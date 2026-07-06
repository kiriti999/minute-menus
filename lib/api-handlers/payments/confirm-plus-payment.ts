import { createLogger } from "../../server/logger";
import { safeVerifyRazorpaySignature } from "../../server/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSupabaseAdmin } from "../../supabase-admin";

const log = createLogger("payments/confirm-plus-payment");

type PlusPlanId = "annual" | "monthly";

const PLAN_PERIOD_DAYS: Record<PlusPlanId, number> = { annual: 365, monthly: 30 };

export const handleConfirmPlusPayment = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature, restaurantId, plan,
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        plan?: PlusPlanId;
    };

    const periodDays = plan ? PLAN_PERIOD_DAYS[plan] : undefined;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !periodDays) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) log.warn("plus payment signature mismatch", { orderId: razorpay_order_id, restaurantId });
        else log.error("verify payment failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const { error } = await requireSupabaseAdmin()
        .from("subscriptions")
        .upsert(
            {
                restaurant_id: restaurantId,
                tier: "plus",
                provider: "razorpay",
                provider_subscription_id: razorpay_payment_id,
                current_period_end: periodEnd.toISOString(),
            },
            { onConflict: "restaurant_id" },
        );

    if (error) {
        log.error("failed to upgrade tier after verified payment", { message: error.message });
        return res.status(500).json({ error: "Payment verified but failed to upgrade tier" });
    }

    return res.status(200).json({ success: true });
};
