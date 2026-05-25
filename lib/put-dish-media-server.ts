import type { SupabaseClient } from "@supabase/supabase-js";

export const DISH_MEDIA_BUCKET = "dish-media";
const MAX_IMAGE_BYTES = 1024 * 1024;

const dataUrlToBuffer = (dataUrl: string): { bytes: Uint8Array; mime: string } => {
    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    return { bytes: Uint8Array.from(Buffer.from(base64, "base64")), mime };
};

export const putDishMediaFromDataUrlServer = async (
    client: SupabaseClient,
    restaurantId: string,
    dishId: string,
    dataUrl: string,
    kind: "image" | "video",
): Promise<string> => {
    const { bytes, mime } = dataUrlToBuffer(dataUrl);
    if (kind === "image" && bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new Error(
            `Image is too large (${Math.round(bytes.byteLength / 1024 / 1024)}MB). Max 1MB.`,
        );
    }
    if (kind === "video" && bytes.byteLength > 50 * 1024 * 1024) {
        throw new Error(
            `Video is too large (${Math.round(bytes.byteLength / 1024 / 1024)}MB). Max 50MB.`,
        );
    }

    const ext = kind === "image" ? "webp" : mime.includes("mp4") ? "mp4" : "webm";
    const contentType = kind === "image" ? "image/webp" : mime;
    const path = `${restaurantId}/${dishId}/${kind}.${ext}`;

    const { error } = await client.storage.from(DISH_MEDIA_BUCKET).upload(path, bytes, {
        upsert: true,
        contentType,
    });
    if (error) {
        throw new Error(`Failed to upload ${kind}: ${error.message}`);
    }

    return client.storage.from(DISH_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
};
