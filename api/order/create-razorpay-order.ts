/**
 * Vercel Serverless Function: POST /api/order/create-razorpay-order
 */

import { getErrorDetail, rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import { createRazorpayOrder } from "@minute-menus/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const log = createLogger("order/create-razorpay-order");

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

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
        log.error("create payment order failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
}
