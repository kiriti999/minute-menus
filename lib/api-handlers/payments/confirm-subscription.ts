import { createLogger } from "../../server/logger";
import { safeVerifyRazorpaySignature } from "../../server/payments";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../../supabase-admin";

const log = createLogger("payments/confirm-subscription");

type Body = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    restaurantId?: string;
    planId?: string;
    customerName?: string;
    phone?: string;
    email?: string;
    deliveryType?: "delivery" | "pickup";
    deliveryFeeMode?: "upfront" | "cash_on_delivery";
    timeSlot?: "08-09" | "12-14" | "19-21";
    rotationDishIds?: string[];
};

export const handleConfirmSubscription = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, planId, customerName, phone, email,
        deliveryType, deliveryFeeMode, timeSlot, rotationDishIds,
    } = req.body as Body;

    if (
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        !restaurantId || !planId || !customerName || !phone || !deliveryType || !deliveryFeeMode || !timeSlot
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) log.warn("subscription payment signature mismatch", { orderId: razorpay_order_id });
        else log.error("verify payment failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endDate = end.toISOString().slice(0, 10);

    const { data, error } = await supabaseAdmin
        .from("customer_subscriptions")
        .insert({
            restaurant_id: restaurantId,
            plan_id: planId,
            customer_name: customerName,
            phone,
            email: email ?? null,
            delivery_type: deliveryType,
            delivery_fee_mode: deliveryFeeMode,
            time_slot: timeSlot,
            start_date: startDate,
            end_date: endDate,
            rotation_dish_ids: rotationDishIds ?? [],
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
        })
        .select("id")
        .single();

    if (error || !data) {
        log.error("failed to create subscription after verified payment", { message: error?.message });
        return res.status(500).json({ error: "Payment verified but failed to create subscription" });
    }

    return res.status(200).json({ success: true, subscriptionId: data.id });
};
