import { Check, Flame, Leaf, Plus, Sparkles } from "lucide-react";
import type React from "react";
import { formatPriceCompactInCurrency } from "@minute-menus/currency";
import type { Dish } from "@minute-menus/types";
import { ExpandableText } from "./ExpandableText";
import {
    dishBenefitLine,
    dishCalorieLabel,
    dishIngredientLine,
} from "./menuCardHelpers";

interface MenuListCardProps {
    dish: Dish;
    currency?: string;
    isSoldOut?: boolean;
    onAdd: (dish: Dish) => void;
    isDarkTheme?: boolean;
    /** Units already in the cart for this dish. */
    quantity?: number;
}

export const MenuListCard: React.FC<MenuListCardProps> = ({
    dish,
    currency = "USD",
    isSoldOut = false,
    onAdd,
    isDarkTheme = true,
    quantity = 0,
}) => {
    const ingredients = dishIngredientLine(dish);
    const benefits = dishBenefitLine(dish);
    const calories = dishCalorieLabel(dish);
    const inCart = quantity > 0;

    return (
        <article
            data-dish-id={dish.id}
            className={`flex gap-3 p-4 border-b transition-colors ${
                isDarkTheme
                    ? "border-zinc-800/80 hover:bg-zinc-900/40"
                    : "border-zinc-200 hover:bg-zinc-50"
            }`}
        >
            <div className="relative w-[88px] h-[88px] shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                {dish.videoUrl ? (
                    <video
                        src={dish.videoUrl}
                        poster={dish.imageUrl}
                        className="h-full w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img src={dish.imageUrl} alt={dish.name} className="h-full w-full object-cover" />
                )}
                {isSoldOut && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white">Sold out</span>
                    </div>
                )}
            </div>

            <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={`min-w-0 flex-1 font-semibold leading-snug line-clamp-2 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                        {dish.name}
                    </h3>
                    <p className={`shrink-0 text-sm font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
                        {formatPriceCompactInCurrency(dish.price, currency)}
                    </p>
                </div>

                <div className={`mt-2 space-y-2 text-[12px] leading-snug ${isDarkTheme ? "text-zinc-400" : "text-zinc-600"}`}>
                    {ingredients && (
                        <div className="flex items-start gap-1.5 min-w-0">
                            <Leaf size={12} className="shrink-0 mt-0.5 opacity-60" />
                            <ExpandableText
                                text={ingredients}
                                lines={2}
                                className={isDarkTheme ? "text-zinc-400" : "text-zinc-600"}
                                toggleClassName={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    isDarkTheme ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                                }`}
                            />
                        </div>
                    )}
                    {benefits && (
                        <div className="flex items-start gap-1.5 min-w-0">
                            <Sparkles size={12} className="shrink-0 mt-0.5 opacity-60" />
                            <ExpandableText
                                text={benefits}
                                lines={2}
                                className={isDarkTheme ? "text-zinc-400" : "text-zinc-600"}
                                toggleClassName={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                    isDarkTheme ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-600"
                                }`}
                            />
                        </div>
                    )}
                    {calories && (
                        <p className="flex items-center gap-1">
                            <Flame size={12} className="opacity-60" />
                            <span>{calories}</span>
                        </p>
                    )}
                </div>

                <div className="mt-auto pt-2 flex justify-end">
                    <button
                        type="button"
                        disabled={isSoldOut}
                        onClick={() => {
                            if (!isSoldOut) onAdd(dish);
                        }}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-colors active:scale-[0.98] ${
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
                                <Check size={13} />
                                Added · {quantity}
                            </>
                        ) : (
                            <>
                                <Plus size={13} />
                                Add
                            </>
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
};
