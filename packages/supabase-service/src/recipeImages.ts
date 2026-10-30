import type { SupabaseClient } from "@supabase/supabase-js";
import { compressDataUrl, putDishMediaFromDataUrl, DISH_MEDIA_BUCKET } from "@minute-menus/menu-persistence";
import type { RecipeImage } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

const normalizeKey = (recipeKey: string): string => recipeKey.trim().toLowerCase();

/** Short stable hash so keys that slugify the same ("a & b" / "a, b") never share a file. */
function hashKey(key: string): string {
	let h = 5381;
	for (const ch of key) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
	return h.toString(36);
}

/** Storage folder name for a card — must be path-safe; storage policy only checks the restaurant prefix. */
export function recipeImageFolder(recipeKey: string): string {
	const key = normalizeKey(recipeKey);
	const slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
	return `recipe-${slug || "card"}-${hashKey(key)}`;
}

export async function getRecipeImages(client: Client, restaurantId: string): Promise<RecipeImage[]> {
	const { data, error } = await client
		.from("recipe_images")
		.select("recipe_key, image_url")
		.eq("restaurant_id", restaurantId);
	if (error) throw error;
	return (data ?? []).map((row) => ({ recipeKey: row.recipe_key, imageUrl: row.image_url }));
}

/** Compress + upload to the dish-media bucket, then point the card at it. Returns the stored URL. */
export async function saveRecipeImage(
	client: Client,
	restaurantId: string,
	recipeKey: string,
	dataUrl: string,
): Promise<string> {
	const key = normalizeKey(recipeKey);
	if (!key) throw new Error("Recipe name is missing");
	if (!dataUrl.startsWith("data:image/")) throw new Error("Choose an image file");
	const compressed = await compressDataUrl(dataUrl);
	const publicUrl = await putDishMediaFromDataUrl(client, restaurantId, recipeImageFolder(key), compressed, "image");
	// The file path is reused on re-upload, so bust browser / CDN caches with a version suffix.
	const imageUrl = `${publicUrl}?v=${Date.now()}`;
	const { error } = await client.from("recipe_images").upsert(
		{ restaurant_id: restaurantId, recipe_key: key, image_url: imageUrl, updated_at: new Date().toISOString() },
		{ onConflict: "restaurant_id,recipe_key" },
	);
	if (error) throw error;
	return imageUrl;
}

export async function removeRecipeImage(client: Client, restaurantId: string, recipeKey: string): Promise<void> {
	const key = normalizeKey(recipeKey);
	const { error } = await client.from("recipe_images").delete().eq("restaurant_id", restaurantId).eq("recipe_key", key);
	if (error) throw error;
	// Best effort — an orphaned file is harmless, a failed row delete is not.
	await client.storage.from(DISH_MEDIA_BUCKET).remove([`${restaurantId}/${recipeImageFolder(key)}/image.webp`]);
}
