/**
 * Indian GST for restaurant / cloud-kitchen food orders (INR only).
 * Standalone restaurants and takeaway typically charge 5% GST on food supply.
 * Menu prices are treated as exclusive of GST; GST is added at checkout per line.
 */

/** Combined GST rate (2.5% CGST + 2.5% SGST) for restaurant food services. */
export const INDIAN_RESTAURANT_GST_RATE = 0.05;

export const INDIAN_RESTAURANT_GST_PERCENT = 5;

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const isIndianGstApplicable = (currencyCode: string): boolean =>
    currencyCode.toUpperCase() === "INR";

export type GstLineInput = { price: number; quantity: number };

export type OrderTaxBreakdown = {
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    total: number;
};

export const calculateOrderTax = (
    lines: GstLineInput[],
    currencyCode: string,
): OrderTaxBreakdown => {
    const subtotal = round2(lines.reduce((sum, line) => sum + line.price * line.quantity, 0));
    if (!isIndianGstApplicable(currencyCode)) {
        return { subtotal, gstRate: 0, gstAmount: 0, total: subtotal };
    }

    const gstAmount = round2(
        lines.reduce(
            (sum, line) => sum + round2(line.price * line.quantity * INDIAN_RESTAURANT_GST_RATE),
            0,
        ),
    );

    return {
        subtotal,
        gstRate: INDIAN_RESTAURANT_GST_RATE,
        gstAmount,
        total: round2(subtotal + gstAmount),
    };
};

/** Applies GST to a single pre-tax amount (e.g. meal-plan monthly total). */
export const applyGstToSubtotal = (subtotal: number, currencyCode: string): OrderTaxBreakdown => {
    const roundedSubtotal = round2(subtotal);
    if (!isIndianGstApplicable(currencyCode)) {
        return { subtotal: roundedSubtotal, gstRate: 0, gstAmount: 0, total: roundedSubtotal };
    }

    const gstAmount = round2(roundedSubtotal * INDIAN_RESTAURANT_GST_RATE);
    return {
        subtotal: roundedSubtotal,
        gstRate: INDIAN_RESTAURANT_GST_RATE,
        gstAmount,
        total: round2(roundedSubtotal + gstAmount),
    };
};

export const calculateMealPlanSubtotal = (
    priceMonthly: number,
    deliveryFee: number,
    deliveryType: "delivery" | "pickup",
    deliveryFeeMode: "upfront" | "cash_on_delivery",
): number => {
    const includeDelivery = deliveryType === "delivery" && deliveryFeeMode === "upfront";
    return round2(Number(priceMonthly) + (includeDelivery ? Number(deliveryFee) * 30 : 0));
};

export const calculateMealPlanTax = (
    priceMonthly: number,
    deliveryFee: number,
    deliveryType: "delivery" | "pickup",
    deliveryFeeMode: "upfront" | "cash_on_delivery",
    currencyCode: string,
): OrderTaxBreakdown => {
    const subtotal = calculateMealPlanSubtotal(
        priceMonthly,
        deliveryFee,
        deliveryType,
        deliveryFeeMode,
    );
    return applyGstToSubtotal(subtotal, currencyCode);
};

export type GstOrderItem = {
    dishId: string;
    quantity: number;
    name: string;
    price: number;
    gstRate?: number;
    gstAmount?: number;
    lineTotal?: number;
};

/** Adds per-line GST fields for storage on confirmed orders. */
export const enrichOrderItemsWithGst = (
    items: Array<{ dishId: string; quantity: number; name: string; price: number }>,
    currencyCode: string,
): GstOrderItem[] => {
    const applyGst = isIndianGstApplicable(currencyCode);
    return items.map((item) => {
        const lineSubtotal = round2(item.price * item.quantity);
        const gstAmount = applyGst
            ? round2(lineSubtotal * INDIAN_RESTAURANT_GST_RATE)
            : 0;
        return {
            ...item,
            ...(applyGst
                ? {
                      gstRate: INDIAN_RESTAURANT_GST_RATE,
                      gstAmount,
                      lineTotal: round2(lineSubtotal + gstAmount),
                  }
                : { lineTotal: lineSubtotal }),
        };
    });
};
