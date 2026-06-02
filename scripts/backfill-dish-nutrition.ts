/**
 * Backfill ingredients, benefits, and calories for menu dishes.
 *
 * Usage:
 *   pnpm backfill:nutrition                  — all restaurants
 *   pnpm backfill:nutrition fresh-and-fusion — single slug
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, "..", ".env"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
}

type NutritionRow = {
    ingredients: string;
    benefits: string;
    calories: number;
};

/** Recipe-based nutrition keyed by exact dish name. */
const NUTRITION_BY_NAME: Record<string, NutritionRow> = {
    "ABC Juice": {
        ingredients: "Apple, beetroot, carrot, lemon, ginger",
        benefits: "Detox blend, immunity boost, blood flow",
        calories: 120,
    },
    "Apple Carrot Celery Cold Pressed": {
        ingredients: "Apple, carrot, celery, lemon",
        benefits: "Hydrating, digestion support, skin glow",
        calories: 95,
    },
    "Apple Carrot Pomegranate Cold Pressed": {
        ingredients: "Apple, carrot, pomegranate, mint",
        benefits: "Antioxidant-rich, heart-friendly, refreshing",
        calories: 118,
    },
    "Apple Cold Pressed": {
        ingredients: "Fresh apple, lemon",
        benefits: "Natural energy, vitamin C, fiber",
        calories: 110,
    },
    "Apple Milkshake": {
        ingredients: "Apple, milk, honey, ice",
        benefits: "Creamy refresh, calcium, satisfying",
        calories: 220,
    },
    "Apple Pomegranate Cold Pressed": {
        ingredients: "Apple, pomegranate, lime",
        benefits: "Immunity support, antioxidants, cooling",
        calories: 115,
    },
    "Banana Milkshake": {
        ingredients: "Banana, milk, honey, ice",
        benefits: "Potassium boost, post-workout energy",
        calories: 250,
    },
    "Carrot Juice Cold Pressed": {
        ingredients: "Fresh carrot, ginger, lemon",
        benefits: "Beta-carotene, eye health, glowing skin",
        calories: 80,
    },
    "Citrus Colada Cold Pressed": {
        ingredients: "Orange, pineapple, coconut water, lime",
        benefits: "Vitamin C burst, tropical hydration",
        calories: 105,
    },
    "Mango Juice": {
        ingredients: "Alphonso mango, water, ice",
        benefits: "Vitamin A, summer refresh, natural sweetness",
        calories: 130,
    },
    "Mosambi Cold Pressed": {
        ingredients: "Fresh mosambi (sweet lime)",
        benefits: "Vitamin C, aids digestion, cooling",
        calories: 90,
    },
    "Oat Milk Cold Pressed": {
        ingredients: "Rolled oats, water, dates, cinnamon",
        benefits: "Plant-based, fiber-rich, heart-friendly",
        calories: 140,
    },
    "Orange Juice Cold Pressed": {
        ingredients: "Fresh orange, no added sugar",
        benefits: "Immunity boost, morning vitamin C",
        calories: 112,
    },
    "Tropical Pina Colada Cold Pressed": {
        ingredients: "Pineapple, coconut water, lime, mint",
        benefits: "Electrolytes, digestive enzymes, hydrating",
        calories: 108,
    },
    "Caesar Salad (Veg)": {
        ingredients: "Romaine, parmesan, croutons, caesar dressing, lemon",
        benefits: "Light, fiber-rich, satisfying greens",
        calories: 280,
    },
    "Caesar Salad (Chicken)": {
        ingredients: "Grilled chicken, romaine, parmesan, croutons, caesar dressing",
        benefits: "High protein, balanced meal bowl",
        calories: 380,
    },
    "Tuna Salad": {
        ingredients: "Tuna, mixed greens, cherry tomato, cucumber, vinaigrette",
        benefits: "Omega-3, lean protein, low carb",
        calories: 340,
    },
    "Mediterranean Salad": {
        ingredients: "Feta, olives, cucumber, tomato, red onion, olive oil, oregano",
        benefits: "Heart-healthy fats, fresh and light",
        calories: 310,
    },
    "Egg Salad": {
        ingredients: "Boiled egg, lettuce, spring onion, light mayo, mustard",
        benefits: "Protein-packed, comfort classic",
        calories: 290,
    },
    "Grilled Chicken Salad": {
        ingredients: "Grilled chicken, lettuce, bell pepper, corn, lemon herb dressing",
        benefits: "Lean protein, gym-friendly bowl",
        calories: 360,
    },
    "Tomato and Avocado Salad": {
        ingredients: "Avocado, tomato, basil, balsamic, extra virgin olive oil",
        benefits: "Healthy fats, skin glow, refreshing",
        calories: 270,
    },
    "Quinoa Avocado Salad": {
        ingredients: "Quinoa, avocado, cherry tomato, cucumber, citrus dressing",
        benefits: "Complete protein, gluten-free, filling",
        calories: 350,
    },
    "Chocolate Milk Shake": {
        ingredients: "Milk, cocoa, chocolate, ice cream, ice",
        benefits: "Indulgent treat, calcium, energy boost",
        calories: 380,
    },
    "Chocolate Thick Shake": {
        ingredients: "Milk, dark chocolate, ice cream, whipped cream",
        benefits: "Rich dessert drink, satisfying",
        calories: 450,
    },
    "Banana Milk Shake": {
        ingredients: "Banana, milk, honey, ice",
        benefits: "Potassium, natural sweetness, filling",
        calories: 260,
    },
    "Oat Milk Shake with Dry Fruits": {
        ingredients: "Oat milk, almonds, dates, walnuts, cinnamon",
        benefits: "Plant-based, fiber, sustained energy",
        calories: 320,
    },
    "Mixed Berry Overnight Oats": {
        ingredients: "Rolled oats, milk, blueberries, strawberries, chia, honey",
        benefits: "Antioxidants, fiber-rich, ready-to-eat breakfast",
        calories: 310,
    },
    "Peanut Butter Banana Overnight Oats": {
        ingredients: "Rolled oats, milk, peanut butter, banana, cinnamon, honey",
        benefits: "High energy, protein, post-workout friendly",
        calories: 380,
    },
    "Chocolate Almond Overnight Oats": {
        ingredients: "Rolled oats, milk, cocoa, almonds, maple syrup, vanilla",
        benefits: "Indulgent yet balanced, magnesium, sustained fullness",
        calories: 340,
    },
    "Mango Coconut Overnight Oats": {
        ingredients: "Rolled oats, coconut milk, mango, shredded coconut, lime zest",
        benefits: "Tropical refresh, vitamin C, dairy-free option",
        calories: 330,
    },
    "Apple Cinnamon Overnight Oats": {
        ingredients: "Rolled oats, milk, apple, cinnamon, raisins, honey",
        benefits: "Comfort breakfast, fiber, naturally sweet",
        calories: 290,
    },
    "Chia Protein Overnight Oats": {
        ingredients: "Rolled oats, Greek yogurt, chia seeds, whey protein, granola",
        benefits: "High protein, muscle recovery, keeps you full longer",
        calories: 360,
    },
};

