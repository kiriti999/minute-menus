import { Check, Flame, Leaf, Plus, Sparkles } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { formatPriceCompactInCurrency } from "@minute-menus/currency";
import type { Dish } from "@minute-menus/types";
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
    onAdd: (dish: Dish) => void;
    isDarkTheme?: boolean;
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
}) => {
    const [added, setAdded] = useState(false);
    const ingredients = dishIngredientLine(dish);
    const benefits = dishBenefitLine(dish);
    const calories = dishCalorieLabel(dish);

    const handleAdd = () => {
        if (isSoldOut) return;
        onAdd(dish);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
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
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">
                <div className="flex items-start justify-between gap-2">
                    <h3
                        className={`min-w-0 flex-1 text-sm font-bold leading-snug line-clamp-2 ${
                            isDarkTheme ? "text-white" : "text-zinc-900"
                        }`}
                    >
                        {dish.name}
                    </h3>
                    <span className={`shrink-0 text-sm font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                        {formatPriceCompactInCurrency(dish.price, currency)}
                    </span>
                </div>

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
                    className={`mt-auto w-full rounded-lg py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                        isSoldOut
                            ? isDarkTheme
                                ? "bg-zinc-800 text-zinc-500"
                                : "bg-zinc-100 text-zinc-400"
                            : added
                              ? "bg-emerald-400 text-black"
                              : isDarkTheme
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                >
                    {added ? (
                        <>
                            <Check size={14} /> Added
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
