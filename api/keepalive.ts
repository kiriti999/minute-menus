/**
 * Vercel Serverless Function: GET /api/keepalive
 *
 * Runs daily via Vercel cron to keep the Supabase free-tier project active.
 * Free projects pause after 7 days of inactivity.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../lib/supabase-admin";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const { error } = await supabaseAdmin.from("restaurants").select("id").limit(1);

    if (error) {
        console.error("keepalive failed:", error.message);
        return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true });
}
