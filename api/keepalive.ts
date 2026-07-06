/**
 * Vercel Serverless Function: GET /api/keepalive
 *
 * Runs daily via Vercel cron to keep the Supabase free-tier project active.
 * Free projects pause after 7 days of inactivity.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createLogger } from "../lib/server/logger";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureDishMediaStorage } from "../lib/ensure-dish-media-storage";
import { getSupabaseAdmin } from "../lib/supabase-admin";

const log = createLogger("keepalive");

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    try {
        await ensureDishMediaStorage();
    } catch (error) {
        log.error("storage ensure failed", { message: error instanceof Error ? error.message : String(error) });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
        log.error("keepalive failed", { message: "missing Supabase env" });
        return res.status(500).json({ ok: false, error: "Server is not configured" });
    }

    const { error } = await admin.from("restaurants").select("id").limit(1);

    if (error) {
        log.error("keepalive failed", { message: error.message });
        return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
}
