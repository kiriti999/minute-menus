import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";

const DEFAULT_MODEL = "claude-haiku-4-5";

export async function fetchOwnerAnthropicKey(
	admin: SupabaseClient<Database>,
	ownerId: string,
): Promise<{ apiKey: string; model: string } | null> {
	const { data, error } = await admin
		.from("owner_settings")
		.select("anthropic_api_key, anthropic_model")
		.eq("owner_id", ownerId)
		.maybeSingle();
	if (error) throw error;
	const apiKey = data?.anthropic_api_key?.trim();
	if (!apiKey) return null;
	return { apiKey, model: data?.anthropic_model ?? DEFAULT_MODEL };
}
