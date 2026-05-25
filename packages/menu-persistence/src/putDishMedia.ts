import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";
import { compressImageBlob, MAX_IMAGE_BYTES } from "./imageCompress";

export const DISH_MEDIA_BUCKET = "dish-media";

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

export const putDishMediaFromDataUrl = async (
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

    const { error } = await client.storage.from(DISH_MEDIA_BUCKET).upload(path, blob, {
        upsert: true,
        contentType,
    });
    if (error) {
        throw new Error(`Failed to upload ${kind}: ${error.message}`);
    }

    return client.storage.from(DISH_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
};
