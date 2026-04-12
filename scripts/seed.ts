/**
 * Seed script — creates a sample restaurant, menu, meal plan, and customer
 * subscription in Supabase so the full flow can be tested end-to-end.
 *
 * Usage:
 *   pnpm seed          — seed if not already seeded
 *   pnpm seed:reset    — wipe existing seed data and re-seed
 *
 * Owner login: developerarjun369@gmail.com / SpiceGarden@2026!
 * Customer:    Kiriti K | kiriti.k999@gmail.com | +919876543210
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ── Load .env before any env-dependent imports ────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
    const envContent = readFileSync(join(__dirname, "..", ".env"), "utf8");
    for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key && !process.env[key]) process.env[key] = value;
    }
} catch { /* rely on actual process.env if .env not found */ }

const { createClient } = await import("@supabase/supabase-js");

// ── Admin client ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// ── Seed constants ────────────────────────────────────────────────────────────
const OWNER_EMAIL = "developerarjun369@gmail.com";
const OWNER_PASSWORD = "SpiceGarden@2026!";
const RESTAURANT_SLUG = "spice-garden";
const CUSTOMER_EMAIL = "kiriti.k999@gmail.com";
const CUSTOMER_PHONE = "+919876543210";

const today = new Date().toISOString().slice(0, 10);
const tomorrowDate = new Date();
tomorrowDate.setDate(tomorrowDate.getDate() + 1);
const tomorrow = tomorrowDate.toISOString().slice(0, 10);
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30);
const subscriptionEnd = endDate.toISOString().slice(0, 10);
const isReset = process.argv.includes("--reset");

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(msg: string) { console.log(`  ✓ ${msg}`); }
function section(label: string) { console.log(`\n── ${label}`); }
function fail(label: string, err: { message: string }) {
    console.error(`  ✗ ${label}: ${err.message}`);
    process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const { data: existing } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", RESTAURANT_SLUG)
    .maybeSingle();

if (existing && !isReset) {
    console.log(`\nAlready seeded — restaurant "${existing.name}" (ID: ${existing.id})`);
    console.log(`Run "pnpm seed:reset" to wipe and re-seed.\n`);
    process.exit(0);
}

if (isReset && existing) {
    section("Reset");
    await supabase.from("restaurants").delete().eq("slug", RESTAURANT_SLUG);
    ok("Deleted restaurant + all cascaded data");
}

// 1. Auth user
section("Auth user");
let ownerId: string;
const { data: userList } = await supabase.auth.admin.listUsers();
const existingUser = (userList?.users ?? []).find((u: { email?: string }) => u.email === OWNER_EMAIL);
if (existingUser) {
    ownerId = existingUser.id;
    ok(`Using existing user: ${OWNER_EMAIL}`);
} else {
    const { data: newUser, error: uErr } = await supabase.auth.admin.createUser({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
        email_confirm: true,
    });
    if (uErr || !newUser) fail("createUser", uErr ?? { message: "no data" });
    ownerId = newUser!.user.id;
    ok(`Created: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
}

// 2. Restaurant
section("Restaurant");
const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .insert({ name: "Spice Garden", slug: RESTAURANT_SLUG, owner_id: ownerId, currency: "INR" })
    .select("id")
    .single();
if (rErr || !restaurant) fail("restaurants.insert", rErr ?? { message: "no data" });
const restaurantId = restaurant!.id;
ok(`Spice Garden (ID: ${restaurantId})`);

// 3. Categories
section("Categories");
const { data: categories, error: catErr } = await supabase
    .from("categories")
    .insert([
        { restaurant_id: restaurantId, title: "Breakfast Specials", sort_order: 1 },
        { restaurant_id: restaurantId, title: "Lunch Box", sort_order: 2 },
        { restaurant_id: restaurantId, title: "Evening Bites", sort_order: 3 },
    ])
    .select("id, title");
if (catErr || !categories) fail("categories.insert", catErr ?? { message: "no data" });
const [breakfastCat, lunchCat, eveningCat] = categories!;
ok(categories!.map((c) => c.title).join(", "));

// 4. Dishes
section("Dishes");
const { data: dishes, error: dishErr } = await supabase
    .from("dishes")
    .insert([
        {
            restaurant_id: restaurantId, category_id: breakfastCat.id,
            name: "Masala Dosa", description: "Crispy dosa with spiced potato filling and chutneys",
            price: 80, popularity_score: 90, prep_time: 10,
            image_url: "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg",
            video_url: "",
        },
        {
            restaurant_id: restaurantId, category_id: lunchCat.id,
            name: "Paneer Butter Masala + Rice", description: "Rich creamy paneer curry with steamed basmati",
            price: 160, popularity_score: 85, prep_time: 20,
            image_url: "https://images.pexels.com/photos/9986228/pexels-photo-9986228.jpeg",
            video_url: "",
        },
        {
            restaurant_id: restaurantId, category_id: lunchCat.id,
            name: "Chicken Biryani", description: "Fragrant dum biryani with tender chicken and caramelised onions",
            price: 220, popularity_score: 95, prep_time: 25,
            image_url: "https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg",
            video_url: "",
        },
        {
            restaurant_id: restaurantId, category_id: eveningCat.id,
            name: "Veg Samosa (2 pcs)", description: "Golden fried samosas with mint chutney",
            price: 40, popularity_score: 70, prep_time: 5,
            image_url: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg",
            video_url: "",
        },
    ])
    .select("id, name, price");
if (dishErr || !dishes) fail("dishes.insert", dishErr ?? { message: "no data" });
const [masalaDosa, paneerRice] = dishes!;
ok(dishes!.map((d) => `${d.name} (₹${d.price})`).join(", "));

// 5. Meal plan
section("Meal plan");
const { data: plan, error: planErr } = await supabase
    .from("meal_plans")
    .insert({
        restaurant_id: restaurantId,
        name: "Daily Tiffin",
        description: "Fresh home-style meals delivered daily",
        price_monthly: 2499,
        delivery_fee: 0,
        is_active: true,
    })
    .select("id")
    .single();
if (planErr || !plan) {
    if (planErr?.message?.includes("schema cache")) {
        console.error(`\n  ✗ Subscription tables missing — run "pnpm db:push" first, then retry.\n`);
    } else {
        fail("meal_plans.insert", planErr ?? { message: "no data" });
    }
    process.exit(1);
}
ok(`Daily Tiffin — ₹2,499/mo (ID: ${plan!.id})`);

const { error: mpdErr } = await supabase
    .from("meal_plan_dishes")
    .insert(dishes!.map((d) => ({ plan_id: plan!.id, dish_id: d.id })));
if (mpdErr) fail("meal_plan_dishes.insert", mpdErr);
ok(`Linked ${dishes!.length} dishes to plan`);

// 6. Customer subscription
section("Customer subscription");
const { data: subscription, error: subErr } = await supabase
    .from("customer_subscriptions")
    .insert({
        restaurant_id: restaurantId,
        plan_id: plan!.id,
        customer_name: "Kiriti K",
        phone: CUSTOMER_PHONE,
        email: CUSTOMER_EMAIL,
        delivery_type: "delivery",
        time_slot: "12-14",
        status: "active",
        start_date: today,
        end_date: subscriptionEnd,
    })
    .select("id")
    .single();
if (subErr || !subscription) fail("customer_subscriptions.insert", subErr ?? { message: "no data" });
ok(`Kiriti K | ${CUSTOMER_EMAIL} | Daily Tiffin | 12–2 PM delivery`);

// 7. Daily orders
section("Daily orders");

// Tomorrow → feeds the daily-digest email test
const { error: tomorrowErr } = await supabase
    .from("subscription_daily_orders")
    .insert({
        subscription_id: subscription!.id,
        restaurant_id: restaurantId,
        delivery_date: tomorrow,
        dish_id: paneerRice.id,
        dish_name: paneerRice.name,
        status: "pending",
    });
if (tomorrowErr) fail("daily_orders tomorrow", tomorrowErr);
ok(`Tomorrow (${tomorrow}): ${paneerRice.name} — pending  [→ daily-digest test]`);

// Today → feeds the cancel-order email test
const { error: todayErr } = await supabase
    .from("subscription_daily_orders")
    .insert({
        subscription_id: subscription!.id,
        restaurant_id: restaurantId,
        delivery_date: today,
        dish_id: masalaDosa.id,
        dish_name: masalaDosa.name,
        status: "pending",
    });
if (todayErr) fail("daily_orders today", todayErr);
ok(`Today     (${today}): ${masalaDosa.name} — pending  [→ cancel-order test]`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`
${"═".repeat(52)}
Seed complete!
${"═".repeat(52)}
Restaurant : Spice Garden
             ${restaurantId}
Owner login: ${OWNER_EMAIL}
             ${OWNER_PASSWORD}
Customer   : Kiriti K
             ${CUSTOMER_EMAIL} | ${CUSTOMER_PHONE}
${"─".repeat(52)}
Run "pnpm test:emails" to trigger all email scenarios.
${"═".repeat(52)}
`);
