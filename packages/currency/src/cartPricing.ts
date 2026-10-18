import { getEffectivePrice, resolveDiscountPercent } from "./index.js";

/** What the browser sends for each cart line — prices are never trusted. */
export type CartLineInput = {
    /** Dish id, or the cart key `dishId__variantId` used by the customer app. */
    dishId?: unknown;
    variantId?: unknown;
    quantity?: unknown;
};

export type PricingDishRow = {
    id: string;
    name: string;
    price: number | string;
    variants: unknown;
    discount_percent: number | null;
    category_id: string;
    is_active: boolean;
    manual_sold_out: boolean | null;
    /** Daily stock limit; null = unlimited. */
    stock_quantity?: number | null;
};

export type PricingCategoryRow = {
    id: string;
    discount_percent: number | null;
};

export type PricedCartLine = {
    dishId: string;
    variantId?: string;
    variantName?: string;
    name: string;
    price: number;
    quantity: number;
};

const MAX_LINE_QUANTITY = 99;

/** Splits the customer app's `dishId__variantId` cart key into its parts. */
export const parseCartLineIds = (line: CartLineInput): { dishId: string; variantId?: string } => {
    const [dishId, keyVariantId] = String(line.dishId ?? "").split("__");
    const variantId = typeof line.variantId === "string" && line.variantId ? line.variantId : keyVariantId;
    return { dishId, variantId: variantId || undefined };
};

const parseQuantity = (value: unknown): number => {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
        throw new Error("Invalid item quantity");
    }
    return quantity;
};

const findVariant = (dish: PricingDishRow, variantId: string) => {
    const variants = Array.isArray(dish.variants)
        ? (dish.variants as Array<{ id?: string; name?: string; price?: number }>)
        : [];
    const variant = variants.find((v) => v.id === variantId);
    if (!variant || typeof variant.price !== "number") throw new Error(`"${dish.name}" size is no longer available`);
    return { name: variant.name ?? "", price: variant.price };
};

const priceLine = (
    line: CartLineInput,
    dishes: Map<string, PricingDishRow>,
    categoryDiscounts: Map<string, number>,
): PricedCartLine => {
    const { dishId, variantId } = parseCartLineIds(line);
    const dish = dishes.get(dishId);
    if (!dish || !dish.is_active) throw new Error("An item in your cart is no longer on the menu");
    if (dish.manual_sold_out) throw new Error(`"${dish.name}" is sold out`);

    const variant = variantId ? findVariant(dish, variantId) : undefined;
    const discount = resolveDiscountPercent(
        dish.discount_percent ?? undefined,
        categoryDiscounts.get(dish.category_id),
    );
    return {
        dishId,
        variantId: variant ? variantId : undefined,
        variantName: variant?.name,
        name: dish.name,
        price: getEffectivePrice(variant?.price ?? Number(dish.price), discount).final,
        quantity: parseQuantity(line.quantity),
    };
};

/** Daily stock is per dish, so every size of a dish counts against one limit. */
const assertWithinStock = (
    items: PricedCartLine[],
    dishes: Map<string, PricingDishRow>,
    soldToday: Map<string, number>,
): void => {
    const ordered = new Map<string, number>();
    items.forEach((item) => ordered.set(item.dishId, (ordered.get(item.dishId) ?? 0) + item.quantity));
    ordered.forEach((quantity, dishId) => {
        const dish = dishes.get(dishId);
        if (dish?.stock_quantity == null) return;
        const left = Math.max(0, dish.stock_quantity - (soldToday.get(dishId) ?? 0));
        if (quantity > left) {
            throw new Error(left === 0 ? `"${dish.name}" is sold out` : `Only ${left} "${dish.name}" left today`);
        }
    });
};

/**
 * Prices a cart from the restaurant's own menu rows (dish or variant price,
 * dish discount over category discount). Throws a customer-safe message when
 * an item is missing, hidden, sold out, over today's stock or has an invalid quantity.
 */
export const priceCartLines = (
    lines: CartLineInput[],
    dishRows: PricingDishRow[],
    categoryRows: PricingCategoryRow[],
    soldToday: Map<string, number> = new Map(),
): PricedCartLine[] => {
    const dishes = new Map(dishRows.map((dish) => [dish.id, dish]));
    const categoryDiscounts = new Map(
        categoryRows.map((category) => [category.id, category.discount_percent ?? 0]),
    );
    const items = lines.map((line) => priceLine(line, dishes, categoryDiscounts));
    assertWithinStock(items, dishes, soldToday);
    return items;
};
