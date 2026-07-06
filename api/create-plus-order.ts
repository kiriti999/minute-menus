/**
 * POST /api/create-plus-order
 * Creates a Razorpay order for an owner's Plus tier upgrade.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getErrorDetail, runPostHandler } from "./_lib/api-helpers";
import { createLogger } from "./_lib/logger";
import { createRazorpayOrder } from "./_lib/payments";

const log = createLogger("create-plus-order");

type PlusPlanId = "annual" | "monthly";

const PLUS_PLAN_PRICING: Record<PlusPlanId, { amount: number; label: string }> = {
    annual: { amount: 120, label: "Plus — Annual Plan" },
    monthly: { amount: 12, label: "Plus — Monthly Plan" },
};

const handleCreatePlusOrder = async (req: VercelRequest, res: VercelResponse) => {
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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    await runPostHandler(req, res, handleCreatePlusOrder, "create-plus-order");
}
