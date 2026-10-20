/**
 * Kitchen recipe book — Fresh & Fusion kitchen builds (from the kitchen notebook).
 * Matched to live dish names (and aliases) when the owner opens /recipe-book.
 */

/** One ingredient line; `qty` aligns with the recipe's `columns`. A heading row labels a group. */
export type RecipeRow = {
	item: string;
	qty: string[];
	heading?: boolean;
};

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
	/** Column headings for the quantity cells (serve sizes, bowl sizes). Defaults to one "Qty" column. */
	columns?: string[];
	/** Structured ingredient table. */
	rows?: RecipeRow[];
	/** Numbered method steps. */
	steps?: string[];
	/** Extra bullet notes (conversions, safety temperatures). */
	notes?: string[];
	/** Plain-text build — used when `rows` is absent (older cards, generic fallback). */
	ingredients?: string;
	/** Plain-text method — used when `steps` is absent. */
	method?: string;
	/** Dressing card names (RECIPE_BOOK dishName) to print alongside this dish. */
	dressings?: string[];
};

function n(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Ingredient row: name followed by one quantity per column. */
const r = (item: string, ...qty: string[]): RecipeRow => ({ item, qty });
/** Group heading row inside an ingredient table. */
const h = (item: string): RecipeRow => ({ item, qty: [], heading: true });

/** Large salads → 750ml bowl; small / medium = 60% of large → 500ml bowl. */
const SALAD_COLS = ["Large · 750ml bowl", "Small / Medium · 500ml bowl"];
const SERVE_COLS = ["1 serve", "3 serves", "6 serves"];

const CAESAR_MAYO = "Caesar dressing (mayo base)";
const CAESAR_CURD = "Caesar dressing (hung curd)";
const YOGURT_DRESSING = "Yogurt dressing";
const LEMON_HERB = "Lemon & herb dressing";
const APPLE_CIDER_HERB = "Apple cider & herb dressing";
const CITRUS = "Citrus dressing";

const SALAD_DRESSING_NOTE = "Dressing goes on the side in 50ml cups (large: 2 cups, small: 1 cup). Never toss it into the salad.";

const PANEER_STEPS = [
	"Marinate the paneer.",
	"Cook on low flame for 2–3 min with the lid on, until soft and spongy.",
	"Do not let the paneer turn hard.",
];
const CHICKEN_STEPS = [
	"Marinate the chicken breast with Cajun spice.",
	"Grill on low with the lid on, 5 min each side.",
	"Check the core temperature — it must reach at least 70°C.",
	"Slice after cooking.",
];
const LEGUME_NOTES = [
	"1 serve: 60g dry (¼ cup) → about 150g cooked.",
	"3 serves: 180g dry (¾ cup) → about 450g cooked.",
	"Small salad: 36g dry → about 90g cooked.",
];
const legumeSteps = (name: string): string[] => [
	`Soak the ${name} for 8–12 hours.`,
	"Cook for 40 min on high in the electric pressure cooker with enough water to cover.",
	"Drain and cool before building the salad.",
];
const legumeSalad = (name: string, dishName: string, aliases?: string[]): RecipeEntry => ({
	dishName,
	aliases,
	category: "Salads",
	yieldNote: "Large ~400g in a 750ml bowl · small / medium in a 500ml bowl",
	columns: SALAD_COLS,
	rows: [
		h("Base"),
		r(`${name}, dry (uncooked)`, "60g", "36g"),
		r(`${name}, cooked`, "150g (10.6g protein)", "90g"),
		h("Veg & toppings"),
		r("Cos lettuce", "25g", "15g"),
		r("Iceberg lettuce", "25g", "15g"),
		r("Tomato", "30g", "18g"),
		r("Cucumber", "30g", "18g"),
		r("Capsicum", "20g", "12g"),
		r("Roasted peanuts", "20g", "12g"),
		h("Dressing"),
		r("Yogurt dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
	],
	steps: legumeSteps(name.toLowerCase()),
	notes: [...LEGUME_NOTES, SALAD_DRESSING_NOTE],
	dressings: [YOGURT_DRESSING],
});

const THICK_SHAKE_STEPS = [
	"Prepare the 300ml glass and aluminium foil.",
	"Put 3 large scoops of ice cream and 40ml milk into the big blender.",
	"Press whip 3–5 times at 1-second intervals until thick.",
	"Pour into the 300ml glass and put one scoop of ice cream on top.",
	"Cover with aluminium foil and tighten the glass lid.",
	"Put a thick straw into the packaging.",
];
const thickShake = (dishName: string, flavour: string, aliases?: string[]): RecipeEntry => ({
	dishName,
	aliases,
	category: "Milkshakes",
	yieldNote: "300ml glass",
	rows: [
		r(`${flavour} ice cream`, "3 large scoops (~220g) + 1 scoop for topping"),
		r("Milk", "40ml"),
		r("Glass", "300ml with glass lid"),
		r("Aluminium foil", "1 sheet"),
		r("Thick straw", "1"),
	],
	steps: THICK_SHAKE_STEPS,
});

const JUICE_FREEZE = "Juice and store it in the freezer until delivery.";

const SMOOTHIE_NOTE = "If using normal curd instead of hung curd: 60ml milk + 60ml curd.";
const smoothie = (dishName: string, category: string, fruit: string, yieldNote: string, extra: RecipeRow[] = [], aliases?: string[]): RecipeEntry => ({
	dishName,
	aliases,
	category,
	yieldNote,
	rows: [
		r(fruit, "35g"),
		r("Ripe banana", "½ (or 50g)"),
		r("Milk", "80g"),
		r("Hung curd", "40g"),
		r("Honey", "10g"),
		...extra,
	],
	steps: ["Blend until smooth."],
	notes: [SMOOTHIE_NOTE],
});

/** Curated kitchen cards — dressings, salads, wraps, pasta, oats, juices, shakes, smoothies. */
export const RECIPE_BOOK: RecipeEntry[] = [
	// ── Dressings (shared prep) ───────────────────────────────────────────────
	{
		dishName: CAESAR_MAYO,
		category: "Dressings",
		yieldNote: "Portion into 50ml cups",
		columns: SERVE_COLS,
		rows: [
			r("Unsweetened mayo", "34g", "102g", "204g"),
			r("Extra virgin olive oil", "7.5ml", "22.5ml", "45ml"),
			r("Concentrated lemon juice", "3ml", "9ml", "18ml"),
			r("Worcestershire sauce", "1.5ml", "4.5ml", "9ml"),
			r("Dijon mustard", "3g", "9g", "18g"),
			r("Garlic powder", "¼ tsp (0.8g)", "¾ tsp (2.3g)", "1½ tsp (4.7g)"),
			r("Black pepper", "¼ tsp (0.6g)", "¾ tsp (1.7g)", "1½ tsp (3.5g)"),
			r("Water", "10ml", "30ml", "60ml"),
			r("Salt", "to taste", "1.5g", "3g"),
			r("Synthetic vinegar (optional)", "2ml", "6ml", "12ml"),
		],
		steps: ["Whisk everything until smooth and pourable.", "Chill.", "Portion into 50ml cups."],
	},
	{
		dishName: CAESAR_CURD,
		category: "Dressings",
		yieldNote: "Portion into 50ml cups",
		columns: ["1 serve", "3 serves"],
		rows: [
			r("Hung curd", "45g", "140g"),
			r("Mayo", "25g", "75g"),
			r("Parmesan", "5g", "30g"),
			r("Lemon juice", "5ml", "15ml"),
			r("Extra virgin olive oil", "7.5ml", "22ml"),
			r("Soy sauce", "1.5ml", "5ml"),
			r("Dijon mustard", "2.5g (½ tsp)", "7.5g"),
			r("Garlic, grated", "1 clove", "3 cloves"),
			r("Black pepper", "¼ tsp", "¾ tsp"),
			r("Salt", "to taste", "¼ tsp"),
			r("Water", "only if needed", "only if needed"),
		],
		steps: [
			"Whisk the curd and mayo smooth.",
			"Mix in the remaining ingredients.",
			"Thin with water only if needed.",
			"Chill and portion into 50ml cups.",
		],
	},
	{
		dishName: YOGURT_DRESSING,
		category: "Dressings",
		yieldNote: "1 serve ≈ 100ml · shared by chickpea, soya chunk and rajma salads",
		columns: ["1 serve"],
		rows: [
			r("Hung yogurt", "100ml"),
			r("Black pepper", "½ tsp"),
			r("Salt", "½ tsp"),
			r("Cumin powder", "½ tsp"),
			r("Chilli powder", "½ tsp (a little)"),
			r("Garlic", "1 clove"),
			r("Honey", "1 tsp"),
			r("Lemon", "½ tsp"),
		],
		steps: ["Blend or whisk until smooth.", "Chill.", "Portion into 50ml cups."],
		notes: ["For extra creaminess add 3–4 soaked cashews or paneer cubes."],
	},
	{
		dishName: LEMON_HERB,
		category: "Dressings",
		yieldNote: "100ml per serve · portion into 50ml cups",
		columns: ["1 serve", "6 serves"],
		rows: [
			r("Oil", "64g", "384g"),
			r("Lemon juice concentrate", "24g", "144g"),
			r("Dijon mustard", "6g", "36g"),
			r("Honey", "10g", "30g"),
			r("Oregano, dried", "1g", "6g"),
			r("Salt & black pepper", "1g", "6g"),
		],
		steps: ["Whisk or shake in a jar until emulsified.", "Shake again before every fill.", "Portion into 50ml cups."],
	},
	{
		dishName: APPLE_CIDER_HERB,
		category: "Dressings",
		yieldNote: "100ml per serve · portion into 50ml cups",
		columns: ["1 serve", "6 serves"],
		rows: [
			r("Oil", "64g", "384g"),
			r("Apple cider vinegar", "24g", "144g"),
			r("Dijon mustard", "6g", "36g"),
			r("Honey", "10g", "50g"),
			r("Oregano, dried", "1g", "3g"),
			r("Salt & pepper", "1g", "6g"),
			r("Parsley, dried", "1g", "6g"),
		],
		steps: ["Whisk or shake in a jar until emulsified.", "Shake again before every fill.", "Portion into 50ml cups."],
	},
	{
		dishName: CITRUS,
		category: "Dressings",
		yieldNote: "Batch ~1L · portion into 50ml cups",
		columns: ["Batch"],
		rows: [
			r("Orange juice", "350ml"),
			r("Lemon juice", "150ml"),
			r("Oil", "550ml"),
			r("Honey", "2 tbsp"),
			r("Salt & pepper", "to taste"),
		],
		steps: ["Whisk the juices with the honey.", "Stream in the oil.", "Chill and portion into 50ml cups."],
	},

	// ── Salads ────────────────────────────────────────────────────────────────
	{
		dishName: "Veg Caesar Salad",
		aliases: ["Paneer Caesar Salad", "Caesar Salad (Veg)"],
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			h("Greens & veg"),
			r("Cos lettuce", "35g", "21g"),
			r("Iceberg lettuce", "35g", "21g"),
			r("Cherry tomato", "6 pcs", "4 pcs"),
			r("Olives", "10g", "6g"),
			r("Yellow capsicum", "30g", "18g"),
			h("Protein & toppings"),
			r("Paneer / tofu", "100g", "60g"),
			r("Croutons", "10g", "6g"),
			r("Mixed seeds", "10–20g", "6–12g"),
			h("Dressing"),
			r("Caesar dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: ["Cook the paneer (steps below).", "Build the cos + iceberg lettuce mix first, then veg, paneer, croutons and seeds on top.", "Pack the dressing on the side."],
		notes: [...PANEER_STEPS.map((s) => `Paneer: ${s}`), SALAD_DRESSING_NOTE],
		dressings: [CAESAR_MAYO, CAESAR_CURD],
	},
	{
		dishName: "Chicken Caesar Salad",
		aliases: ["Caesar Salad (Chicken)", "Caesar Chicken Salad"],
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			h("Protein"),
			r("Chicken breast (raw)", "120–130g", "80g"),
			h("Greens & veg"),
			r("Cos lettuce", "35g", "21g"),
			r("Iceberg lettuce", "35g", "21g"),
			r("Cherry tomato", "6 pcs", "4 pcs"),
			r("Olives", "10g", "6g"),
			r("Yellow capsicum", "30g", "18g"),
			h("Toppings"),
			r("Croutons", "10g", "6g"),
			r("Mixed seeds", "10–20g", "6–12g"),
			h("Dressing"),
			r("Caesar dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: [...CHICKEN_STEPS, "Build the cos + iceberg lettuce mix first, then veg, sliced chicken, croutons and seeds on top.", "Pack the dressing on the side."],
		notes: [SALAD_DRESSING_NOTE],
		dressings: [CAESAR_MAYO, CAESAR_CURD],
	},
	{
		dishName: "Grilled Chicken Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			h("Protein"),
			r("Chicken breast (raw)", "120–130g", "80g"),
			h("Greens & veg"),
			r("Cos lettuce", "35g", "21g"),
			r("Iceberg lettuce", "35g", "21g"),
			r("Tomato", "30g", "18g"),
			r("Capsicum", "30g", "18g"),
			r("Cucumber", "20g", "12g"),
			r("Onion", "10g", "6g"),
			h("Toppings"),
			r("Shredded cheese", "20g", "12g"),
			r("Mixed seeds", "10–20g", "6–12g"),
			h("Dressing"),
			r("Lemon & herb dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: [...CHICKEN_STEPS, "Build the cos + iceberg lettuce mix first, then veg, sliced chicken, cheese and seeds on top.", "Pack the dressing on the side."],
		notes: [SALAD_DRESSING_NOTE],
		dressings: [LEMON_HERB],
	},
	legumeSalad("Chickpeas", "Chickpea Salad"),
	legumeSalad("Rajma", "Rajma Salad"),
	{
		dishName: "Soya Chunks Salad",
		aliases: ["Soya Chunk Salad", "Mini Soya Chunk Salad"],
		category: "Salads",
		yieldNote: "Large ~400g in a 750ml bowl · small / medium in a 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			h("Base"),
			r("Mini soya chunks, dry", "50g", "30g"),
			r("Soya, hydrated & squeezed", "150g (21g protein)", "90g"),
			h("Veg & toppings"),
			r("Cos lettuce", "25g", "15g"),
			r("Iceberg lettuce", "25g", "15g"),
			r("Tomato", "30g", "18g"),
			r("Cucumber", "30g", "18g"),
			r("Capsicum", "20g", "12g"),
			r("Roasted peanuts", "20g", "12g"),
			h("Dressing"),
			r("Yogurt dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: [
			"Boil the soya chunks in water with 1 tsp salt for 3 min on gas.",
			"Drain and rinse in cool water.",
			"Squeeze out 80–90% of the water.",
			"Build the salad and pack the dressing on the side.",
		],
		notes: [SALAD_DRESSING_NOTE],
		dressings: [YOGURT_DRESSING],
	},
	{
		dishName: "Tuna Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			r("Cos lettuce", "70g", "42g"),
			r("Iceberg lettuce", "70g", "42g"),
			r("Tuna, drained", "90g", "54g"),
			r("Cherry tomato", "50g", "30g"),
			r("Cucumber", "50g", "30g"),
			r("Mixed seeds", "10–20g", "6–12g"),
			r("Apple cider & herb dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: [
			"Open the tuna can slightly and drain all the water or oil out first.",
			"Build the salad with the drained tuna.",
			"Pack the dressing on the side.",
		],
		notes: [SALAD_DRESSING_NOTE],
		dressings: [APPLE_CIDER_HERB],
	},
	{
		dishName: "Quinoa Paneer Salad",
		category: "Salads",
		yieldNote: "Large 750ml bowl · small / medium 500ml bowl",
		columns: SALAD_COLS,
		rows: [
			r("Cooked quinoa", "110g", "66g"),
			r("Paneer", "90g", "54g"),
			r("Cucumber", "50g", "30g"),
			r("Tomato", "50g", "30g"),
			r("Cos lettuce", "20g", "12g"),
			r("Iceberg lettuce", "20g", "12g"),
			r("Citrus dressing (50ml cups)", "100ml · 2 cups", "50ml · 1 cup"),
		],
		steps: ["Cook the quinoa once (40g dry ≈ 110–120g cooked).", ...PANEER_STEPS, "Mix the cos and iceberg lettuce, build the salad and pack the dressing on the side."],
		notes: [SALAD_DRESSING_NOTE],
		dressings: [CITRUS],
	},
	{
		dishName: "Egg Salad",
		category: "Salads",
		yieldNote: "Bowl ~330g",
		columns: ["Qty"],
		rows: [
			r("Cos lettuce", "75g"),
			r("Iceberg lettuce", "75g"),
			r("Boiled eggs", "2 (~110–120g)"),
			r("Spring onion", "20g"),
			r("Cherry tomato", "40g"),
		],
		steps: ["Batch-boil the eggs, ice shock and peel when cool.", "Assemble cold.", "Pack the dressing on the side."],
	},
	{
		dishName: "Quinoa Avocado Salad",
		category: "Salads",
		yieldNote: "Bowl ~340g",
		columns: ["Qty"],
		rows: [
			r("Cooked quinoa", "120g"),
			r("Avocado", "80g"),
			r("Cherry tomato", "50g"),
			r("Cucumber", "50g"),
			r("Cos lettuce", "20g"),
			r("Iceberg lettuce", "20g"),
			r("Citrus dressing (50ml cup)", "1 cup"),
		],
		steps: ["Cut the avocado last to avoid browning.", "Squeeze lemon on the cut face if holding for 10+ min."],
		dressings: [CITRUS],
	},

	// ── Wraps & bowls ─────────────────────────────────────────────────────────
	{
		dishName: "Paneer Tortilla Wrap",
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		columns: ["Qty"],
		rows: [
			r("Wheat tortilla", "1"),
			r("Paneer", "70g"),
			r("Iceberg lettuce", "60–70g"),
			r("Tomato", "15g"),
			r("Bell peppers", "15g"),
			r("Shredded cheese", "15g"),
			r("Tomato sauce", "1 sachet (in the bag)"),
		],
		steps: [
			"Marinate the paneer with mixed herbs, or oregano + a little chilli flakes + parsley.",
			"Cook on low flame for 2–3 min with the lid on until soft and spongy.",
			"After cooking add a little diluted lemon juice on the stove, mix and add a little salt.",
			"Heat the wrap for 20 seconds.",
			"Fill with lettuce, paneer, tomato, bell peppers and cheese, then roll.",
			"Put one tomato sauce sachet in the bag.",
		],
	},
	{
		dishName: "Caesar Chicken Tortilla Wrap",
		aliases: ["Chicken Tortilla Wrap"],
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		columns: ["Qty"],
		rows: [
			h("Wrap"),
			r("Wheat tortilla", "1"),
			r("Iceberg lettuce", "40g"),
			r("Capsicum", "to fill"),
			r("Shredded cheese", "to fill"),
			r("Tomato ketchup", "1 sachet (in the bag)"),
			h("Chicken & marinade"),
			r("Chicken breast", "70g"),
			r("Cajun spice", "2 tsp"),
			r("Diluted lemon juice", "5ml"),
			r("Yogurt", "½ tbsp"),
			h("Herb mayo"),
			r("Mayo", "60g"),
			r("Salt, pepper, oregano, parsley", "to taste"),
			r("Water or diluted lime", "a little, to thin"),
		],
		steps: [
			"Marinate the chicken with Cajun spice and diluted lemon juice, then mix with the yogurt.",
			"Cook the chicken uncut along with the capsicum until it reaches 71°C.",
			"Slice the chicken into strips after cooking.",
			"Warm the tortilla and spread the herb mayo.",
			"Add lettuce, chicken, capsicum and shredded cheese.",
			"Roll and cook on the grill on both sides.",
			"Wrap in paper and send with 1 ketchup sachet.",
		],
	},
	{
		dishName: "Double Egg Roll",
		aliases: ["Double Egg Wrap"],
		category: "Wraps & Bowls",
		yieldNote: "1 wrap",
		columns: ["Qty"],
		rows: [
			r("Wheat paratha / wrap", "1 (70–80g)"),
			r("Eggs", "2"),
			r("Onion", "40g"),
			r("Spices & lemon", "to taste"),
			r("Mayo (optional)", "15g"),
		],
		steps: ["Scramble the eggs with the onion on the flat top.", "Roll in a warm wrap with a squeeze of lemon."],
	},
	{
		dishName: "Tomato Mutti Rice Bowl",
		aliases: ["Tomato Mutti Wrap", "Tomato Mutti Bowl", "Tomato Mutti Wrap/Bowl"],
		category: "Wraps & Bowls",
		yieldNote: "Bowl or wrap fill",
		columns: ["Qty"],
		rows: [
			r("Tomato mutti gravy", "100g"),
			r("Spiced base / veg", "80–100g"),
			r("Cooked rice (bowl)", "150g"),
			r("Wrap (instead of rice)", "1"),
		],
		steps: ["Reheat the gravy and rice.", "Assemble the bowl hot.", "For a wrap, reduce the gravy so it doesn't soak through."],
	},

	// ── Pasta bowls ───────────────────────────────────────────────────────────
	{
		dishName: "Veg Pasta Bowl",
		category: "Pasta Bowls",
		yieldNote: "500ml bowl",
		columns: ["Qty"],
		rows: [
			r("Pasta, dry", "80–90g"),
			r("Water (pressure cooker)", "1½ cups"),
			r("Cajun cream pasta base", "as per Cajun pasta recipe"),
			r("Mushroom, bell peppers, capsicum", "as per menu"),
		],
		steps: [
			"Cook the pasta in the electric pressure cooker with 1½ cups water for 5 min, then drain.",
			"Meanwhile cook the cream pasta base with the veg in the Nosh machine (Cajun pasta recipe).",
			"Mix the drained pasta into the cream base.",
			"Serve in a 500ml bowl.",
		],
	},
	{
		dishName: "Chicken Pasta Bowl",
		category: "Pasta Bowls",
		yieldNote: "500ml bowl",
		columns: ["Qty"],
		rows: [
			r("Pasta, dry", "80–90g"),
			r("Water (pressure cooker)", "1½ cups"),
			r("Cajun grilled chicken", "as per menu"),
			r("Cajun cream pasta base", "as per Cajun pasta recipe"),
			r("Mushroom, bell peppers, capsicum", "as per menu"),
		],
		steps: [
			...CHICKEN_STEPS,
			"Cook the pasta in the electric pressure cooker with 1½ cups water for 5 min, then drain.",
			"Meanwhile cook the cream pasta base with the veg in the Nosh machine (Cajun pasta recipe).",
			"Mix the drained pasta and chicken into the cream base.",
			"Serve in a 500ml bowl.",
		],
	},

	// ── Snacks ────────────────────────────────────────────────────────────────
	{
		dishName: "Cajun Grilled Chicken",
		category: "Snacks",
		yieldNote: "1 serve",
		rows: [r("Boneless chicken breast", "1 serve"), r("Cajun spice marinade", "to coat")],
		steps: CHICKEN_STEPS,
	},
	{
		dishName: "Peri Peri Grilled Paneer",
		category: "Snacks",
		yieldNote: "1 serve",
		rows: [r("Paneer cubes", "1 serve"), r("Peri peri spice marinade", "to coat")],
		steps: PANEER_STEPS,
	},
	{
		dishName: "Cilantro Grill Paneer",
		category: "Snacks",
		yieldNote: "1 serve",
		rows: [r("Paneer cubes", "1 serve"), r("Crushed cilantro, minced garlic, green chilli marinade", "to coat")],
		steps: PANEER_STEPS,
	},
	{
		dishName: "Paneer Crunch Snack",
		category: "Snacks",
		yieldNote: "1 serve",
		rows: [
			r("Paneer", "60–70g"),
			r("Tomato", "4 slices"),
			r("Onion", "2 slices"),
			r("Cheese", "1 slice"),
			r("Tomato sauce", "20g"),
		],
		steps: PANEER_STEPS,
	},
	{
		dishName: "Rice Kheer",
		category: "Desserts",
		yieldNote: "1 serve",
		rows: [
			r("Rice", "100g"),
			r("Milk", "150g"),
			r("Cream", "20g"),
			r("Raisins (kismis)", "8 pcs"),
			r("Almonds (badam)", "2 pcs"),
			r("Cashews", "2 pcs"),
			r("Jaggery (bellam)", "to taste"),
		],
		steps: [
			"Tadka the almonds and cashews.",
			"Add the milk and bring to a boil.",
			"Add the jaggery, then the rice.",
			"Finish with the cream.",
		],
	},

	// ── Overnight oats & chia ─────────────────────────────────────────────────
	{
		dishName: "Overnight Oats With Dry Fruits, Berries & Nuts",
		aliases: ["Overnight Oats With Dry Fruits", "Overnight oats with dry fruits"],
		category: "Overnight Oats",
		yieldNote: "1 jar · soak overnight",
		columns: ["Qty"],
		rows: [
			r("Rolled oats", "40g"),
			r("Milk", "115ml"),
			r("Chia base", "chia 15g + milk 100ml"),
			r("Berries", "10g"),
			r("Honey", "5g"),
			r("Dry fruits & nuts (topping)", "as per menu"),
		],
		steps: [
			"Mix the oats with the milk.",
			"Stir in the chia base and honey.",
			"Refrigerate overnight.",
			"Top with berries, dry fruits and nuts before sealing.",
		],
	},
	{
		dishName: "Chia Pudding With Dry Fruits",
		aliases: ["Chia Pudding"],
		category: "Overnight Oats",
		yieldNote: "1 serve",
		columns: ["Qty"],
		rows: [
			r("Chia seeds", "25g"),
			r("Milk", "135ml"),
			r("Honey", "5g"),
			r("Dry fruits, mixed berries, granola crunch (topping)", "as per menu"),
		],
		steps: ["Mix the chia, milk and honey.", "Refrigerate until set.", "Top with dry fruits, berries and granola before sealing."],
	},
	{
		dishName: "Chia Jam Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "Jar finished weight 250–280g · soak 6–8h",
		columns: ["Qty"],
		rows: [
			r("Rolled oats", "60g"),
			r("Chilled milk", "155ml"),
			r("Chia", "8g"),
			r("Fruit jam", "25g"),
			r("Honey", "8g"),
		],
		steps: ["Mix the night before.", "Weigh to 250–280g before sealing.", "Serve cold."],
	},
	{
		dishName: "Mango Chia Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		columns: ["Qty"],
		rows: [
			r("Rolled oats", "55g"),
			r("Milk", "150ml"),
			r("Chia", "8g"),
			r("Mango", "70g"),
			r("Honey", "10g"),
		],
		steps: ["Mix the oats, milk, chia and honey.", "Fold in the mango.", "Soak cold and weigh the jar."],
	},
	{
		dishName: "Mixed Berries Overnight Oats",
		aliases: ["Mixed Berry Overnight Oats"],
		category: "Overnight Oats",
		yieldNote: "250–280g",
		columns: ["Qty"],
		rows: [
			r("Oats", "60g"),
			r("Milk", "160ml"),
			r("Chia", "8g"),
			r("Blueberries", "30g"),
			r("Strawberries", "30g"),
			r("Honey", "10g"),
		],
		steps: ["Mix the base.", "Top with the berries.", "Soak and weigh."],
	},
	{
		dishName: "Apple Cinnamon Overnight Oats",
		category: "Overnight Oats",
		yieldNote: "250–280g",
		columns: ["Qty"],
		rows: [
			r("Oats", "60g"),
			r("Milk", "155ml"),
			r("Apple", "50g"),
			r("Raisins", "12g"),
			r("Cinnamon", "to taste"),
			r("Honey", "10g"),
		],
		steps: ["Dice the apple small so it softens overnight.", "Mix, soak and weigh."],
	},

	// ── Juices ────────────────────────────────────────────────────────────────
	{
		dishName: "ABC Immunity Booster",
		aliases: ["ABC Juice", "ABC Immunity Booster"],
		category: "Fresh Juices",
		yieldNote: "1 serve chilled",
		ingredients: "Apple · beetroot · carrot · lemon · ginger (see menu ingredients)",
		steps: ["Wash and rough chop the apple, beetroot and carrot.", "Juice, or high-speed blend and fine strain.", JUICE_FREEZE],
	},
	{
		dishName: "Orange Immunity Boost",
		aliases: ["Orange Juice Cold Pressed", "Orange Immunity Boost"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Fresh oranges only",
		steps: ["Juice the oranges and strain the pulp if needed.", JUICE_FREEZE],
	},
	{
		dishName: "Watermelon Hydrator",
		aliases: ["Watermelon Juice", "Watermelon Hydrator"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Watermelon flesh · optional ice",
		steps: ["Blend in the large mixer.", "Put it into a 200ml pet bottle.", "Keep it in the freezer until delivery."],
	},
	{
		dishName: "Green Glow Detox",
		aliases: ["Apple Carrot Celery Cold Pressed", "Green Glow Detox"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · carrot · celery · lemon",
		steps: ["Juice the apple, carrot and celery together, lemon last.", JUICE_FREEZE],
	},
	{
		dishName: "Carrot Apple Energy",
		aliases: ["Apple Carrot Cold Pressed", "Carrot Apple Energy"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Apple · carrot · lemon (see menu ingredients)",
		steps: ["Wash and chop the apple and carrot.", "Juice, or blend and strain.", JUICE_FREEZE],
	},
	{
		dishName: "Crisp Apple Vitality",
		aliases: ["Apple Cold Pressed", "Crisp Apple Vitality"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Fresh apples · lemon optional",
		steps: ["Juice the apples with a splash of lemon to slow browning.", JUICE_FREEZE],
	},
	{
		dishName: "Beta-Glow Carrot",
		aliases: ["Carrot Juice Cold Pressed", "Beta-Glow Carrot"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Carrots · optional ginger/lemon",
		steps: ["Juice the carrots; finish with ginger/lemon if on the menu.", JUICE_FREEZE],
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
		steps: ["Juice or blend; strain the seeds if needed.", JUICE_FREEZE],
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
		steps: ["Blend the mango pulp with chilled water until pourable.", JUICE_FREEZE],
	},
	{
		dishName: "Sweet Lime Digestive",
		aliases: ["Mosambi Cold Pressed", "Sweet Lime Digestive"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Mosambi (sweet lime)",
		steps: ["Juice the sweet lime.", JUICE_FREEZE],
	},
	{
		dishName: "Tropical Electrolyte Cooler",
		aliases: ["Tropical Pina Colada Cold Pressed", "Pineapple Juice", "Pineapple Energizer", "Tropical Electrolyte Cooler"],
		category: "Fresh Juices",
		yieldNote: "1 serve",
		ingredients: "Pineapple · coconut water · lime · mint",
		steps: ["Blend or juice the pineapple with the coconut water; finish with lime and mint.", JUICE_FREEZE],
	},

	// ── Milkshakes & thick shakes ─────────────────────────────────────────────
	thickShake("Triple Chocolate Thick Shake", "Chocolate", ["Chocolate Thick Shake"]),
	thickShake("Crunchy Butterscotch Thick Shake", "Butterscotch", ["Butterscotch Thick Shake"]),
	{
		dishName: "Vanilla Thick Shake With Chocolate",
		aliases: ["Vanilla Milkshake With Chocolate", "Vanilla Thick Shake"],
		category: "Milkshakes",
		yieldNote: "300ml glass",
		rows: [
			r("Vanilla ice cream", "3 large scoops (~220g) + 1 scoop for topping"),
			r("Milk", "40ml"),
			r("Chocolate syrup", "to coat the glass + drizzle"),
			r("Choco sprinkles", "to top"),
			r("Glass", "300ml with glass lid"),
			r("Aluminium foil", "1 sheet"),
			r("Thick straw", "1"),
		],
		steps: [
			"Prepare the 300ml glass and aluminium foil.",
			"Coat the inside of the glass with chocolate syrup.",
			"Put 3 large scoops of ice cream and 40ml milk into the big blender.",
			"Press whip 3–5 times at 1-second intervals until thick.",
			"Pour into the glass and put one scoop of ice cream on top.",
			"Drizzle chocolate syrup and add choco sprinkles.",
			"Cover with aluminium foil and tighten the glass lid.",
			"Put a thick straw into the packaging.",
		],
	},
	{
		dishName: "Classic Milk Shake",
		category: "Milkshakes",
		yieldNote: "1 serve",
		rows: [r("Milk", "100ml"), r("Ice cream", "140g"), r("Chocolate sprinkles", "a little, on top")],
		steps: ["Blend the milk and ice cream until smooth.", "Pour and finish with chocolate sprinkles."],
	},
	{
		dishName: "Kitkat Chocolate Milk Shake",
		aliases: ["Chocolate Milk Shake", "Chocolate Milkshake"],
		category: "Milkshakes",
		yieldNote: "1 tall serve",
		rows: [
			r("Milk", "as per menu"),
			r("Cocoa or chocolate syrup", "to taste"),
			r("Ice cream", "1 scoop"),
			r("Ice", "as needed"),
			r("KitKat crush (optional)", "to top"),
		],
		steps: ["Blend the milk, syrup, ice cream and ice for 20–30 seconds.", "Top with the KitKat crush if the dish needs it."],
	},
	{
		dishName: "Apple Milkshake",
		category: "Milkshakes",
		yieldNote: "1 serve",
		rows: [r("Apple, peeled", "1"), r("Milk", "as per menu"), r("Honey", "to taste"), r("Ice", "as needed")],
		steps: ["Blend everything until smooth."],
	},
	{
		dishName: "Banana Milkshake",
		aliases: ["Banana Milk Shake"],
		category: "Milkshakes",
		yieldNote: "1 serve",
		rows: [r("Banana", "1"), r("Milk", "as per menu"), r("Honey", "to taste"), r("Ice", "as needed")],
		steps: ["Blend until smooth."],
		notes: ["Spotty bananas are sweeter — use less honey."],
	},

	// ── Smoothies & smoothie bowls ────────────────────────────────────────────
	{
		dishName: "Oat Smoothie With Dry Fruits",
		aliases: ["Oat Milk Shake With Dry Fruits", "Oat Smoothie with Dry Fruits"],
		category: "Smoothies",
		yieldNote: "200ml",
		rows: [r("Milk", "200ml"), r("Rolled oats", "50g"), r("Dry fruits", "20g"), r("Dates", "2 pieces")],
		steps: ["Blend everything until smooth."],
	},
	smoothie("Blueberry Smoothie", "Smoothies", "Frozen blueberry", "200ml", [], ["Blueberry Yogurt Smoothie"]),
	smoothie("Strawberry Smoothie", "Smoothies", "Frozen strawberry", "200ml"),
	smoothie("Mango Smoothie", "Smoothies", "Mango", "200ml"),
	smoothie("Muesli Blueberry Smoothie Bowl", "Smoothies", "Frozen blueberry", "1 bowl", [
		h("Toppings"),
		r("Toasted muesli, banana, honey", "as per menu"),
	]),
	smoothie("Muesli Banana Smoothie Bowl", "Smoothies", "Extra banana (instead of berries)", "1 bowl", [
		h("Toppings"),
		r("Toasted muesli, berries, walnuts, honey", "as per menu"),
	]),
	smoothie("Muesli Mango Smoothie Bowl", "Smoothies", "Mango", "1 bowl", [
		h("Toppings"),
		r("Crunchy muesli, mixed nuts", "as per menu"),
	]),

	// ── Ice creams ────────────────────────────────────────────────────────────
	{
		dishName: "Vanilla With Chocolate Topping",
		category: "Ice Creams",
		yieldNote: "1 cup",
		rows: [r("Vanilla ice cream", "as per menu"), r("Chocolate syrup", "drizzle")],
		steps: ["Scoop into the cup.", "Drizzle with chocolate syrup.", "Lid and send."],
	},
	{
		dishName: "Chocolate Ice Cream",
		aliases: ["Chocolate"],
		category: "Ice Creams",
		yieldNote: "1 cup",
		rows: [r("Chocolate ice cream", "as per menu")],
		steps: ["Scoop into the cup.", "Lid and send."],
	},
	{
		dishName: "Butterscotch Ice Cream",
		aliases: ["Butterscotch"],
		category: "Ice Creams",
		yieldNote: "1 cup",
		rows: [r("Butterscotch ice cream", "as per menu")],
		steps: ["Scoop into the cup.", "Lid and send."],
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
