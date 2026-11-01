import type { Category, RecipeImage, RecipeLink, RecipeOverride } from "@minute-menus/types";
import {
	type RecipeEntry,
	type RecipeRow,
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
	const tokens = needle.split(/[^a-z0-9]+/).filter((t) => t.length >= 5 && t !== "dressing");
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

/** Searchable text of a kitchen recipe (structured rows/steps or plain text). */
function kitchenText(kitchen: RecipeEntry): string {
	const rows = (kitchen.rows ?? []).map((row) => row.item).join(" ");
	return [kitchen.ingredients, kitchen.method, rows, ...(kitchen.steps ?? [])].join(" ");
}

/** Curated recipes name their dressings; otherwise infer from menu + kitchen text. */
function collectDressingsForDish(dish: RecipeBookDish, kitchen: RecipeEntry, into: Set<string>): void {
	if (kitchen.dressings) {
		for (const name of kitchen.dressings) into.add(name.toLowerCase());
		return;
	}
	collectDressingsForText(
		`${dish.ingredients} ${dish.description} ${kitchenText(kitchen)}`,
		into,
	);
}

/** Printable card — live menu fields are never taken from curated RECIPE_BOOK. */
export type RecipeCardModel = {
	title: string;
	category: string;
	/** Live menu editor description (customer-facing). */
	liveDescription: string;
	/** Live menu editor ingredients. */
	liveIngredients: string;
	/** Plain-text kitchen build (used when there is no ingredient table). */
	kitchenBuild: string;
	/** Plain-text kitchen method (used when there are no numbered steps). */
	kitchenMethod: string;
	columns: string[];
	rows: RecipeRow[];
	steps: string[];
	notes: string[];
	yieldNote?: string;
	isDressing: boolean;
};

function kitchenFields(kitchen: RecipeEntry) {
	return {
		kitchenBuild: (kitchen.ingredients ?? "").trim(),
		kitchenMethod: (kitchen.method ?? "").trim(),
		columns: kitchen.columns ?? ["Qty"],
		rows: kitchen.rows ?? [],
		steps: kitchen.steps ?? [],
		notes: kitchen.notes ?? [],
	};
}

function cardFromLiveDish(dish: RecipeBookDish, kitchen: RecipeEntry): RecipeCardModel {
	return {
		title: dish.name,
		category: dish.category || kitchen.category || "Menu",
		liveDescription: dish.description,
		liveIngredients: dish.ingredients,
		...kitchenFields(kitchen),
		yieldNote: kitchen.yieldNote,
		isDressing: false,
	};
}

function cardFromEntry(entry: RecipeEntry, isDressing: boolean): RecipeCardModel {
	return {
		title: entry.dishName,
		category: entry.category,
		liveDescription: "",
		liveIngredients: "",
		...kitchenFields(entry),
		yieldNote: entry.yieldNote,
		isDressing,
	};
}

/** Cards for recipes a dish names as companions (e.g. the PET-bottle variant), once each. */
function companionCards(kitchen: RecipeEntry, seen: Set<string>): RecipeCardModel[] {
	return (kitchen.companions ?? []).flatMap((name) => {
		const key = name.toLowerCase();
		const entry = RECIPE_BOOK.find((r) => r.dishName.toLowerCase() === key);
		if (!entry || seen.has(key)) return [];
		seen.add(key);
		return [cardFromEntry(entry, false)];
	});
}

/** A deleted-only row carries no edit; only rows with content replace the built-in recipe. */
export const hasRecipeContent = (o: RecipeOverride): boolean => o.rows.length > 0 || o.steps.length > 0;

/** Owner edit replaces the built-in kitchen build, method, notes and yield of a card. */
function applyOverride(card: RecipeCardModel, override: RecipeOverride | undefined): RecipeCardModel {
	if (!override || !hasRecipeContent(override)) return card;
	const width = override.columns.length;
	return {
		...card,
		kitchenBuild: "",
		kitchenMethod: "",
		yieldNote: override.yieldNote ?? undefined,
		columns: override.columns,
		rows: override.rows.map((row) =>
			row.heading ? row : { ...row, qty: Array.from({ length: width }, (_, i) => row.qty[i] ?? "") },
		),
		steps: override.steps,
		notes: override.notes,
	};
}

/**
 * Build cards from the latest menu pull.
 * Title / description / ingredients always come from live menu rows.
 * Curated RECIPE_BOOK only supplies kitchen build and method.
 */
export function buildRecipeCards(
	menuDishes: RecipeBookDish[],
	overrides: RecipeOverride[] = [],
): RecipeCardModel[] {
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
		fromMenu.push(cardFromLiveDish(d, kitchen), ...companionCards(kitchen, seen));
		collectDressingsForDish(d, kitchen, neededDressingKeys);
	}

	const dressings = RECIPE_BOOK.filter(
		(r) => r.category === "Dressings" && neededDressingKeys.has(r.dishName.toLowerCase()),
	).map((e) => cardFromEntry(e, true));

	const byKey = new Map(overrides.map((o) => [o.recipeKey, o]));
	const prep = RECIPE_BOOK.filter((r) => r.prep && !seen.has(r.dishName.toLowerCase())).map((e) => cardFromEntry(e, true));
	return [...dressings, ...fromMenu, ...prep]
		.filter((card) => !byKey.get(recipeKey(card.title))?.hidden)
		.map((card) => applyOverride(card, byKey.get(recipeKey(card.title))));
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
		columns: c.columns,
		rows: c.rows,
		steps: c.steps,
		notes: c.notes,
		yieldNote: c.yieldNote,
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

const splitLines = (text: string): string[] =>
	text.split("\n").map((l) => l.trim()).filter(Boolean);

const section = (label: string, body: string): string =>
	`<p class="label">${escapeHtml(label)}</p>${body}`;

/** Key a card's saved links are stored under (live dish name, lower-cased). */
export const recipeKey = (title: string): string => title.trim().toLowerCase();

const cardAnchor = (title: string): string => `recipe-${recipeKey(title).replace(/[^a-z0-9]+/g, "-")}`;

const RECIPE_REF = /\[\[([^\]]+)\]\]/g;

