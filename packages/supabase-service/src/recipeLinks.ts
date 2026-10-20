import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeLink } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

const HTTP_URL = /^https?:\/\//i;

/** Trim a pasted link; blank → null; anything that isn't http(s) is rejected. */
export function normalizeRecipeUrl(raw: string | null | undefined, label: string): string | null {
	const url = (raw ?? "").trim();
	if (!url) return null;
	if (!HTTP_URL.test(url)) throw new Error(`${label} link must start with http:// or https://`);
	return url;
}

export async function getRecipeLinks(client: Client, restaurantId: string): Promise<RecipeLink[]> {
	const { data, error } = await client
		.from("recipe_links")
		.select("recipe_key, video_url, article_url")
		.eq("restaurant_id", restaurantId);
	if (error) throw error;
	return (data ?? []).map((row) => ({
		recipeKey: row.recipe_key,
		videoUrl: row.video_url,
		articleUrl: row.article_url,
	}));
}

/** Save both links for a card; clearing both removes the row. */
export async function saveRecipeLink(client: Client, restaurantId: string, link: RecipeLink): Promise<void> {
	const videoUrl = normalizeRecipeUrl(link.videoUrl, "Video");
	const articleUrl = normalizeRecipeUrl(link.articleUrl, "Article");
	const key = link.recipeKey.trim().toLowerCase();
	if (!key) throw new Error("Recipe name is missing");
	if (!videoUrl && !articleUrl) {
		const { error } = await client.from("recipe_links").delete().eq("restaurant_id", restaurantId).eq("recipe_key", key);
		if (error) throw error;
		return;
	}
	const { error } = await client.from("recipe_links").upsert(
		{
			restaurant_id: restaurantId,
			recipe_key: key,
			video_url: videoUrl,
			article_url: articleUrl,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "restaurant_id,recipe_key" },
	);
	if (error) throw error;
}
