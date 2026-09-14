import type { Category } from "@minute-menus/types";
import {
	type RecipeEntry,
	findRecipeForDish,
	recipeFromMenuFields,
	RECIPE_BOOK,
} from "./recipeBookData";

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export type RecipeBookDish = {
	name: string;
	category: string;
	ingredients: string;
	description: string;
};

/** Flatten live menu into dish rows for matching. */
export function dishesFromMenu(menu: Category[]): RecipeBookDish[] {
	const rows: RecipeBookDish[] = [];
	for (const cat of menu) {
		for (const dish of cat.items) {
			rows.push({
				name: String(dish.name ?? "").trim(),
				category: String(cat.title ?? "").trim(),
				ingredients: String(dish.ingredients ?? "").trim(),
				description: String(dish.description ?? "").trim(),
			});
		}
	}
	return rows;
}

/** True if recipe/menu text references this dressing (e.g. "Caesar cup", "vinaigrette"). */
function textMentionsDressing(text: string, dressingName: string): boolean {
	const hay = text.toLowerCase();
	const needle = dressingName.toLowerCase();
	if (hay.includes(needle)) return true;
	const tokens = needle.split(/[^a-z0-9]+/).filter((t) => t.length >= 5);
	return tokens.some((t) => hay.includes(t));
}

function collectDressingsForText(text: string, into: Set<string>): void {
	for (const dressing of RECIPE_BOOK) {
		if (dressing.category !== "Dressings") continue;
		if (textMentionsDressing(text, dressing.dishName)) {
			into.add(dressing.dishName.toLowerCase());
		}
	}
}

/** Printable card — live menu fields are never taken from curated RECIPE_BOOK. */
export type RecipeCardModel = {
	title: string;
	category: string;
	/** Live menu editor description (customer-facing). */
	liveDescription: string;
	/** Live menu editor ingredients. */
	liveIngredients: string;
	/** Curated kitchen portion guide (optional). */
	kitchenBuild: string;
	/** Curated kitchen method (optional). */
	kitchenMethod: string;
	yieldNote?: string;
	hacks: RecipeEntry["hacks"];
	isDressing: boolean;
};

function cardFromLiveDish(dish: RecipeBookDish, kitchen: RecipeEntry): RecipeCardModel {
	return {
		title: dish.name,
		category: dish.category || kitchen.category || "Menu",
		liveDescription: dish.description,
		liveIngredients: dish.ingredients,
		kitchenBuild: kitchen.ingredients.trim(),
		kitchenMethod: kitchen.method.trim(),
		yieldNote: kitchen.yieldNote,
		hacks: kitchen.hacks,
		isDressing: false,
	};
}

function cardFromDressing(entry: RecipeEntry): RecipeCardModel {
	return {
		title: entry.dishName,
		category: "Dressings",
		liveDescription: "",
		liveIngredients: "",
		kitchenBuild: entry.ingredients.trim(),
		kitchenMethod: entry.method.trim(),
		yieldNote: entry.yieldNote,
		hacks: entry.hacks,
		isDressing: true,
	};
}

/**
 * Build cards from the latest menu pull.
 * Title / description / ingredients always come from live menu rows.
 * Curated RECIPE_BOOK only supplies kitchen build, method, and hacks.
 */
export function buildRecipeCards(menuDishes: RecipeBookDish[]): RecipeCardModel[] {
	const seen = new Set<string>();
	const fromMenu: RecipeCardModel[] = [];
	const neededDressingKeys = new Set<string>();

	for (const d of menuDishes) {
		const key = d.name.trim().toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);

		const curated = findRecipeForDish(d.name);
		const kitchen =
			curated ??
			recipeFromMenuFields(d.name, d.category, d.ingredients, d.description);
		fromMenu.push(cardFromLiveDish(d, kitchen));
		collectDressingsForText(
			`${d.ingredients} ${d.description} ${kitchen.ingredients} ${kitchen.method}`,
			neededDressingKeys,
		);
	}

	const dressings = RECIPE_BOOK.filter(
		(r) => r.category === "Dressings" && neededDressingKeys.has(r.dishName.toLowerCase()),
	).map(cardFromDressing);

	return [...dressings, ...fromMenu];
}

/** @deprecated Use buildRecipeCards — kept for any older imports. */
export function buildRecipeEntries(menuDishes: RecipeBookDish[]): RecipeEntry[] {
	return buildRecipeCards(menuDishes).map((c) => ({
		dishName: c.title,
		category: c.category,
		menuDescription: c.liveDescription || undefined,
		menuIngredients: c.liveIngredients || undefined,
		ingredients: c.kitchenBuild,
		method: c.kitchenMethod,
		yieldNote: c.yieldNote,
		hacks: c.hacks,
	}));
}

function groupByCategory(cards: RecipeCardModel[]): { category: string; items: RecipeCardModel[] }[] {
	const order: string[] = [];
	const map = new Map<string, RecipeCardModel[]>();
	for (const c of cards) {
		const cat = c.category || "Menu";
		if (!map.has(cat)) {
			map.set(cat, []);
			order.push(cat);
		}
		map.get(cat)!.push(c);
	}
	return order.map((category) => ({ category, items: map.get(category)! }));
}

function fieldBlock(label: string, value: string, emptyHint: string): string {
	if (value) {
		return `<p class="label">${escapeHtml(label)}</p><p class="body menu-field">${escapeHtml(value)}</p>`;
	}
	return `<p class="label">${escapeHtml(label)}</p><p class="body muted">${escapeHtml(emptyHint)}</p>`;
}

