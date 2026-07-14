import type { Dish } from "@minute-menus/types";

export const dishIngredientLine = (dish: Dish): string =>
    dish.ingredients?.trim() || dish.description?.trim() || "";

export const dishBenefitLine = (dish: Dish): string => dish.benefits?.trim() || "";

export const dishCalorieLabel = (dish: Dish): string | null =>
    dish.calories != null && dish.calories > 0 ? `${dish.calories} kcal` : null;

export const isDishSoldOut = (
    dish: Dish,
    soldCounts: Record<string, number>,
): boolean =>
    dish.manualSoldOut === true ||
    (dish.stockQuantity != null && (soldCounts[dish.id] ?? 0) >= dish.stockQuantity);
