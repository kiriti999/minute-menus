/**
 * Vercel Serverless Function: GET /api/subscription/daily-digest
 */

import { buildDailyDigestEmailHtml, formatFromRestaurant, TIME_SLOT_LABELS } from "../../lib/server/email-templates";
import { createLogger } from "../../lib/server/logger";
import { sendMail } from "../../lib/server/mailer";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserEmailById, requireSupabaseAdmin } from "../../lib/supabase-admin";

const log = createLogger("daily-digest");

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const { data: orders, error } = await requireSupabaseAdmin()
        .from("subscription_daily_orders")
        .select(`
            id,
            delivery_date,
            dish_name,
            status,
            restaurant_id,
            customer_subscriptions (
                customer_name,
                phone,
                time_slot,
                delivery_type
            )
        `)
        .eq("delivery_date", tomorrowStr)
        .eq("status", "pending");

    if (error) {
        log.error("DB error", { message: error.message });
        return res.status(500).json({ error: error.message });
    }

    if (!orders || orders.length === 0) {
        return res.status(200).json({ ok: true, sent: 0 });
    }

    const byRestaurant = new Map<string, typeof orders>();
    orders.forEach((o) => {
        const arr = byRestaurant.get(o.restaurant_id) ?? [];
        arr.push(o);
        byRestaurant.set(o.restaurant_id, arr);
    });

    let sent = 0;

    for (const [restaurantId, restaurantOrders] of byRestaurant) {
        const { data: restaurant } = await requireSupabaseAdmin()
            .from("restaurants")
            .select("name, owner_id")
            .eq("id", restaurantId)
            .single();

        if (!restaurant) continue;

        const ownerEmail = await getUserEmailById(restaurant.owner_id);
        if (!ownerEmail) continue;

        const rows = restaurantOrders.map((o) => {
            const sub = o.customer_subscriptions as unknown as {
                customer_name: string; phone: string;
                time_slot: string; delivery_type: string;
            } | null;
            return {
                customerName: sub?.customer_name ?? "-",
                phone: sub?.phone ?? "-",
                dishName: o.dish_name,
                timeSlotLabel: TIME_SLOT_LABELS[sub?.time_slot ?? ""] ?? sub?.time_slot ?? "-",
                deliveryType: sub?.delivery_type ?? "-",
            };
        });

        try {
            await sendMail({
                from: formatFromRestaurant(restaurant.name),
                replyTo: ownerEmail,
                to: ownerEmail,
                subject: `${restaurantOrders.length} order${restaurantOrders.length !== 1 ? "s" : ""} for tomorrow (${tomorrowStr})`,
                html: buildDailyDigestEmailHtml(tomorrowStr, restaurantOrders.length, rows),
            });
            sent++;
        } catch (e) {
            log.error("email send failed", { restaurantId, message: String(e) });
        }
    }

    return res.status(200).json({ ok: true, sent });
}
