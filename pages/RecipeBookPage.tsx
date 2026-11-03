import type { RecipeEntry, RecipeImage, RecipeLink, RecipeOverride } from "@minute-menus/types";
import { LoadingScreen } from "@minute-menus/ui";
import { ArrowLeft, ChevronsDownUp, ChevronsUpDown, Moon, Printer, QrCode, Search, Sun, Trash2, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RecipeBookSignIn } from "../components/RecipeBookSignIn";
import { RecipeEditModal } from "../components/RecipeEditModal";
import { RecipeLinksModal } from "../components/RecipeLinksModal";
import { RecipeRestoreModal } from "../components/RecipeRestoreModal";
import { useRecipeBookAccess } from "../hooks/useRecipeBookAccess";
import {
	buildRecipeBookHtml,
	buildRecipeCards,
	cardKey,
	dishesFromMenu,
	hasRecipeContent,
	type RecipeBookDish,
} from "../lib/recipeBook/buildRecipeBookHtml";
import { draftFromCard, overrideFromDraft, type RecipeDraft } from "../lib/recipeBook/recipeEditText";
import { isNewVersionAvailable } from "../lib/newVersion";
import { RecipeBookQrModal } from "../components/RecipeBookQrModal";
import { supabaseService } from "../services/supabaseService";

export interface RecipeBookPageProps {
	isDarkTheme: boolean;
	onToggleTheme: () => void;
	/** `isOwner` lets the app send owners to the dashboard and everyone else to the SOP page. */
	onBack: (isOwner: boolean) => void;
	slug: string;
}

interface RecipeBookViewerProps {
	isDarkTheme: boolean;
	onToggleTheme: () => void;
	onBack: () => void;
	slug: string;
	/** Only the owner can edit; team members get a read-only book. */
	isOwner: boolean;
}

interface RecipeBookData {
	restaurantId: string;
	restaurantName: string;
	dishes: RecipeBookDish[];
	links: RecipeLink[];
	overrides: RecipeOverride[];
	images: RecipeImage[];
	book: RecipeEntry[];
}

interface EditTarget {
	key: string;
	title: string;
}

const RETURN_REFRESH_MIN_MS = 60_000;

async function fetchMenuAndRestaurant(slug: string): Promise<RecipeBookData> {
	const restaurant = await supabaseService.getRestaurantBySlug(slug);
	if (!restaurant) throw new Error(`Restaurant "${slug}" not found`);
	const menu = await supabaseService.getMenu(restaurant.id);
	// Links are optional — a failed fetch must never break the recipe book.
	const links = await supabaseService.getRecipeLinks(restaurant.id).catch(() => []);
	const overrides = await supabaseService.getRecipeOverrides(restaurant.id).catch(() => []);
	const images = await supabaseService.getRecipeImages(restaurant.id).catch(() => []);
	const book = await supabaseService.getRecipeBookDefaults(restaurant.id);
	return {
		restaurantId: restaurant.id,
		restaurantName: restaurant.name || "Recipe book",
		dishes: dishesFromMenu(menu),
		links,
		overrides,
		images,
		book,
	};
}

function parseOpenSections(data: unknown): string[] | null {
	const msg = data as { type?: unknown; open?: unknown } | null;
	if (msg?.type !== "sections" || !Array.isArray(msg.open)) return null;
	return msg.open.filter((c): c is string => typeof c === "string");
}

/** Reads an "edit-links" / "edit-recipe" message posted by the recipe-book iframe. */
function parseEditMessage(data: unknown, type: "edit-links" | "edit-recipe"): EditTarget | null {
	const msg = data as { type?: unknown; key?: unknown; title?: unknown } | null;
	if (msg?.type !== type) return null;
	if (typeof msg.key !== "string" || typeof msg.title !== "string") return null;
	return { key: msg.key, title: msg.title };
}

/**
 * Printable recipe book — always fetches the latest menu when opened or revisited.
 * Rendered only after the gate confirmed the user is the owner or an active team member.
 */
