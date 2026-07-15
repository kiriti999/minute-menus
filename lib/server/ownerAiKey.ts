import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_MODEL = "claude-haiku-4-5";

type OwnerSettingsRow = {
	anthropic_api_key: string | null;
	anthropic_model: string | null;
};

/** Untyped client — avoids coupling to generated DB types that may lag schema pushes. */
export async function fetchOwnerAnthropicKey(
	admin: SupabaseClient,
	ownerId: string,
): Promise<{ apiKey: string; model: string } | null> {
	const { data, error } = await admin
		.from("owner_settings")
		.select("anthropic_api_key, anthropic_model")
		.eq("owner_id", ownerId)
		.maybeSingle();
	if (error) {
		const message = error.message ?? String(error);
		if (/relation .*owner_settings.* does not exist|Could not find the table/i.test(message)) {
			throw new Error(
				"owner_settings table is missing — run pnpm db:push (or apply supabase/schema.sql) then try again",
			);
		}
		throw error;
	}
	const row = data as OwnerSettingsRow | null;
	const apiKey = row?.anthropic_api_key?.trim();
	if (!apiKey) return null;
	return { apiKey, model: row?.anthropic_model?.trim() || DEFAULT_MODEL };
}
