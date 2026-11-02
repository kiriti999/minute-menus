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

/** Asks the server to email a one-time sign-in code; it only sends to the owner and active team emails. */
export async function sendRecipeBookCode(slug: string, email: string): Promise<void> {
	const response = await fetch("/api/keepalive?action=recipe-code", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ slug, email }),
	});
	if (response.ok) return;
	const body = (await response.json().catch(() => null)) as { error?: string } | null;
	throw new Error(body?.error ?? "Could not send the code. Try again.");
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
