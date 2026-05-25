import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";
import { throwStepError } from "@minute-menus/errors";

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
        category.items.map((dish) => ({
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
        })),
    );

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

    const { error: deleteErr } = await client.from(table).delete().in("id", idsToDelete);
    if (deleteErr) throwStepError(`Delete removed ${table}`, deleteErr);
};

export const persistMenu = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    categories: Category[],
): Promise<void> => {
    const safeCategories = normalizeMenuIds(categories);

    const { error: categoryErr } = await client
        .from("categories")
        .upsert(toCategoryRows(safeCategories, restaurantId), { onConflict: "id" });
    if (categoryErr) throwStepError("Save categories", categoryErr);

    const { error: dishErr } = await client
        .from("dishes")
        .upsert(toDishRows(safeCategories, restaurantId), { onConflict: "id" });
    if (dishErr) throwStepError("Save dishes", dishErr);

    const keptDishIds = new Set(
        safeCategories.flatMap((category) => category.items.map((dish) => dish.id)),
    );
    await deleteMissingIds(client, "dishes", restaurantId, keptDishIds);

    const keptCategoryIds = new Set(safeCategories.map((category) => category.id));
    await deleteMissingIds(client, "categories", restaurantId, keptCategoryIds);
};
