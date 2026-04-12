/**
 * Vercel Serverless Function: POST /api/subscription/cancel-order
 *
 * Called when a restaurant owner cancels a specific daily order.
 * Sends a cancellation email to the customer (if email on file) and the owner.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY, FROM_EMAIL
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { supabaseAdmin } from "../../lib/supabase-admin";

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
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Guard against unauthenticated abuse — callers must supply the internal secret
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret && req.headers["x-internal-secret"] !== internalSecret) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body as Partial<CancelPayload>;
    const { restaurantId, deliveryDate, dishName, reason, customerEmail, customerName } = payload;

    if (!restaurantId || !deliveryDate || !dishName || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: restaurant } = await supabaseAdmin
        .from("restaurants")
        .select("name, owner_id")
        .eq("id", restaurantId)
        .single();

    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(restaurant.owner_id);
    const ownerEmail = user?.email;

    const resend = new Resend(process.env.RESEND_API_KEY ?? "");
    const from = `Minute Menus <${process.env.FROM_EMAIL ?? "notifications@minutemenus.com"}>`;

    const buildHtml = (recipient: "customer" | "owner") => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#000;color:#fff;margin:0;padding:0;}
  .wrap{max-width:520px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;}
  .hdr{background:#fff;padding:20px 32px;}.hdr span{font-size:17px;font-weight:900;color:#000;}
  .body{padding:32px;}.badge{display:inline-block;background:#ef4444;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:16px;}
  h2{margin:0 0 6px;font-size:20px;color:#fff;}
  p{color:#aaa;font-size:14px;line-height:1.6;margin:0 0 12px;}
  .box{background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px 20px;margin:16px 0;}
  .box strong{color:#fff;font-size:15px;}
  .box span{color:#666;font-size:12px;display:block;margin-top:4px;}
  .ftr{padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><span>MINUTE MENUS</span></div>
  <div class="body">
    <div class="badge">Order Cancelled</div>
    <h2>${recipient === "customer" ? `Hi ${customerName ?? "there"},` : "Order Cancellation Notice"}</h2>
    <p>${recipient === "customer"
            ? `We're sorry — ${restaurant.name} has cancelled your delivery for <strong>${deliveryDate}</strong>.`
            : `You have cancelled the following subscription delivery.`}</p>
    <div class="box">
      <strong>${dishName}</strong>
      <span>Scheduled: ${deliveryDate}</span>
    </div>
    <p><strong>Reason:</strong> ${reason}</p>
    ${recipient === "customer"
            ? "<p>No charge will be applied for this day. Your subscription continues as normal.</p>"
            : "<p>The customer has been notified (if email was provided).</p>"}
  </div>
  <div class="ftr">Sent by Minute Menus subscription service.</div>
</div>
</body>
</html>`;

    const sends: Promise<unknown>[] = [];

    if (customerEmail) {
        sends.push(
            resend.emails.send({
                from,
                to: customerEmail,
                subject: `[${restaurant.name}] Your order for ${deliveryDate} has been cancelled`,
                html: buildHtml("customer"),
            }),
        );
    }

    if (ownerEmail) {
        sends.push(
            resend.emails.send({
                from,
                to: ownerEmail,
                subject: `[${restaurant.name}] Order cancelled for ${deliveryDate} — ${dishName}`,
                html: buildHtml("owner"),
            }),
        );
    }

    await Promise.allSettled(sends);

    return res.status(200).json({ ok: true });
}
