/** Canonical payment API paths (single Vercel serverless function at /api/payments/*). */
export const PAYMENT_API_PATHS = {
    createOrder: "/api/payments/order/create-razorpay-order",
    confirmOrder: "/api/payments/order/confirm-order",
    verifyPayment: "/api/payments/verify-razorpay-payment",
    createSubscriptionOrder: "/api/payments/subscription/create-razorpay-order",
    confirmSubscription: "/api/payments/subscription/confirm-subscription",
    createPlusOrder: "/api/payments/subscription/create-plus-order",
    confirmPlusPayment: "/api/payments/subscription/confirm-plus-payment",
} as const;

/** Legacy paths kept for local dev rewrite lookup only. */
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

export const paymentActionFromPath = (pathname: string): string | null => {
    const legacy = PAYMENT_API_REWRITES[pathname];
    if (legacy) return legacy;
    if (pathname.startsWith("/api/payments/")) {
        const action = pathname.slice("/api/payments/".length);
        return action || null;
    }
    return null;
};

export const normalizePaymentAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action.join("/") : action;
};
