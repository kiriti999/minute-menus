/**
 * db:push — Applies supabase/schema.sql to the Supabase database
 * using the Supabase Management API (no DB password needed).
 *
 * Usage:
 *   pnpm db:push
 *   pnpm db:push -- --start=121   # resume after rate-limit interruption
 *
 * Optional env:
 *   DB_PUSH_DELAY_MS=300   pause between statements (default 300)
 *
 * Required env var in .env:
 *   SUPABASE_ACCESS_TOKEN — personal access token from:
 *   https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ─────────────────────────────────────────────────────────────────
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

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
if (!ACCESS_TOKEN) {
    console.error(`
✗ SUPABASE_ACCESS_TOKEN not set in .env

  Get one at: https://supabase.com/dashboard/account/tokens
  → Generate new token → copy it → add to .env:
    SUPABASE_ACCESS_TOKEN=sbp_...
`);
    process.exit(1);
}

// Extract project ref from VITE_SUPABASE_URL
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
    console.error("✗ Could not determine project ref from VITE_SUPABASE_URL");
    process.exit(1);
}

const schemaPath = join(__dirname, "..", "supabase", "schema.sql");
const sql = readFileSync(schemaPath, "utf8");

function parseStartIndex(argv: string[]): number {
	const arg = argv.find((a) => a.startsWith("--start="));
	if (!arg) return 1;
	const n = Number.parseInt(arg.slice("--start=".length), 10);
	return Number.isFinite(n) && n >= 1 ? n : 1;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const START_AT = parseStartIndex(process.argv.slice(2));
const DELAY_MS = Number.parseInt(process.env.DB_PUSH_DELAY_MS ?? "300", 10) || 300;
const MAX_RETRIES = 6;

// Split SQL respecting $$-quoted function bodies and single-quoted strings
function splitStatements(src: string): string[] {
    const result: string[] = [];
    let current = "";
    let i = 0;
    while (i < src.length) {
        if (src[i] === "-" && src[i + 1] === "-") {
            const nl = src.indexOf("\n", i);
            const end = nl === -1 ? src.length : nl + 1;
            current += src.slice(i, end);
            i = end;
            continue;
        }
        if (src[i] === "$") {
            const closeDollar = src.indexOf("$", i + 1);
            if (closeDollar !== -1) {
                const openTag = src.slice(i, closeDollar + 1);
                const closeIdx = src.indexOf(openTag, closeDollar + 1);
                if (closeIdx !== -1) {
                    current += src.slice(i, closeIdx + openTag.length);
                    i = closeIdx + openTag.length;
                    continue;
                }
            }
        }
        if (src[i] === "'") {
            let j = i + 1;
            while (j < src.length) {
                if (src[j] === "'" && src[j + 1] === "'") j += 2;
                else if (src[j] === "'") { j++; break; }
                else j++;
            }
            current += src.slice(i, j); i = j; continue;
        }
        if (src[i] === ";") {
            current += ";";
            const t = current.trim();
            // A statement may be preceded by one or more full-line comments —
            // strip those before checking for real SQL, so a leading comment
            // doesn't cause the whole (comment + statement) block to be dropped.
            const withoutLeadingComments = t.replace(/^(?:--[^\n]*\n)+/, "").trim();
            if (withoutLeadingComments.length > 1) result.push(t);
            current = ""; i++; continue;
        }
        current += src[i]; i++;
    }
    const tail = current.trim();
    const tailWithoutComments = tail.replace(/^(?:--[^\n]*\n)+/, "").trim();
    if (tailWithoutComments.length > 1 && tail !== ";") result.push(tail);
    return result;
}

const statements = splitStatements(sql);
const total = statements.length;
const resumeNote = START_AT > 1 ? ` (resuming from statement ${START_AT})` : "";
console.log(`\nApplying schema to project ${projectRef} (${total} statements${resumeNote})...`);

let applied = 0;
let skipped = 0;
let failed = 0;

async function runStatement(stmt: string, index: number): Promise<"ok" | "skip" | "fail"> {
	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		if (attempt > 0) {
			const backoff = Math.min(32_000, 2_000 * 2 ** (attempt - 1));
			console.warn(`  ↻ [${index}] rate limited — retry ${attempt}/${MAX_RETRIES} in ${backoff / 1000}s`);
			await sleep(backoff);
		}

		const res = await fetch(
			`https://api.supabase.com/v1/projects/${projectRef}/database/query`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${ACCESS_TOKEN}`,
				},
				body: JSON.stringify({ query: stmt }),
			},
		);

		if (res.ok) return "ok";

		const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
		const msg = body.message ?? body.error ?? res.statusText;

		if (/already exists|duplicate/i.test(msg)) return "skip";

		const rateLimited =
			res.status === 429 || /too many requests|throttler/i.test(msg);

		if (rateLimited && attempt < MAX_RETRIES) continue;

		const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
		console.error(`  ✗ [${index}] ${preview}\n    → ${msg}\n`);
		return "fail";
	}

	return "fail";
}

for (let i = 0; i < statements.length; i++) {
	const index = i + 1;
	if (index < START_AT) continue;

	const stmt = statements[i];
	const result = await runStatement(stmt, index);

	if (result === "ok") {
		const preview = stmt.replace(/\s+/g, " ").slice(0, 60);
		console.log(`  ✓ [${index}] ${preview}`);
		applied++;
	} else if (result === "skip") {
		skipped++;
	} else {
		failed++;
	}

	if (i < statements.length - 1 && DELAY_MS > 0) {
		await sleep(DELAY_MS);
	}
}

if (failed > 0) {
    console.error(`\n✗ ${failed} statement(s) failed. Fix errors above and re-run.\n`);
    process.exit(1);
}

console.log(`✓ Done — ${applied} applied, ${skipped} already existed\n`);

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
        const { ensureDishMediaStorage } = await import("../lib/ensure-dish-media-storage");
        const storage = await ensureDishMediaStorage();
        console.log(
            storage.created
                ? "✓ Created dish-media storage bucket via Storage API"
                : "✓ dish-media storage bucket already exists",
        );
    } catch (error) {
        console.error(
            `✗ dish-media bucket ensure failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        console.error("  Run: pnpm storage:ensure\n");
        process.exit(1);
    }
} else {
    console.warn("⚠ SUPABASE_SERVICE_ROLE_KEY not set — run pnpm storage:ensure to create dish-media bucket\n");
}

console.log("Run 'pnpm seed' (or 'pnpm seed:reset') to populate test data.\n");

