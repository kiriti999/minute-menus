import { getErrorDetail } from "../../server/api-helpers";
import { createLogger } from "../../server/logger";
import { createRazorpayOrder } from "../../server/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const log = createLogger("payments/create-order-razorpay");

export const handleCreateOrderRazorpay = async (req: VercelRequest, res: VercelResponse) => {
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
};
