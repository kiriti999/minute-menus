/**
 * Vercel Serverless Function: POST /api/sold-out-email
 */

import {
    getErrorDetail,
    rejectUnlessPost,
    soldOutEmailSubject,
} from "../lib/server/api-helpers";
import { buildSoldOutEmailHtml } from "../lib/server/email-templates";
import { createLogger } from "../lib/server/logger";
import { sendMail } from "../lib/server/mailer";
import { verifyOwnerForRestaurant } from "../lib/server/verifyOwnerRestaurant";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserEmailById, requireSupabaseAdmin } from "../lib/supabase-admin";

const log = createLogger("sold-out-email");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

async function withRetry<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
    delayMs = BASE_DELAY_MS,
): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        await new Promise((res) => setTimeout(res, delayMs));
        return withRetry(fn, retries - 1, delayMs * 2);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    if (!process.env.BREVO_SMTP_KEY) {
        log.error("BREVO_SMTP_KEY not configured");
        return res.status(500).json({ error: "Email not configured" });
    }

    // Owner-only, and always addressed to that owner: the recipient and the
    // dish/restaurant names come from the database, never the request body.
    const { restaurantId, dishId, reason } = (req.body ?? {}) as {
        restaurantId?: string;
        dishId?: string;
        reason?: string;
    };
    if (!restaurantId || !dishId || (reason !== "stock" && reason !== "manual")) {
        return res.status(400).json({ error: "restaurantId, dishId and reason are required" });
    }
    const owner = await verifyOwnerForRestaurant(req, restaurantId);
    if (!owner) return res.status(401).json({ error: "Unauthorized" });

    const admin = requireSupabaseAdmin();
    const [{ data: dish }, { data: restaurant }, to] = await Promise.all([
        admin.from("dishes").select("name").eq("id", dishId).eq("restaurant_id", restaurantId).maybeSingle(),
        admin.from("restaurants").select("name").eq("id", restaurantId).maybeSingle(),
        getUserEmailById(owner.userId),
    ]);
    if (!dish || !restaurant || !to) return res.status(404).json({ error: "Dish or owner email not found" });
    const dishName = dish.name;
    const restaurantName = restaurant.name;
    const fromEmail = process.env.FROM_EMAIL ?? "minutemenus@outlook.com";

    try {
        await withRetry(() =>
            sendMail({
                from: `Minute Menus <${fromEmail}>`,
                to,
                subject: soldOutEmailSubject(restaurantName, dishName, reason),
                html: buildSoldOutEmailHtml(dishName, restaurantName, reason),
            }),
        );

        return res.status(200).json({ ok: true });
    } catch (err) {
        log.error("all retries exhausted", { message: getErrorDetail(err) });
        return res.status(502).json({
            error: "Failed to send email after retries",
            detail: getErrorDetail(err),
        });
    }
}