const RecipeBookViewer: React.FC<RecipeBookViewerProps> = ({
	isDarkTheme,
	onToggleTheme,
	onBack,
	slug,
	isOwner,
}) => {
	const [data, setData] = useState<RecipeBookData | null>(null);
	const [query, setQuery] = useState("");
	const [editing, setEditing] = useState<EditTarget | null>(null);
	const [editingRecipe, setEditingRecipe] = useState<EditTarget | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [showingQr, setShowingQr] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	// Closing the phone search box also clears it, so a hidden filter never lingers.
	const toggleSearch = () => {
		if (searchOpen) setQuery("");
		setSearchOpen(!searchOpen);
	};
	const [updateReady, setUpdateReady] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [loadedAt, setLoadedAt] = useState<Date | null>(null);
	const [fetchTick, setFetchTick] = useState(0);
	const [currentSlug] = useState<string>(slug);
	const frameRef = useRef<HTMLIFrameElement>(null);
	// Expanded categories survive iframe reloads (e.g. after saving a link); read when the HTML is built.
	const openSections = useRef<string[]>([]);
	const requestId = useRef(0);
	const hasData = useRef(false);
	const lastLoadMs = useRef(0);
	// Read only when the HTML is (re)built; later theme changes reach the iframe by postMessage so it never reloads.
	const darkRef = useRef(isDarkTheme);
	darkRef.current = isDarkTheme;

	const loadLatest = useCallback(async (opts?: { silent?: boolean }) => {
		const id = ++requestId.current;
		// Once something is on screen, reloads are background refreshes — never a loading state.
		if (!opts?.silent && !hasData.current) setLoading(true);
		setError("");
		try {
			const next = await fetchMenuAndRestaurant(slug);
			if (id !== requestId.current) return;
			// Keep the same object when nothing changed so the recipe frame isn't rebuilt (it would reset scroll).
			setData((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
			hasData.current = true;
			lastLoadMs.current = Date.now();
			setLoadedAt(new Date());
		} catch (e) {
			if (id !== requestId.current) return;
			setError(
				e instanceof Error ? e.message : "Could not load menu for recipe book",
			);
		} finally {
			if (id === requestId.current) setLoading(false);
		}
	}, [slug]);

	// Fresh pull whenever the page is opened / remounted, or fetchTick bumps.
	useEffect(() => {
		void loadLatest();
	}, [loadLatest, fetchTick]);

	// Re-pull when returning to this tab or restoring from bfcache — at most once a minute.
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState !== "visible") return;
			isNewVersionAvailable()
				.then((available) => available && setUpdateReady(true))
				.catch(() => undefined);
			if (Date.now() - lastLoadMs.current < RETURN_REFRESH_MIN_MS) return;
			setFetchTick((n) => n + 1);
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
						overrides: data.overrides,
						images: data.images,
						book: data.book,
						dark: darkRef.current,
						editable: isOwner,
						openSections: openSections.current,
						embedded: true,
					})
				: "",
		[data, isOwner],
	);

	const postToFrame = useCallback((message: object) => {
		frameRef.current?.contentWindow?.postMessage(message, "*");
	}, []);

	useEffect(() => {
		postToFrame({ type: "theme", dark: isDarkTheme });
	}, [isDarkTheme, postToFrame]);

	// The iframe is sandboxed without same-origin, so search / print / edit go through postMessage.
	useEffect(() => {
		postToFrame({ type: "filter", query });
	}, [query, postToFrame]);

	useEffect(() => {
		const onMessage = (e: MessageEvent) => {
			if (e.source !== frameRef.current?.contentWindow) return;
			const open = parseOpenSections(e.data);
			if (open) openSections.current = open;
			const target = parseEditMessage(e.data, "edit-links");
			if (target) setEditing(target);
			const recipe = parseEditMessage(e.data, "edit-recipe");
			if (recipe) setEditingRecipe(recipe);
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

	const recipeDraft = useMemo(() => {
		if (!data || !editingRecipe) return null;
		const card = buildRecipeCards(data.dishes, data.overrides, data.book).find(
			(c) => cardKey(c) === editingRecipe.key,
		);
		return card ? draftFromCard(card) : null;
	}, [data, editingRecipe]);

	const linkTargets = useMemo(
		() =>
			data && editingRecipe
				? buildRecipeCards(data.dishes, data.overrides, data.book)
						.filter((c) => cardKey(c) !== editingRecipe.key)
						.map((c) => c.title)
						.sort((a, b) => a.localeCompare(b))
				: [],
		[data, editingRecipe],
	);

	const reloadOverrides = async () => {
		if (!data) return;
		const overrides = await supabaseService.getRecipeOverrides(data.restaurantId);
		setData({ ...data, overrides });
		setEditingRecipe(null);
	};

	const saveRecipe = async (draft: RecipeDraft) => {
		if (!data || !editingRecipe) return;
		const card = buildRecipeCards(data.dishes, data.overrides, data.book).find((c) => cardKey(c) === editingRecipe.key);
		const override = overrideFromDraft(editingRecipe.key, card?.sourceTitle ?? editingRecipe.title, draft);
		await supabaseService.saveRecipeOverride(data.restaurantId, override);
		await reloadOverrides();
	};

	const reloadImages = async () => {
		if (!data) return;
		const images = await supabaseService.getRecipeImages(data.restaurantId);
		setData({ ...data, images });
	};

	const uploadRecipeImage = async (dataUrl: string) => {
		if (!data || !editingRecipe) return;
		await supabaseService.saveRecipeImage(data.restaurantId, editingRecipe.key, dataUrl);
		await reloadImages();
	};

	const removeRecipeImage = async () => {
		if (!data || !editingRecipe) return;
		await supabaseService.removeRecipeImage(data.restaurantId, editingRecipe.key);
		await reloadImages();
	};

	const deleteRecipe = async () => {
		if (!data || !editingRecipe) return;
		await supabaseService.setRecipeHidden(data.restaurantId, editingRecipe.key, true);
		await reloadOverrides();
	};

	const restoreRecipe = async (key: string) => {
		if (!data) return;
		await supabaseService.setRecipeHidden(data.restaurantId, key, false);
		const overrides = await supabaseService.getRecipeOverrides(data.restaurantId);
		setData({ ...data, overrides });
	};

	const deletedKeys = data?.overrides.filter((o) => o.hidden).map((o) => o.recipeKey) ?? [];

	const resetRecipe = async () => {
		if (!data || !editingRecipe) return;
		await supabaseService.deleteRecipeOverride(data.restaurantId, editingRecipe.key);
		await reloadOverrides();
	};

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
					aria-label={isOwner ? "Back to dashboard" : "Back to SOP"}
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
		? `Updated ${loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
		: "Pulling latest menu…";

	return (
		<div className="fixed inset-0 flex flex-col min-w-0 overflow-hidden">
			<div className={`flex-shrink-0 border-b px-3 py-2 sm:px-4 sm:py-3 flex-wrap items-center gap-2 sm:gap-3 ${searchOpen ? "hidden sm:flex" : "flex"} ${bar}`}>
				<button
					type="button"
					onClick={onBack}
					className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
				>
					<ArrowLeft size={16} />
					<span className="hidden sm:inline">{isOwner ? "Dashboard" : "SOP"}</span>
				</button>
				<p className={`flex-1 min-w-0 truncate text-xs ${isDarkTheme ? "text-zinc-400" : "text-zinc-500"}`}>{updatedLabel}</p>
				<div
					className={`relative hidden sm:block sm:w-56 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}
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
					onClick={toggleSearch}
					aria-label="Search recipes"
					className={`sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-full border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
				>
					<Search size={16} />
				</button>
				<div className={`inline-flex rounded-full border overflow-hidden ${isDarkTheme ? "border-zinc-700" : "border-zinc-300"}`}>
					<button
						type="button"
						onClick={() => postToFrame({ type: "toggle-all", open: true })}
						title="Expand all sections"
						aria-label="Expand all sections"
						className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold ${isDarkTheme ? "hover:bg-zinc-800" : "hover:bg-zinc-100"}`}
					>
						<ChevronsUpDown size={16} />
						<span className="hidden md:inline">Expand all</span>
					</button>
					<button
						type="button"
						onClick={() => postToFrame({ type: "toggle-all", open: false })}
						title="Collapse all sections"
						aria-label="Collapse all sections"
						className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold border-l ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
					>
						<ChevronsDownUp size={16} />
						<span className="hidden md:inline">Collapse all</span>
					</button>
				</div>
				{isOwner && deletedKeys.length > 0 && (
					<button
						type="button"
						onClick={() => setRestoring(true)}
						className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
						title="Restore recipes you deleted"
						aria-label={`Deleted recipes (${deletedKeys.length})`}
					>
						<Trash2 size={16} />
						<span className="sm:hidden">{deletedKeys.length}</span>
						<span className="hidden sm:inline">Deleted ({deletedKeys.length})</span>
					</button>
				)}
				{isOwner && (
					<button
						type="button"
						onClick={() => setShowingQr(true)}
						className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
						title="QR code for this page"
						aria-label="QR code for this page"
					>
						<QrCode size={16} />
						<span className="hidden sm:inline">QR</span>
					</button>
				)}
				<button
					type="button"
					onClick={onToggleTheme}
					aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
					title={isDarkTheme ? "Light theme" : "Dark theme"}
					className={`inline-flex items-center justify-center w-9 h-9 rounded-full border ${isDarkTheme ? "border-zinc-700 hover:bg-zinc-800" : "border-zinc-300 hover:bg-zinc-100"}`}
				>
					{isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
				</button>
				<button
					type="button"
					onClick={() => postToFrame({ type: "print" })}
					aria-label="Print or save as PDF"
					className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold bg-[#0B4A42] text-white hover:opacity-90"
				>
					<Printer size={16} />
					<span className="hidden sm:inline">Print / PDF</span>
				</button>
			</div>
			{searchOpen && (
				<div className={`sm:hidden flex-shrink-0 border-b px-3 py-2 flex items-center gap-3 ${bar}`}>
					<div className="relative flex-1 min-w-0">
						<input
							type="search"
							// biome-ignore lint/a11y/noAutofocus: the user just tapped the search icon to type
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search…"
							aria-label="Search recipes"
							className={`w-full rounded-full border py-2.5 pl-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-[#0B4A42] ${isDarkTheme ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-900"}`}
						/>
						<Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
					</div>
					<button type="button" onClick={toggleSearch} aria-label="Close search" className="p-1 opacity-70 hover:opacity-100">
						<X size={22} />
					</button>
				</div>
			)}
			{updateReady && (
				<div className="flex-shrink-0 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
					A newer version of the recipe book is available.
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white"
					>
						Reload
					</button>
				</div>
			)}
			<iframe
				ref={frameRef}
				title="Kitchen Recipe Book"
				srcDoc={html}
				className="flex-1 w-full border-0 bg-white"
				sandbox="allow-scripts allow-modals allow-popups allow-popups-to-escape-sandbox"
				onLoad={() => {
					postToFrame({ type: "filter", query });
					postToFrame({ type: "theme", dark: isDarkTheme });
				}}
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
			{showingQr && (
				<RecipeBookQrModal
					url={`${import.meta.env.VITE_SITE_URL || window.location.origin}/${currentSlug}/recipe-book`}
					restaurantName={data?.restaurantName ?? "Recipe book"}
					isDarkTheme={isDarkTheme}
					onClose={() => setShowingQr(false)}
				/>
			)}
			{restoring && (
				<RecipeRestoreModal
					recipeKeys={deletedKeys}
					isDarkTheme={isDarkTheme}
					onRestore={restoreRecipe}
					onClose={() => setRestoring(false)}
				/>
			)}
			{editingRecipe && recipeDraft && (
				<RecipeEditModal
					title={editingRecipe.title}
					linkTargets={linkTargets}
					imageUrl={data?.images.find((i) => i.recipeKey === editingRecipe.key)?.imageUrl}
					onUploadImage={uploadRecipeImage}
					onRemoveImage={removeRecipeImage}
					initialDraft={recipeDraft}
					isEdited={Boolean(
						data?.overrides.some((o) => o.recipeKey === editingRecipe.key && hasRecipeContent(o)),
					)}
					isDarkTheme={isDarkTheme}
					onSave={saveRecipe}
					onReset={resetRecipe}
					onDelete={deleteRecipe}
					onClose={() => setEditingRecipe(null)}
				/>
			)}
		</div>
	);
};

/** Gate: the recipe book renders only for the owner or an active team member. */
export const RecipeBookPage: React.FC<RecipeBookPageProps> = ({ isDarkTheme, onToggleTheme, onBack, slug }) => {
	const access = useRecipeBookAccess(slug);

	useEffect(() => {
		document.body.className = isDarkTheme
			? "bg-zinc-950 text-white overflow-auto"
			: "bg-zinc-100 text-black overflow-auto";
	}, [isDarkTheme]);

	if (access.status === "checking") return <LoadingScreen label="Checking access…" />;
	if (access.status === "error") {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
				<p className="text-sm text-red-500">{access.message}</p>
				<button type="button" onClick={() => onBack(false)} className="px-4 py-2 rounded-full border text-sm font-semibold">
					Back
				</button>
			</div>
		);
	}
	if (access.status === "granted") {
		return (
			<RecipeBookViewer
				slug={slug}
				isDarkTheme={isDarkTheme}
				onToggleTheme={onToggleTheme}
				isOwner={access.role === "owner"}
				onBack={() => onBack(access.role === "owner")}
			/>
		);
	}
	return (
		<RecipeBookSignIn
			isDarkTheme={isDarkTheme}
			restaurantName={access.restaurantName}
			slug={slug}
			deniedEmail={access.status === "denied" ? access.email : undefined}
			onBack={() => onBack(false)}
		/>
	);
};
