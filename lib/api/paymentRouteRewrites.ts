/** Canonical payment API paths. Vercel Hobby: max 12 serverless functions (one api/**/*.ts file each). */
export const PAYMENT_API_PATHS = {
    createOrder: "/api/create-razorpay-order",
    createSubscriptionOrder: "/api/create-razorpay-order",
    confirmOrder: "/api/confirm-payment?action=confirm-order",
    confirmSubscription: "/api/confirm-payment?action=confirm-subscription",
    createPlusOrder: "/api/create-plus-order",
    confirmPlusPayment: "/api/confirm-payment?action=confirm-plus",
    verifyPayment: "/api/confirm-payment?action=verify",
} as const;

export const normalizePaymentAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action[0] ?? "" : action;
};
