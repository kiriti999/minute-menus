/** Server-only Razorpay helpers (in api/_lib for Vercel bundling). */

import crypto from "node:crypto";
import Razorpay from "razorpay";

export type RazorpayOrderInput = {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
};

export type RazorpayOrderResult = {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
};

export const toSmallestCurrencyUnit = (amount: number): number => Math.round(amount * 100);

export const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
};

export const createRazorpayClient = (): Razorpay => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");
    return new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
};

export const createRazorpayOrder = async (
    input: RazorpayOrderInput,
): Promise<RazorpayOrderResult> => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");

    const amountSmallest = toSmallestCurrencyUnit(input.amount);
    const currency = input.currency.toUpperCase();
    const razorpay = createRazorpayClient();
    const order = await razorpay.orders.create({
        amount: amountSmallest,
        currency,
        receipt: input.receipt,
        notes: input.notes,
    });

    return {
        orderId: order.id,
        amount: amountSmallest,
        currency,
        keyId: creds.keyId,
    };
};

export type RazorpayVerificationInput = {
    orderId: string;
    paymentId: string;
    signature: string;
};

export const verifyRazorpaySignature = (input: RazorpayVerificationInput): boolean => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");

    const expected = crypto
        .createHmac("sha256", creds.keySecret)
        .update(`${input.orderId}|${input.paymentId}`)
        .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const actualBuf = Buffer.from(input.signature, "utf8");
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

export type RazorpayVerificationOutcome = {
    verified: boolean;
    status: 200 | 400 | 500 | 502;
    error: string;
};

export const safeVerifyRazorpaySignature = (
    input: RazorpayVerificationInput,
): RazorpayVerificationOutcome => {
    try {
        if (!verifyRazorpaySignature(input)) {
            return { verified: false, status: 400, error: "Payment signature mismatch" };
        }
        return { verified: true, status: 200, error: "" };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
            verified: false,
            status: message === "Razorpay not configured" ? 500 : 502,
            error: "Failed to verify payment",
        };
    }
};

export const calculateSubscriptionTotal = (
    priceMonthly: number,
    deliveryFee: number,
    includeDelivery: boolean,
): number =>
    Number(priceMonthly) + (includeDelivery ? Number(deliveryFee) * 30 : 0);
