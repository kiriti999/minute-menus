/**
 * POST /api/create-plus-order
 * Creates a Razorpay order for an owner's Plus tier upgrade.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

type PlusPlanId = "annual" | "monthly";

const PLUS_PLAN_PRICING: Record<PlusPlanId, { amount: number; label: string }> = {
    annual: { amount: 120, label: "Plus — Annual Plan" },
    monthly: { amount: 12, label: "Plus — Monthly Plan" },
};

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

const getErrorDetail = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { plan, restaurantId, currency = "USD" } = req.body as {
        plan?: PlusPlanId;
        restaurantId?: string;
        currency?: string;
    };

    const pricing = plan ? PLUS_PLAN_PRICING[plan] : undefined;
    if (!pricing || !restaurantId) {
        return res.status(400).json({ error: "A valid plan and restaurantId are required" });
    }

    try {
        const result = await createRazorpayOrder({
            amount: pricing.amount,
            currency,
            receipt: `plus_${restaurantId.slice(0, 8)}_${Date.now()}`,
            notes: { restaurantId, plan, planName: pricing.label },
        });
        return res.status(200).json(result);
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-plus-order] failed", msg);
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
}
