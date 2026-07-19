/**
 * Marketing-style juice titles — shared by wall board print and menu rename scripts.
 * Menu editor / DB names are the source of truth; only exact legacy keys are remapped.
 */

/** Legacy menu name → marketing title (exact match only). */
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

/** Wall board title: editor/DB name, or exact legacy alias if still on an old name. */
export function juiceDisplayTitle(dishName: string, _categoryTitle: string): string {
	const key = normalizeKey(dishName);
	if (MARKETING_TITLE_SET.has(key)) return key;
	return JUICE_MARKETING_TITLES[key] ?? key;
}

/** Target title for DB rename scripts — undefined if already marketing or not mapped. */
export function juiceRenameTarget(currentName: string): string | undefined {
	const key = normalizeKey(currentName);
	if (MARKETING_TITLE_SET.has(key)) return undefined;
	return JUICE_MARKETING_TITLES[key];
}
