/**
 * Marketing-style juice titles — shared by wall board print and menu rename scripts.
 * Menu editor / DB use the target titles; wall board falls back for legacy names.
 */

/** Legacy menu name → marketing title shown in editor, reels, and wall board. */
export const JUICE_MARKETING_TITLES: Record<string, string> = {
	"ABC Juice": "ABC Immunity Booster",
	"Orange Juice Cold Pressed": "Orange Immunity Boost",
	"Watermelon Juice": "Watermelon Hydrator",
	"Apple Carrot Celery Cold Pressed": "Green Glow Detox",
	"Apple Carrot Cold Pressed": "Carrot Apple Energy",
	"Apple Cold Pressed": "Crisp Apple Vitality",
	"Citrus Colada Cold Pressed": "Tropical Citrus Cooler",
	"Apple Carrot Pomegranate Cold Pressed": "Heart & Glow Blend",
	"Apple Pomegranate Cold Pressed": "Apple Pomegranate Boost",
	"Pomegranate Cold Pressed": "Apple Pomegranate Boost",
	"Carrot Juice Cold Pressed": "Beta-Glow Carrot",
	"Mango Juice": "Alphonso Mango Refresh",
	"Mosambi Cold Pressed": "Sweet Lime Digestive",
	"Oat Milk Cold Pressed": "Oat Fiber Vitality",
	"Tropical Pina Colada Cold Pressed": "Tropical Electrolyte Cooler",
	"Pineapple Juice": "Pineapple Energizer",
	"Beetroot Juice": "Beetroot Blood Flow Boost",
	"Green Juice": "Daily Green Detox",
	"Lemon Ginger Shot": "Immunity Ginger Shot",
	"Virgin Mojito": "Mint Lime Refresher",
};

const MARKETING_TITLE_SET = new Set(Object.values(JUICE_MARKETING_TITLES));

export function isJuiceCategory(categoryTitle: string): boolean {
	return /\bjuice/i.test(categoryTitle);
}

function normalizeKey(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

function inferJuiceTitle(dishName: string): string {
	const n = normalizeKey(dishName);
	const lower = n.toLowerCase();

	if (/^abc\b/.test(lower)) return "ABC Immunity Booster";
	if (lower.includes("watermelon")) return "Watermelon Hydrator";
	if (lower.includes("orange")) return "Orange Immunity Boost";
	if (lower.includes("carrot") && lower.includes("celery")) return "Green Glow Detox";
	if (lower.includes("carrot") && lower.includes("apple")) return "Carrot Apple Energy";
	if (lower.includes("citrus") || lower.includes("colada")) return "Tropical Citrus Cooler";
	if (lower.includes("mosambi") || lower.includes("sweet lime")) return "Sweet Lime Digestive";
	if (lower.includes("mango")) return "Alphonso Mango Refresh";
	if (lower.includes("pineapple") || lower.includes("pina")) return "Tropical Electrolyte Cooler";
	if (lower.includes("beet")) return "Beetroot Blood Flow Boost";
	if (lower.includes("oat")) return "Oat Fiber Vitality";
	if (lower.includes("apple") && lower.includes("pomegranate")) return "Apple Pomegranate Boost";
	if (lower.includes("carrot")) return "Beta-Glow Carrot";
	if (lower.includes("apple")) return "Crisp Apple Vitality";

	const trimmed = n
		.replace(/\s+Cold Pressed$/i, "")
		.replace(/\s+Juice$/i, "")
		.trim();
	if (trimmed.length < n.length && trimmed.length > 0) return trimmed;

	return n;
}

/** Resolve display title for wall board (DB name or legacy alias). */
export function juiceDisplayTitle(dishName: string, categoryTitle: string): string {
	const key = normalizeKey(dishName);
	if (MARKETING_TITLE_SET.has(key)) return key;
	const mapped = JUICE_MARKETING_TITLES[key];
	if (mapped) return mapped;
	if (!isJuiceCategory(categoryTitle)) return key;
	return inferJuiceTitle(key);
}

/** Target title for DB rename scripts — undefined if already marketing or not mapped. */
export function juiceRenameTarget(currentName: string): string | undefined {
	const key = normalizeKey(currentName);
	if (MARKETING_TITLE_SET.has(key)) return undefined;
	return JUICE_MARKETING_TITLES[key];
}
