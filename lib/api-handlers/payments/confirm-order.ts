import { createLogger } from "../../server/logger";
import { safeVerifyRazorpaySignature } from "../../server/payments";
import type { Json } from "../../server/database.types";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSupabaseAdmin } from "../../supabase-admin";

const log = createLogger("payments/confirm-order");

type OrderItemInput = { dishId: string; quantity: number; name: string; price: number };

type Body = {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    restaurantId?: string;
    items?: OrderItemInput[];
    timeToOrder?: number;
};

export const handleConfirmOrder = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature, restaurantId, items, timeToOrder,
    } = req.body as Body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        if (outcome.status === 400) log.warn("order payment signature mismatch", { orderId: razorpay_order_id });
        else log.error("verify payment failed", { message: outcome.error });
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const admin = requireSupabaseAdmin();
    const { data: order, error: insertError } = await admin
        .from("orders")
        .insert({
            restaurant_id: restaurantId,
            items: items as unknown as Json,
            total_amount: totalAmount,
            time_to_order: timeToOrder ?? 0,
            status: "pending",
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
        })
        .select("id")
        .single();

    if (insertError || !order) {
        log.error("failed to record order after verified payment", { message: insertError?.message });
        return res.status(500).json({ error: "Payment verified but failed to record order" });
    }

    const today = new Date().toISOString().slice(0, 10);
    await Promise.allSettled(
        items.map((item) =>
            admin.rpc("increment_dish_stock", {
                p_dish_id: item.dishId,
                p_restaurant_id: restaurantId,
                p_sold_date: today,
                p_quantity: item.quantity,
            }),
        ),
    );

    return res.status(200).json({ success: true, orderId: order.id });
};
