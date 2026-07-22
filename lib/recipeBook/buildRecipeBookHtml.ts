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
				name: dish.name,
				category: cat.title,
				ingredients: dish.ingredients?.trim() ?? "",
				description: dish.description?.trim() ?? "",
			});
		}
	}
	return rows;
}

/** Build recipe list: curated match first, else generate from menu fields. Always include shared dressings. */
export function buildRecipeEntries(menuDishes: RecipeBookDish[]): RecipeEntry[] {
	const dressings = RECIPE_BOOK.filter((r) => r.category === "Dressings");
	const seen = new Set<string>();
	const fromMenu: RecipeEntry[] = [];

	for (const d of menuDishes) {
		const key = d.name.trim().toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		const curated = findRecipeForDish(d.name);
		if (curated) {
			fromMenu.push({
				...curated,
				category: d.category || curated.category,
				ingredients: curated.ingredients,
			});
			continue;
		}
		fromMenu.push(recipeFromMenuFields(d.name, d.category, d.ingredients, d.description));
	}

	return [...dressings, ...fromMenu];
}

function groupByCategory(entries: RecipeEntry[]): { category: string; items: RecipeEntry[] }[] {
	const order: string[] = [];
	const map = new Map<string, RecipeEntry[]>();
	for (const e of entries) {
		const cat = e.category || "Menu";
		if (!map.has(cat)) {
			map.set(cat, []);
			order.push(cat);
		}
		map.get(cat)!.push(e);
	}
	return order.map((category) => ({ category, items: map.get(category)! }));
}

function renderCard(entry: RecipeEntry): string {
	const hacks = entry.hacks
		.map(
			(h) =>
				`<li><strong>${escapeHtml(h.title)}:</strong> ${escapeHtml(h.detail)}</li>`,
		)
		.join("");
	const yieldLine = entry.yieldNote
		? `<p class="yield">${escapeHtml(entry.yieldNote)}</p>`
		: "";
	return `
<article class="card">
  <h3>${escapeHtml(entry.dishName)}</h3>
  ${yieldLine}
  <p class="label">Cost-effective build</p>
  <p class="body">${escapeHtml(entry.ingredients)}</p>
  <p class="label">Easy method</p>
  <p class="body">${escapeHtml(entry.method)}</p>
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
	const entries = buildRecipeEntries(opts.menuDishes);
	const groups = groupByCategory(entries);
	const sections = groups
		.map((g) => {
			const cards = g.items.map(renderCard).join("\n");
			return `<section><h2>${escapeHtml(g.category)}</h2><div class="grid">${cards}</div></section>`;
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
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${nav}
    <header>
      <h1>${name} — Kitchen Recipe Book</h1>
      <p class="meta">Cost-effective builds · easy methods · kitchen hacks · printable A4</p>
      <div class="banner">
        <strong>House rules:</strong> Salad bowls weigh <strong>300–350g</strong> (no dressing tossed in).
        Dressing always in a <strong>120ml</strong> side cup (fill 110–120ml).
        Overnight oats jars finish at <strong>250–280g</strong>. Prefer mayo-based dressings over raw-egg emulsions.
      </div>
    </header>
    ${sections}
  </div>
</body>
</html>`;
}
