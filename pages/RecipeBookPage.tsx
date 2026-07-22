import { LoadingScreen } from "@minute-menus/ui";
import { ArrowLeft, Printer } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
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
 * Logged-in printable recipe book — loads live menu, merges curated kitchen hacks.
 */
export const RecipeBookPage: React.FC<RecipeBookPageProps> = ({
	isDarkTheme,
	onBack,
}) => {
	const [html, setHtml] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const frameRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const [menu, details] = await Promise.all([
					supabaseService.getMenu(),
					supabaseService.getRestaurantDetails(),
				]);
				if (cancelled) return;
				setHtml(
					buildRecipeBookHtml({
						restaurantName: details.name || "Recipe book",
						menuDishes: dishesFromMenu(menu),
						embedded: true,
					}),
				);
			} catch (e) {
				if (!cancelled) {
					setError(
						e instanceof Error ? e.message : "Could not load menu for recipe book",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
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

	if (loading) return <LoadingScreen label="Building recipe book…" />;

	if (error) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
				<p className="text-sm text-red-500">{error}</p>
				<button
					type="button"
					onClick={onBack}
					className="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-semibold"
				>
					Back
				</button>
			</div>
		);
	}

	const bar = isDarkTheme
		? "bg-zinc-900 border-zinc-800 text-white"
		: "bg-white border-zinc-200 text-zinc-900";

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
						/recipe-book · cost-effective builds &amp; hacks
					</p>
				</div>
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
				ref={frameRef}
				title="Kitchen Recipe Book"
				srcDoc={html}
				className="flex-1 w-full border-0 bg-white"
				sandbox="allow-modals allow-same-origin"
			/>
		</div>
	);
};
