/**
 * Consolidated Razorpay payment API (Vercel Hobby plan: max 12 serverless functions).
 *
 * This is a single static function route. The specific operation is selected via
 * the `action` query param (e.g. POST /api/payments?action=create-order).
 *
 * NOTE: We deliberately do NOT use a catch-all route file (`[...action].ts` /
 * `[[...action]].ts`) — those only work in Next.js, not in a plain Vite + Vercel
 * Functions project, where nested paths silently fall through to the SPA (405).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { rejectUnlessPost } from "../lib/server/api-helpers";
import { normalizePaymentAction } from "../lib/api/paymentRouteRewrites";
import { handleConfirmOrder } from "../lib/api-handlers/payments/confirm-order";
import { handleConfirmPlusPayment } from "../lib/api-handlers/payments/confirm-plus-payment";
import { handleConfirmSubscription } from "../lib/api-handlers/payments/confirm-subscription";
import { handleCreateOrderRazorpay } from "../lib/api-handlers/payments/create-order-razorpay";
import { handleCreatePlusOrder } from "../lib/api-handlers/payments/create-plus-order";
import { handleCreateSubscriptionRazorpayOrder } from "../lib/api-handlers/payments/create-subscription-razorpay-order";
import { handleVerifyRazorpayPayment } from "../lib/api-handlers/payments/verify-razorpay-payment";

type PaymentHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

const ROUTES: Record<string, PaymentHandler> = {
    "create-order": handleCreateOrderRazorpay,
    "confirm-order": handleConfirmOrder,
    "verify-payment": handleVerifyRazorpayPayment,
    "create-subscription-order": handleCreateSubscriptionRazorpayOrder,
    "confirm-subscription": handleConfirmSubscription,
    "create-plus-order": handleCreatePlusOrder,
    "confirm-plus-payment": handleConfirmPlusPayment,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    const action = normalizePaymentAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        return res.status(404).json({ error: `Unknown payment action: ${action || "(none)"}` });
    }

    await routeHandler(req, res);
}
