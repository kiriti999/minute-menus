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

export const calculateSubscriptionTotal = (
    priceMonthly: number,
    deliveryFee: number,
    includeDelivery: boolean,
): number =>
    Number(priceMonthly) + (includeDelivery ? Number(deliveryFee) * 30 : 0);
