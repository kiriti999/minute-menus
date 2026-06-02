/**
 * Update dish image_url values from dish-image-urls mapping (fresh-and-fusion).
 *
 * Usage: pnpm update:dish-images fresh-and-fusion
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { DISH_IMAGE_BY_NAME } from "./dish-image-urls";

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

const slug = process.argv[2]?.trim() ?? "fresh-and-fusion";

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

if (restErr || !restaurant) {
    console.error(`✗ Restaurant "${slug}" not found`);
    process.exit(1);
}

console.log(`\nUpdating dish images for ${restaurant.name} (${slug})…\n`);

const { data: dishes, error: dishErr } = await supabase
    .from("dishes")
    .select("id, name, image_url")
    .eq("restaurant_id", restaurant.id)
    .in("name", Object.keys(DISH_IMAGE_BY_NAME));

if (dishErr || !dishes) {
    console.error(`✗ Failed to load dishes: ${dishErr?.message ?? "unknown"}`);
    process.exit(1);
}

let updated = 0;
for (const dish of dishes) {
    const imageUrl = DISH_IMAGE_BY_NAME[dish.name];
    if (!imageUrl || dish.image_url === imageUrl) {
        console.log(`  · ${dish.name} (unchanged)`);
        continue;
    }

    const { error } = await supabase.from("dishes").update({ image_url: imageUrl }).eq("id", dish.id);
    if (error) {
        console.error(`  ✗ ${dish.name}: ${error.message}`);
        continue;
    }

    console.log(`  ✓ ${dish.name}`);
    updated++;
}

const missing = Object.keys(DISH_IMAGE_BY_NAME).filter((name) => !dishes.some((d) => d.name === name));
if (missing.length) {
    console.log("\nNot found in DB:");
    for (const name of missing) console.log(`  ⚠ ${name}`);
}

console.log(`\nDone: ${updated} image(s) updated.\n`);
