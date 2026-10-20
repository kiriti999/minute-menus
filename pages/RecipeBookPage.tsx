import type { RecipeLink } from "@minute-menus/types";
import { LoadingScreen } from "@minute-menus/ui";
import { ArrowLeft, Printer, RefreshCw, Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecipeLinksModal } from "../components/RecipeLinksModal";
import {
	buildRecipeBookHtml,
	dishesFromMenu,
	type RecipeBookDish,
} from "../lib/recipeBook/buildRecipeBookHtml";
import { supabaseService } from "../services/supabaseService";

export interface RecipeBookPageProps {
	isDarkTheme: boolean;
	onBack: () => void;
	slug: string;
	isAuthenticated?: boolean;
}

interface RecipeBookData {
	restaurantId: string;
	restaurantName: string;
	dishes: RecipeBookDish[];
	links: RecipeLink[];
}

interface EditTarget {
	key: string;
	title: string;
}

async function fetchMenuAndRestaurant(slug: string): Promise<RecipeBookData> {
	const restaurant = await supabaseService.getRestaurantBySlug(slug);
	if (!restaurant) throw new Error(`Restaurant "${slug}" not found`);
	const menu = await supabaseService.getMenu(restaurant.id);
	// Links are optional — a failed fetch must never break the recipe book.
	const links = await supabaseService.getRecipeLinks(restaurant.id).catch(() => []);
	return {
		restaurantId: restaurant.id,
		restaurantName: restaurant.name || "Recipe book",
		dishes: dishesFromMenu(menu),
		links,
	};
}

/** Reads an "edit-links" message posted by the recipe-book iframe. */
function parseOpenSections(data: unknown): string[] | null {
	const msg = data as { type?: unknown; open?: unknown } | null;
	if (msg?.type !== "sections" || !Array.isArray(msg.open)) return null;
	return msg.open.filter((c): c is string => typeof c === "string");
}

function parseEditMessage(data: unknown): EditTarget | null {
	const msg = data as { type?: unknown; key?: unknown; title?: unknown } | null;
	if (msg?.type !== "edit-links") return null;
	if (typeof msg.key !== "string" || typeof msg.title !== "string") return null;
	return { key: msg.key, title: msg.title };
}

/**
 * Printable recipe book — always fetches the latest menu when opened or revisited.
 */
export const RecipeBookPage: React.FC<RecipeBookPageProps> = ({
	isDarkTheme,
	onBack,
	slug,
	isAuthenticated,
}) => {
	const [data, setData] = useState<RecipeBookData | null>(null);
	const [query, setQuery] = useState("");
	const [editing, setEditing] = useState<EditTarget | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadedAt, setLoadedAt] = useState<Date | null>(null);
	const [fetchTick, setFetchTick] = useState(0);
	const [currentSlug] = useState<string>(slug);
	const frameRef = useRef<HTMLIFrameElement>(null);
	// Expanded categories survive iframe reloads (e.g. after saving a link); read when the HTML is built.
	const openSections = useRef<string[]>([]);
	const requestId = useRef(0);

	const loadLatest = useCallback(async (opts?: { silent?: boolean }) => {
		const id = ++requestId.current;
		if (opts?.silent) setRefreshing(true);
		else setLoading(true);
		setError("");
		try {
			const next = await fetchMenuAndRestaurant(slug);
			if (id !== requestId.current) return;
			setData(next);
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
	}, [slug]);

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

	const html = useMemo(
		() =>
			data
				? buildRecipeBookHtml({
						restaurantName: data.restaurantName,
						menuDishes: data.dishes,
						links: data.links,
						editable: Boolean(isAuthenticated),
						openSections: openSections.current,
						embedded: true,
					})
				: "",
		[data, isAuthenticated],
	);

	const postToFrame = useCallback((message: object) => {
		frameRef.current?.contentWindow?.postMessage(message, "*");
	}, []);

	// The iframe is sandboxed without same-origin, so search / print / edit go through postMessage.
	useEffect(() => {
		postToFrame({ type: "filter", query });
	}, [query, postToFrame]);

	useEffect(() => {
		const onMessage = (e: MessageEvent) => {
			if (e.source !== frameRef.current?.contentWindow) return;
			const open = parseOpenSections(e.data);
			if (open) openSections.current = open;
			const target = parseEditMessage(e.data);
			if (target) setEditing(target);
		};
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	const saveLinks = async (videoUrl: string, articleUrl: string) => {
		if (!data || !editing) return;
		const link: RecipeLink = {
			recipeKey: editing.key,
			videoUrl: videoUrl.trim() || null,
			articleUrl: articleUrl.trim() || null,
		};
		await supabaseService.saveRecipeLink(data.restaurantId, link);
		const links = await supabaseService.getRecipeLinks(data.restaurantId);
		setData({ ...data, links });
		setEditing(null);
	};

	const editingLink = data?.links.find((l) => l.recipeKey === editing?.key);

	if (loading && !html) return <LoadingScreen label="Loading latest menu…" />;

	if (error && !data) {
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
					{isAuthenticated ? "Dashboard" : "Menu"}
				</button>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold truncate">Kitchen Recipe Book</p>
					<p className={`text-[11px] ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>
						{currentSlug ? `/${currentSlug}/recipe-book` : "/recipe-book"} · {updatedLabel}
					</p>
				</div>
				<div
					className={`relative w-36 sm:w-56 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}
				>
					<Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
					<input
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search recipes…"
						aria-label="Search recipes"
						className={`w-full rounded-full border py-2 pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-[#0B4A42] ${isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-white border-zinc-300"}`}
					/>
					{query && (
						<button
							type="button"
							onClick={() => setQuery("")}
							aria-label="Clear search"
							className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
						>
							<X size={14} />
						</button>
					)}
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
					onClick={() => postToFrame({ type: "print" })}
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
				sandbox="allow-scripts allow-modals allow-popups allow-popups-to-escape-sandbox"
				onLoad={() => postToFrame({ type: "filter", query })}
			/>
			{editing && (
				<RecipeLinksModal
					title={editing.title}
					initialVideoUrl={editingLink?.videoUrl ?? ""}
					initialArticleUrl={editingLink?.articleUrl ?? ""}
					isDarkTheme={isDarkTheme}
					onSave={saveLinks}
					onClose={() => setEditing(null)}
				/>
			)}
		</div>
	);
};
