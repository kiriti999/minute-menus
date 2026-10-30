import type { RecipeOverride, RecipeOverrideRow } from "@minute-menus/types";
import type { RecipeCardModel } from "./buildRecipeBookHtml";

/** Plain-text form of a recipe, as typed into the edit modal. */
export type RecipeDraft = {
	yieldNote: string;
	/** Quantity column headings separated by "|". */
	columns: string;
	/** One ingredient per line: `Item | qty | qty`. A line starting with `#` is a group heading. */
	ingredients: string;
	/** One method step per line. */
	steps: string;
	/** One note per line. */
	notes: string;
};

const lines = (text: string): string[] =>
	text
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

const cells = (line: string): string[] => line.split("|").map((c) => c.trim());

const rowToLine = (row: RecipeOverrideRow): string =>
	row.heading ? `# ${row.item}` : [row.item, ...row.qty].join(" | ");

function parseRow(line: string): RecipeOverrideRow {
	const heading = /^#+\s*(.*)$/.exec(line);
	if (heading) return { item: heading[1], qty: [], heading: true };
	const [item, ...qty] = cells(line);
	return { item, qty };
}

/** Users often type "1." themselves; the printed list is already numbered. */
const stripStepNumber = (step: string): string => step.replace(/^\d+[.)]\s*/, "");

export function draftFromCard(card: RecipeCardModel): RecipeDraft {
	const ingredients = card.rows.length ? card.rows.map(rowToLine) : lines(card.kitchenBuild);
	const steps = card.steps.length ? card.steps : lines(card.kitchenMethod);
	return {
		yieldNote: card.yieldNote ?? "",
		columns: card.columns.join(" | "),
		ingredients: ingredients.join("\n"),
		steps: steps.join("\n"),
		notes: card.notes.join("\n"),
	};
}

/** Parse the modal text into an override; throws a user-facing message when a row doesn't fit the columns. */
export function overrideFromDraft(recipeKey: string, draft: RecipeDraft): RecipeOverride {
	const named = cells(draft.columns).filter(Boolean);
	const columns = named.length ? named : ["Qty"];
	const rows = lines(draft.ingredients).map(parseRow);
	const tooWide = rows.find((row) => !row.heading && row.qty.length > columns.length);
	if (tooWide) {
		throw new Error(
			`"${tooWide.item}" has more quantities than columns (${columns.length}). Add column names, separated by |`,
		);
	}
	return {
		recipeKey,
		yieldNote: draft.yieldNote.trim() || null,
		columns,
		rows,
		steps: lines(draft.steps).map(stripStepNumber),
		notes: lines(draft.notes),
		hidden: false,
	};
}
