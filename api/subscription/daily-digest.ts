/**
 * Vercel Serverless Function: GET /api/subscription/daily-digest
 *
 * Runs daily at 5:05 PM IST (11:35 UTC) via Vercel cron.
 * Sends each restaurant owner an email listing tomorrow's subscription orders.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL / SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY, FROM_EMAIL
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { supabaseAdmin } from "../../lib/supabase-admin";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    const resend = new Resend(process.env.RESEND_API_KEY ?? "");

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    // Fetch tomorrow's pending orders joined with subscription + plan + restaurant
    const { data: orders, error } = await supabaseAdmin
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
        console.error("daily-digest: DB error", error.message);
        return res.status(500).json({ error: error.message });
    }

    if (!orders || orders.length === 0) {
        return res.status(200).json({ ok: true, sent: 0 });
    }

    // Group by restaurant_id
    const byRestaurant = new Map<string, typeof orders>();
    orders.forEach((o) => {
        const arr = byRestaurant.get(o.restaurant_id) ?? [];
        arr.push(o);
        byRestaurant.set(o.restaurant_id, arr);
    });

    let sent = 0;

    for (const [restaurantId, restaurantOrders] of byRestaurant) {
        const { data: restaurant } = await supabaseAdmin
            .from("restaurants")
            .select("name, owner_id")
            .eq("id", restaurantId)
            .single();

        if (!restaurant) continue;

        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(restaurant.owner_id);
        const ownerEmail = user?.email;
        if (!ownerEmail) continue;

        // Group orders by time slot
        const slotLabels: Record<string, string> = {
            "08-09": "8:00 AM – 9:00 AM",
            "12-14": "12:00 PM – 2:00 PM",
            "19-21": "7:00 PM – 9:00 PM",
        };

        const rows = restaurantOrders.map((o) => {
            const sub = o.customer_subscriptions as unknown as {
                customer_name: string; phone: string;
                time_slot: string; delivery_type: string;
            } | null;
            const slot = slotLabels[sub?.time_slot ?? ""] ?? sub?.time_slot ?? "-";
            return `<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${sub?.customer_name ?? "-"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${sub?.phone ?? "-"}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${o.dish_name}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${slot}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #222;">${sub?.delivery_type ?? "-"}</td>
            </tr>`;
        }).join("");

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#000;color:#fff;margin:0;padding:0;}
  .wrap{max-width:680px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;}
  .hdr{background:#fff;padding:20px 32px;}.hdr span{font-size:17px;font-weight:900;color:#000;}
  .body{padding:32px;}.badge{display:inline-block;background:#3b82f6;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 10px;border-radius:4px;margin-bottom:16px;}
  h2{margin:0 0 6px;font-size:20px;color:#fff;}
  p{color:#aaa;font-size:14px;line-height:1.6;margin:0 0 16px;}
  table{width:100%;border-collapse:collapse;margin-top:16px;}
  th{text-align:left;padding:8px 12px;background:#1a1a1a;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;}
  td{color:#fff;font-size:13px;}
  .ftr{padding:16px 32px;border-top:1px solid #1a1a1a;color:#444;font-size:11px;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><span>MINUTE MENUS</span></div>
  <div class="body">
    <div class="badge">Daily Digest</div>
    <h2>Tomorrow's Orders — ${tomorrowStr}</h2>
    <p>${restaurantOrders.length} subscriber${restaurantOrders.length !== 1 ? "s" : ""} have selected their meal for tomorrow.</p>
    <table>
      <thead><tr>
        <th>Customer</th><th>Phone</th><th>Dish</th><th>Time Slot</th><th>Type</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="ftr">Please prepare these items for delivery tomorrow. Sent by Minute Menus.</div>
</div>
</body>
</html>`;

        try {
            await resend.emails.send({
                from: `Minute Menus <${process.env.FROM_EMAIL ?? "notifications@minutemenus.com"}>`,
                to: ownerEmail,
                subject: `[${restaurant.name}] ${restaurantOrders.length} order${restaurantOrders.length !== 1 ? "s" : ""} for tomorrow (${tomorrowStr})`,
                html,
            });
            sent++;
        } catch (e) {
            console.error("daily-digest: email send failed for", restaurantId, e);
        }
    }

    return res.status(200).json({ ok: true, sent });
}
