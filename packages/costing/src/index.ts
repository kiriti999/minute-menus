/**
 * Menu item costing & pricing.
 *
 * Pricing model (per an experienced chef): the selling price should be a
 * 300%–400% markup ON TOP of the ingredient cost per plate — i.e. price =
 * cost × 4 to cost × 5. That markup is what absorbs overhead (rent, wages,
 * utilities, packing) and profit. Overhead figures are tracked separately
 * for the owner's reference and to sanity-check that the suggested price
 * comfortably clears the true cost per plate.
 *
 * All money values are in the restaurant's own currency (no conversion).
 * GST is NOT part of costing — it is added transparently at checkout.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Default chef markup band applied on top of ingredient cost. */
export const DEFAULT_MIN_MARKUP_PERCENT = 300;
export const DEFAULT_MAX_MARKUP_PERCENT = 400;

// ── Ingredient unit cost ─────────────────────────────────────────────────────

export type PurchaseUnit = "kg" | "g" | "l" | "ml" | "piece";

/** Normalises a purchased quantity to base units (grams for mass/volume, count for pieces). */
export const toBaseUnits = (quantity: number, unit: PurchaseUnit): number => {
    switch (unit) {
        case "kg":
        case "l":
            return quantity * 1000;
        case "g":
        case "ml":
        case "piece":
            return quantity;
    }
};

/**
 * Cost per base unit (per gram / per ml / per piece) from an invoice line.
 * e.g. ₹280 for 1 kg chicken → 280 / 1000 = ₹0.28 per gram.
 */
export const unitCostFromPurchase = (
    purchaseAmount: number,
    purchaseQuantity: number,
    unit: PurchaseUnit,
): number => {
    const base = toBaseUnits(purchaseQuantity, unit);
    if (base <= 0) return 0;
    return purchaseAmount / base;
};

// ── Dish (recipe) cost ───────────────────────────────────────────────────────

export type RecipeLine = {
    /** Cost per base unit of the ingredient (per gram / ml / piece). */
    unitCost: number;
    /** Quantity used per plate, in the ingredient's base unit (grams by default). */
    quantity: number;
};

/** Total ingredient cost to make one plate. */
export const dishIngredientCost = (lines: RecipeLine[]): number =>
    round2(lines.reduce((sum, l) => sum + l.unitCost * l.quantity, 0));

// ── Overhead (informational) ─────────────────────────────────────────────────

export type MonthlyOverhead = {
    rent?: number;
    wages?: number;
    electricity?: number;
    gas?: number;
    internet?: number;
    packing?: number;
    other?: number;
};

export const totalMonthlyOverhead = (o: MonthlyOverhead): number =>
    round2(
        (o.rent ?? 0) +
            (o.wages ?? 0) +
            (o.electricity ?? 0) +
            (o.gas ?? 0) +
            (o.internet ?? 0) +
            (o.packing ?? 0) +
            (o.other ?? 0),
    );

/** Overhead absorbed per plate, if the owner has an expected monthly order volume. */
export const overheadPerPlate = (
    overhead: MonthlyOverhead,
    expectedOrders?: number | null,
): number | null => {
    if (!expectedOrders || expectedOrders <= 0) return null;
    return round2(totalMonthlyOverhead(overhead) / expectedOrders);
};

// ── Suggested price ──────────────────────────────────────────────────────────

export type SuggestedPrice = {
    /** Ingredient cost per plate. */
    ingredientCost: number;
    /** Overhead share per plate (null when order volume is unknown). */
    overheadPerPlate: number | null;
    /** Ingredient cost + overhead share — the true break-even per plate. */
    trueCostPerPlate: number;
    /** Lower bound of the suggested price band (cost × (1 + minMarkup)). */
    minPrice: number;
    /** Upper bound of the suggested price band (cost × (1 + maxMarkup)). */
    maxPrice: number;
    minMarkupPercent: number;
    maxMarkupPercent: number;
};

export const suggestPrice = (
    ingredientCost: number,
    options?: {
        overhead?: MonthlyOverhead;
        expectedOrders?: number | null;
        minMarkupPercent?: number;
        maxMarkupPercent?: number;
    },
): SuggestedPrice => {
    const minMarkupPercent = options?.minMarkupPercent ?? DEFAULT_MIN_MARKUP_PERCENT;
    const maxMarkupPercent = options?.maxMarkupPercent ?? DEFAULT_MAX_MARKUP_PERCENT;
    const ohPerPlate = options?.overhead
        ? overheadPerPlate(options.overhead, options?.expectedOrders)
        : null;
    const trueCost = round2(ingredientCost + (ohPerPlate ?? 0));

    return {
        ingredientCost: round2(ingredientCost),
        overheadPerPlate: ohPerPlate,
        trueCostPerPlate: trueCost,
        minPrice: round2(ingredientCost * (1 + minMarkupPercent / 100)),
        maxPrice: round2(ingredientCost * (1 + maxMarkupPercent / 100)),
        minMarkupPercent,
        maxMarkupPercent,
    };
};

// ── Price health warnings ────────────────────────────────────────────────────

export type PriceHealth = {
    level: "ok" | "below-suggested" | "below-true-cost" | "below-ingredient-cost";
    message: string;
    /** Effective markup of the entered price over ingredient cost, as a percentage. */
    markupPercent: number | null;
};

export const evaluatePrice = (
    price: number,
    suggestion: SuggestedPrice,
): PriceHealth => {
    const { ingredientCost, trueCostPerPlate, minPrice, minMarkupPercent } = suggestion;
    const markupPercent =
        ingredientCost > 0 ? round2(((price - ingredientCost) / ingredientCost) * 100) : null;

    if (ingredientCost > 0 && price < ingredientCost) {
        return {
            level: "below-ingredient-cost",
            message: "Price is below the ingredient cost per plate — you lose money on every order.",
            markupPercent,
        };
    }
    if (price < trueCostPerPlate) {
        return {
            level: "below-true-cost",
            message: "Price does not cover ingredient cost plus overhead share.",
            markupPercent,
        };
    }
    if (price < minPrice) {
        return {
            level: "below-suggested",
            message: `Below the chef-recommended ${minMarkupPercent}% markup — margin may be thin.`,
            markupPercent,
        };
    }
    return { level: "ok", message: "Healthy margin.", markupPercent };
};
