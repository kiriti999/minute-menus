/**
 * Vercel Serverless Function: POST /api/payment/verify-razorpay-payment
 *
 * Verifies a Razorpay checkout signature server-side. Used by both the customer
 * cart order and meal-plan subscription flows before persisting anything.
 */

import { getErrorDetail, rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import { verifyRazorpaySignature } from "@minute-menus/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const log = createLogger("payment/verify-razorpay-payment");

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

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

    try {
        const verified = verifyRazorpaySignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
        });
        if (!verified) {
            log.warn("payment signature mismatch", { orderId: razorpay_order_id });
            return res.status(400).json({ verified: false, error: "Payment signature mismatch" });
        }
        return res.status(200).json({ verified: true });
    } catch (e) {
        const msg = getErrorDetail(e);
        log.error("verify payment failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ verified: false, error: "Failed to verify payment", detail: msg });
    }
}
