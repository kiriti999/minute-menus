/**
 * POST /api/confirm-payment?action=confirm-order|confirm-subscription|confirm-plus|verify
 * Confirms a Razorpay payment and records the order/subscription server-side.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPostHandler } from "./_lib/api-helpers";
import { createLogger } from "./_lib/logger";
import { safeVerifyRazorpaySignature } from "./_lib/payments";
import { requireSupabaseAdmin } from "./_lib/supabase-admin";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

const normalizeAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action[0] ?? "" : action;
};

// ─────────────────────────────────────────────────────────────────────────────
// confirm-order: Record cart order after payment verification
// ─────────────────────────────────────────────────────────────────────────────
type OrderItemInput = { dishId: string; quantity: number; name: string; price: number };
type ConfirmOrderBody = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    restaurantId?: string;
    items?: OrderItemInput[];
    timeToOrder?: number;
};

const logOrder = createLogger("confirm-order");

const handleConfirmOrder = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature, restaurantId, items, timeToOrder,
    } = req.body as ConfirmOrderBody;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) logOrder.warn("signature mismatch", { orderId: razorpay_order_id });
        else logOrder.error("verify failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const admin = requireSupabaseAdmin();
    const { data: order, error: insertError } = await admin
        .from("orders")
        .insert({
            restaurant_id: restaurantId,
            items: items as unknown as Json,
            total_amount: totalAmount,
            time_to_order: timeToOrder ?? 0,
            status: "pending",
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
        })
        .select("id")
        .single();

    if (insertError || !order) {
        logOrder.error("record failed after verified payment", { message: insertError?.message });
        return res.status(500).json({ error: "Payment verified but failed to record order" });
    }

    const today = new Date().toISOString().slice(0, 10);
    await Promise.allSettled(
        items.map((item) =>
            admin.rpc("increment_dish_stock", {
                p_dish_id: item.dishId,
                p_restaurant_id: restaurantId,
                p_sold_date: today,
                p_quantity: item.quantity,
            }),
        ),
    );

    return res.status(200).json({ success: true, orderId: order.id });
};

// ─────────────────────────────────────────────────────────────────────────────
// confirm-subscription: Record meal-plan subscription after payment verification
// ─────────────────────────────────────────────────────────────────────────────
type ConfirmSubBody = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    restaurantId?: string;
    planId?: string;
    customerName?: string;
    phone?: string;
    email?: string;
    deliveryType?: "delivery" | "pickup";
    deliveryFeeMode?: "upfront" | "cash_on_delivery";
    timeSlot?: "08-09" | "12-14" | "19-21";
    rotationDishIds?: string[];
};

const logSub = createLogger("confirm-subscription");

const handleConfirmSubscription = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, planId, customerName, phone, email,
        deliveryType, deliveryFeeMode, timeSlot, rotationDishIds,
    } = req.body as ConfirmSubBody;

    if (
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        !restaurantId || !planId || !customerName || !phone || !deliveryType || !deliveryFeeMode || !timeSlot
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) logSub.warn("signature mismatch", { orderId: razorpay_order_id });
        else logSub.error("verify failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endDate = end.toISOString().slice(0, 10);

    const { data, error } = await requireSupabaseAdmin()
        .from("customer_subscriptions")
        .insert({
            restaurant_id: restaurantId,
            plan_id: planId,
            customer_name: customerName,
            phone,
            email: email ?? null,
            delivery_type: deliveryType,
            delivery_fee_mode: deliveryFeeMode,
            time_slot: timeSlot,
            start_date: startDate,
            end_date: endDate,
            rotation_dish_ids: rotationDishIds ?? [],
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
        })
        .select("id")
        .single();

    if (error || !data) {
        logSub.error("create subscription failed after verified payment", { message: error?.message });
        return res.status(500).json({ error: "Payment verified but failed to create subscription" });
    }

    return res.status(200).json({ success: true, subscriptionId: data.id });
};

// ─────────────────────────────────────────────────────────────────────────────
// confirm-plus: Upgrade owner to Plus tier after payment verification
// ─────────────────────────────────────────────────────────────────────────────
type PlusPlanId = "annual" | "monthly";
const PLAN_PERIOD_DAYS: Record<PlusPlanId, number> = { annual: 365, monthly: 30 };

const logPlus = createLogger("confirm-plus");

const handleConfirmPlus = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature, restaurantId, plan,
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        plan?: PlusPlanId;
    };

    const periodDays = plan ? PLAN_PERIOD_DAYS[plan] : undefined;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !periodDays) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) logPlus.warn("signature mismatch", { orderId: razorpay_order_id, restaurantId });
        else logPlus.error("verify failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const { error } = await requireSupabaseAdmin()
        .from("subscriptions")
        .upsert(
            {
                restaurant_id: restaurantId,
                tier: "plus",
                provider: "razorpay",
                provider_subscription_id: razorpay_payment_id,
                current_period_end: periodEnd.toISOString(),
            },
            { onConflict: "restaurant_id" },
        );

    if (error) {
        logPlus.error("upgrade failed after verified payment", { message: error.message });
        return res.status(500).json({ error: "Payment verified but failed to upgrade tier" });
    }

    return res.status(200).json({ success: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// verify: Simple signature verification (no DB write)
// ─────────────────────────────────────────────────────────────────────────────
const logVerify = createLogger("verify-payment");

const handleVerify = async (req: VercelRequest, res: VercelResponse) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
            verified: false,
            error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) logVerify.warn("signature mismatch", { orderId: razorpay_order_id });
        else logVerify.error("verify failed", { message: outcome.error });
        return res.status(outcome.status).json({ verified: false, error: outcome.error });
    }
    return res.status(200).json({ verified: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────
const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
    "confirm-order": handleConfirmOrder,
    "confirm-subscription": handleConfirmSubscription,
    "confirm-plus": handleConfirmPlus,
    verify: handleVerify,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = normalizeAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        if (req.method === "OPTIONS") return;
        return res.status(404).json({ error: `Unknown action: ${action || "(none)"}` });
    }
    await runPostHandler(req, res, routeHandler, `confirm-payment/${action}`);
}
