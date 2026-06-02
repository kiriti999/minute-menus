/**
 * Add Salads + Shakes categories and dishes for fresh-and-fusion.
 *
 * Usage: pnpm seed:menu-categories fresh-and-fusion
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

import { DISH_IMAGE_BY_NAME } from "./dish-image-urls";

type DishSeed = {
    name: string;
    price: number;
    description: string;
    ingredients: string;
    benefits: string;
    calories: number;
    imageUrl: string;
    prepTime?: number;
    popularityScore?: number;
};

const imageFor = (name: string): string => DISH_IMAGE_BY_NAME[name] ?? "";

const SALADS: DishSeed[] = [
    {
        name: "Caesar Salad (Veg)",
        price: 220,
        description: "Crisp romaine, parmesan, croutons, classic caesar dressing",
        ingredients: "Romaine, parmesan, croutons, caesar dressing, lemon",
        benefits: "Light, fiber-rich, satisfying greens",
        calories: 280,
        imageUrl: imageFor("Caesar Salad (Veg)"),
    },
    {
        name: "Caesar Salad (Chicken)",
        price: 280,
        description: "Grilled chicken on classic caesar salad",
        ingredients: "Grilled chicken, romaine, parmesan, croutons, caesar dressing",
        benefits: "High protein, balanced meal bowl",
        calories: 380,
        imageUrl: imageFor("Caesar Salad (Chicken)"),
    },
    {
        name: "Tuna Salad",
        price: 320,
        description: "Flaked tuna with mixed greens and light vinaigrette",
        ingredients: "Tuna, mixed greens, cherry tomato, cucumber, vinaigrette",
        benefits: "Omega-3, lean protein, low carb",
        calories: 340,
        imageUrl: imageFor("Tuna Salad"),
    },
    {
        name: "Mediterranean Salad",
        price: 260,
        description: "Olives, feta, cucumber, tomato, herbs, olive oil",
        ingredients: "Feta, olives, cucumber, tomato, red onion, olive oil, oregano",
        benefits: "Heart-healthy fats, fresh and light",
        calories: 310,
        imageUrl: imageFor("Mediterranean Salad"),
    },
    {
        name: "Egg Salad",
        price: 180,
        description: "Creamy egg salad on fresh garden greens",
        ingredients: "Boiled egg, lettuce, spring onion, light mayo, mustard",
        benefits: "Protein-packed, comfort classic",
        calories: 290,
        imageUrl: imageFor("Egg Salad"),
    },
    {
        name: "Grilled Chicken Salad",
        price: 300,
        description: "Char-grilled chicken breast with seasonal vegetables",
        ingredients: "Grilled chicken, lettuce, bell pepper, corn, lemon herb dressing",
        benefits: "Lean protein, gym-friendly bowl",
        calories: 360,
        imageUrl: imageFor("Grilled Chicken Salad"),
    },
    {
        name: "Tomato and Avocado Salad",
        price: 240,
        description: "Ripe avocado, heirloom tomato, basil, balsamic",
        ingredients: "Avocado, tomato, basil, balsamic, extra virgin olive oil",
        benefits: "Healthy fats, skin glow, refreshing",
        calories: 270,
        imageUrl: imageFor("Tomato and Avocado Salad"),
    },
    {
        name: "Quinoa Avocado Salad",
        price: 280,
        description: "Protein-rich quinoa with avocado and citrus dressing",
        ingredients: "Quinoa, avocado, cherry tomato, cucumber, citrus dressing",
        benefits: "Complete protein, gluten-free, filling",
        calories: 350,
        imageUrl: imageFor("Quinoa Avocado Salad"),
    },
];

const SHAKES: DishSeed[] = [
    {
        name: "Chocolate Milk Shake",
        price: 140,
        description: "Classic chilled chocolate milkshake",
        ingredients: "Milk, cocoa, chocolate, ice cream, ice",
        benefits: "Indulgent treat, calcium, energy boost",
        calories: 380,
        imageUrl: imageFor("Chocolate Milk Shake"),
    },
    {
        name: "Chocolate Thick Shake",
        price: 160,
        description: "Extra-thick blended chocolate shake",
        ingredients: "Milk, dark chocolate, ice cream, whipped cream",
        benefits: "Rich dessert drink, satisfying",
        calories: 450,
        imageUrl: imageFor("Chocolate Thick Shake"),
    },
    {
        name: "Banana Milk Shake",
        price: 130,
        description: "Creamy banana blended with milk and honey",
        ingredients: "Banana, milk, honey, ice",
        benefits: "Potassium, natural sweetness, filling",
        calories: 260,
        imageUrl: imageFor("Banana Milk Shake"),
    },
    {
        name: "Oat Milk Shake with Dry Fruits",
        price: 180,
        description: "Oat milk blended with almonds, dates, and walnuts",
        ingredients: "Oat milk, almonds, dates, walnuts, cinnamon",
        benefits: "Plant-based, fiber, sustained energy",
        calories: 320,
        imageUrl: imageFor("Oat Milk Shake with Dry Fruits"),
    },
];

const { createClient } = await import("@supabase/supabase-js");

const slug = process.argv[2]?.trim() ?? "fresh-and-fusion";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
});

function ok(msg: string) {
    console.log(`  ✓ ${msg}`);
}

const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

if (restErr || !restaurant) {
    console.error(`✗ Restaurant "${slug}" not found`);
    process.exit(1);
}

console.log(`\nSeeding menu categories for ${restaurant.name} (${slug})…\n`);

const { data: existingCats } = await supabase
    .from("categories")
    .select("id, title, sort_order")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order");

const maxSort = existingCats?.reduce((max, cat) => Math.max(max, cat.sort_order ?? 0), 0) ?? 0;

async function ensureCategory(title: string, sortOrder: number): Promise<string> {
    const found = existingCats?.find((cat) => cat.title.toLowerCase() === title.toLowerCase());
    if (found) {
        ok(`Category exists: ${title}`);
        return found.id;
    }

    const { data, error } = await supabase
        .from("categories")
        .insert({ restaurant_id: restaurant.id, title, sort_order: sortOrder })
        .select("id")
        .single();

    if (error || !data) {
        console.error(`✗ Failed to create category ${title}: ${error?.message ?? "unknown"}`);
        process.exit(1);
    }

    ok(`Created category: ${title}`);
    return data.id;
}

const saladsCatId = await ensureCategory("Salads", Math.max(maxSort + 1, 2));
const shakesCatId = await ensureCategory("Shakes", Math.max(maxSort + 2, 3));

const { data: existingDishes } = await supabase
    .from("dishes")
    .select("name")
    .eq("restaurant_id", restaurant.id);

const existingNames = new Set((existingDishes ?? []).map((d) => d.name.toLowerCase()));

async function seedDishes(categoryId: string, dishes: DishSeed[]) {
    for (const dish of dishes) {
        if (existingNames.has(dish.name.toLowerCase())) {
            ok(`Skipped (exists): ${dish.name}`);
            continue;
        }

        const { error } = await supabase.from("dishes").insert({
            restaurant_id: restaurant.id,
            category_id: categoryId,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            image_url: dish.imageUrl,
            video_url: "",
            popularity_score: dish.popularityScore ?? 75,
            prep_time: dish.prepTime ?? 10,
            ingredients: dish.ingredients,
            benefits: dish.benefits,
            calories: dish.calories,
        });

        if (error) {
            console.error(`  ✗ ${dish.name}: ${error.message}`);
            continue;
        }

        ok(`Added: ${dish.name} (₹${dish.price})`);
        existingNames.add(dish.name.toLowerCase());
    }
}

console.log("\n── Salads");
await seedDishes(saladsCatId, SALADS);

console.log("\n── Shakes");
await seedDishes(shakesCatId, SHAKES);

console.log("\nDone. Refresh the customer menu to see new sections.\n");
