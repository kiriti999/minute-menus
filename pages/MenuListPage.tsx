import { LoadingScreen } from "@minute-menus/ui";
import { formatPriceInCurrency, getEffectivePrice, resolveDiscountPercent } from "@minute-menus/currency";
import type { Category, Dish } from "@minute-menus/types";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseService } from "../services/supabaseService";

export interface MenuListPageProps {
	slug: string;
	isDarkTheme: boolean;
	onBack: () => void;
}

interface RestaurantInfo {
	name: string;
	slug: string;
	currency: string;
}

// ─── Data loading ────────────────────────────────────────────────────────────

async function fetchMenuList(slug: string): Promise<{ categories: Category[]; restaurant: RestaurantInfo }> {
	const restaurant = await supabaseService.getRestaurantBySlug(slug);
	if (!restaurant) throw new Error(`Restaurant "${slug}" not found`);
	const categories = await supabaseService.getMenu(restaurant.id);
	return {
		categories,
		restaurant: {
			name: restaurant.name,
			slug: restaurant.slug,
			currency: restaurant.currency,
		},
	};
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const DishRow: React.FC<{ dish: Dish; currency: string; isDarkTheme: boolean; categoryDiscountPercent?: number }> = ({
	dish,
	currency,
	isDarkTheme,
	categoryDiscountPercent = 0,
}) => {
	const soldOut = dish.manualSoldOut || (dish.stockQuantity !== undefined && dish.stockQuantity <= 0);
	const mutedText = isDarkTheme ? "text-zinc-500" : "text-zinc-400";
	const nameClass = soldOut
		? `line-through ${isDarkTheme ? "text-zinc-600" : "text-zinc-400"}`
		: isDarkTheme
		? "text-white"
		: "text-zinc-900";

	const hasVariants = dish.variants && dish.variants.length > 0;
	const discountPct = resolveDiscountPercent(dish.discountPercent, categoryDiscountPercent);

	return (
		<div
			className={`py-3 border-b border-dashed ${
				isDarkTheme ? "border-zinc-800" : "border-zinc-200"
			} last:border-b-0`}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<span className={`font-medium text-sm leading-snug ${nameClass}`}>
						{dish.name}
						{soldOut && (
							<span className={`ml-2 text-[10px] font-bold uppercase tracking-wider ${isDarkTheme ? "text-red-500/70" : "text-red-400"}`}>
								Sold out
							</span>
						)}
						{discountPct > 0 && !soldOut && (
							<span className="ml-2 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
								{discountPct}% OFF
							</span>
						)}
					</span>
					{dish.description && (
						<p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${mutedText}`}>
							{dish.description}
						</p>
					)}
				</div>

				{/* Price column — show base price if has variants (variants listed below) */}
				{!hasVariants && (
					<div className="flex-shrink-0 text-right pt-0.5">
						{(() => {
							const { original, final } = getEffectivePrice(dish.price, discountPct);
							if (discountPct > 0 && dish.price > 0) return (
								<>
									<span className={`block text-[11px] line-through ${mutedText}`}>{formatPriceInCurrency(original, currency)}</span>
									<span className="block text-sm font-semibold text-emerald-400">{formatPriceInCurrency(final, currency)}</span>
								</>
							);
							return <span className={`text-sm font-semibold tabular-nums ${soldOut ? mutedText : isDarkTheme ? "text-zinc-200" : "text-zinc-800"}`}>{dish.price > 0 ? formatPriceInCurrency(dish.price, currency) : "—"}</span>;
						})()}
					</div>
				)}
			</div>

			{/* Variant rows */}
			{hasVariants && (
				<div className="mt-1.5 pl-2 flex flex-col gap-0.5">
					{dish.variants!.map((variant) => {
						const { original, final } = getEffectivePrice(variant.price, discountPct);
						return (
							<div key={variant.id} className="flex items-center justify-between">
								<span className={`text-xs ${mutedText}`}>{variant.name}</span>
								<div className="flex items-center gap-2">
									{discountPct > 0 ? (
										<>
											<span className={`text-xs line-through ${mutedText}`}>{formatPriceInCurrency(original, currency)}</span>
											<span className="text-xs font-semibold text-emerald-400">{formatPriceInCurrency(final, currency)}</span>
										</>
									) : (
										<span className={`text-xs font-semibold tabular-nums ${isDarkTheme ? "text-zinc-300" : "text-zinc-700"}`}>{formatPriceInCurrency(variant.price, currency)}</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

const CategorySection: React.FC<{
	category: Category;
	currency: string;
	isDarkTheme: boolean;
}> = ({ category, currency, isDarkTheme }) => {
	if (category.items.length === 0) return null;

	return (
		<section className="mb-8 print:mb-6 print:break-inside-avoid-page">
			<div
				className={`px-4 py-2 mb-1 rounded-md flex items-center justify-between ${
					isDarkTheme
						? "bg-zinc-800/60 text-zinc-200"
						: "bg-zinc-100 text-zinc-700"
				}`}
			>
				<h2 className="text-xs font-bold uppercase tracking-[0.18em]">
					{category.title}
				</h2>
				{(category.discountPercent ?? 0) > 0 && (
					<span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
						{category.discountPercent}% OFF
					</span>
				)}
			</div>
			<div className="px-1">
				{category.items.map((dish) => (
					<DishRow
						key={dish.id}
						dish={dish}
						currency={currency}
						isDarkTheme={isDarkTheme}
						categoryDiscountPercent={category.discountPercent ?? 0}
					/>
				))}
			</div>
		</section>
	);
};

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Public price-list page at /:slug/menu.
 * No auth required — anyone with the link can view.
 */
export const MenuListPage: React.FC<MenuListPageProps> = ({
	slug,
	isDarkTheme,
	onBack,
}) => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState("");
	const [loadedAt, setLoadedAt] = useState<Date | null>(null);
	const [fetchTick, setFetchTick] = useState(0);
	const requestId = useRef(0);

	const load = useCallback(async (opts?: { silent?: boolean }) => {
		const id = ++requestId.current;
		if (opts?.silent) setRefreshing(true);
		else setLoading(true);
		setError("");
		try {
			const result = await fetchMenuList(slug);
			if (id !== requestId.current) return;
			setCategories(result.categories);
			setRestaurant(result.restaurant);
			setLoadedAt(new Date());
		} catch (e) {
			if (id !== requestId.current) return;
			setError(e instanceof Error ? e.message : "Could not load menu");
		} finally {
			if (id === requestId.current) {
				setLoading(false);
				setRefreshing(false);
			}
		}
	}, [slug]);

	useEffect(() => { void load(); }, [load, fetchTick]);

	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === "visible") setFetchTick((n) => n + 1);
		};
		const onPageShow = (e: PageTransitionEvent) => {
			if (e.persisted) setFetchTick((n) => n + 1);
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("pageshow", onPageShow);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("pageshow", onPageShow);
		};
	}, []);

	useEffect(() => {
		document.body.className = isDarkTheme
			? "bg-zinc-950 text-white overflow-auto"
			: "bg-zinc-50 text-black overflow-auto";
	}, [isDarkTheme]);

	const bar = isDarkTheme
		? "bg-zinc-900 border-zinc-800 text-white"
		: "bg-white border-zinc-200 text-zinc-900";

	const updatedLabel = loadedAt
		? `Updated ${loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
		: "Loading…";

	const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);

	if (loading && !categories.length) return <LoadingScreen label="Loading menu…" />;

	if (error && !categories.length) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
				<p className="text-sm text-red-500">{error}</p>
				<button
					type="button"
					onClick={() => setFetchTick((n) => n + 1)}
					className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-semibold"
				>
					Retry
				</button>
				<button
					type="button"
					onClick={onBack}
					className={`px-4 py-2 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700" : "border-zinc-300"}`}
				>
					Back
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex flex-col">
			{/* Top bar */}
			<div
				className={`sticky top-0 z-10 flex-shrink-0 border-b px-4 py-3 flex items-center gap-3 ${bar} print:hidden`}
			>
				<button
					id="menu-list-back-btn"
					type="button"
					onClick={onBack}
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${
						isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
					}`}
				>
					<ArrowLeft size={16} />
					Menu
				</button>

				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">
						{restaurant?.name ?? "Menu"}
					</p>
					<p className={`text-[11px] ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>
						/{slug}/menu · {updatedLabel}
					</p>
				</div>

				<button
					id="menu-list-refresh-btn"
					type="button"
					disabled={refreshing || loading}
					onClick={() => setFetchTick((n) => n + 1)}
					className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border disabled:opacity-50 ${
						isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"
					}`}
					title="Reload latest menu"
				>
					<RefreshCw size={16} className={refreshing || loading ? "animate-spin" : undefined} />
					<span className="hidden sm:inline">Refresh</span>
				</button>

				<button
					id="menu-list-print-btn"
					type="button"
					onClick={() => window.print()}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#0B4A42] text-white hover:opacity-90"
				>
					<Printer size={16} />
					<span className="hidden sm:inline">Print / PDF</span>
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
				<div className="mb-8 print:mb-6">
					<h1
						className={`text-2xl font-bold tracking-tight mb-1 ${
							isDarkTheme ? "text-white" : "text-zinc-900"
						}`}
					>
						{restaurant?.name ?? slug} — Menu
					</h1>
					<p className={`text-xs ${isDarkTheme ? "text-zinc-500" : "text-zinc-400"}`}>
						{totalItems} item{totalItems !== 1 ? "s" : ""} across {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
					</p>
				</div>

				{categories.map((cat) => (
					<CategorySection
						key={cat.id}
						category={cat}
						currency={restaurant?.currency ?? "USD"}
						isDarkTheme={isDarkTheme}
					/>
				))}

				{categories.length === 0 && !loading && (
					<p className={`text-sm text-center py-16 ${isDarkTheme ? "text-zinc-600" : "text-zinc-400"}`}>
						No items in the menu yet.
					</p>
				)}

				<p
					className={`mt-8 text-center text-[10px] ${
						isDarkTheme ? "text-zinc-700" : "text-zinc-400"
					} print:text-zinc-500`}
				>
					Prices may vary. All prices include applicable taxes where shown.
				</p>
			</div>

			<style>{`
				@media print {
					body { background: white !important; color: black !important; }
					* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				}
			`}</style>
		</div>
	);
};
