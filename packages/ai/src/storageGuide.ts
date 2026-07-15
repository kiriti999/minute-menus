import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "@minute-menus/logger";
import type { IngredientStorageAdvice, MenuItemForStorageGuide } from "@minute-menus/types";

const log = createLogger("ai-storage-guide");

export const STORAGE_GUIDE_MODEL = "claude-haiku-4-5";

const FRIDGE_LABEL = "Cold bain marie (under fridge)";
const FREEZER_LABEL = "Freezer (ice cream)";
const RACK_LABEL = "Outside wooden racks";

const normalizeStoragePlace = (raw: string): string => {
	const t = raw.trim().toLowerCase();
	if (!t) return FRIDGE_LABEL;
	if (/freezer|ice.?cream|frozen/.test(t)) return FREEZER_LABEL;
	if (/fridge|refrigerat|chill|cold|bain|marie/.test(t)) return FRIDGE_LABEL;
	if (/rack|outside|room.?temp|ambient|wooden|pantry|counter|cupboard|cabinet|shelf|dry/.test(t)) {
		return RACK_LABEL;
	}
	return FRIDGE_LABEL;
};

const simplifyKitchenHacks = (raw: string): string =>
	raw
		.replace(/\bcrisper drawers?\b/gi, "cold bain marie")
		.replace(/\bcrisper\b/gi, "cold bain marie")
		.replace(/\b(vegetable|veggie) drawer\b/gi, "cold bain marie")
		.replace(/\bpantry\b/gi, "wooden racks")
		.replace(/\s{2,}/g, " ")
		.trim();

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
				category: String(item.category ?? item.group ?? "Other").trim() || "Other",
				storagePlace: normalizeStoragePlace(String(item.storagePlace ?? item.storage_place ?? "").trim()),
				shelfLifeFridge: String(
					item.shelfLifeFridge ?? item.shelf_life_fridge ?? item.shelfLife ?? item.shelf_life ?? "",
				).trim(),
				shelfLifeOutside: String(
					item.shelfLifeOutside ?? item.shelf_life_outside ?? "",
				).trim() || "Do not store outside",
				simpleHacks: simplifyKitchenHacks(
					String(item.simpleHacks ?? item.simple_hacks ?? item.hacks ?? "").trim(),
				),
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

This kitchen stores food in ONLY three places:
1) Under the cold bain marie fridge (commercial under-counter cold unit) — NOT a home fridge, NO crisper drawer
2) Small freezer — for ice cream and frozen desserts only
3) Outside wooden racks (dry goods like onion, potato, garlic)

Scan every menu dish and its ingredients below. Extract UNIQUE raw ingredients.

For EACH unique ingredient return practical storage guidance:
- category: ONE of Vegetables, Fruits, Herbs, Dairy, Proteins, Grains & staples, Spices & condiments, Oils & fats, Other
- storagePlace: ONLY "Cold bain marie (under fridge)" OR "Freezer (ice cream)" OR "Outside wooden racks"
- shelfLifeFridge: life span in cold bain marie at 1-4C (or "N/A — keep frozen" for ice cream)
- shelfLifeOutside: life span on outside wooden racks (or "Do not store outside" when cold storage is required)
- simpleHacks: short tip for kitchen staff; NEVER say crisper, pantry, or counter
- usedInDishes: dish names that use it

Rules:
- Plain English, no jargon, no markdown in values
- Merge duplicates across dishes
- Skip pure water/ice
- ALWAYS give BOTH shelfLifeFridge and shelfLifeOutside
- Use Freezer (ice cream) ONLY for ice cream / frozen desserts
- NEVER use pantry/counter/crisper
- Return ONLY a JSON array, no prose before or after

Keys: ingredient, category, storagePlace, shelfLifeFridge, shelfLifeOutside, simpleHacks, usedInDishes

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
