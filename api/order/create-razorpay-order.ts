/**
 * Vercel Serverless Function: POST /api/order/create-razorpay-order
 *
 * Creates a Razorpay order for a regular cart checkout.
 *
 * Body: { amount: number, currency: string, restaurantId: string, customerName: string }
 * Response: { orderId, amount, currency, keyId }
 *
 * Required env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { amount, currency = "INR", restaurantId, customerName } = req.body as {
        amount?: number;
        currency?: string;
        restaurantId?: string;
        customerName?: string;
    };

    if (!amount || amount <= 0 || !restaurantId || !customerName) {
        return res.status(400).json({ error: "amount, restaurantId and customerName are required" });
    }

    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: "Razorpay not configured" });
    }

    // Razorpay expects amount in smallest currency unit (paise for INR, cents for USD, etc.)
    const amountSmallest = Math.round(amount * 100);

    const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

    try {
        const order = await razorpay.orders.create({
            amount: amountSmallest,
            currency: currency.toUpperCase(),
            receipt: `order_${restaurantId.slice(0, 8)}_${Date.now()}`,
            notes: { restaurantId, customerName },
        });
        return res.status(200).json({
            orderId: order.id,
            amount: amountSmallest,
            currency: currency.toUpperCase(),
            keyId: RAZORPAY_KEY_ID,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("order/create-razorpay-order:", msg);
        return res.status(502).json({ error: "Failed to create payment order", detail: msg });
    }
}
