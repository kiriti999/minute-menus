/**
 * Wall board display names — marketing-style titles for print only (DB names unchanged).
 * Juices use benefit-led names so descriptions can stay off the layout.
 */

/** Exact dish name → wall board title (Fresh & Fusion / cold-pressed menu). */
const JUICE_WALL_TITLES: Record<string, string> = {
	"ABC Juice": "ABC Immunity Booster",
	"Orange Juice Cold Pressed": "Sunrise Orange · Vit C Boost",
	"Watermelon Juice": "Hydrating Watermelon Cooler",
	"Apple Carrot Celery Cold Pressed": "Green Glow Detox",
	"Apple Carrot Cold Pressed": "Carrot Apple Energy Blend",
	"Apple Cold Pressed": "Crisp Apple Vitality",
	"Citrus Colada Cold Pressed": "Tropical Citrus Hydrator",
	"Apple Carrot Pomegranate Cold Pressed": "Heart & Glow Blend",
	"Apple Pomegranate Cold Pressed": "Antioxidant Apple Pomegranate",
	"Carrot Juice Cold Pressed": "Beta-Glow Carrot Juice",
	"Mango Juice": "Alphonso Mango Refresh",
	"Mosambi Cold Pressed": "Sweet Lime Digestive Aid",
	"Oat Milk Cold Pressed": "Fiber-Rich Oat Vitality",
	"Tropical Pina Colada Cold Pressed": "Tropical Electrolyte Cooler",
	"Pineapple Juice": "Tropical Pineapple Energizer",
	"Beetroot Juice": "Blood Flow Beetroot Boost",
	"Green Juice": "Daily Green Detox",
	"Lemon Ginger Shot": "Immunity Ginger Shot",
	"Virgin Mojito": "Mint Lime Refresher",
};

function isJuiceCategory(categoryTitle: string): boolean {
	return /\bjuice/i.test(categoryTitle);
}

function normalizeKey(name: string): string {
	return name.trim().replace(/\s+/g, " ");
}

/** Pattern fallbacks for juice items not in the exact map. */
function inferJuiceTitle(dishName: string): string {
	const n = normalizeKey(dishName);
	const lower = n.toLowerCase();

	if (/^abc\b/.test(lower)) return "ABC Immunity Booster";
	if (lower.includes("watermelon")) return "Hydrating Watermelon Cooler";
	if (lower.includes("orange")) return "Sunrise Orange · Vit C Boost";
	if (lower.includes("carrot") && lower.includes("celery")) return "Green Glow Detox";
	if (lower.includes("carrot") && lower.includes("apple")) return "Carrot Apple Energy Blend";
	if (lower.includes("citrus") || lower.includes("colada")) return "Tropical Citrus Hydrator";
	if (lower.includes("mosambi") || lower.includes("sweet lime")) return "Sweet Lime Digestive Aid";
	if (lower.includes("mango")) return "Alphonso Mango Refresh";
	if (lower.includes("pineapple") || lower.includes("pina")) return "Tropical Electrolyte Cooler";
	if (lower.includes("beet")) return "Blood Flow Beetroot Boost";
	if (lower.includes("oat")) return "Fiber-Rich Oat Vitality";
	if (lower.includes("apple") && lower.includes("pomegranate")) return "Antioxidant Apple Pomegranate";
	if (lower.includes("carrot")) return "Beta-Glow Carrot Juice";
	if (lower.includes("apple")) return "Crisp Apple Vitality";

	// Drop trailing "Cold Pressed" / "Juice" for a shorter board line
	const trimmed = n
		.replace(/\s+Cold Pressed$/i, "")
		.replace(/\s+Juice$/i, "")
		.trim();
	if (trimmed.length < n.length && trimmed.length > 0) {
		return `${trimmed} · Fresh Pressed`;
	}

	return n;
}

/** Display name for wall board print — enriches juice titles only. */
export function wallBoardDisplayName(dishName: string, categoryTitle: string): string {
	const key = normalizeKey(dishName);
	const mapped = JUICE_WALL_TITLES[key];
	if (mapped) return mapped;
	if (!isJuiceCategory(categoryTitle)) return key;
	return inferJuiceTitle(key);
}
