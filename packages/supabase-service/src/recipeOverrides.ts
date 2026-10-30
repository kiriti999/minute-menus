import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeOverride, RecipeOverrideRow } from "@minute-menus/types";
import type { Database, Json } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

const MAX_ROWS = 200;
const MAX_STEPS = 100;
const MAX_COLUMNS = 6;
const MAX_TEXT = 500;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "");

const cleanList = (value: unknown, max: number): string[] =>
	(Array.isArray(value) ? value : []).map(clean).filter(Boolean).slice(0, max);

function cleanRow(value: unknown): RecipeOverrideRow | null {
	const row = (value ?? {}) as { item?: unknown; qty?: unknown; heading?: unknown };
	const item = clean(row.item);
	if (!item) return null;
	if (row.heading === true) return { item, qty: [], heading: true };
	const qty = (Array.isArray(row.qty) ? row.qty : []).map(clean).slice(0, MAX_COLUMNS);
	return { item, qty };
}

/** Trim, drop blanks and cap sizes — applied on read and write so stored JSON can never break the page. */
export function sanitizeRecipeOverride(raw: {
	recipeKey: string;
	yieldNote?: string | null;
	columns?: unknown;
	rows?: unknown;
	steps?: unknown;
	notes?: unknown;
	hidden?: boolean;
}): RecipeOverride {
	const columns = cleanList(raw.columns, MAX_COLUMNS);
	const rows = (Array.isArray(raw.rows) ? raw.rows : []).map(cleanRow).filter((r): r is RecipeOverrideRow => r !== null);
	return {
		recipeKey: raw.recipeKey.trim().toLowerCase(),
		yieldNote: clean(raw.yieldNote) || null,
		columns: columns.length ? columns : ["Qty"],
		rows: rows.slice(0, MAX_ROWS),
		steps: cleanList(raw.steps, MAX_STEPS),
		notes: cleanList(raw.notes, MAX_STEPS),
		hidden: raw.hidden === true,
	};
}

export async function getRecipeOverrides(client: Client, restaurantId: string): Promise<RecipeOverride[]> {
	const { data, error } = await client
		.from("recipe_overrides")
		.select("recipe_key, yield_note, columns, rows, steps, notes, hidden")
		.eq("restaurant_id", restaurantId);
	if (error) throw error;
	return (data ?? []).map((row) =>
		sanitizeRecipeOverride({
			recipeKey: row.recipe_key,
			yieldNote: row.yield_note,
			columns: row.columns,
			rows: row.rows,
			steps: row.steps,
			notes: row.notes,
			hidden: row.hidden,
		}),
	);
}

export async function saveRecipeOverride(client: Client, restaurantId: string, override: RecipeOverride): Promise<void> {
	const safe = sanitizeRecipeOverride(override);
	if (!safe.recipeKey) throw new Error("Recipe name is missing");
	if (!safe.rows.length && !safe.steps.length) {
		throw new Error("Add at least one ingredient or method step (or reset to the default recipe)");
	}
	const { error } = await client.from("recipe_overrides").upsert(
		{
			restaurant_id: restaurantId,
			recipe_key: safe.recipeKey,
			yield_note: safe.yieldNote,
			columns: safe.columns,
			rows: safe.rows as unknown as Json,
			steps: safe.steps,
			notes: safe.notes,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "restaurant_id,recipe_key" },
	);
	if (error) throw error;
}

/** Restores the built-in recipe for a card. */
export async function deleteRecipeOverride(client: Client, restaurantId: string, recipeKey: string): Promise<void> {
	const { error } = await client
		.from("recipe_overrides")
		.delete()
		.eq("restaurant_id", restaurantId)
		.eq("recipe_key", recipeKey.trim().toLowerCase());
	if (error) throw error;
}

/** Delete (hide) or restore a card. Hiding keeps any saved edits so a restore brings them back. */
export async function setRecipeHidden(
	client: Client,
	restaurantId: string,
	recipeKey: string,
	hidden: boolean,
): Promise<void> {
	const key = recipeKey.trim().toLowerCase();
	if (!key) throw new Error("Recipe name is missing");
	const query = hidden
		? client.from("recipe_overrides").upsert(
				{ restaurant_id: restaurantId, recipe_key: key, hidden: true, updated_at: new Date().toISOString() },
				{ onConflict: "restaurant_id,recipe_key" },
			)
		: client.from("recipe_overrides").update({ hidden: false }).eq("restaurant_id", restaurantId).eq("recipe_key", key);
	const { error } = await query;
	if (error) throw error;
}
