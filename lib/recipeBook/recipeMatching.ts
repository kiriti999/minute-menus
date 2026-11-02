import type { RecipeEntry } from "@minute-menus/types";

function n(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const MATCH_STOP = new Set([
	"with",
	"and",
	"the",
	"cold",
	"pressed",
	"fresh",
	"juice",
	"milk",
	"shake",
	"salad",
	"wrap",
	"bowl",
	"oats",
	"overnight",
	"meal",
]);

function significantTokens(name: string): Set<string> {
	return new Set(
		n(name)
			.split(/[^a-z0-9]+/)
			.filter((t) => t.length >= 3 && !MATCH_STOP.has(t)),
	);
}

function recipeMatchNames(recipe: RecipeEntry): string[] {
	return [recipe.dishName, ...(recipe.aliases ?? [])];
}

/** Higher score = better match. 0 = no usable match. */
function scoreRecipeMatch(menuName: string, recipe: RecipeEntry): number {
	if (recipe.category === "Dressings") return 0;
	const menuKey = n(menuName);
	const candidates = recipeMatchNames(recipe).map(n);

	if (candidates.some((c) => c === menuKey)) return 10_000;
	// Prep recipes only attach to a dish of the very same name, never by fuzzy overlap.
	if (recipe.prep) return 0;

	let best = 0;
	for (const c of candidates) {
		if (c.length >= 8 && (menuKey.includes(c) || c.includes(menuKey))) {
			best = Math.max(best, 5_000 + Math.min(c.length, menuKey.length));
		}
	}
	if (best > 0) return best;

	const menuTokens = significantTokens(menuName);
	if (menuTokens.size === 0) return 0;

	for (const c of candidates) {
		const recipeTokens = significantTokens(c);
		if (recipeTokens.size === 0) continue;
		let overlap = 0;
		for (const t of menuTokens) {
			if (recipeTokens.has(t)) overlap += 1;
		}
		const denom = Math.max(menuTokens.size, recipeTokens.size);
		const ratio = overlap / denom;
		// Need 2+ shared tokens — single-token hits ("Chicken Fricassee" → chicken wrap) print the wrong recipe.
		if (overlap >= 2) {
			best = Math.max(best, Math.round(ratio * 1000) + overlap * 10);
		}
	}
	return best;
}

/**
 * Find the curated kitchen recipe for a live menu dish in `book`.
 * Exact / alias first, then token overlap so renames still match
 * without hand-updating aliases. Card titles always come from the live menu.
 */
export function findRecipeForDish(dishName: string, book: RecipeEntry[]): RecipeEntry | undefined {
	let best: RecipeEntry | undefined;
	let bestScore = 0;
	for (const r of book) {
		const score = scoreRecipeMatch(dishName, r);
		if (score > bestScore) {
			bestScore = score;
			best = r;
		}
	}
	return bestScore > 0 ? best : undefined;
}

/** Fallback kitchen guidance when no curated recipe exists. Live description is NOT copied here. */
export function recipeFromMenuFields(
	dishName: string,
	category: string,
	ingredients: string,
	_description: string,
): RecipeEntry {
	const ing = ingredients.trim() || "See menu ingredients / station mise";
	return {
		dishName,
		category: category || "Menu",
		ingredients: ing,
		method:
			"Prep from the menu ingredients above. Keep portions consistent; chill or heat as the category requires. Label and date prep containers.",
	};
}
