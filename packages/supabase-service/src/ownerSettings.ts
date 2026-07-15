import type { SupabaseClient } from "@supabase/supabase-js";
import type { OwnerAiSettings } from "@minute-menus/types";
import type { Database } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

export const DEFAULT_OWNER_AI_MODEL = "claude-haiku-4-5";

export async function getOwnerAiSettings(client: Client, ownerId: string): Promise<OwnerAiSettings> {
	const { data, error } = await client
		.from("owner_settings")
		.select("anthropic_api_key, anthropic_model")
		.eq("owner_id", ownerId)
		.maybeSingle();
	if (error) throw error;
	return {
		hasAnthropicApiKey: Boolean(data?.anthropic_api_key?.trim()),
		anthropicModel: data?.anthropic_model ?? DEFAULT_OWNER_AI_MODEL,
	};
}

export async function upsertOwnerAnthropicKey(
	client: Client,
	ownerId: string,
	apiKey: string,
	model = DEFAULT_OWNER_AI_MODEL,
): Promise<void> {
	const trimmed = apiKey
		.trim()
		.replace(/^["']+|["']+$/g, "")
		.replace(/[\u200B-\u200D\uFEFF]/g, "");
	if (!trimmed) throw new Error("API key cannot be empty");
	if (trimmed.startsWith("sk-ant-oat")) {
		throw new Error(
			"That looks like a Claude OAuth/setup token — it won't work here. Create an API key at console.anthropic.com/settings/keys (starts with sk-ant-api).",
		);
	}
	if (trimmed.startsWith("sk-ant-admin")) {
		throw new Error(
			"Admin keys can't call Claude models. Create a normal API key at console.anthropic.com/settings/keys (starts with sk-ant-api).",
		);
	}
	if (!trimmed.startsWith("sk-ant-api")) {
		throw new Error(
			"Use a Console API key starting with sk-ant-api (from console.anthropic.com/settings/keys), not a Claude.ai chat login token.",
		);
	}
	const { error } = await client.from("owner_settings").upsert(
		{
			owner_id: ownerId,
			anthropic_api_key: trimmed,
			anthropic_model: model,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: "owner_id" },
	);
	if (error) throw error;
}

export async function getOwnerAnthropicApiKey(
	client: Client,
	ownerId: string,
): Promise<{ apiKey: string; model: string } | null> {
	const { data, error } = await client
		.from("owner_settings")
		.select("anthropic_api_key, anthropic_model")
		.eq("owner_id", ownerId)
		.maybeSingle();
	if (error) throw error;
	const apiKey = data?.anthropic_api_key?.trim();
	if (!apiKey) return null;
	return { apiKey, model: data?.anthropic_model ?? DEFAULT_OWNER_AI_MODEL };
}