function renderCard(card: RecipeCardModel): string {
	const hacks = card.hacks
		.map(
			(h) =>
				`<li><strong>${escapeHtml(h.title)}:</strong> ${escapeHtml(h.detail)}</li>`,
		)
		.join("");
	const yieldLine = card.yieldNote
		? `<p class="yield">${escapeHtml(card.yieldNote)}</p>`
		: "";

	if (card.isDressing) {
		return `
<article class="card">
  <h3>${escapeHtml(card.title)}</h3>
  ${yieldLine}
  <p class="label">Batch recipe</p>
  <p class="body">${escapeHtml(card.kitchenBuild)}</p>
  <p class="label">Kitchen method</p>
  <p class="body">${escapeHtml(card.kitchenMethod)}</p>
  <p class="label">Kitchen hacks</p>
  <ul class="hacks">${hacks}</ul>
</article>`;
	}

	const liveDesc = fieldBlock(
		"Description (from menu)",
		card.liveDescription,
		"Not set in menu editor — save a description on this dish, then refresh.",
	);
	const liveIng = fieldBlock(
		"Ingredients (from menu)",
		card.liveIngredients,
		"Not set in menu editor — save ingredients on this dish, then refresh.",
	);
	const kitchen =
		card.kitchenBuild || card.kitchenMethod
			? `${card.kitchenBuild ? `<p class="label">Kitchen build (portion guide)</p><p class="body">${escapeHtml(card.kitchenBuild)}</p>` : ""}
  ${card.kitchenMethod ? `<p class="label">Kitchen method</p><p class="body">${escapeHtml(card.kitchenMethod)}</p>` : ""}`
			: "";

	return `
<article class="card">
  <h3>${escapeHtml(card.title)}</h3>
  ${yieldLine}
  ${liveDesc}
  ${liveIng}
  ${kitchen}
  <p class="label">Kitchen hacks</p>
  <ul class="hacks">${hacks}</ul>
</article>`;
}

/** Full printable HTML document for the recipe book. */
export function buildRecipeBookHtml(opts: {
	restaurantName: string;
	menuDishes: RecipeBookDish[];
	/** Hide in-document nav when embedded in the app shell. */
	embedded?: boolean;
}): string {
	const cards = buildRecipeCards(opts.menuDishes);
	const groups = groupByCategory(cards);
	const sections = groups
		.map((g) => {
			const cardHtml = g.items.map(renderCard).join("\n");
			return `<section><h2>${escapeHtml(g.category)}</h2><div class="grid">${cardHtml}</div></section>`;
		})
		.join("\n");

	const name = escapeHtml(opts.restaurantName || "Recipe book");
	const nav = opts.embedded
		? ""
		: `<div class="no-print">
      <button class="btn" type="button" onclick="window.print()">Print / Save PDF</button>
    </div>`;
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${name} — Kitchen Recipe Book</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #14201c;
      font-size: 11px;
      line-height: 1.4;
      margin: 0;
      background: #f7faf8;
    }
    .wrap { max-width: 920px; margin: 0 auto; padding: 20px 16px 48px; }
    header { margin-bottom: 16px; page-break-after: avoid; }
    h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .meta { color: #4a635c; margin: 0 0 10px; font-size: 11px; }
    .banner {
      background: #e8f5e9;
      border: 1.5px solid #2e7d32;
      padding: 10px 12px;
      margin: 0 0 18px;
      font-size: 11px;
    }
    h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1b5e20;
      border-bottom: 2px solid #2e7d32;
      padding-bottom: 4px;
      margin: 22px 0 10px;
      page-break-after: avoid;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    @media (max-width: 720px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: #fff;
      border: 1px solid #d5e5e0;
      border-radius: 8px;
      padding: 10px 12px;
      page-break-inside: avoid;
    }
    .card h3 { margin: 0 0 4px; font-size: 13px; }
    .yield { margin: 0 0 6px; color: #2e7d32; font-weight: 600; font-size: 10.5px; }
    .label {
      margin: 8px 0 2px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #5a7a74;
    }
    .body { margin: 0; }
    .menu-field {
      background: #f0f7f4;
      border: 1px solid #d5e5e0;
      border-radius: 6px;
      padding: 6px 8px;
      white-space: pre-wrap;
    }
    .muted { color: #8a9e97; font-style: italic; }
    .hacks { margin: 4px 0 0; padding-left: 16px; }
    .hacks li { margin-bottom: 3px; }
    .hacks strong { color: #0b4a42; }
    .no-print { margin: 0 0 14px; display: flex; gap: 8px; flex-wrap: wrap; }
    .btn {
      appearance: none;
      border: 1px solid #0b4a42;
      background: #0b4a42;
      color: #fff;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 999px;
      cursor: pointer;
    }
    @media print {
      body { background: #fff; font-size: 10px; }
      .wrap { max-width: none; padding: 0; }
      .no-print { display: none !important; }
      .card { box-shadow: none; }
      .menu-field { background: #f0f7f4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${nav}
    <header>
      <h1>${name} — Kitchen Recipe Book</h1>
      <p class="meta">Live menu description &amp; ingredients · kitchen builds · hacks · printable A4</p>
      <div class="banner">
        <strong>From your saved menu:</strong> green boxes are the exact <strong>description</strong> and <strong>ingredients</strong> from the menu editor (after Save Changes).
        Grey kitchen build / method text is station guidance only — not the customer-facing description.
        Salad bowls <strong>300–350g</strong>; dressing <strong>120ml</strong> side cup; oats <strong>250–280g</strong>.
      </div>
    </header>
    ${sections}
  </div>
</body>
</html>`;
}
