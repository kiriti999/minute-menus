/**
 * Kitchen recipe book — cost-effective builds + shortcuts for Fresh & Fusion style menus.
 * Matched to live dish names (and aliases) when the owner opens /recipe-book.
 */

export type RecipeHack = {
	title: string;
	detail: string;
};

export type RecipeEntry = {
	/** Primary dish name used for matching. */
	dishName: string;
	aliases?: string[];
	category: string;
	/** Portion / yield note shown under the title. */
	yieldNote?: string;
	/** Cost-effective ingredient build. */
	ingredients: string;
	/** Short easy method. */
	method: string;
	hacks: RecipeHack[];
};

function n(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Curated kitchen cards — dressings, salads, wraps, oats, juices, shakes, bowls. */
export const RECIPE_BOOK: RecipeEntry[] = [
	// ── Dressings (shared prep) ───────────────────────────────────────────────
	{
		dishName: "Caesar dressing",
		category: "Dressings",
		yieldNote: "Batch ~1.1L ≈ 10 × 120ml side cups",
		ingredients:
			"Mayonnaise 600g · grated parmesan 150g · lemon juice 120ml · Dijon 3 tbsp · garlic 3 cloves minced · black pepper · water to thin",
		method: "Whisk mayo + Dijon + garlic. Fold in parmesan, lemon, pepper. Thin with water until pourable. Chill. Fill 110–120ml per cup.",
		hacks: [
			{
				title: "Skip raw-egg Caesar",
				detail: "Use mayo as the emulsified base — no egg yolks, no blender, food-safe and cheaper for cloud kitchen volume.",
			},
			{
				title: "Parm stretch",
				detail: "Blend 50% grated parmesan + 50% processed cheese powder for cost; finish with a little real parm for aroma.",
			},
		],
	},
	{
		dishName: "Light vinaigrette",
		category: "Dressings",
		yieldNote: "Batch ~1.05L ≈ 10 cups",
		ingredients: "Oil 700ml · lemon juice/vinegar 350ml · Dijon 2 tbsp · salt · pepper · honey 2 tbsp (optional)",
		method: "Shake in a jar or whisk. Taste salt. Fill 110–120ml cups.",
		hacks: [
			{
				title: "Oil blend",
				detail: "Use 70% refined sunflower + 30% olive oil instead of 100% EVOO — same mouthfeel, lower cost.",
			},
		],
	},
	{
		dishName: "Lemon herb dressing",
		category: "Dressings",
		yieldNote: "Batch ~1L ≈ 10 cups",
		ingredients: "Oil 700ml · lemon juice 280ml · garlic 3 cloves · mixed herbs 6 tbsp · salt · pepper",
		method: "Mince garlic + herbs, whisk with oil and lemon. Season. Cup 110–120ml.",
		hacks: [
			{
				title: "Dried herbs OK",
				detail: "If fresh herbs are pricey, use 2 tbsp dried mixed herbs + 2 tbsp chopped coriander for colour.",
			},
		],
	},
	{
		dishName: "Citrus dressing",
		category: "Dressings",
		yieldNote: "Batch ~1L ≈ 10 cups",
		ingredients: "Orange juice 350ml · lemon 150ml · oil 550ml · honey 2 tbsp · salt · pepper",
		method: "Whisk juices + honey, stream in oil. Cup and chill.",
		hacks: [
			{
				title: "Juice shortcut",
				detail: "Use packed sweetened orange drink diluted 1:1 with water when fresh oranges spike in price — balance with extra lemon.",
			},
		],
	},
	{
		dishName: "Balsamic + EVOO",
		category: "Dressings",
		yieldNote: "Batch ~1.1L ≈ 10 cups",
		ingredients: "Oil 800ml · balsamic 320ml · salt · pepper",
		method: "Shake well before every fill — separates fast. 110–120ml cups.",
		hacks: [
			{
				title: "Balsamic stretch",
				detail: "Mix balsamic with a splash of cheap vinegar + pinch of sugar if pure balsamic is costly.",
			},
		],
	},
	{
		dishName: "Light mayo–mustard",
		category: "Dressings",
		yieldNote: "Batch ~1L ≈ 10 cups",
		ingredients: "Light mayo 700g · mustard 4 tbsp · lemon 2 tbsp · salt · pepper · spring onion 4 tbsp · water to thin",
		method: "Stir mayo + mustard + lemon. Fold spring onion. Thin. Cup.",
		hacks: [
			{
				title: "No homemade mayo",
				detail: "Buy bulk light mayo — faster, consistent, and cheaper than eggs + oil emulsion in-house.",
			},
		],
	},

	// ── Salads ────────────────────────────────────────────────────────────────
	{
		dishName: "Paneer Caesar Salad",
		aliases: ["Caesar Salad (Veg)", "Veg Caesar Salad"],
		category: "Salads",
		yieldNote: "Bowl 300–350g · dressing 120ml side",
		ingredients: "Romaine 240g · parmesan 25g · croutons 45g · lemon wedge · Caesar cup",
		method: "Weigh greens first, add toppings to 300–350g. Never toss dressing in kitchen — send 120ml cup on the side.",
		hacks: [
			{ title: "Croutons", detail: "Toast stale bread cubes in oil + salt; freeze bags. Better cost than retail croutons." },
			{ title: "Caesar hack", detail: "Dressing = mayo base (see Dressings) — no raw egg." },
		],
	},
	{
		dishName: "Chicken Caesar Salad",
		aliases: ["Caesar Salad (Chicken)"],
		category: "Salads",
		yieldNote: "Bowl ~330g · Caesar cup",
		ingredients: "Romaine 160g · grilled chicken 120g · parmesan 20g · croutons 30g · Caesar cup",
		method: "Batch-grill chicken, chill, slice cold. Assemble to weight. Side dressing.",
		hacks: [
			{ title: "Chicken batch", detail: "Marinate with salt + pepper + oil only; grill once for salads + wraps shared protein." },
		],
	},
	{
		dishName: "Tuna Salad",
		category: "Salads",
		yieldNote: "Bowl ~330g · vinaigrette cup",
		ingredients: "Mixed greens 140g · tuna drained 90g · cherry tomato 50g · cucumber 50g · light vinaigrette",
		method: "Drain tuna well (saves soggy bowl). Build to weight. Side dressing.",
		hacks: [
			{ title: "Tuna cans", detail: "Buy tuna in brine (cheaper); rinse once, drain 2 min on sieve before plating." },
		],
	},
	{
		dishName: "Egg Salad",
		category: "Salads",
		yieldNote: "Bowl ~330g · mayo–mustard cup",
		ingredients: "Lettuce 150g · boiled eggs 2 (~110–120g) · spring onion 20g · cherry tomato 40g · light mayo–mustard cup",
		method: "Batch-boil eggs, ice shock, peel when cool. Assemble cold. Side dressing.",
		hacks: [
			{ title: "Egg peel hack", detail: "Older eggs peel easier; steam 12 min then ice bath." },
		],
	},
	{
		dishName: "Grilled Chicken Salad",
		category: "Salads",
		yieldNote: "Bowl ~340g · lemon herb cup",
		ingredients: "Lettuce 140g · grilled chicken 110g · bell pepper 50g · corn 40g · lemon herb cup",
		method: "Same chicken batch as Caesar/wraps. Corn from frozen thawed. Side dressing.",
		hacks: [
			{ title: "Corn", detail: "Frozen sweet corn — thaw in colander; no need to cook for salads." },
		],
	},
	{
		dishName: "Quinoa Paneer Salad",
		category: "Salads",
		yieldNote: "Bowl ~340g · citrus cup",
		ingredients: "Cooked quinoa 110g · paneer 90g · cucumber 50g · tomato 50g · greens 40g · citrus cup",
		method: "Cook quinoa once (40g dry ≈ 110–120g cooked). Cube paneer. Build to weight.",
		hacks: [
			{ title: "Quinoa batch", detail: "Cook big pot, chill, portion; lasts 3 days refrigerated." },
			{ title: "Paneer", detail: "Buy block paneer; pan-sear lightly once for wraps + salads." },
		],
	},
	{
		dishName: "Quinoa Avocado Salad",
		category: "Salads",
		yieldNote: "Bowl ~340g · citrus cup",
		ingredients: "Cooked quinoa 120g · avocado 80g · cherry tomato 50g · cucumber 50g · greens 40g · citrus cup",
		method: "Cut avocado last to avoid browning; lemon on cut face if holding 10+ min.",
		hacks: [
			{ title: "Avocado timing", detail: "Only cut ripe fruit at pick-pack — unripe stock ripens in paper bag with banana." },
		],
	},

	// ── Wraps & bowls ─────────────────────────────────────────────────────────
	{
		dishName: "Paneer Tortilla Wrap",
		category: "Wraps & Bowls",
		yieldNote: "1 wrap ~280–350g after roll",
		ingredients: "Tortilla 1 (60–70g) · paneer 90g · tomato 50g · onion 40g · cheese 25g · mayo 20g",
		method: "Warm tortilla 5–8s so it flexes. Spread mayo, fill, roll tight, wrap paper.",
		hacks: [
			{ title: "Shared fill", detail: "Same paneer/veg mise as salads — one prep line." },
		],
	},
	{
		dishName: "Chicken Tortilla Wrap",
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		ingredients: "Tortilla 1 · grilled chicken 100g · tomato 50g · onion 40g · cheese 25g · mayo 20g",
		method: "Warm wrap, mayo, chicken + veg, roll.",
		hacks: [
			{ title: "Protein pool", detail: "Use leftover salad chicken slices — no second cook." },
		],
	},
	{
		dishName: "Double Egg Roll",
		aliases: ["Double Egg Wrap"],
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		ingredients: "Wheat paratha/wrap 1 (70–80g) · eggs 2 · onion 40g · spices · lemon · optional mayo 15g",
		method: "Scramble eggs with onion on flat top; roll in warm wrap with lemon squeeze.",
		hacks: [
			{ title: "Paratha stock", detail: "Frozen parathas toast faster than fresh dough for service rush." },
		],
	},
	{
		dishName: "Tomato Mutti Rice Bowl",
		aliases: ["Tomato Mutti Wrap", "Tomato Mutti Bowl", "Tomato Mutti Wrap/Bowl"],
		category: "Wraps & Bowls",
		yieldNote: "Bowl or wrap fill",
		ingredients: "Tomato mutti gravy 100g · spiced base/veg 80–100g · rice 150g cooked OR wrap 1",
		method: "Reheat gravy + rice; assemble bowl hot. For wrap, reduce gravy so it doesn’t soak.",
		hacks: [
			{ title: "Mutti batch", detail: "Cook tomato gravy in bulk; freeze flat bags; thaw overnight in fridge." },
		],
	},

	// ── Overnight oats ────────────────────────────────────────────────────────
	{
		dishName: "Chia Jam Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "Jar finished weight 250–280g · soak 6–8h",
		ingredients: "Rolled oats 60g · chilled milk 155ml · chia 8g · fruit jam 25g · honey 8g",
		method: "Mix night before in cold bain. Weigh to 250–280g before seal. Serve cold.",
		hacks: [
			{ title: "Oats base", detail: "Premix dry oats+chia in tubs; add milk+jam per jar — faster night prep." },
			{ title: "Milk", detail: "Use toned milk; oat milk only when labelled plant-based SKU." },
		],
	},
	{
		dishName: "Mango Chia Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Rolled oats 55g · milk 150ml · chia 8g · mango 70g · honey 10g",
		method: "Mix oats+milk+chia+honey; fold mango. Soak cold. Weigh jar.",
		hacks: [
			{ title: "Mango", detail: "Use frozen mango pulp when fresh Alphonso is expensive — thaw overnight." },
		],
	},
	{
		dishName: "Mixed Berries Overnight Oats",
		aliases: ["Mixed Berry Overnight Oats"],
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Oats 60g · milk 160ml · chia 8g · blueberries 30g · strawberries 30g · honey 10g",
		method: "Mix base; top berries. Soak. Weigh.",
		hacks: [
			{ title: "Berries", detail: "Frozen mixed berries — cheaper, no spoilage; add frozen so they don’t bleed overnight." },
		],
	},
	{
		dishName: "Overnight Oats With Dry Fruits",
		aliases: ["Overnight oats with dry fruits"],
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Oats 60g · milk 155ml · chia 8g · mixed dry fruits 30g · honey 10g",
		method: "Mix all; soak; weigh.",
		hacks: [
			{ title: "Dry fruit mix", detail: "Buy broken cashew/raisin mix; chop dates in-house for sweetness instead of extra honey." },
		],
	},
	{
		dishName: "Apple Cinnamon Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Oats 60g · milk 155ml · apple 50g · raisins 12g · cinnamon · honey 10g",
		method: "Dice apple small so it softens overnight. Mix, soak, weigh.",
		hacks: [
			{ title: "Apple", detail: "Use slightly soft apples for oats; firm ones for fresh juice — split purchase grade." },
		],
	},

	// ── Juices ────────────────────────────────────────────────────────────────
	{
		dishName: "ABC Immunity Booster",
		aliases: ["ABC Juice"],
		category: "Fresh Juices",
		yieldNote: "1 serve chilled",
		ingredients: "Apple · beetroot · carrot · lemon · ginger (see menu ingredients)",
		method: "Wash, rough chop, juice or high-speed blend + fine strain. Serve cold; no ice in sealed bottle if shipping.",
		hacks: [
			{ title: "Blend + strain", detail: "If cold-press is slow, blend with a splash of water and strain — faster for volume." },
			{ title: "Beet stain", detail: "Juice beet last or wipe spout — prevents pink carry-over into light juices." },
		],
	},
	{
		dishName: "Orange Immunity Boost",
		aliases: ["Orange Juice Cold Pressed"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Fresh oranges only",
		method: "Juice, strain pulp if needed, chill.",
		hacks: [
			{ title: "Yield", detail: "Room-temp oranges juice more than fridge-cold; pull fruit 30 min early." },
		],
	},
	{
		dishName: "Watermelon Hydrator",
		aliases: ["Watermelon Juice"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Watermelon flesh · optional ice",
		method: "Blend flesh; strain seeds if needed. Very perishable — make close to service.",
		hacks: [
			{ title: "Trim waste", detail: "Use near-rind white flesh in staff juice; red centre for customer cups." },
		],
	},
	{
		dishName: "Green Glow Detox",
		aliases: ["Apple Carrot Celery Cold Pressed"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · carrot · celery · lemon",
		method: "Juice together; lemon last for brightness.",
		hacks: [
			{ title: "Celery", detail: "Keep celery upright in jar with water in fridge — lasts longer, crisper juice." },
		],
	},
	{
		dishName: "Mango refresh",
		aliases: ["Alphonso Mango Refresh", "Mango Juice", "Mango Refresh"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Mango pulp · water · ice",
		method: "Blend pulp + chilled water to pourable; ice if dine-in.",
		hacks: [
			{ title: "Pulp cans/frozen", detail: "Alphonso pulp (canned/frozen) beats expensive fresh fruit off-season — same SKU taste." },
		],
	},
	{
		dishName: "Sweet Lime Digestive",
		aliases: ["Mosambi Cold Pressed"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Mosambi (sweet lime)",
		method: "Juice and serve immediately — oxidises fast.",
		hacks: [
			{ title: "Hand press", detail: "Manual citrus press is fine; no need for cold-press machine on citrus-only SKUs." },
		],
	},
	{
		dishName: "Tropical Electrolyte Cooler",
		aliases: ["Tropical Pina Colada Cold Pressed", "Pineapple Juice"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Pineapple · coconut water · lime · mint",
		method: "Blend/juice pineapple with coconut water; finish lime + mint.",
		hacks: [
			{ title: "Coconut water", detail: "Tetra packs are consistent and often cheaper than fresh tender coconut labour." },
		],
	},

	// ── Milkshakes ────────────────────────────────────────────────────────────
	{
		dishName: "Kitkat Chocolate Milk Shake",
		aliases: ["Chocolate Milk Shake", "Chocolate Milkshake"],
		category: "Milkshakes",
		yieldNote: "1 tall serve",
		ingredients: "Milk · cocoa or chocolate syrup · ice cream scoop · ice · optional KitKat crush",
		method: "Blend milk + syrup + 1 scoop ice cream + ice 20–30s. Top crush if SKU needs it.",
		hacks: [
			{ title: "Ice cream cost", detail: "One scoop soft-serve or block ice cream portioned with scoop — don’t free-pour." },
			{ title: "Cocoa", detail: "Unsweetened cocoa + sugar syrup cheaper than branded chocolate sauce." },
		],
	},
	{
		dishName: "Triple Chocolate Thick Shake",
		aliases: ["Chocolate Thick Shake"],
		category: "Milkshakes",
		yieldNote: "1 thick serve",
		ingredients: "Milk · dark chocolate · ice cream · optional whipped cream",
		method: "Less milk, more ice cream for thickness. Blend short bursts.",
		hacks: [
			{ title: "Thick without waste", detail: "Frozen milk ice cubes thicken cheaper than extra ice cream." },
		],
	},
	{
		dishName: "Apple Milkshake",
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Apple · milk · honey · ice",
		method: "Blend peeled apple + milk + honey + ice until smooth.",
		hacks: [
			{ title: "Peel speed", detail: "Use apple scrap from juice mise when possible — same fruit, less waste." },
		],
	},
	{
		dishName: "Banana Milkshake",
		aliases: ["Banana Milk Shake"],
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Banana · milk · honey · ice",
		method: "Blend until smooth. Spotty bananas = sweeter, less honey.",
		hacks: [
			{ title: "Frozen banana", detail: "Freeze ripe bananas in bags — thicker shake, less ice cream needed." },
		],
	},
	{
		dishName: "Oat Milk Shake With Dry Fruits",
		aliases: ["Oat Milk Shake with Dry Fruits"],
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Oat milk · almonds · dates · walnuts · cinnamon · ice",
		method: "Soak dates 10 min if hard; blend all smooth.",
		hacks: [
			{ title: "Oat milk DIY", detail: "Blend rolled oats + water, strain — cheaper than cartons for high volume (label allergens)." },
		],
	},
	{
		dishName: "Vanilla Milkshake With Chocolate",
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Milk · vanilla ice cream · chocolate syrup drizzle · ice",
		method: "Blend vanilla base; drizzle syrup in glass before pour.",
		hacks: [
			{ title: "Vanilla base", detail: "Milk + sugar + vanilla essence + ice if ice cream stock is low." },
		],
	},
];

export function normalizeDishKey(name: string): string {
	return n(name);
}

/** Find curated recipe for a live menu dish name. */
export function findRecipeForDish(dishName: string): RecipeEntry | undefined {
	const key = n(dishName);
	for (const r of RECIPE_BOOK) {
		if (n(r.dishName) === key) return r;
		if (r.aliases?.some((a) => n(a) === key)) return r;
	}
	return undefined;
}

/** Fallback card from menu description/ingredients when no curated recipe exists. */
export function recipeFromMenuFields(
	dishName: string,
	category: string,
	ingredients: string,
	description: string,
): RecipeEntry {
	const ing = ingredients.trim() || "See menu ingredients / station mise";
	const desc = description.trim();
	return {
		dishName,
		category: category || "Menu",
		ingredients: ing,
		method: desc
			? `Prep from listed ingredients. ${desc} Keep portions consistent; chill or heat as category requires.`
			: "Prep from listed ingredients. Standardise portion weight; label and date prep containers.",
		hacks: [
			{
				title: "Buy once, use many",
				detail: "Share proteins, greens, and sauces across salads, wraps, and bowls from one mise en place.",
			},
			{
				title: "Shortcut sauces",
				detail: "Prefer mayo / bottled bases for dressings and wraps instead of from-scratch emulsions when labour is tight.",
			},
		],
	};
}
