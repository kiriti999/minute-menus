import { createLogger } from "@minute-menus/logger";
import { supabaseAdmin } from "./supabase-admin";

const log = createLogger("storage");
export const DISH_MEDIA_BUCKET = "dish-media";
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ensureDishMediaStorage = async (): Promise<{ created: boolean }> => {
    const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
    if (listErr) {
        throw new Error(`Failed to list storage buckets: ${listErr.message}`);
    }

    if (buckets.some((bucket) => bucket.name === DISH_MEDIA_BUCKET)) {
        return { created: false };
    }

    const { error: createErr } = await supabaseAdmin.storage.createBucket(DISH_MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_BYTES,
    });
    if (createErr) {
        throw new Error(`Failed to create ${DISH_MEDIA_BUCKET} bucket: ${createErr.message}`);
    }

    log.info("created dish-media storage bucket");
    return { created: true };
};