const { createClient } = await import("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const slugFilter = process.argv[2]?.trim();

function ok(msg: string) {
    console.log(`  ✓ ${msg}`);
}

function warn(msg: string) {
    console.warn(`  ⚠ ${msg}`);
}

let restaurantQuery = supabase.from("restaurants").select("id, name, slug");
if (slugFilter) restaurantQuery = restaurantQuery.eq("slug", slugFilter);

const { data: restaurants, error: restErr } = await restaurantQuery;
if (restErr || !restaurants?.length) {
    console.error(`✗ No restaurants found${slugFilter ? ` for slug "${slugFilter}"` : ""}`);
    process.exit(1);
}

console.log(`\nBackfilling nutrition for ${restaurants.length} restaurant(s)…\n`);

let updated = 0;
let skipped = 0;
const unmatched: string[] = [];

for (const restaurant of restaurants) {
    console.log(`── ${restaurant.name} (${restaurant.slug})`);

    const { data: dishes, error: dishErr } = await supabase
        .from("dishes")
        .select("id, name, ingredients, benefits, calories")
        .eq("restaurant_id", restaurant.id);

    if (dishErr || !dishes) {
        console.error(`  ✗ Failed to load dishes: ${dishErr?.message ?? "unknown"}`);
        continue;
    }

    for (const dish of dishes) {
        const nutrition = NUTRITION_BY_NAME[dish.name];
        if (!nutrition) {
            unmatched.push(`${restaurant.slug}: ${dish.name}`);
            skipped++;
            continue;
        }

        const alreadySet =
            dish.ingredients?.trim() &&
            dish.benefits?.trim() &&
            dish.calories != null &&
            dish.calories > 0;

        if (alreadySet) {
            skipped++;
            continue;
        }

        const { error: updateErr } = await supabase
            .from("dishes")
            .update({
                ingredients: nutrition.ingredients,
                benefits: nutrition.benefits,
                calories: nutrition.calories,
            })
            .eq("id", dish.id);

        if (updateErr) {
            console.error(`  ✗ ${dish.name}: ${updateErr.message}`);
            continue;
        }

        ok(`${dish.name} — ${nutrition.calories} kcal`);
        updated++;
    }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
if (unmatched.length) {
    console.log("\nNo recipe mapping for:");
    for (const name of unmatched) warn(name);
}
console.log("");
