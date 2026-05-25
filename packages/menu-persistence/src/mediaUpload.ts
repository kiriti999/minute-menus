import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";
import { compressImageBlob, MAX_IMAGE_BYTES } from "./imageCompress";

const BUCKET = "dish-media";

const dataUrlToBlob = (dataUrl: string): Blob => {
    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
};

const extensionFor = (mime: string, fallback: "jpg" | "mp4"): string => {
    if (mime.includes("png")) return "png";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("gif")) return "gif";
    if (mime.includes("mp4")) return "mp4";
    if (mime.includes("webm")) return "webm";
    if (mime.includes("quicktime")) return "mov";
    return fallback;
};

const uploadDataUrl = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    dishId: string,
    dataUrl: string,
    kind: "image" | "video",
): Promise<string> => {
    let blob = dataUrlToBlob(dataUrl);
    if (kind === "image") {
        blob = await compressImageBlob(blob, MAX_IMAGE_BYTES);
    } else if (blob.size > 50 * 1024 * 1024) {
        throw new Error(
            `Video is too large (${Math.round(blob.size / 1024 / 1024)}MB). Max 50MB.`,
        );
    }

    const ext = kind === "image" ? "webp" : extensionFor(blob.type, "mp4");
    const contentType = kind === "image" ? "image/webp" : blob.type;
    const path = `${restaurantId}/${dishId}/${kind}.${ext}`;

    const { error } = await client.storage.from(BUCKET).upload(path, blob, {
        upsert: true,
        contentType,
    });
    if (error) {
        throw new Error(
            `Failed to upload ${kind}: ${error.message}. Ensure the dish-media storage bucket exists (run pnpm db:push).`,
        );
    }

    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
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

export const uploadCategoryMedia = async (
    client: SupabaseClient<Database>,
    restaurantId: string,
    categories: Category[],
): Promise<Category[]> =>
    Promise.all(
        categories.map(async (category) => ({
            ...category,
            items: await Promise.all(
                category.items.map(async (dish) => ({
                    ...dish,
                    imageUrl: dish.imageUrl
                        ? await resolveMediaUrl(client, restaurantId, dish.id, dish.imageUrl, "image")
                        : dish.imageUrl,
                    videoUrl: dish.videoUrl
                        ? await resolveMediaUrl(client, restaurantId, dish.id, dish.videoUrl, "video")
                        : dish.videoUrl,
                })),
            ),
        })),
    );
