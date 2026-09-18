import { Check, Flame, Leaf, Plus, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { formatPriceCompactInCurrency, getEffectivePrice, resolveDiscountPercent } from "@minute-menus/currency";
import type { Dish, DishVariant } from "@minute-menus/types";
import { ExpandableText } from "./ExpandableText";
import {
    dishBenefitLine,
    dishCalorieLabel,
    dishIngredientLine,
} from "./menuCardHelpers";

interface MenuGridCardProps {
    dish: Dish;
    currency?: string;
    isSoldOut?: boolean;
    onAdd: (dish: Dish, variantId?: string) => void;
    isDarkTheme?: boolean;
    /** Units already in the cart for this dish (across all variants). */
    quantity?: number;
    /** Category-level discount percent, used if dish has no item-level discount. */
    categoryDiscountPercent?: number;
}

const NutritionRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    expandable?: boolean;
    isDarkTheme: boolean;
}> = ({ icon, label, value, expandable = false, isDarkTheme }) => (
    <div className="flex items-start gap-1.5 min-w-0">
        <span className={`shrink-0 mt-0.5 ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>{icon}</span>
        <div className="min-w-0 flex-1">
            <p className={`text-[9px] uppercase tracking-wide mb-0.5 ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
                {label}
            </p>
            {expandable ? (
                <ExpandableText
                    text={value}
                    lines={2}
                    className={`text-[11px] leading-snug break-words ${isDarkTheme ? "text-zinc-300" : "text-zinc-600"}`}
                    toggleClassName={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isDarkTheme ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                    }`}
                />
            ) : (
                <p className={`text-[11px] leading-snug ${isDarkTheme ? "text-zinc-300" : "text-zinc-600"}`}>{value}</p>
            )}
        </div>
    </div>
);

export const MenuGridCard: React.FC<MenuGridCardProps> = ({
    dish,
    currency = "USD",
    isSoldOut = false,
    onAdd,
    isDarkTheme = true,
    quantity = 0,
    categoryDiscountPercent = 0,
}) => {
    const hasVariants = dish.variants && dish.variants.length > 0;
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
        hasVariants ? dish.variants![0].id : undefined,
    );

    const ingredients = dishIngredientLine(dish);
    const benefits = dishBenefitLine(dish);
    const calories = dishCalorieLabel(dish);
    const inCart = quantity > 0;

    // Resolve active variant and base price
    const activeVariant: DishVariant | undefined = hasVariants
        ? dish.variants!.find((v) => v.id === selectedVariantId) ?? dish.variants![0]
        : undefined;
    const basePrice = activeVariant ? activeVariant.price : dish.price;

    // Resolve discount
    const discountPct = resolveDiscountPercent(dish.discountPercent, categoryDiscountPercent);
    const { original, final } = getEffectivePrice(basePrice, discountPct);
    const hasDiscount = discountPct > 0;

    const handleAdd = () => {
        if (isSoldOut) return;
        onAdd(dish, activeVariant?.id);
    };

    return (
        <article
            data-dish-id={dish.id}
            className={`group flex h-full flex-col overflow-hidden rounded-2xl border shadow-lg ${
                isDarkTheme ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
            }`}
        >
            <div className={`relative aspect-[4/3] shrink-0 overflow-hidden ${isDarkTheme ? "bg-zinc-800" : "bg-zinc-100"}`}>
                {dish.videoUrl ? (
                    <video
                        src={dish.videoUrl}
                        poster={dish.imageUrl}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                )}

                {isSoldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="border border-white/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                            Sold out
                        </span>
                    </div>
                )}

                {hasDiscount && !isSoldOut && (
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {discountPct}% OFF
                    </div>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
                {/* Name + price */}
                <div className="flex items-start justify-between gap-2">
                    <h3
                        className={`min-w-0 flex-1 text-sm font-bold leading-snug line-clamp-2 ${
                            isDarkTheme ? "text-white" : "text-zinc-900"
                        }`}
                    >
                        {dish.name}
                    </h3>
                    <div className="shrink-0 text-right">
                        {hasDiscount ? (
                            <>
                                <span className={`block text-[11px] line-through ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
                                    {formatPriceCompactInCurrency(original, currency)}
                                </span>
                                <span className="block text-sm font-bold text-emerald-400">
                                    {formatPriceCompactInCurrency(final, currency)}
                                </span>
                            </>
                        ) : (
                            <span className={`text-sm font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                                {formatPriceCompactInCurrency(final, currency)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Variant pills */}
                {hasVariants && (
                    <div className="flex flex-wrap gap-1.5">
                        {dish.variants!.map((v) => {
                            const isSelected = v.id === selectedVariantId;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setSelectedVariantId(v.id)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                                        isSelected
                                            ? isDarkTheme
                                                ? "bg-white text-black border-white"
                                                : "bg-zinc-900 text-white border-zinc-900"
                                            : isDarkTheme
                                                ? "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
                                                : "bg-transparent text-zinc-500 border-zinc-300 hover:border-zinc-500"
                                    }`}
                                >
                                    {v.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div
                    className={`space-y-1.5 rounded-lg border px-2.5 py-2 ${
                        isDarkTheme ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-zinc-50"
                    }`}
                >
                    <NutritionRow
                        icon={<Leaf size={11} />}
                        label="Ingredients"
                        value={ingredients || "—"}
                        expandable
                        isDarkTheme={isDarkTheme}
                    />
                    <NutritionRow
                        icon={<Sparkles size={11} />}
                        label="Benefits"
                        value={benefits || "—"}
                        expandable
                        isDarkTheme={isDarkTheme}
                    />
                    <NutritionRow
                        icon={<Flame size={11} />}
                        label="Calories"
                        value={calories ?? "—"}
                        isDarkTheme={isDarkTheme}
                    />
                </div>

                <button
                    type="button"
                    disabled={isSoldOut}
                    onClick={handleAdd}
                    className={`mt-auto w-full rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] ${
                        isSoldOut
                            ? isDarkTheme
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-zinc-100 text-zinc-400"
                            : inCart
                              ? "bg-emerald-400 text-black"
                              : isDarkTheme
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                >
                    {inCart ? (
                        <>
                            <Check size={14} /> Added · {quantity}
                        </>
                    ) : (
                        <>
                            <Plus size={14} /> Add
                        </>
                    )}
                </button>
            </div>
        </article>
    );
};
