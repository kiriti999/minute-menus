/**
 * seed:sop — Loads the kitchen SOP (scripts/data/sopSections.ts)
 * into the sop_sections table. Re-runnable: rows are upserted by position and
 * any rows past the end of the source list are removed.
 *
 * The table is only readable through the get_sop_sections function (owner and
 * team members), which keeps the SOP out of the public client bundle.
 *
 * Usage:
 *   pnpm db:push        # creates the table and function first
 *   pnpm seed:sop
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

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
const { SOP_SECTIONS } = await import("./data/sopSections.js");

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const rows = SOP_SECTIONS.map((section, position) => ({ position, section }));

const { error: upsertError } = await admin.from("sop_sections").upsert(rows, { onConflict: "position" });
if (upsertError) {
    console.error(`✗ Could not save SOP: ${upsertError.message}`);
    process.exit(1);
}

const { error: pruneError } = await admin.from("sop_sections").delete().gte("position", rows.length);
if (pruneError) {
    console.error(`✗ Saved recipes, but could not remove stale sections: ${pruneError.message}`);
    process.exit(1);
}

console.log(`✓ ${rows.length} SOP sections loaded into sop_sections`);
