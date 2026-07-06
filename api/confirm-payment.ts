/**
 * POST /api/confirm-payment?action=confirm-order|confirm-subscription|confirm-plus|verify
 * Confirms a Razorpay payment or verifies a signature server-side.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPostHandler } from "../lib/api/runPostHandler";
import { normalizePaymentAction } from "../lib/api/paymentRouteRewrites";
import { handleConfirmOrder } from "../lib/api-handlers/payments/confirm-order";
import { handleConfirmPlusPayment } from "../lib/api-handlers/payments/confirm-plus-payment";
import { handleConfirmSubscription } from "../lib/api-handlers/payments/confirm-subscription";
import { handleVerifyRazorpayPayment } from "../lib/api-handlers/payments/verify-razorpay-payment";

const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
    "confirm-order": handleConfirmOrder,
    "confirm-subscription": handleConfirmSubscription,
    "confirm-plus": handleConfirmPlusPayment,
    verify: handleVerifyRazorpayPayment,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = normalizePaymentAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        if (!req.method || req.method === "OPTIONS") return;
        return res.status(404).json({ error: `Unknown confirm action: ${action || "(none)"}` });
    }
    await runPostHandler(req, res, routeHandler, `confirm-payment/${action}`);
}
