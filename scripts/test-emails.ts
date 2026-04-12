/**
 * Email test script — triggers every email notification scenario against the
 * seeded Spice Garden restaurant data. Run after "pnpm seed".
 *
 * Scenarios tested:
 *   1. Daily Digest   — owner receives tomorrow's order list
 *   2. Cancel Order   — customer (kiriti.k999@gmail.com) + owner receive
 *                       cancellation notices for today's pending order
 *
 * Usage:
 *   pnpm test:emails
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ── Load .env synchronously BEFORE any env-dependent dynamic imports ──────────
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
} catch { /* rely on actual process.env */ }

// Dynamic imports run AFTER process.env is populated — supabase-admin.ts is safe
const { default: digestHandler } = await import("../api/subscription/daily-digest.js");
const { default: cancelHandler } = await import("../api/subscription/cancel-order.js");
const { default: soldOutHandler } = await import("../api/sold-out-email.js");
const { createClient } = await import("@supabase/supabase-js");

// ── Admin client (for querying seed data) ────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const RESTAURANT_SLUG = "spice-garden";
const today = new Date().toISOString().slice(0, 10);

// ── Mock Vercel req/res ───────────────────────────────────────────────────────
type MockRes = {
    statusCode: number;
    body: unknown;
    status: (code: number) => MockRes;
    json: (data: unknown) => MockRes;
    end: () => MockRes;
};

function makeMockRes(): MockRes {
    const r: MockRes = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; },
        end() { return this; },
    };
    return r;
}

function section(label: string) {
    console.log(`\n${"─".repeat(52)}`);
    console.log(`  ${label}`);
    console.log("─".repeat(52));
}

function result(res: MockRes) {
    const icon = res.statusCode < 300 ? "✓" : "✗";
    console.log(`  ${icon} HTTP ${res.statusCode}:`, JSON.stringify(res.body));
}

// ── Lookup seed data ──────────────────────────────────────────────────────────
const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", RESTAURANT_SLUG)
    .maybeSingle();

if (!restaurant) {
    console.error(`\n✗ Restaurant "${RESTAURANT_SLUG}" not found. Run "pnpm seed" first.\n`);
    process.exit(1);
}

const { data: todayOrder } = await supabase
    .from("subscription_daily_orders")
    .select(`
        id,
        dish_name,
        customer_subscriptions (
            customer_name,
            email
        )
    `)
    .eq("restaurant_id", restaurant.id)
    .eq("delivery_date", today)
    .eq("status", "pending")
    .maybeSingle();

const tomorrowStr = (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
const { count: tomorrowOrderCount } = await supabase
    .from("subscription_daily_orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id)
    .eq("delivery_date", tomorrowStr)
    .eq("status", "pending");

const { data: firstDish } = await supabase
    .from("dishes")
    .select("name")
    .eq("restaurant_id", restaurant.id)
    .limit(1)
    .maybeSingle();

console.log(`\nTest target: ${restaurant.name} (${restaurant.id})`);

// ── Scenario 1: Daily Digest ──────────────────────────────────────────────────
section("Scenario 1 — Daily Digest (owner email)");
console.log(`  Tomorrow (${tomorrowStr}): ${tomorrowOrderCount ?? 0} pending order(s) in DB`);
if (!tomorrowOrderCount) {
    console.log("  ✗ No seed data for tomorrow — skipping.");
    console.log("    Tip: run 'pnpm seed:reset' then 'pnpm test:emails' again.");
} else {
    console.log("  Sending tomorrow's order list to the restaurant owner.");
    const digestRes = makeMockRes();
    await digestHandler({} as never, digestRes as never);
    result(digestRes);
    if (digestRes.statusCode < 300) {
        const body = digestRes.body as { sent?: number };
        if ((body.sent ?? 0) > 0) {
            console.log(`  → Digest email sent to developerarjun369@gmail.com`);
        } else {
            console.log("  ✗ Handler returned sent:0 — check SMTP credentials (BREVO_SMTP_USER / BREVO_SMTP_KEY)");
        }
    }
}

// ── Scenario 2: Cancel Order ──────────────────────────────────────────────────
section("Scenario 2 — Cancel Order (customer + owner emails)");
if (!todayOrder) {
    console.log("  ✗ No pending order for today — skipping.");
    console.log("    Tip: run 'pnpm seed:reset' then 'pnpm test:emails' again.");
} else {
    const sub = todayOrder.customer_subscriptions as unknown as {
        customer_name: string;
        email: string | null;
    } | null;

    console.log(`  Cancelling: ${todayOrder.dish_name} (${today})`);
    console.log(`  Customer:   ${sub?.customer_name ?? "—"} <${sub?.email ?? "no email"}>`);

    const cancelReq = {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
        },
        body: {
            restaurantId: restaurant.id,
            deliveryDate: today,
            dishName: todayOrder.dish_name,
            reason: "Testing cancellation flow — automated email test",
            customerEmail: sub?.email ?? null,
            customerName: sub?.customer_name ?? null,
        },
        query: {},
    };

    const cancelRes = makeMockRes();
    await cancelHandler(cancelReq as never, cancelRes as never);
    result(cancelRes);

    if (cancelRes.statusCode < 300) {
        console.log(
            sub?.email
                ? `  → Customer email sent to ${sub.email}`
                : "  → No customer email (subscription has no email)",
        );
        console.log("  → Owner notification sent to developerarjun369@gmail.com");
    }
}

// ── Scenario 3: Sold Out Email ───────────────────────────────────────────────
section("Scenario 3 — Sold Out (owner email)");
console.log("  Notifies the owner that a dish has been marked sold out.");

const soldOutReq = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
        to: "developerarjun369@gmail.com",
        restaurantName: restaurant.name,
        dishName: firstDish?.name ?? "Masala Dosa",
        reason: "manual" as const,
    },
    query: {},
};

const soldOutRes = makeMockRes();
await soldOutHandler(soldOutReq as never, soldOutRes as never);
result(soldOutRes);
if (soldOutRes.statusCode < 300) {
    console.log("  → Sold-out alert sent to developerarjun369@gmail.com");
}

// ── Done ─────────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(52)}`);
console.log("All scenarios complete. Check both inboxes:");
console.log("  Owner:    developerarjun369@gmail.com");
console.log("  Customer: kiriti.k999@gmail.com");
console.log(`${"═".repeat(52)}\n`);
