/**
 * Consolidated Razorpay payment API (Vercel Hobby plan: max 12 serverless functions).
 * Legacy paths are rewritten here via vercel.json — see lib/api/paymentRouteRewrites.ts.
 */

import { rejectUnlessPost } from "../../lib/server/api-helpers";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { normalizePaymentAction } from "../../lib/api/paymentRouteRewrites";
import { handleConfirmOrder } from "../../lib/api-handlers/payments/confirm-order";
import { handleConfirmPlusPayment } from "../../lib/api-handlers/payments/confirm-plus-payment";
import { handleConfirmSubscription } from "../../lib/api-handlers/payments/confirm-subscription";
import { handleCreateOrderRazorpay } from "../../lib/api-handlers/payments/create-order-razorpay";
import { handleCreatePlusOrder } from "../../lib/api-handlers/payments/create-plus-order";
import { handleCreateSubscriptionRazorpayOrder } from "../../lib/api-handlers/payments/create-subscription-razorpay-order";
import { handleVerifyRazorpayPayment } from "../../lib/api-handlers/payments/verify-razorpay-payment";

type PaymentHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

const ROUTES: Record<string, PaymentHandler> = {
    "order/create-razorpay-order": handleCreateOrderRazorpay,
    "order/confirm-order": handleConfirmOrder,
    "verify-razorpay-payment": handleVerifyRazorpayPayment,
    "subscription/create-razorpay-order": handleCreateSubscriptionRazorpayOrder,
    "subscription/confirm-subscription": handleConfirmSubscription,
    "subscription/create-plus-order": handleCreatePlusOrder,
    "subscription/confirm-plus-payment": handleConfirmPlusPayment,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    const action = normalizePaymentAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        return res.status(404).json({ error: "Unknown payment route" });
    }

    await routeHandler(req, res);
}
