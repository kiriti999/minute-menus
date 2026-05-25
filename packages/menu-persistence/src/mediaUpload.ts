import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";
import { compressDataUrl } from "./imageCompress";
import { putDishMediaFromDataUrl } from "./putDishMedia";

const isRlsError = (message: string): boolean =>
    /row-level security|permission denied|not authorized|403/i.test(message);

const uploadImageViaApi = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    dishId: string,
    dataUrl: string,
): Promise<string> => {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
        throw new Error("Not authenticated. Sign in again and retry.");
    }

    const response = await fetch("/api/menu/upload-media", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ restaurantId, dishId, kind: "image", dataUrl }),
    });

    const body = (await response.json().catch(() => ({}))) as {
        publicUrl?: string;
        error?: string;
    };

    if (!response.ok) {
        throw new Error(body.error ?? `Image upload failed (${response.status})`);
    }

    if (!body.publicUrl) {
        throw new Error("Image upload failed: missing public URL");
    }

    return body.publicUrl;
};

const uploadDataUrl = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    dishId: string,
    dataUrl: string,
    kind: "image" | "video",
): Promise<string> => {
    let prepared = dataUrl;
    if (kind === "image") {
        prepared = await compressDataUrl(dataUrl);
    }

    try {
        return await putDishMediaFromDataUrl(client, restaurantId, dishId, prepared, kind);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        if (kind === "image" && typeof window !== "undefined" && isRlsError(message)) {
            return uploadImageViaApi(client, restaurantId, dishId, prepared);
        }
        if (isRlsError(message)) {
            throw new Error(
                `${message}. Sign out and back in, then retry. If it persists, contact support.`,
            );
        }
        throw new Error(`${message}. If this persists, run pnpm storage:ensure.`);
    }
};

const resolveMediaUrl = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    dishId: string,
    url: string,
    kind: "image" | "video",
): Promise<string> => {
    if (!url.startsWith("data:")) return url;
    return uploadDataUrl(client, restaurantId, dishId, url, kind);
};

const mapDishMedia = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    dish: Category["items"][number],
): Promise<Category["items"][number]> => ({
    ...dish,
    imageUrl: dish.imageUrl
        ? await resolveMediaUrl(client, restaurantId, dish.id, dish.imageUrl, "image")
        : dish.imageUrl,
    videoUrl: dish.videoUrl
        ? await resolveMediaUrl(client, restaurantId, dish.id, dish.videoUrl, "video")
        : dish.videoUrl,
});

export const uploadCategoryMedia = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    categories: Category[],
): Promise<Category[]> => {
    const results: Category[] = [];
    for (const category of categories) {
        const items = [];
        for (const dish of category.items) {
            items.push(await mapDishMedia(client, restaurantId, dish));
        }
        results.push({ ...category, items });
    }
    return results;
};
