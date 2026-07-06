/**
 * POST /api/create-razorpay-order
 * Creates a Razorpay order for cart checkout or meal-plan subscription.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getErrorDetail, runPostHandler } from "./_lib/api-helpers";
import { createLogger } from "./_lib/logger";
import { calculateSubscriptionTotal, createRazorpayOrder } from "./_lib/payments";
import { requireSupabaseAdmin } from "./_lib/supabase-admin";

const log = createLogger("create-razorpay-order");

const handleCartOrder = async (req: VercelRequest, res: VercelResponse) => {
    const { amount, currency = "INR", restaurantId, customerName } = req.body as {
        amount?: number;
        currency?: string;
        restaurantId?: string;
        customerName?: string;
    };

    if (!amount || amount <= 0 || !restaurantId || !customerName) {
        return res.status(400).json({ error: "amount, restaurantId and customerName are required" });
    }

    try {
        const result = await createRazorpayOrder({
            amount,
            currency,
            receipt: `order_${restaurantId.slice(0, 8)}_${Date.now()}`,
            notes: { restaurantId, customerName },
        });
        return res.status(200).json(result);
    } catch (e) {
        const msg = getErrorDetail(e);
        log.error("create cart order failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

const handleSubscriptionOrder = async (req: VercelRequest, res: VercelResponse) => {
    const { planId, restaurantId, deliveryFeeMode, deliveryType } = req.body as {
        planId?: string;
        restaurantId?: string;
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        deliveryType?: "delivery" | "pickup";
    };

    if (!planId || !restaurantId) {
        return res.status(400).json({ error: "planId and restaurantId are required" });
    }

    const { data: plan, error } = await requireSupabaseAdmin()
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
        log.error("create subscription order failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const body = req.body as { planId?: string };
    const routeHandler = body?.planId ? handleSubscriptionOrder : handleCartOrder;
    await runPostHandler(req, res, routeHandler, "create-razorpay-order");
}
