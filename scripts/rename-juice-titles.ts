/**
 * Rename juice dishes to marketing titles (matches wall board / menu editor sync).
 *
 * Usage: pnpm rename:juice-titles fresh-and-fusion
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isJuiceCategory, juiceRenameTarget } from "../lib/juiceMarketingTitles";

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

console.log(`\nRenaming juice titles for ${restaurant.name} (${slug})…\n`);

const { data: categories, error: catErr } = await supabase
	.from("categories")
	.select("id, title")
	.eq("restaurant_id", restaurant.id);

if (catErr || !categories) {
	console.error(`✗ Failed to load categories: ${catErr?.message ?? "unknown"}`);
	process.exit(1);
}

const juiceCategoryIds = categories.filter((c) => isJuiceCategory(c.title)).map((c) => c.id);
if (!juiceCategoryIds.length) {
	console.log("No juice categories found — nothing to rename.");
	process.exit(0);
}

const { data: dishes, error: dishErr } = await supabase
	.from("dishes")
	.select("id, name, category_id")
	.eq("restaurant_id", restaurant.id)
	.in("category_id", juiceCategoryIds);

if (dishErr || !dishes) {
	console.error(`✗ Failed to load dishes: ${dishErr?.message ?? "unknown"}`);
	process.exit(1);
}

let updated = 0;
for (const dish of dishes) {
	const target = juiceRenameTarget(dish.name);
	if (!target || target === dish.name) {
		console.log(`  · ${dish.name} (unchanged)`);
		continue;
	}

	const { error } = await supabase.from("dishes").update({ name: target }).eq("id", dish.id);
	if (error) {
		console.error(`  ✗ ${dish.name} → ${target}: ${error.message}`);
		continue;
	}

	console.log(`  ✓ ${dish.name} → ${target}`);
	updated++;
}

console.log(`\nDone: ${updated} juice title(s) updated.\n`);
