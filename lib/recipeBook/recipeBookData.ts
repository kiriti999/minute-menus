/**
 * Kitchen recipe book — Fresh & Fusion kitchen builds (from the kitchen notebook).
 * Matched to live dish names (and aliases) when the owner opens /recipe-book.
 */

export type RecipeEntry = {
	/** Primary dish name used for matching. */
	dishName: string;
	aliases?: string[];
	category: string;
	/** Portion / yield note shown under the title. */
	yieldNote?: string;
	/** Exact description from the menu editor (live). */
	menuDescription?: string;
	/** Exact ingredients from the menu editor (live). */
	menuIngredients?: string;
	/** Kitchen build (curated). */
	ingredients: string;
	/** Short easy method. */
	method: string;
	/** Dressing card names (RECIPE_BOOK dishName) to print alongside this dish. */
	dressings?: string[];
};

function n(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Large salads → 750ml bowl; small / medium = 60% of large → 500ml bowl. */
function sized(large: string, small: string): string {
	return `LARGE — 750ml bowl\n${large}\n\nSMALL / MEDIUM — 500ml bowl\n${small}`;
}

const CAESAR_MAYO = "Caesar dressing (mayo base)";
const CAESAR_CURD = "Caesar dressing (hung curd)";
const YOGURT_DRESSING = "Yogurt dressing";
const LEMON_HERB = "Lemon & herb dressing";
const APPLE_CIDER_HERB = "Apple cider & herb dressing";
const CITRUS = "Citrus dressing";

const PANEER_COOK =
	"Paneer: marinate, then cook on low flame for 2–3 min with the lid on until soft and spongy — do not let it turn hard.";
const CHICKEN_GRILL =
	"Chicken: marinate breast with Cajun spice. Grill on low with the lid on, 5 min each side. Core temperature must reach at least 70°C. Slice after cooking.";
const LEGUME_SERVES =
	"1 serve: 60g dry (¼ cup) → ~150g cooked · 3 serves: 180g dry (¾ cup) → ~450g cooked · small salad: 36g dry → ~90g cooked";
const legumeCook = (name: string) =>
	`${name}: soak 8–12 h, then cook 40 min on high in the electric pressure cooker with enough water to cover. Drain and cool.\n${LEGUME_SERVES}`;
const DRESSING_CUPS = "Dressing goes on the side in 50ml cups — large: 2 cups, small: 1 cup. Never toss dressing into the salad.";

const THICK_SHAKE_BASE =
	"3 large scoops into the big blender with 40ml milk. Press whip 3–5 times at 1-second intervals until thick. Pour into the 300ml glass";
const THICK_SHAKE_PACK =
	"Cover with aluminium foil and tighten the glass lid. Put a thick straw into the packaging.";

const SMOOTHIE_BASE =
	"Frozen blueberry 35g · ripe banana ½ (or 50g) · milk 80g · hung curd 40g · honey 10g\nIf using normal curd instead of hung curd: 60ml milk + 60ml curd";

/** Curated kitchen cards — dressings, salads, wraps, pasta, oats, juices, shakes, smoothies. */
export const RECIPE_BOOK: RecipeEntry[] = [
	// ── Dressings (shared prep) ───────────────────────────────────────────────
	{
		dishName: CAESAR_MAYO,
		category: "Dressings",
		yieldNote: "1 serve · 3 serves · 6 serves",
		ingredients: [
			"Unsweetened mayo — 34g · 102g · 204g",
			"Extra virgin olive oil — 7.5ml · 22.5ml · 45ml",
			"Concentrated lemon juice — 3ml · 9ml · 18ml",
			"Worcestershire sauce — 1.5ml · 4.5ml · 9ml",
			"Dijon mustard — 3g · 9g · 18g",
			"Garlic powder — ¼ tsp (0.8g) · ¾ tsp (2.3g) · 1½ tsp (4.7g)",
			"Black pepper — ¼ tsp (0.6g) · ¾ tsp (1.7g) · 1½ tsp (3.5g)",
			"Water — 10ml · 30ml · 60ml",
			"Salt — to taste · 1.5g · 3g",
			"Synthetic vinegar (optional) — 2ml · 6ml · 12ml",
		].join("\n"),
		method: "Whisk everything until smooth and pourable. Chill. Portion into 50ml cups.",
	},
	{
		dishName: CAESAR_CURD,
		category: "Dressings",
		yieldNote: "3 serves · 1 serve",
		ingredients: [
			"Hung curd — 140g · 45g",
			"Mayo — 75g · 25g",
			"Parmesan — 30g · 5g",
			"Lemon juice — 15ml · 5ml",
			"Extra virgin olive oil — 22ml · 7.5ml",
			"Soy sauce — 5ml · 1.5ml",
			"Dijon mustard — 7.5g · 2.5g (½ tsp)",
			"Garlic, grated — 3 cloves · 1 clove",
			"Black pepper — ¾ tsp · ¼ tsp",
			"Salt — ¼ tsp · to taste",
			"Water — only if needed",
		].join("\n"),
		method: "Whisk curd and mayo smooth, then mix in the rest. Thin with water only if needed. Chill. Portion into 50ml cups.",
	},
	{
		dishName: YOGURT_DRESSING,
		category: "Dressings",
		yieldNote: "1 serve ≈ 100ml · shared by Chickpea, Soya Chunk and Rajma salads",
		ingredients: [
			"Hung yogurt — 100ml",
			"Black pepper — ½ tsp",
			"Salt — ½ tsp",
			"Cumin powder — ½ tsp",
			"Chilli powder — ½ tsp (a little)",
			"Garlic — 1 clove",
			"Honey — 1 tsp",
			"Lemon — ½ tsp",
			"Optional for creaminess: 3–4 soaked cashews or paneer cubes",
		].join("\n"),
		method: "Blend or whisk until smooth. Chill. Portion into 50ml cups.",
	},
	{
		dishName: LEMON_HERB,
		category: "Dressings",
		yieldNote: "1 serve (100ml) · 6 serves",
		ingredients: [
			"Oil — 64g · 384g",
			"Lemon juice concentrate — 24g · 144g",
			"Dijon mustard — 6g · 36g",
			"Honey — 10g · 30g",
			"Oregano, dried — 1g · 6g",
			"Salt & black pepper — 1g · 6g",
		].join("\n"),
		method: "Whisk or shake in a jar until emulsified. Shake again before every fill. Portion into 50ml cups.",
	},
	{
		dishName: APPLE_CIDER_HERB,
		category: "Dressings",
		yieldNote: "1 serve (100ml) · 6 serves",
		ingredients: [
			"Oil — 64g · 384g",
			"Apple cider vinegar — 24g · 144g",
			"Dijon mustard — 6g · 36g",
			"Honey — 10g · 50g",
			"Oregano, dried — 1g · 3g",
			"Salt & pepper — 1g · 6g",
			"Parsley, dried — 1g · 6g",
		].join("\n"),
		method: "Whisk or shake in a jar until emulsified. Shake again before every fill. Portion into 50ml cups.",
	},
	{
		dishName: CITRUS,
		category: "Dressings",
		yieldNote: "Batch ~1L",
		ingredients: "Orange juice 350ml · lemon 150ml · oil 550ml · honey 2 tbsp · salt · pepper",
		method: "Whisk juices + honey, stream in oil. Chill. Portion into 50ml cups.",
	},

	// ── Salads ────────────────────────────────────────────────────────────────
	{
		dishName: "Veg Caesar Salad",
		aliases: ["Paneer Caesar Salad", "Caesar Salad (Veg)"],
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl · dressing in 50ml cups",
		ingredients: sized(
			"Cos lettuce 70g · cherry tomato 6 pcs · olives 10g · croutons 10g · yellow capsicum 30g · paneer / tofu 100g · mixed seeds 10–20g · Caesar dressing 100ml",
			"Cos lettuce 42g · cherry tomato 4 pcs · olives 6g · croutons 6g · yellow capsicum 18g · paneer / tofu 60g · mixed seeds 6–12g · Caesar dressing 50ml",
		),
		method: `${PANEER_COOK}\nBuild greens first, then veg, paneer, croutons and seeds on top.\n${DRESSING_CUPS}`,
		dressings: [CAESAR_MAYO, CAESAR_CURD],
	},
	{
		dishName: "Chicken Caesar Salad",
		aliases: ["Caesar Salad (Chicken)", "Caesar Chicken Salad"],
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl · dressing in 50ml cups",
		ingredients: sized(
			"Chicken breast 120–130g (raw) · cos lettuce 70g · cherry tomato 6 pcs · olives 10g · croutons 10g · yellow capsicum 30g · mixed seeds 10–20g · Caesar dressing 100ml",
			"Chicken breast 80g (raw) · cos lettuce 42g · cherry tomato 4 pcs · olives 6g · croutons 6g · yellow capsicum 18g · mixed seeds 6–12g · Caesar dressing 50ml",
		),
		method: `${CHICKEN_GRILL}\nBuild greens first, then veg, sliced chicken, croutons and seeds on top.\n${DRESSING_CUPS}`,
		dressings: [CAESAR_MAYO, CAESAR_CURD],
	},
	{
		dishName: "Grilled Chicken Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl · dressing in 50ml cups",
		ingredients: sized(
			"Chicken breast 120–130g (raw) · romaine lettuce 70g · tomato 30g · capsicum 30g · cucumber 20g · onion 10g · shredded cheese 20g · mixed seeds 10–20g · Lemon & herb dressing 100ml",
			"Chicken breast 80g (raw) · romaine lettuce 42g · tomato 18g · capsicum 18g · cucumber 12g · onion 6g · shredded cheese 12g · mixed seeds 6–12g · Lemon & herb dressing 50ml",
		),
		method: `${CHICKEN_GRILL}\nBuild greens first, then veg, sliced chicken, cheese and seeds on top.\n${DRESSING_CUPS}`,
		dressings: [LEMON_HERB],
	},
	{
		dishName: "Chickpea Salad",
		category: "Salads",
		yieldNote: "Large ~400g in 750ml bowl · small / medium 500ml bowl · yogurt dressing",
		ingredients: sized(
			"Cooked chickpeas 150g (from 60g dry · ~10.6g protein) · romaine lettuce 50g · tomato 30g · cucumber 30g · capsicum 20g · roasted peanuts 20g · Yogurt dressing 100ml",
			"Cooked chickpeas 90g (from 36g dry) · romaine lettuce 30g · tomato 18g · cucumber 18g · capsicum 12g · roasted peanuts 12g · Yogurt dressing 50ml",
		),
		method: `${legumeCook("Chickpeas")}\n${DRESSING_CUPS}`,
		dressings: [YOGURT_DRESSING],
	},
	{
		dishName: "Rajma Salad",
		category: "Salads",
		yieldNote: "Large ~400g in 750ml bowl · small / medium 500ml bowl · yogurt dressing",
		ingredients: sized(
			"Cooked rajma 150g (from 60g dry · ~10.6g protein) · romaine lettuce 50g · tomato 30g · cucumber 30g · capsicum 20g · roasted peanuts 20g · Yogurt dressing 100ml",
			"Cooked rajma 90g (from 36g dry) · romaine lettuce 30g · tomato 18g · cucumber 18g · capsicum 12g · roasted peanuts 12g · Yogurt dressing 50ml",
		),
		method: `${legumeCook("Rajma")}\n${DRESSING_CUPS}`,
		dressings: [YOGURT_DRESSING],
	},
	{
		dishName: "Soya Chunks Salad",
		aliases: ["Soya Chunk Salad", "Mini Soya Chunk Salad"],
		category: "Salads",
		yieldNote: "Large ~400g in 750ml bowl · small / medium 500ml bowl · yogurt dressing",
		ingredients: sized(
			"Hydrated & squeezed mini soya 150g (from 50g dry · ~21g protein) · romaine lettuce 50g · tomato 30g · cucumber 30g · capsicum 20g · roasted peanuts 20g · Yogurt dressing 100ml",
			"Hydrated & squeezed mini soya 90g (from 30g dry) · romaine lettuce 30g · tomato 18g · cucumber 18g · capsicum 12g · roasted peanuts 12g · Yogurt dressing 50ml",
		),
		method: `Soya: boil mini soya chunks in water with 1 tsp salt for 3 min on gas. Drain, rinse in cool water and squeeze out 80–90% of the water.\n${DRESSING_CUPS}`,
		dressings: [YOGURT_DRESSING],
	},
	{
		dishName: "Soya Salad",
		category: "Salads",
		yieldNote: "230g + 100ml dressing",
		ingredients: "Soya 150g (cooked) · carrot 20g · cucumber 40g · tomato 40g · romaine lettuce 20g · roasted peanuts 20 pcs · Yogurt dressing 100ml",
		method:
			"Soya cooking (40g dry soya): boil in 500ml water with salt for 6 min on high. Drain, wash in cool water and squeeze out 80–90% of the water. Pan-fry 2–3 min with salt, turmeric, chilli and a little oil.",
		dressings: [YOGURT_DRESSING],
	},
	{
		dishName: "Cucumber Chickpea Salad",
		category: "Salads",
		yieldNote: "1 serve",
		ingredients: "Cooked chickpeas 100g · cucumber 150g · tomato 50g · coriander 2 tbsp · salt, pepper, cumin powder + curd 30g",
		method: `${legumeCook("Chickpeas")}\nMix curd with salt, pepper and cumin; toss with chickpeas, cucumber, tomato and coriander.`,
	},
	{
		dishName: "Tuna Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl · dressing in 50ml cups",
		ingredients: sized(
			"Lettuce 140g · tuna, drained 90g · cherry tomato 50g · cucumber 50g · mixed seeds 10–20g · Apple cider & herb dressing 100ml",
			"Lettuce 84g · tuna, drained 54g · cherry tomato 30g · cucumber 30g · mixed seeds 6–12g · Apple cider & herb dressing 50ml",
		),
		method: `Tuna: open the can slightly and drain all the water or oil out first, then use as per the recipe.\n${DRESSING_CUPS}`,
		dressings: [APPLE_CIDER_HERB],
	},
	{
		dishName: "Quinoa Paneer Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl · dressing in 50ml cups",
		ingredients: sized(
			"Cooked quinoa 110g · paneer 90g · cucumber 50g · tomato 50g · greens 40g · Citrus dressing 100ml",
			"Cooked quinoa 66g · paneer 54g · cucumber 30g · tomato 30g · greens 24g · Citrus dressing 50ml",
		),
		method: `Cook quinoa once (40g dry ≈ 110–120g cooked).\n${PANEER_COOK}\n${DRESSING_CUPS}`,
		dressings: [CITRUS],
	},
	{
		dishName: "Egg Salad",
		category: "Salads",
		yieldNote: "Bowl ~330g",
		ingredients: "Lettuce 150g · boiled eggs 2 (~110–120g) · spring onion 20g · cherry tomato 40g",
		method: "Batch-boil eggs, ice shock, peel when cool. Assemble cold. Side dressing.",
	},
	{
		dishName: "Quinoa Avocado Salad",
		category: "Salads",
		yieldNote: "Bowl ~340g · citrus cup",
		ingredients: "Cooked quinoa 120g · avocado 80g · cherry tomato 50g · cucumber 50g · greens 40g · citrus cup",
		method: "Cut avocado last to avoid browning; lemon on cut face if holding 10+ min.",
		dressings: [CITRUS],
	},

	// ── Wraps & bowls ─────────────────────────────────────────────────────────
	{
		dishName: "Paneer Tortilla Wrap",
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		ingredients:
			"Wheat tortilla 1 · paneer 70g · iceberg lettuce 60–70g · tomato 15g · bell peppers 15g · shredded cheese 15g · tomato sauce 1 sachet\nPaneer marinade: mixed herbs, or oregano + a little chilli flakes + parsley",
		method: [
			PANEER_COOK,
			"After cooking, add a little diluted lemon juice on the stove, mix and add a little salt.",
			"Heat the wrap for 20 seconds. Fill with lettuce, paneer, tomato, bell peppers and cheese, then roll.",
			"Put one tomato sauce sachet in the bag.",
		].join("\n"),
	},
	{
		dishName: "Caesar Chicken Tortilla Wrap",
		aliases: ["Chicken Tortilla Wrap"],
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		ingredients: [
			"Wheat tortilla 1 · chicken breast 70g · iceberg lettuce 40g · capsicum · shredded cheese · tomato ketchup 1 sachet",
			"Chicken marinade: Cajun spice 2 tsp · diluted lemon juice 5ml · yogurt ½ tbsp",
			"Herb mayo: mayo 60g · salt & pepper · oregano · parsley · a little water or diluted lime to thin if needed",
		].join("\n"),
		method: [
			"Marinate chicken with Cajun spice and diluted lemon juice, then mix with yogurt.",
			"Cook the chicken uncut along with the capsicum until it reaches 71°C. Slice into strips after cooking.",
			"Warm the tortilla, spread herb mayo, add lettuce, chicken, capsicum and shredded cheese.",
			"Roll and cook on the grill on both sides. Wrap in paper and send with 1 ketchup sachet.",
		].join("\n"),
	},
	{
		dishName: "Double Egg Roll",
		aliases: ["Double Egg Wrap"],
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		ingredients: "Wheat paratha/wrap 1 (70–80g) · eggs 2 · onion 40g · spices · lemon · optional mayo 15g",
		method: "Scramble eggs with onion on flat top; roll in warm wrap with lemon squeeze.",
	},
	{
		dishName: "Tomato Mutti Rice Bowl",
		aliases: ["Tomato Mutti Wrap", "Tomato Mutti Bowl", "Tomato Mutti Wrap/Bowl"],
		category: "Wraps & Bowls",
		yieldNote: "Bowl or wrap fill",
		ingredients: "Tomato mutti gravy 100g · spiced base/veg 80–100g · rice 150g cooked OR wrap 1",
		method: "Reheat gravy + rice; assemble bowl hot. For wrap, reduce gravy so it doesn’t soak.",
	},

	// ── Pasta bowls ───────────────────────────────────────────────────────────
	{
		dishName: "Veg Pasta Bowl",
		category: "Pasta Bowls",
		yieldNote: "500ml bowl",
		ingredients: "Pasta 80–90g (dry) · water 1½ cups · Cajun cream pasta base · mushroom, bell peppers, capsicum",
		method: [
			"Cook pasta in the electric pressure cooker with 1½ cups water for 5 min. Drain the water out.",
			"Meanwhile, cook the cream pasta base with the veg in the Nosh machine (as per the Cajun pasta recipe).",
			"Mix the drained pasta into the cream base and serve in a 500ml bowl.",
		].join("\n"),
	},
	{
		dishName: "Chicken Pasta Bowl",
		category: "Pasta Bowls",
		yieldNote: "500ml bowl",
		ingredients: "Pasta 80–90g (dry) · water 1½ cups · Cajun cream pasta base · Cajun grilled chicken · mushroom, bell peppers, capsicum",
		method: [
			CHICKEN_GRILL,
			"Cook pasta in the electric pressure cooker with 1½ cups water for 5 min. Drain the water out.",
			"Meanwhile, cook the cream pasta base with the veg in the Nosh machine (as per the Cajun pasta recipe).",
			"Mix the drained pasta and chicken into the cream base and serve in a 500ml bowl.",
		].join("\n"),
	},

	// ── Snacks ────────────────────────────────────────────────────────────────
	{
		dishName: "Cajun Grilled Chicken",
		category: "Snacks",
		yieldNote: "1 serve",
		ingredients: "Boneless chicken breast · Cajun spice marinade",
		method: CHICKEN_GRILL,
	},
	{
		dishName: "Peri Peri Grilled Paneer",
		category: "Snacks",
		yieldNote: "1 serve",
		ingredients: "Paneer cubes · peri peri spice marinade",
		method: PANEER_COOK,
	},
	{
		dishName: "Cilantro Grill Paneer",
		category: "Snacks",
		yieldNote: "1 serve",
		ingredients: "Paneer cubes · crushed cilantro, minced garlic and green chilli marinade",
		method: PANEER_COOK,
	},
	{
		dishName: "Paneer Crunch Snack",
		category: "Snacks",
		yieldNote: "1 serve",
		ingredients: "Paneer 60–70g · tomato 4 slices · onion 2 slices · cheese 1 slice · tomato sauce 20g",
		method: PANEER_COOK,
	},
	{
		dishName: "Rice Kheer",
		category: "Desserts",
		yieldNote: "1 serve",
		ingredients: "Rice 100g · milk 150g · cream 20g · raisins (kismis) 8 pcs · almonds (badam) 2 pcs · cashews 2 pcs · jaggery (bellam)",
		method: "Tadka the almonds and cashews. Add milk and bring to a boil. Add jaggery, then the rice. Finish with cream.",
	},

	// ── Overnight oats & chia ─────────────────────────────────────────────────
	{
		dishName: "Overnight Oats With Dry Fruits, Berries & Nuts",
		aliases: ["Overnight Oats With Dry Fruits", "Overnight oats with dry fruits"],
		category: "Overnight Oats",
		yieldNote: "1 jar · soak overnight",
		ingredients:
			"Rolled oats 40g · milk 115ml · chia base (chia 15g + milk 100ml) · berries 10g · honey 5g · dry fruits & nuts on top (as per menu)",
		method: "Mix oats with milk, stir in the chia base and honey. Refrigerate overnight. Top with berries, dry fruits and nuts before sealing.",
	},
	{
		dishName: "Chia Pudding With Dry Fruits",
		aliases: ["Chia Pudding"],
		category: "Overnight Oats",
		yieldNote: "1 serve",
		ingredients: "Chia 25g · milk 135ml · honey 5g · dry fruits, mixed berries & granola crunch on top (as per menu)",
		method: "Mix chia, milk and honey. Refrigerate until set. Top with dry fruits, berries and granola before sealing.",
	},
	{
		dishName: "Chia Jam Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "Jar finished weight 250–280g · soak 6–8h",
		ingredients: "Rolled oats 60g · chilled milk 155ml · chia 8g · fruit jam 25g · honey 8g",
		method: "Mix night before in cold bain. Weigh to 250–280g before seal. Serve cold.",
	},
	{
		dishName: "Mango Chia Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Rolled oats 55g · milk 150ml · chia 8g · mango 70g · honey 10g",
		method: "Mix oats+milk+chia+honey; fold mango. Soak cold. Weigh jar.",
	},
	{
		dishName: "Mixed Berries Overnight Oats",
		aliases: ["Mixed Berry Overnight Oats"],
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Oats 60g · milk 160ml · chia 8g · blueberries 30g · strawberries 30g · honey 10g",
		method: "Mix base; top berries. Soak. Weigh.",
	},
	{
		dishName: "Apple Cinnamon Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		ingredients: "Oats 60g · milk 155ml · apple 50g · raisins 12g · cinnamon · honey 10g",
		method: "Dice apple small so it softens overnight. Mix, soak, weigh.",
	},

	// ── Juices ────────────────────────────────────────────────────────────────
	{
		dishName: "ABC Immunity Booster",
		aliases: ["ABC Juice", "ABC Immunity Booster"],
		category: "Fresh Juices",
		yieldNote: "1 serve chilled",
		ingredients: "Apple · beetroot · carrot · lemon · ginger (see menu ingredients)",
		method: "Wash, rough chop, juice or high-speed blend + fine strain. Serve cold; no ice in sealed bottle if shipping.",
	},
	{
		dishName: "Orange Immunity Boost",
		aliases: ["Orange Juice Cold Pressed", "Orange Immunity Boost"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Fresh oranges only",
		method: "Juice, strain pulp if needed, chill.",
	},
	{
		dishName: "Watermelon Hydrator",
		aliases: ["Watermelon Juice", "Watermelon Hydrator"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Watermelon flesh · optional ice",
		method: "Blend flesh; strain seeds if needed. Very perishable — make close to service.",
	},
	{
		dishName: "Green Glow Detox",
		aliases: ["Apple Carrot Celery Cold Pressed", "Green Glow Detox"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · carrot · celery · lemon",
		method: "Juice together; lemon last for brightness.",
	},
	{
		dishName: "Carrot Apple Energy",
		aliases: ["Apple Carrot Cold Pressed", "Carrot Apple Energy"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · carrot · lemon (see menu ingredients)",
		method: "Wash, chop, juice or blend + strain. Serve cold.",
	},
	{
		dishName: "Crisp Apple Vitality",
		aliases: ["Apple Cold Pressed", "Crisp Apple Vitality"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Fresh apples · lemon optional",
		method: "Juice apples; lemon splash to slow browning. Chill.",
	},
	{
		dishName: "Beta-Glow Carrot",
		aliases: ["Carrot Juice Cold Pressed", "Beta-Glow Carrot"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Carrots · optional ginger/lemon",
		method: "Juice carrots; finish ginger/lemon if on menu.",
	},
	{
		dishName: "Apple Pomegranate Boost",
		aliases: [
			"Apple Pomegranate Cold Pressed",
			"Pomegranate Cold Pressed",
			"Pomegranate, Freshly Pressed",
			"Apple Carrot Pomegranate Cold Pressed",
			"Apple Pomegranate Boost",
			"Heart & Glow Blend",
		],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · pomegranate · optional carrot (see menu)",
		method: "Juice/blend; strain seeds if needed. Serve cold.",
	},
	{
		dishName: "Seasonal Mango Refresh",
		aliases: [
			"Mango refresh",
			"Alphonso Mango Refresh",
			"Mango Juice",
			"Mango Refresh",
			"Seasonal Mango Refresh",
		],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Mango pulp · water · ice",
		method: "Blend pulp + chilled water to pourable; ice if dine-in.",
	},
	{
		dishName: "Sweet Lime Digestive",
		aliases: ["Mosambi Cold Pressed", "Sweet Lime Digestive"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Mosambi (sweet lime)",
		method: "Juice and serve immediately — oxidises fast.",
	},
	{
		dishName: "Tropical Electrolyte Cooler",
		aliases: ["Tropical Pina Colada Cold Pressed", "Pineapple Juice", "Pineapple Energizer", "Tropical Electrolyte Cooler"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Pineapple · coconut water · lime · mint",
		method: "Blend/juice pineapple with coconut water; finish lime + mint.",
	},

	// ── Milkshakes & thick shakes ─────────────────────────────────────────────
	{
		dishName: "Triple Chocolate Thick Shake",
		aliases: ["Chocolate Thick Shake"],
		category: "Milkshakes",
		yieldNote: "300ml glass",
		ingredients:
			"Chocolate ice cream 3 large scoops (~220g) + 1 scoop for topping · milk 40ml · 300ml glass · aluminium foil · glass lid · thick straw",
		method: `Prepare the glass and aluminium foil.\n${THICK_SHAKE_BASE}, put one scoop of ice cream on top.\n${THICK_SHAKE_PACK}`,
	},
	{
		dishName: "Crunchy Butterscotch Thick Shake",
		aliases: ["Butterscotch Thick Shake"],
		category: "Milkshakes",
		yieldNote: "300ml glass",
		ingredients:
			"Butterscotch ice cream 3 large scoops (~220g) + 1 scoop for topping · milk 40ml · 300ml glass · aluminium foil · glass lid · thick straw",
		method: `Prepare the glass and aluminium foil.\n${THICK_SHAKE_BASE}, put one scoop of ice cream on top.\n${THICK_SHAKE_PACK}`,
	},
	{
		dishName: "Vanilla Thick Shake With Chocolate",
		aliases: ["Vanilla Milkshake With Chocolate", "Vanilla Thick Shake"],
		category: "Milkshakes",
		yieldNote: "300ml glass",
		ingredients:
			"Vanilla ice cream 3 large scoops (~220g) + 1 scoop for topping · milk 40ml · chocolate syrup · choco sprinkles · 300ml glass · aluminium foil · glass lid · thick straw",
		method: `Prepare the glass and aluminium foil. Coat the inside of the glass with chocolate syrup.\n${THICK_SHAKE_BASE}, put one scoop of ice cream on top, then drizzle chocolate syrup and add choco sprinkles.\n${THICK_SHAKE_PACK}`,
	},
	{
		dishName: "Classic Milk Shake",
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Milk 100ml · ice cream 140g · a few chocolate sprinkles on top",
		method: "Blend milk and ice cream until smooth. Pour and finish with chocolate sprinkles.",
	},
	{
		dishName: "Kitkat Chocolate Milk Shake",
		aliases: ["Chocolate Milk Shake", "Chocolate Milkshake"],
		category: "Milkshakes",
		yieldNote: "1 tall serve",
		ingredients: "Milk · cocoa or chocolate syrup · ice cream scoop · ice · optional KitKat crush",
		method: "Blend milk + syrup + 1 scoop ice cream + ice 20–30s. Top crush if SKU needs it.",
	},
	{
		dishName: "Apple Milkshake",
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Apple · milk · honey · ice",
		method: "Blend peeled apple + milk + honey + ice until smooth.",
	},
	{
		dishName: "Banana Milkshake",
		aliases: ["Banana Milk Shake"],
		category: "Milkshakes",
		yieldNote: "1 serve",
		ingredients: "Banana · milk · honey · ice",
		method: "Blend until smooth. Spotty bananas = sweeter, less honey.",
	},
	{
		dishName: "Oat Smoothie With Dry Fruits",
		aliases: ["Oat Milk Shake With Dry Fruits", "Oat Smoothie with Dry Fruits"],
		category: "Smoothies",
		yieldNote: "1 serve",
		ingredients: "Milk 200ml · rolled oats 50g · dry fruits 20g · dates 2 pcs",
		method: "Blend everything until smooth.",
	},

	// ── Smoothies & smoothie bowls ────────────────────────────────────────────
	{
		dishName: "Blueberry Smoothie",
		aliases: ["Blueberry Yogurt Smoothie"],
		category: "Smoothies",
		yieldNote: "200ml",
		ingredients: SMOOTHIE_BASE,
		method: "Blend until smooth.",
	},
	{
		dishName: "Strawberry Smoothie",
		category: "Smoothies",
		yieldNote: "200ml",
		ingredients: `${SMOOTHIE_BASE}\nSwap the blueberry for 35g frozen strawberry`,
		method: "Blend until smooth.",
	},
	{
		dishName: "Mango Smoothie",
		category: "Smoothies",
		yieldNote: "200ml",
		ingredients: `${SMOOTHIE_BASE}\nSwap the blueberry for 35g mango`,
		method: "Blend until smooth.",
	},
	{
		dishName: "Muesli Blueberry Smoothie Bowl",
		category: "Smoothies",
		yieldNote: "1 bowl",
		ingredients: `${SMOOTHIE_BASE}\nToppings: toasted muesli, banana, honey (as per menu)`,
		method: "Blend the smoothie base thick. Pour into the bowl and add toppings.",
	},
	{
		dishName: "Muesli Banana Smoothie Bowl",
		category: "Smoothies",
		yieldNote: "1 bowl",
		ingredients: `${SMOOTHIE_BASE}\nSwap the blueberry for extra banana\nToppings: toasted muesli, berries, walnuts, honey (as per menu)`,
		method: "Blend the smoothie base thick. Pour into the bowl and add toppings.",
	},
	{
		dishName: "Muesli Mango Smoothie Bowl",
		category: "Smoothies",
		yieldNote: "1 bowl",
		ingredients: `${SMOOTHIE_BASE}\nSwap the blueberry for 35g mango\nToppings: crunchy muesli, mixed nuts (as per menu)`,
		method: "Blend the smoothie base thick. Pour into the bowl and add toppings.",
	},

	// ── Ice creams ────────────────────────────────────────────────────────────
	{
		dishName: "Vanilla With Chocolate Topping",
		category: "Ice Creams",
		yieldNote: "1 cup",
		ingredients: "Vanilla ice cream · chocolate syrup",
		method: "Scoop into the cup, drizzle chocolate syrup, lid and send.",
	},
	{
		dishName: "Chocolate Ice Cream",
		aliases: ["Chocolate"],
		category: "Ice Creams",
		yieldNote: "1 cup",
		ingredients: "Chocolate ice cream",
		method: "Scoop into the cup, lid and send.",
	},
	{
		dishName: "Butterscotch Ice Cream",
		aliases: ["Butterscotch"],
		category: "Ice Creams",
		yieldNote: "1 cup",
		ingredients: "Butterscotch ice cream",
		method: "Scoop into the cup, lid and send.",
	},
];

export function normalizeDishKey(name: string): string {
	return n(name);
}

const MATCH_STOP = new Set([
	"with",
	"and",
	"the",
	"cold",
	"pressed",
	"fresh",
	"juice",
	"milk",
	"shake",
	"salad",
	"wrap",
	"bowl",
	"oats",
	"overnight",
]);

function significantTokens(name: string): Set<string> {
	return new Set(
		n(name)
			.split(/[^a-z0-9]+/)
			.filter((t) => t.length >= 3 && !MATCH_STOP.has(t)),
	);
}

function recipeMatchNames(recipe: RecipeEntry): string[] {
	return [recipe.dishName, ...(recipe.aliases ?? [])];
}

/** Higher score = better match. 0 = no usable match. */
function scoreRecipeMatch(menuName: string, recipe: RecipeEntry): number {
	if (recipe.category === "Dressings") return 0;
	const menuKey = n(menuName);
	const candidates = recipeMatchNames(recipe).map(n);

	if (candidates.some((c) => c === menuKey)) return 10_000;

	let best = 0;
	for (const c of candidates) {
		if (c.length >= 8 && (menuKey.includes(c) || c.includes(menuKey))) {
			best = Math.max(best, 5_000 + Math.min(c.length, menuKey.length));
		}
	}
	if (best > 0) return best;

	const menuTokens = significantTokens(menuName);
	if (menuTokens.size === 0) return 0;

	for (const c of candidates) {
		const recipeTokens = significantTokens(c);
		if (recipeTokens.size === 0) continue;
		let overlap = 0;
		for (const t of menuTokens) {
			if (recipeTokens.has(t)) overlap += 1;
		}
		const denom = Math.max(menuTokens.size, recipeTokens.size);
		const ratio = overlap / denom;
		// Need 2+ shared tokens — single-token hits ("Chicken Fricassee" → chicken wrap) print the wrong recipe.
		if (overlap >= 2) {
			best = Math.max(best, Math.round(ratio * 1000) + overlap * 10);
		}
	}
	return best;
}

/**
 * Find curated kitchen recipe for a live menu dish.
 * Exact / alias first, then token overlap so renames still match
 * without hand-updating aliases. Card titles always come from the live menu.
 */
export function findRecipeForDish(dishName: string): RecipeEntry | undefined {
	let best: RecipeEntry | undefined;
	let bestScore = 0;
	for (const r of RECIPE_BOOK) {
		const score = scoreRecipeMatch(dishName, r);
		if (score > bestScore) {
			bestScore = score;
			best = r;
		}
	}
	return bestScore > 0 ? best : undefined;
}

/** Fallback kitchen guidance when no curated recipe exists. Live description is NOT copied here. */
export function recipeFromMenuFields(
	dishName: string,
	category: string,
	ingredients: string,
	_description: string,
): RecipeEntry {
	const ing = ingredients.trim() || "See menu ingredients / station mise";
	return {
		dishName,
		category: category || "Menu",
		ingredients: ing,
		method:
			"Prep from the menu ingredients above. Keep portions consistent; chill or heat as the category requires. Label and date prep containers.",
	};
}
