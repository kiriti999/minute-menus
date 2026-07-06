/**
 * POST /api/create-razorpay-order
 * Creates a Razorpay order for cart checkout or meal-plan subscription.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

// ── Supabase admin (inline — no lib imports) ─────────────────────────────────
let adminClient: SupabaseClient | null = null;

const requireSupabaseAdmin = (): SupabaseClient => {
    if (adminClient) return adminClient;
    const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) throw new Error("Server is not configured (missing Supabase env vars)");
    adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return adminClient;
};

// ── Razorpay helpers (inline) ───────────────────────────────────────────────
const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
};

const createRazorpayOrder = async (input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
}) => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");

    const amountSmallest = Math.round(input.amount * 100);
    const currency = input.currency.toUpperCase();
    const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    const order = await razorpay.orders.create({
        amount: amountSmallest,
        currency,
        receipt: input.receipt,
        notes: input.notes,
    });

    return { orderId: order.id, amount: amountSmallest, currency, keyId: creds.keyId };
};

const INDIAN_RESTAURANT_GST_RATE = 0.05;
const round2 = (value: number): number => Math.round(value * 100) / 100;

const calculateSubscriptionSubtotal = (
    priceMonthly: number,
    deliveryFee: number,
    includeDelivery: boolean,
): number => round2(Number(priceMonthly) + (includeDelivery ? Number(deliveryFee) * 30 : 0));

type CartLine = { price: number; quantity: number };

const computeCartTotals = (items: CartLine[], currency: string) => {
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

const getErrorDetail = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

// ── Handlers ────────────────────────────────────────────────────────────────
const handleCartOrder = async (req: VercelRequest, res: VercelResponse) => {
    const { items, currency = "INR", restaurantId, customerName } = req.body as {
        items?: CartLine[];
        currency?: string;
        restaurantId?: string;
        customerName?: string;
    };

    if (!items?.length || !restaurantId || !customerName) {
        return res.status(400).json({ error: "items, restaurantId and customerName are required" });
    }

    const { subtotal, gstAmount, total } = computeCartTotals(items, currency);
    if (total <= 0) {
        return res.status(400).json({ error: "Order total must be greater than zero" });
    }

    try {
        const result = await createRazorpayOrder({
            amount: total,
            currency,
            receipt: `order_${restaurantId.slice(0, 8)}_${Date.now()}`,
            notes: {
                restaurantId,
                customerName,
                subtotal: String(subtotal),
                gstAmount: String(gstAmount),
            },
        });
        return res.status(200).json({ ...result, subtotal, gstAmount, total });
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-razorpay-order] cart failed", msg);
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

const handleSubscriptionOrder = async (req: VercelRequest, res: VercelResponse) => {
    const { planId, restaurantId, deliveryFeeMode, deliveryType, currency = "INR" } = req.body as {
        planId?: string;
        restaurantId?: string;
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        deliveryType?: "delivery" | "pickup";
        currency?: string;
    };

    if (!planId || !restaurantId || !deliveryType || !deliveryFeeMode) {
        return res.status(400).json({ error: "planId, restaurantId, deliveryType and deliveryFeeMode are required" });
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
    const monthlySubtotal = calculateSubscriptionSubtotal(
        Number(plan.price_monthly),
        Number(plan.delivery_fee),
        includeDelivery,
    );
    const { subtotal, gstAmount, total } = computeCartTotals(
        [{ price: monthlySubtotal, quantity: 1 }],
        currency,
    );

    try {
        const result = await createRazorpayOrder({
            amount: total,
            currency,
            receipt: `sub_${planId.slice(0, 8)}_${Date.now()}`,
            notes: {
                planId,
                restaurantId,
                planName: plan.name,
                subtotal: String(subtotal),
                gstAmount: String(gstAmount),
            },
        });
        return res.status(200).json({ ...result, subtotal, gstAmount, total });
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-razorpay-order] subscription failed", msg);
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const body = req.body as { planId?: string };
        if (body?.planId) await handleSubscriptionOrder(req, res);
        else await handleCartOrder(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error("[create-razorpay-order] unhandled", message);
        if (!res.writableEnded) {
            res.status(500).json({ error: "create-razorpay-order failed", detail: message });
        }
    }
};
