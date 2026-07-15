import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "@minute-menus/logger";
import type { IngredientStorageAdvice, MenuItemForStorageGuide } from "@minute-menus/types";

const log = createLogger("ai-storage-guide");

export const STORAGE_GUIDE_MODEL = "claude-haiku-4-5";

const parseAdviceJson = (raw: string): IngredientStorageAdvice[] => {
	const trimmed = raw.trim();
	const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? trimmed;
	const parsed = JSON.parse(jsonBlock) as unknown;
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

export async function generateStoragePreservationGuide(
	apiKey: string,
	restaurantName: string,
	menuItems: MenuItemForStorageGuide[],
	model = STORAGE_GUIDE_MODEL,
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
		model,
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
	if (block.type !== "text") throw new Error("Unexpected AI response");
	try {
		const tips = parseAdviceJson(block.text);
		if (!tips.length) throw new Error("AI returned no storage tips");
		return tips;
	} catch (error) {
		log.error("Failed to parse storage guide JSON", { message: String(error), preview: block.text.slice(0, 200) });
		throw new Error("Could not parse AI storage guide — try again");
	}
}
