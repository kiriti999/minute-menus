/**
 * Vercel Serverless Function: POST /api/subscription/create-razorpay-order
 *
 * Creates a Razorpay order for a subscription payment.
 * Amount = plan.price_monthly + (plan.delivery_fee × 30)
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";
import { supabaseAdmin } from "../../lib/supabase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { planId, restaurantId, deliveryFeeMode, deliveryType } = req.body as {
        planId?: string; restaurantId?: string;
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        deliveryType?: "delivery" | "pickup";
    };
    if (!planId || !restaurantId) {
        return res.status(400).json({ error: "planId and restaurantId are required" });
    }

    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: "Razorpay not configured" });
    }

    const { data: plan, error } = await supabaseAdmin
        .from("meal_plans")
        .select("price_monthly, delivery_fee, name")
        .eq("id", planId)
        .eq("restaurant_id", restaurantId)
        .single();

    if (error || !plan) {
        return res.status(404).json({ error: "Plan not found" });
    }

    const includeDelivery = deliveryType === "delivery" && deliveryFeeMode === "upfront";
    const monthlyTotal = Number(plan.price_monthly) + (includeDelivery ? Number(plan.delivery_fee) * 30 : 0);
    // Razorpay expects amount in smallest currency unit (paise for INR)
    const amountPaise = Math.round(monthlyTotal * 100);

    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    try {
        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: `sub_${planId.slice(0, 8)}_${Date.now()}`,
            notes: { planId, restaurantId, planName: plan.name },
        });
        return res.status(200).json({ orderId: order.id, amount: amountPaise, currency: "INR", keyId: RAZORPAY_KEY_ID });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("create-razorpay-order:", msg);
        return res.status(502).json({ error: "Failed to create payment order", detail: msg });
    }
}
