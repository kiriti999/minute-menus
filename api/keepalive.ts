/**
 * Vercel Serverless Function: GET /api/keepalive
 *
 * Runs daily via Vercel cron to keep the Supabase free-tier project active.
 * Free projects pause after 7 days of inactivity.
 *
 * Also serves public SEO (Hobby plan is at 12/12 functions — see lib/server/seo.ts):
 *   ?action=page&slug=…  → restaurant page HTML (rewritten from /:slug and /:slug/menu)
 *   ?action=sitemap      → sitemap.xml
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createLogger } from "../lib/server/logger.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureDishMediaStorage } from "../lib/ensure-dish-media-storage.js";
import { expirePlusSubscriptions } from "../lib/server/plusSubscriptions.js";
import { getSupabaseAdmin } from "../lib/supabase-admin.js";
import { handleSeoPage, handleSitemap } from "../lib/server/seo.js";

const log = createLogger("keepalive");

const SEO_ACTIONS: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
    page: handleSeoPage,
    sitemap: handleSitemap,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const seoHandler = SEO_ACTIONS[String(req.query.action ?? "")];
    if (seoHandler) return seoHandler(req, res);

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

    let expiredPlus = 0;
    try {
        expiredPlus = await expirePlusSubscriptions(admin);
    } catch (error) {
        log.error("expire plus failed", { message: error instanceof Error ? error.message : String(error) });
    }

    return res.status(200).json({ ok: true, expiredPlus });
}
