/**
 * Vercel Serverless Function: POST /api/subscription/create-razorpay-order
 */

import { getErrorDetail, rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import { calculateSubscriptionTotal, createRazorpayOrder } from "@minute-menus/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../lib/supabase-admin";

const log = createLogger("subscription/create-razorpay-order");

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    const { planId, restaurantId, deliveryFeeMode, deliveryType } = req.body as {
        planId?: string; restaurantId?: string;
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        deliveryType?: "delivery" | "pickup";
    };
    if (!planId || !restaurantId) {
        return res.status(400).json({ error: "planId and restaurantId are required" });
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
    const monthlyTotal = calculateSubscriptionTotal(
        Number(plan.price_monthly),
        Number(plan.delivery_fee),
        includeDelivery,
    );

    try {
        const result = await createRazorpayOrder({
            amount: monthlyTotal,
            currency: "INR",
            receipt: `sub_${planId.slice(0, 8)}_${Date.now()}`,
            notes: { planId, restaurantId, planName: plan.name },
        });
        return res.status(200).json(result);
    } catch (e) {
        const msg = getErrorDetail(e);
        log.error("create payment order failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
}
