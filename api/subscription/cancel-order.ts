/**
 * Vercel Serverless Function: POST /api/subscription/cancel-order
 */

import { getErrorDetail, rejectUnlessPost, verifyInternalSecret } from "../../lib/server/api-helpers";
import { buildCancelOrderEmailHtml, formatFromRestaurant } from "../../lib/server/email-templates";
import { sendMail } from "../../lib/server/mailer";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserEmailById, requireSupabaseAdmin } from "../../lib/supabase-admin";

interface CancelPayload {
    subscriptionId: string;
    restaurantId: string;
    deliveryDate: string;
    dishName: string;
    reason: string;
    customerEmail: string | null;
    customerName: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;
    if (!verifyInternalSecret(req, res)) return;

    const payload = req.body as Partial<CancelPayload>;
    const { restaurantId, deliveryDate, dishName, reason, customerEmail, customerName } = payload;

    if (!restaurantId || !deliveryDate || !dishName || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: restaurant } = await requireSupabaseAdmin()
        .from("restaurants")
        .select("name, owner_id")
        .eq("id", restaurantId)
        .single();

    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const ownerEmail = await getUserEmailById(restaurant.owner_id);
    const from = formatFromRestaurant(restaurant.name);

    const sends: Promise<unknown>[] = [];

    if (customerEmail) {
        sends.push(
            sendMail({
                from,
                replyTo: ownerEmail ?? undefined,
                to: customerEmail,
                subject: `Your order for ${deliveryDate} has been cancelled`,
                html: buildCancelOrderEmailHtml({
                    restaurantName: restaurant.name,
                    deliveryDate,
                    dishName,
                    reason,
                    customerName,
                    recipient: "customer",
                }),
            }).catch((err) => Promise.reject(new Error(getErrorDetail(err)))),
        );
    }

    if (ownerEmail) {
        sends.push(
            sendMail({
                from,
                to: ownerEmail,
                subject: `Order cancelled for ${deliveryDate} — ${dishName}`,
                html: buildCancelOrderEmailHtml({
                    restaurantName: restaurant.name,
                    deliveryDate,
                    dishName,
                    reason,
                    customerName,
                    recipient: "owner",
                }),
            }).catch((err) => Promise.reject(new Error(getErrorDetail(err)))),
        );
    }

    await Promise.allSettled(sends);

    return res.status(200).json({ ok: true });
}
