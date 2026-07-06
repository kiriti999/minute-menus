/**
 * Vercel Serverless Function: POST /api/subscription/create-plus-order
 *
 * Creates a Razorpay order for an owner's Plus tier upgrade. Pricing is
 * looked up server-side by plan id — the client only chooses which plan,
 * never the amount.
 */

import { getErrorDetail, rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import { createRazorpayOrder } from "@minute-menus/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const log = createLogger("subscription/create-plus-order");

export type PlusPlanId = "annual" | "monthly";

export const PLUS_PLAN_PRICING: Record<PlusPlanId, { amount: number; label: string }> = {
    annual: { amount: 120, label: "Plus — Annual Plan" },
    monthly: { amount: 12, label: "Plus — Monthly Plan" },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

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
        log.error("create plus order failed", { message: msg });
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
}
