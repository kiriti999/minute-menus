import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeBookRole, RecipeEntry } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

/** Owner / team role for the signed-in user, or null when signed out or not on the team. */
export async function getRecipeBookRole(client: Client, restaurantId: string): Promise<RecipeBookRole | null> {
	const { data: session } = await client.auth.getSession();
	if (!session.session) return null;
	const { data, error } = await client.rpc("recipe_book_role", { p_restaurant_id: restaurantId });
	if (error) throw error;
	return data === "owner" || data === "team" ? data : null;
}

/** Built-in recipes. The database refuses anyone who is not the owner or an active team member. */
export async function getRecipeBookDefaults(client: Client, restaurantId: string): Promise<RecipeEntry[]> {
	const { data, error } = await client.rpc("get_recipe_book_defaults", { p_restaurant_id: restaurantId });
	if (error) throw error;
	return Array.isArray(data) ? (data as unknown as RecipeEntry[]) : [];
}

/** Emails a one-time sign-in code. */
export async function sendRecipeBookCode(client: Client, email: string): Promise<void> {
	const { error } = await client.auth.signInWithOtp({ email: email.trim().toLowerCase() });
	if (error) throw error;
}

export async function verifyRecipeBookCode(client: Client, email: string, code: string): Promise<void> {
	const { error } = await client.auth.verifyOtp({
		email: email.trim().toLowerCase(),
		token: code.trim(),
		type: "email",
	});
	if (error) throw error;
}

/** Google sign-in that returns to the page it was started from. */
export async function signInWithGoogleHere(client: Client): Promise<void> {
	const { error } = await client.auth.signInWithOAuth({
		provider: "google",
		options: { redirectTo: window.location.href },
	});
	if (error) throw error;
}
