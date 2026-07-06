/**
 * POST /api/create-razorpay-order
 * Creates a Razorpay order for cart checkout or meal-plan subscription (when planId is set).
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runPostHandler } from "../lib/api/runPostHandler";
import { handleCreateOrderRazorpay } from "../lib/api-handlers/payments/create-order-razorpay";
import { handleCreateSubscriptionRazorpayOrder } from "../lib/api-handlers/payments/create-subscription-razorpay-order";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const body = req.body as { planId?: string };
    const routeHandler = body?.planId
        ? handleCreateSubscriptionRazorpayOrder
        : handleCreateOrderRazorpay;
    await runPostHandler(req, res, routeHandler, "create-razorpay-order");
}
