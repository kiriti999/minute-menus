/**
 * Vercel Serverless Function: GET /api/subscription/auto-deliver?slot=08-09
 *
 * Called by Vercel cron after each delivery time slot ends.
 * Bulk-marks all pending orders for that slot as "delivered".
 *
 * Cron schedule (IST = UTC+5:30):
 *   slot=08-09 → after 9:30 AM IST = 04:00 UTC   → "0 4 * * *"
 *   slot=12-14 → after 2:30 PM IST = 09:00 UTC   → "0 9 * * *"
 *   slot=19-21 → after 9:30 PM IST = 16:00 UTC   → "0 16 * * *"
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createLogger } from "../../lib/server/logger";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSupabaseAdmin } from "../../lib/supabase-admin";

const log = createLogger("auto-deliver");

const VALID_SLOTS = ["08-09", "12-14", "19-21"] as const;
type Slot = (typeof VALID_SLOTS)[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const slot = req.query.slot as string | undefined;

    if (!slot || !VALID_SLOTS.includes(slot as Slot)) {
        return res.status(400).json({ error: `slot must be one of: ${VALID_SLOTS.join(", ")}` });
    }

    const validSlot = slot as Slot;
    const today = new Date().toISOString().slice(0, 10);

    // Find all active subscriptions with this time_slot, then mark their pending orders
    const admin = requireSupabaseAdmin();
    const { data: subscriptions } = await admin
        .from("customer_subscriptions")
        .select("id")
        .eq("time_slot", validSlot)
        .eq("status", "active");

    if (!subscriptions || subscriptions.length === 0) {
        return res.status(200).json({ ok: true, updated: 0 });
    }

    const subIds = subscriptions.map((s) => s.id);

    const { data, error } = await admin
        .from("subscription_daily_orders")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("delivery_date", today)
        .eq("status", "pending")
        .in("subscription_id", subIds)
        .select("id");

    if (error) {
        log.error("DB error", { message: error.message });
        return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, updated: data?.length ?? 0 });
}
