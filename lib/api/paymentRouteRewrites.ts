/** Legacy payment API paths rewritten to the consolidated /api/payments/* handler. */
export const PAYMENT_API_REWRITES: Record<string, string> = {
    "/api/order/create-razorpay-order": "order/create-razorpay-order",
    "/api/order/confirm-order": "order/confirm-order",
    "/api/payment/verify-razorpay-payment": "verify-razorpay-payment",
    "/api/subscription/create-razorpay-order": "subscription/create-razorpay-order",
    "/api/subscription/confirm-subscription": "subscription/confirm-subscription",
    "/api/subscription/create-plus-order": "subscription/create-plus-order",
    "/api/subscription/confirm-plus-payment": "subscription/confirm-plus-payment",
};

export const PAYMENTS_CATCH_ALL_HANDLER = "./api/payments/[[...action]].ts";

export const paymentActionFromPath = (pathname: string): string | null =>
    PAYMENT_API_REWRITES[pathname] ?? null;

export const normalizePaymentAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action.join("/") : action;
};
