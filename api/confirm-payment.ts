/**
 * POST /api/confirm-payment?action=confirm-order|confirm-subscription|confirm-plus|verify
 * Confirms a Razorpay payment and records the order/subscription server-side.
 */

import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Supabase admin (inline) ───────────────────────────────────────────────────
let adminClient: SupabaseClient | null = null;

const requireSupabaseAdmin = (): SupabaseClient => {
    if (adminClient) return adminClient;
    const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) throw new Error("Server is not configured (missing Supabase env vars)");
    adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return adminClient;
};

// ── Razorpay signature verification (inline) ──────────────────────────────────
const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
};

const safeVerifyRazorpaySignature = (input: {
    orderId: string;
    paymentId: string;
    signature: string;
}): { verified: boolean; status: 200 | 400 | 500 | 502; error: string } => {
    try {
        const creds = getRazorpayCredentials();
        if (!creds) throw new Error("Razorpay not configured");

        const expected = crypto
            .createHmac("sha256", creds.keySecret)
            .update(`${input.orderId}|${input.paymentId}`)
            .digest("hex");

        const expectedBuf = Buffer.from(expected, "utf8");
        const actualBuf = Buffer.from(input.signature, "utf8");
        const match =
            expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

        if (!match) return { verified: false, status: 400, error: "Payment signature mismatch" };
        return { verified: true, status: 200, error: "" };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
            verified: false,
            status: message === "Razorpay not configured" ? 500 : 502,
            error: "Failed to verify payment",
        };
    }
};

const normalizeAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action[0] ?? "" : action;
};

const getErrorDetail = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

const INDIAN_RESTAURANT_GST_RATE = 0.05;
const round2 = (value: number): number => Math.round(value * 100) / 100;

type OrderItemInput = {
    dishId: string;
    quantity: number;
    name: string;
    price: number;
};

const computeCartTotals = (items: OrderItemInput[], currency: string) => {
    const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    if (currency.toUpperCase() !== "INR") {
        return { subtotal, gstAmount: 0, total: subtotal };
    }
    const gstAmount = round2(
        items.reduce(
            (sum, item) => sum + round2(item.price * item.quantity * INDIAN_RESTAURANT_GST_RATE),
            0,
        ),
    );
    return { subtotal, gstAmount, total: round2(subtotal + gstAmount) };
};

const enrichItemsWithGst = (items: OrderItemInput[], currency: string) => {
    const applyGst = currency.toUpperCase() === "INR";
    return items.map((item) => {
        const lineSubtotal = round2(item.price * item.quantity);
        const gstAmount = applyGst ? round2(lineSubtotal * INDIAN_RESTAURANT_GST_RATE) : 0;
        return {
            ...item,
            ...(applyGst
                ? {
                      gstRate: INDIAN_RESTAURANT_GST_RATE,
                      gstAmount,
                      lineTotal: round2(lineSubtotal + gstAmount),
                  }
                : { lineTotal: lineSubtotal }),
        };
    });
};

// ── confirm-order ─────────────────────────────────────────────────────────────

const handleConfirmOrder = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, items, timeToOrder, currency = "INR",
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        items?: OrderItemInput[];
        timeToOrder?: number;
        currency?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const { subtotal, gstAmount, total } = computeCartTotals(items, currency);
    const itemsWithGst = enrichItemsWithGst(items, currency);
    const admin = requireSupabaseAdmin();
    const { data: order, error: insertError } = await admin
        .from("orders")
        .insert({
            restaurant_id: restaurantId,
            items: itemsWithGst as unknown as Json,
            subtotal_amount: subtotal,
            gst_amount: gstAmount,
            total_amount: total,
            time_to_order: timeToOrder ?? 0,
            status: "pending",
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
        })
        .select("id")
        .single();

    if (insertError || !order) {
        console.error("[confirm-order] insert failed", insertError?.message);
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

// ── confirm-subscription ──────────────────────────────────────────────────────
const handleConfirmSubscription = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, planId, customerName, phone, email,
        deliveryType, deliveryFeeMode, timeSlot, rotationDishIds, currency = "INR",
    } = req.body as {
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
        currency?: string;
    };

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
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const { data: plan, error: planError } = await requireSupabaseAdmin()
        .from("meal_plans")
        .select("price_monthly, delivery_fee")
        .eq("id", planId)
        .eq("restaurant_id", restaurantId)
        .single();

    if (planError || !plan) {
        return res.status(404).json({ error: "Plan not found" });
    }

    const includeDelivery = deliveryType === "delivery" && deliveryFeeMode === "upfront";
    const monthlySubtotal = round2(
        Number(plan.price_monthly) + (includeDelivery ? Number(plan.delivery_fee) * 30 : 0),
    );
    const { subtotal, gstAmount } = computeCartTotals(
        [{ price: monthlySubtotal, quantity: 1 }],
        currency,
    );

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
            subtotal_amount: subtotal,
            gst_amount: gstAmount,
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error("[confirm-subscription] insert failed", error?.message);
        return res.status(500).json({ error: "Payment verified but failed to create subscription" });
    }

    return res.status(200).json({ success: true, subscriptionId: data.id });
};

// ── confirm-plus ──────────────────────────────────────────────────────────────
type PlusPlanId = "annual" | "monthly";
const PLAN_PERIOD_DAYS: Record<PlusPlanId, number> = { annual: 365, monthly: 30 };

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
        console.error("[confirm-plus] upsert failed", error.message);
        return res.status(500).json({ error: "Payment verified but failed to upgrade tier" });
    }

    return res.status(200).json({ success: true });
};

// ── verify ────────────────────────────────────────────────────────────────────
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
        return res.status(outcome.status).json({ verified: false, error: outcome.error });
    }
    return res.status(200).json({ verified: true });
};

// ── Router ────────────────────────────────────────────────────────────────────
const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
    "confirm-order": handleConfirmOrder,
    "confirm-subscription": handleConfirmSubscription,
    "confirm-plus": handleConfirmPlus,
    verify: handleVerify,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const action = normalizeAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        return res.status(404).json({ error: `Unknown action: ${action || "(none)"}` });
    }

    try {
        await routeHandler(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error(`[confirm-payment/${action}] unhandled`, message);
        if (!res.writableEnded) {
            res.status(500).json({ error: `confirm-payment/${action} failed`, detail: message });
        }
    }
}
