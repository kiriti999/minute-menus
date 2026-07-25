import { LoadingScreen } from "@minute-menus/ui";
import { ArrowLeft, Printer, RefreshCw } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	buildRecipeBookHtml,
	dishesFromMenu,
} from "../lib/recipeBook/buildRecipeBookHtml";
import { supabaseService } from "../services/supabaseService";

export interface RecipeBookPageProps {
	isDarkTheme: boolean;
	onBack: () => void;
}

/**
 * Logged-in printable recipe book — always fetches the latest menu when opened or revisited.
 */
export const RecipeBookPage: React.FC<RecipeBookPageProps> = ({
	isDarkTheme,
	onBack,
}) => {
	const [html, setHtml] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadedAt, setLoadedAt] = useState<Date | null>(null);
	const [fetchTick, setFetchTick] = useState(0);
	const frameRef = useRef<HTMLIFrameElement>(null);
	const requestId = useRef(0);

	const loadLatest = useCallback(async (opts?: { silent?: boolean }) => {
		const id = ++requestId.current;
		if (opts?.silent) setRefreshing(true);
		else setLoading(true);
		setError("");
		try {
			const [menu, details] = await Promise.all([
				supabaseService.getMenu(),
				supabaseService.getRestaurantDetails(),
			]);
			if (id !== requestId.current) return;
			setHtml(
				buildRecipeBookHtml({
					restaurantName: details.name || "Recipe book",
					menuDishes: dishesFromMenu(menu),
					embedded: true,
				}),
			);
			setLoadedAt(new Date());
		} catch (e) {
			if (id !== requestId.current) return;
			setError(
				e instanceof Error ? e.message : "Could not load menu for recipe book",
			);
		} finally {
			if (id === requestId.current) {
				setLoading(false);
				setRefreshing(false);
			}
		}
	}, []);

	// Fresh pull whenever the page is opened / remounted, or fetchTick bumps.
	useEffect(() => {
		void loadLatest();
	}, [loadLatest, fetchTick]);

	// Re-pull when returning to this tab or restoring from bfcache.
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
			? "bg-zinc-950 text-white overflow-hidden"
			: "bg-zinc-100 text-black overflow-hidden";
	}, [isDarkTheme]);

	const printBook = () => {
		const win = frameRef.current?.contentWindow;
		if (win) win.print();
	};

	if (loading && !html) return <LoadingScreen label="Loading latest menu…" />;

	if (error && !html) {
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

	const bar = isDarkTheme
		? "bg-zinc-900 border-zinc-800 text-white"
		: "bg-white border-zinc-200 text-zinc-900";
	const updatedLabel = loadedAt
		? `Updated ${loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
		: "Pulling latest menu…";

	return (
		<div className="h-screen flex flex-col">
			<div className={`flex-shrink-0 border-b px-4 py-3 flex items-center gap-3 ${bar}`}>
				<button
					type="button"
					onClick={onBack}
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
				>
					<ArrowLeft size={16} />
					Dashboard
				</button>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">Kitchen Recipe Book</p>
					<p className={`text-[11px] ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>
						/recipe-book · {updatedLabel}
					</p>
				</div>
				<button
					type="button"
					disabled={refreshing || loading}
					onClick={() => setFetchTick((n) => n + 1)}
					className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border disabled:opacity-50 ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
					title="Reload latest menu from database"
				>
					<RefreshCw size={16} className={refreshing || loading ? "animate-spin" : undefined} />
					Refresh
				</button>
				<button
					type="button"
					onClick={printBook}
					className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#0B4A42] text-white hover:opacity-90"
				>
					<Printer size={16} />
					Print / PDF
				</button>
			</div>
			<iframe
				key={loadedAt?.getTime() ?? 0}
				ref={frameRef}
				title="Kitchen Recipe Book"
				srcDoc={html}
				className="flex-1 w-full border-0 bg-white"
				sandbox="allow-modals allow-same-origin"
			/>
		</div>
	);
};
