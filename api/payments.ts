/**
 * Consolidated Razorpay payment API (Vercel Hobby plan: max 12 serverless functions).
 *
 * Single static function route — operation selected via ?action= query param.
 * Handlers are loaded dynamically so create-order does not pull in Supabase at import time.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getErrorDetail, rejectUnlessPost } from "../lib/server/api-helpers";
import { normalizePaymentAction } from "../lib/api/paymentRouteRewrites";

type PaymentHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

const loadHandler = async (action: string): Promise<PaymentHandler | null> => {
    switch (action) {
        case "create-order":
            return (await import("../lib/api-handlers/payments/create-order-razorpay")).handleCreateOrderRazorpay;
        case "confirm-order":
            return (await import("../lib/api-handlers/payments/confirm-order")).handleConfirmOrder;
        case "verify-payment":
            return (await import("../lib/api-handlers/payments/verify-razorpay-payment")).handleVerifyRazorpayPayment;
        case "create-subscription-order":
            return (await import("../lib/api-handlers/payments/create-subscription-razorpay-order")).handleCreateSubscriptionRazorpayOrder;
        case "confirm-subscription":
            return (await import("../lib/api-handlers/payments/confirm-subscription")).handleConfirmSubscription;
        case "create-plus-order":
            return (await import("../lib/api-handlers/payments/create-plus-order")).handleCreatePlusOrder;
        case "confirm-plus-payment":
            return (await import("../lib/api-handlers/payments/confirm-plus-payment")).handleConfirmPlusPayment;
        default:
            return null;
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (rejectUnlessPost(req, res)) return;

        const action = normalizePaymentAction(req.query.action as string | string[] | undefined);
        const routeHandler = await loadHandler(action);
        if (!routeHandler) {
            return res.status(404).json({ error: `Unknown payment action: ${action || "(none)"}` });
        }

        await routeHandler(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error("[payments] unhandled error", message);
        return res.status(500).json({ error: "Payment handler failed", detail: message });
    }
}
