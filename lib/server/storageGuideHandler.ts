import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IngredientStorageAdvice, MenuItemForStorageGuide, StorageGuideResult } from "@minute-menus/types";
import { requireSupabaseAdminOrThrow, verifyOwnerForRestaurant } from "./verifyOwnerRestaurant";
import { fetchOwnerAnthropicKey } from "./ownerAiKey";

type StorageGuideBody = {
	action: "storage-guide";
	restaurantId?: string;
	menuItems?: MenuItemForStorageGuide[];
};

const DEFAULT_MODEL = "claude-haiku-4-5";

/** Self-contained (npm imports only) so Vercel bundles reliably with parse-invoice. */
const parseAdviceJson = (raw: string): IngredientStorageAdvice[] => {
	const trimmed = raw.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim();
	const candidate = fenced ?? trimmed;
	const tryParse = (text: string): IngredientStorageAdvice[] => {
		const parsed = JSON.parse(text) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((row) => {
				const item = row as Record<string, unknown>;
				const dishes = item.usedInDishes ?? item.used_in_dishes ?? item.dishes;
				return {
					ingredient: String(item.ingredient ?? "").trim(),
					storagePlace: String(item.storagePlace ?? item.storage_place ?? "").trim(),
					shelfLife: String(item.shelfLife ?? item.shelf_life ?? "").trim(),
					simpleHacks: String(item.simpleHacks ?? item.simple_hacks ?? item.hacks ?? "").trim(),
					usedInDishes: Array.isArray(dishes)
						? dishes.map((d) => String(d).trim()).filter(Boolean)
						: [],
				};
			})
			.filter((row) => row.ingredient.length > 0);
	};
	try {
		return tryParse(candidate);
	} catch {
		const start = candidate.indexOf("[");
		const end = candidate.lastIndexOf("]");
		if (start === -1 || end === -1) throw new Error("Could not parse AI storage guide — try again");
		return tryParse(candidate.slice(start, end + 1));
	}
};

async function generateGuide(
	apiKey: string,
	restaurantName: string,
	menuItems: MenuItemForStorageGuide[],
	model: string,
): Promise<IngredientStorageAdvice[]> {
	const client = new Anthropic({ apiKey });
	const menuPayload = menuItems
		.filter((item) => item.ingredients.trim() || item.name.trim())
		.map((item) => ({
			dish: item.name,
			category: item.category,
			ingredients: item.ingredients.trim() || "(see dish name)",
		}));

	const response = await client.messages.create({
		model: model || DEFAULT_MODEL,
		max_tokens: 4096,
		messages: [
			{
				role: "user",
				content: `You are a cloud-kitchen food safety and prep coach for "${restaurantName}" in India.

Scan every menu dish and its ingredients below. Extract UNIQUE raw ingredients (veggies, fruits, dairy, grains, proteins, herbs, etc.).

For EACH unique ingredient return practical storage guidance:
- Where: fridge (which zone), counter, pantry, or freezer — be specific and simple
- Shelf life: realistic days at peak quality
- Simple hacks: 1–2 short kitchen-friendly tips (wrap, container, wash-dry, etc.)

Rules:
- Plain English, no jargon, no markdown in values
- Focus on vegetables, fruits, and perishables; include dairy/proteins when present
- Merge duplicates (e.g. "tomato" across dishes → one row with all dish names in usedInDishes)
- Cover every ingredient you can infer from the menu; skip only pure water/ice
- Return ONLY a JSON array, no prose before or after

Each object keys: ingredient, storagePlace, shelfLife, simpleHacks, usedInDishes (string array of dish names)

MENU:
${JSON.stringify(menuPayload, null, 2)}`,
			},
		],
	});

	const block = response.content[0];
	if (!block || block.type !== "text") throw new Error("Unexpected AI response");
	const tips = parseAdviceJson(block.text);
	if (!tips.length) throw new Error("AI returned no storage tips");
	return tips;
}

export async function handleStorageGuideRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
	try {
		const body = (req.body ?? {}) as StorageGuideBody;
		const { restaurantId, menuItems } = body;
		if (!restaurantId || !Array.isArray(menuItems) || menuItems.length === 0) {
			res.status(400).json({ error: "restaurantId and menuItems are required" });
			return;
		}

		const auth = await verifyOwnerForRestaurant(req, restaurantId);
		if (!auth) {
			res.status(403).json({ error: "Not allowed for this restaurant" });
			return;
		}

		const admin = requireSupabaseAdminOrThrow();
		const keyRow = await fetchOwnerAnthropicKey(admin, auth.userId);
		if (!keyRow) {
			res.status(428).json({
				error: "missing_api_key",
				message: "Add your Claude API key to generate a storage guide.",
			});
			return;
		}

		const { data: restaurant, error: restErr } = await admin
			.from("restaurants")
			.select("name")
			.eq("id", restaurantId)
			.single();
		if (restErr || !restaurant) {
			res.status(404).json({ error: "Restaurant not found" });
			return;
		}

		const sanitized = menuItems
			.map((item) => ({
				name: String(item.name ?? "").trim(),
				category: String(item.category ?? "").trim(),
				ingredients: String(item.ingredients ?? "").trim(),
			}))
			.filter((item) => item.name.length > 0);

		if (!sanitized.length) {
			res.status(400).json({ error: "No menu items with names to scan" });
			return;
		}

		const tips = await generateGuide(keyRow.apiKey, restaurant.name, sanitized, keyRow.model);
		const result: StorageGuideResult = {
			generatedAt: new Date().toISOString(),
			restaurantName: restaurant.name,
			tips,
		};
		res.status(200).json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error("[storage-guide] failed", message);
		res.status(502).json({ error: "Failed to generate storage guide", detail: message });
	}
}