/** Escapes text and turns `[[Recipe name]]` into an anchor to that card (plain text if no such recipe). */
function renderInline(text: string, ctx: RecipeCardContext): string {
	let out = "";
	let last = 0;
	for (const m of text.matchAll(RECIPE_REF)) {
		const title = ctx.titles.get(recipeKey(m[1]));
		out += escapeHtml(text.slice(last, m.index));
		const label = escapeHtml(title ?? m[1].trim());
		out += title
			? `<a class="xref" href="#${cardAnchor(title)}" data-goto="${cardAnchor(title)}">${label}<span class="xref-icon" aria-hidden="true">🔗</span></a>`
			: label;
		last = m.index + m[0].length;
	}
	return out + escapeHtml(text.slice(last));
}

function renderRow(row: RecipeRow, cols: number, ctx: RecipeCardContext): string {
	if (row.heading) {
		return `<tr class="grp"><th colspan="${cols + 1}">${escapeHtml(row.item)}</th></tr>`;
	}
	const cells = row.qty.map((q) => `<td class="qty">${escapeHtml(q)}</td>`).join("");
	return `<tr><td>${renderInline(row.item, ctx)}</td>${cells}</tr>`;
}

function renderTable(columns: string[], rows: RecipeRow[], ctx: RecipeCardContext): string {
	const head = ["Ingredient", ...columns].map((c) => `<th>${escapeHtml(c)}</th>`).join("");
	const body = rows.map((row) => renderRow(row, columns.length, ctx)).join("");
	return `<table class="ing"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderList(tag: "ul" | "ol", items: string[], ctx: RecipeCardContext): string {
	const lis = items.map((i) => `<li>${renderInline(i, ctx)}</li>`).join("");
	return `<${tag} class="list">${lis}</${tag}>`;
}

function renderBuild(card: RecipeCardModel, ctx: RecipeCardContext): string {
	const label = card.isDressing ? "Recipe" : "Kitchen build (portion guide)";
	if (card.rows.length) return section(label, renderTable(card.columns, card.rows, ctx));
	if (card.kitchenBuild) return section(label, renderList("ul", splitLines(card.kitchenBuild), ctx));
	return "";
}

function renderMethod(card: RecipeCardModel, ctx: RecipeCardContext): string {
	const steps = card.steps.length ? card.steps : splitLines(card.kitchenMethod);
	return steps.length ? section("Method", renderList("ol", steps, ctx)) : "";
}

function renderNotes(card: RecipeCardModel, ctx: RecipeCardContext): string {
	return card.notes.length ? section("Notes", renderList("ul", card.notes, ctx)) : "";
}

export type RecipeCardContext = {
	/** Card title per key — targets for `[[Recipe name]]` links. */
	titles: Map<string, string>;
	links: Map<string, RecipeLink>;
	/** Photo URL per card key. */
	images: Map<string, string>;
	/** Keys of cards the owner has edited (shown as "Edit recipe · edited"). */
	editedKeys: Set<string>;
	/** Show the per-card edit buttons (embedded owner view only). */
	editable: boolean;
};

const HTTP_URL = /^https?:\/\//i;

function linkChip(label: string, url: string | null | undefined): string {
	if (!url || !HTTP_URL.test(url)) return "";
	return `<a class="chip" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function renderLinks(card: RecipeCardModel, ctx: RecipeCardContext): string {
	const link = ctx.links.get(recipeKey(card.title));
	const chips = linkChip("▶ Video", link?.videoUrl) + linkChip("📄 Article", link?.articleUrl);
	const label = chips ? "Edit links" : "+ Add video / article links";
	const key = escapeHtml(recipeKey(card.title));
	const title = escapeHtml(card.title);
	const recipeLabel = ctx.editedKeys.has(recipeKey(card.title)) ? "✎ Edit / delete · edited" : "✎ Edit / delete";
	const edit = ctx.editable
		? `<button type="button" class="edit-links no-print" data-edit-links="${key}" data-title="${title}">${label}</button>` +
			`<button type="button" class="edit-links no-print" data-edit-recipe="${key}" data-title="${title}">${recipeLabel}</button>`
		: "";
	return chips || edit ? `<div class="links">${chips ? `<span class="no-print">${chips}</span>` : ""}${edit}</div>` : "";
}

function renderPhoto(card: RecipeCardModel, ctx: RecipeCardContext): string {
	const url = ctx.images.get(recipeKey(card.title));
	if (!url || !HTTP_URL.test(url)) return "";
	return `<img class="photo" src="${escapeHtml(url)}" alt="${escapeHtml(card.title)}" loading="lazy" />`;
}

function cardSearchText(card: RecipeCardModel): string {
	const rows = card.rows.flatMap((row) => [row.item, ...row.qty]);
	return [
		card.title,
		card.category,
		card.yieldNote ?? "",
		card.kitchenBuild,
		card.kitchenMethod,
		...rows,
		...card.steps,
		...card.notes,
	]
		.join(" ")
		.toLowerCase();
}

function renderCard(card: RecipeCardModel, ctx: RecipeCardContext): string {
	const yieldLine = card.yieldNote ? `<p class="yield">${escapeHtml(card.yieldNote)}</p>` : "";
	return `
<article class="card" id="${cardAnchor(card.title)}" data-search="${escapeHtml(cardSearchText(card))}">
  <h3>${escapeHtml(card.title)}</h3>
  ${yieldLine}
  ${renderPhoto(card, ctx)}
  ${renderLinks(card, ctx)}
  ${renderBuild(card, ctx)}
  ${renderMethod(card, ctx)}
  ${renderNotes(card, ctx)}
</article>`;
}

/**
 * Runs inside the sandboxed iframe (scripts only, no same-origin access).
 * The parent page drives it by postMessage: live search filter and print.
 * Edit-links clicks are reported back to the parent the same way.
 */
const FRAME_SCRIPT = `(function () {
  var cards = [].slice.call(document.querySelectorAll(".card"));
  var sections = [].slice.call(document.querySelectorAll("section"));
  var details = [].slice.call(document.querySelectorAll("details.sec"));
  var empty = document.getElementById("no-match");
  var saved = null;
  var beforePrint = null;
  function category(d) { return d.getAttribute("data-category"); }
  function openCategories() { return details.filter(function (d) { return d.open; }).map(category); }
  function restore(open) { details.forEach(function (d) { d.open = open.indexOf(category(d)) > -1; }); }
  function filter(query) {
    var terms = query.toLowerCase().split(/\\s+/).filter(Boolean);
    var shown = 0;
    if (terms.length && !saved) saved = openCategories();
    cards.forEach(function (card) {
      var hay = card.getAttribute("data-search") || "";
      var ok = terms.every(function (t) { return hay.indexOf(t) > -1; });
      card.classList.toggle("hide", !ok);
      if (ok) shown += 1;
    });
    sections.forEach(function (sec) {
      var any = !!sec.querySelector(".card:not(.hide)");
      sec.classList.toggle("hide", !any);
      if (terms.length) sec.querySelector("details").open = any;
    });
    if (!terms.length && saved) { restore(saved); saved = null; }
    empty.classList.toggle("hide", shown > 0);
  }
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent) return;
    var d = e.data || {};
    if (d.type === "filter") filter(String(d.query || ""));
    if (d.type === "print") window.print();
    if (d.type === "theme") document.body.classList.toggle("dark", d.dark === true);
  });
  window.addEventListener("beforeprint", function () {
    beforePrint = openCategories();
    details.forEach(function (d) { d.open = true; });
  });
  window.addEventListener("afterprint", function () {
    if (beforePrint) restore(beforePrint);
    beforePrint = null;
  });
  document.addEventListener("click", function (e) {
    var summary = e.target.closest && e.target.closest("summary");
    if (summary && !saved) {
      setTimeout(function () { window.parent.postMessage({ type: "sections", open: openCategories() }, "*"); }, 0);
    }
    var go = e.target.closest && e.target.closest("[data-goto]");
    if (go) {
      var target = document.getElementById(go.getAttribute("data-goto"));
      e.preventDefault();
      if (target) {
        var sec = target.closest("details.sec");
        if (sec) sec.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("flash");
        setTimeout(function () { target.classList.remove("flash"); }, 1600);
      }
      return;
    }
    var btn = e.target.closest && e.target.closest("[data-edit-links], [data-edit-recipe]");
    if (!btn) return;
    var isRecipe = btn.hasAttribute("data-edit-recipe");
    window.parent.postMessage(
      {
        type: isRecipe ? "edit-recipe" : "edit-links",
        key: btn.getAttribute(isRecipe ? "data-edit-recipe" : "data-edit-links"),
        title: btn.getAttribute("data-title")
      },
      "*"
    );
  });
})();`;

/** Full printable HTML document for the recipe book. */
export function buildRecipeBookHtml(opts: {
	restaurantName: string;
	menuDishes: RecipeBookDish[];
	/** Hide in-document nav when embedded in the app shell. */
	embedded?: boolean;
	/** Saved video / article links, shown as chips on each card. */
	links?: RecipeLink[];
	/** Photo per card, shown at the top of the card. */
	images?: RecipeImage[];
	/** Start in the dark screen theme (printing is always light). */
	dark?: boolean;
	/** Owner edits that replace the built-in kitchen build / method of a card. */
	overrides?: RecipeOverride[];
	/** Show "Edit links" / "Edit recipe" buttons (owner view). */
	editable?: boolean;
	/** Categories to render expanded (embedded view collapses the rest). */
	openSections?: string[];
}): string {
	const cards = buildRecipeCards(opts.menuDishes, opts.overrides);
	const groups = groupByCategory(cards);
	const ctx: RecipeCardContext = {
		titles: new Map(cards.map((c) => [recipeKey(c.title), c.title])),
		links: new Map((opts.links ?? []).map((l) => [l.recipeKey, l])),
		images: new Map((opts.images ?? []).map((i) => [i.recipeKey, i.imageUrl])),
		editedKeys: new Set((opts.overrides ?? []).filter(hasRecipeContent).map((o) => o.recipeKey)),
		editable: Boolean(opts.editable && opts.embedded),
	};
	const openSections = new Set(opts.openSections ?? []);
	const sections = groups
		.map((g) => {
			const cardHtml = g.items.map((c) => renderCard(c, ctx)).join("\n");
			// Standalone (non-embedded) documents have no script, so keep everything open for print.
			const open = !opts.embedded || openSections.has(g.category) ? " open" : "";
			return `<section><details class="sec" data-category="${escapeHtml(g.category)}"${open}><summary><h2>${escapeHtml(g.category)} <span class="count">${g.items.length}</span></h2></summary><div class="grid">${cardHtml}</div></details></section>`;
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
    summary { list-style: none; cursor: pointer; }
    summary::-webkit-details-marker { display: none; }
    summary h2 { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    summary h2::before { content: "▸"; font-size: 14px; width: 14px; }
    details[open] > summary h2::before { content: "▾"; }
    summary:hover h2 { color: #0b4a42; }
    .count {
      font-weight: 600; font-size: 10px; letter-spacing: 0; color: #5a7a74;
      background: #e8f0ed; border-radius: 999px; padding: 1px 8px;
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
    .body { margin: 0; white-space: pre-line; }
    table.ing { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .ing th, .ing td { border: 1px solid #d5e5e0; padding: 3px 6px; text-align: left; vertical-align: top; }
    .ing thead th { background: #e8f0ed; color: #3f5e57; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
    .ing td.qty, .ing thead th:not(:first-child) { text-align: right; }
    .ing tr.grp th { background: #f0f7f4; color: #1b5e20; font-size: 9.5px; }
    .list { margin: 2px 0 0; padding-left: 18px; }
    .list li { margin-bottom: 2px; }
    .hide { display: none !important; }
    .muted-note { color: #5a7a74; font-style: italic; padding: 24px 0; text-align: center; }
    .links { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 2px 0 4px; }
    .chip {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 10px; font-weight: 700;
      background: #e8f5e9; color: #1b5e20; border: 1px solid #2e7d32; text-decoration: none;
    }
    .edit-links {
      appearance: none; border: 1px dashed #5a7a74; background: transparent; color: #3f5e57;
      font-size: 10px; padding: 2px 10px; border-radius: 999px; cursor: pointer;
    }
    .edit-links:hover { background: #f0f7f4; }
    .xref { color: #1b5e20; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
    .xref-icon { font-size: 0.85em; margin-left: 2px; }
    .card.flash { outline: 2px solid #2e7d32; }
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
    .photo {
      display: block; width: 100%; max-height: 160px; object-fit: cover;
      border-radius: 6px; margin: 0 0 6px; border: 1px solid #d5e5e0;
    }
    @media screen {
      body.dark { background: #0d1512; color: #e3eeea; }
      .dark .meta, .dark .label, .dark .muted-note { color: #93b0a8; }
      .dark .banner { background: #14261d; border-color: #3d8f43; }
      .dark h2 { color: #7fd18a; border-bottom-color: #3d8f43; }
      .dark summary:hover h2 { color: #b6ebbd; }
      .dark .count { background: #1c2e29; color: #9fc2b8; }
      .dark .card { background: #131d1a; border-color: #243630; }
      .dark .yield { color: #7fd18a; }
      .dark .ing th, .dark .ing td, .dark .photo { border-color: #2a3d37; }
      .dark .ing thead th { background: #1c2e29; color: #b4cdc5; }
      .dark .ing tr.grp th { background: #172722; color: #7fd18a; }
      .dark .xref { color: #9be0a5; }
      .dark .chip { background: #14261d; color: #9be0a5; border-color: #3d8f43; }
      .dark .edit-links { border-color: #6f8f87; color: #b4cdc5; }
      .dark .edit-links:hover { background: #1c2e29; }
    }
    @media print {
      body { background: #fff; font-size: 10px; }
      .wrap { max-width: none; padding: 0; }
      .no-print { display: none !important; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body${opts.dark ? ' class="dark"' : ""}>
  <div class="wrap">
    ${nav}
    <header>
      <h1>${name} — Kitchen Recipe Book</h1>
      <p class="meta">Kitchen builds · methods · printable A4</p>
      <div class="banner">
        Containers: large salads <strong>750ml</strong> · small / medium salads <strong>500ml</strong> (60% of large) · pasta <strong>500ml</strong> · appetizer rice items <strong>300ml</strong> · dressing <strong>50ml</strong> cups · thick shakes <strong>300ml</strong> glass.
      </div>
    </header>
    ${sections}
    <p id="no-match" class="hide muted-note">No recipes match your search.</p>
  </div>
  ${opts.embedded ? `<script>${FRAME_SCRIPT}</script>` : ""}
</body>
</html>`;
}
