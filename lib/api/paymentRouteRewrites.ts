/**
 * Canonical payment API paths. All payment operations go through the single
 * static function route /api/payments, selected via the `action` query param.
 *
 * We avoid catch-all route files (`[...action].ts`) because those are a Next.js
 * feature and do not route nested paths in a plain Vite + Vercel Functions app.
 */
export const PAYMENT_API_PATHS = {
    createOrder: "/api/payments?action=create-order",
    confirmOrder: "/api/payments?action=confirm-order",
    verifyPayment: "/api/payments?action=verify-payment",
    createSubscriptionOrder: "/api/payments?action=create-subscription-order",
    confirmSubscription: "/api/payments?action=confirm-subscription",
    createPlusOrder: "/api/payments?action=create-plus-order",
    confirmPlusPayment: "/api/payments?action=confirm-plus-payment",
} as const;

export const normalizePaymentAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action[0] ?? "" : action;
};
