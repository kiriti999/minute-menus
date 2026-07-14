import type { SupabaseClient } from "@supabase/supabase-js";
import { throwStepError } from "@minute-menus/errors";
import type { Category } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";
import { chunkArray } from "./chunk";
import { uploadCategoryMedia } from "./mediaUpload";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DISH_UPSERT_CHUNK = 20;
const DELETE_CHUNK = 100;

export { compressDataUrl, compressImageBlob, MAX_IMAGE_BYTES } from "./imageCompress";
export { putDishMediaFromDataUrl, DISH_MEDIA_BUCKET } from "./putDishMedia";

export const normalizeMenuIds = (categories: Category[]): Category[] =>
    categories.map((category) => ({
        ...category,
        id: UUID_RE.test(category.id) ? category.id : crypto.randomUUID(),
        items: category.items.map((dish) => ({
            ...dish,
            id: UUID_RE.test(dish.id) ? dish.id : crypto.randomUUID(),
        })),
    }));

const toCategoryRows = (categories: Category[], restaurantId: string) =>
    categories.map((category, index) => ({
        id: category.id,
        restaurant_id: restaurantId,
        title: category.title,
        sort_order: index,
    }));

const toDishRows = (categories: Category[], restaurantId: string) =>
    categories.flatMap((category) =>
        category.items.map((dish, index) => ({
            id: dish.id,
            category_id: category.id,
            restaurant_id: restaurantId,
            name: dish.name?.trim() || "Untitled item",
            description: dish.description ?? "",
            price: Number.isFinite(dish.price) ? dish.price : 0,
            image_url: dish.imageUrl ?? "",
            video_url: dish.videoUrl ?? "",
            popularity_score: dish.popularityScore ?? 0,
            prep_time: dish.prepTime ?? 0,
            media_transform: dish.mediaTransform ?? null,
            stock_quantity: dish.stockQuantity ?? null,
            manual_sold_out: dish.manualSoldOut ?? false,
            ingredients: dish.ingredients ?? "",
            benefits: dish.benefits ?? "",
            calories: dish.calories ?? null,
            sort_order: index,
        })),
    );

const upsertDishRows = async (
    client: SupabaseClient<Database>,
    rows: ReturnType<typeof toDishRows>,
): Promise<void> => {
    for (const batch of chunkArray(rows, DISH_UPSERT_CHUNK)) {
        const { error } = await client.from("dishes").upsert(batch, { onConflict: "id" });
        if (error) throwStepError("Save dishes", error);
    }
};

const deleteMissingIds = async (
    client: SupabaseClient<Database>,
    table: "dishes" | "categories",
    restaurantId: string,
    keptIds: Set<string>,
): Promise<void> => {
    const { data: existing, error: existingErr } = await client
        .from(table)
        .select("id")
        .eq("restaurant_id", restaurantId);
    if (existingErr) throwStepError(`Load existing ${table}`, existingErr);

    const idsToDelete = (existing ?? [])
        .map((row) => row.id)
        .filter((id) => !keptIds.has(id));
    if (idsToDelete.length === 0) return;

    for (const batch of chunkArray(idsToDelete, DELETE_CHUNK)) {
        const { error: deleteErr } = await client.from(table).delete().in("id", batch);
        if (deleteErr) throwStepError(`Delete removed ${table}`, deleteErr);
    }
};

export const persistMenu = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    categories: Category[],
): Promise<Category[]> => {
    const safeCategories = normalizeMenuIds(categories);
    const withMedia = await uploadCategoryMedia(client, restaurantId, safeCategories);

    const { error: categoryErr } = await client
        .from("categories")
        .upsert(toCategoryRows(withMedia, restaurantId), { onConflict: "id" });
    if (categoryErr) throwStepError("Save categories", categoryErr);

    await upsertDishRows(client, toDishRows(withMedia, restaurantId));

    const keptDishIds = new Set(
        withMedia.flatMap((category) => category.items.map((dish) => dish.id)),
    );
    await deleteMissingIds(client, "dishes", restaurantId, keptDishIds);

    const keptCategoryIds = new Set(withMedia.map((category) => category.id));
    await deleteMissingIds(client, "categories", restaurantId, keptCategoryIds);

    return withMedia;
};
