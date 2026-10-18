#!/usr/bin/env node
/**
 * Static guard for Vercel API functions — runs before every `pnpm build` (and so every deploy).
 *
 * Vercel runs `api/**` as unbundled ESM and ships only compiled `.js`, so these crash a
 * function at load with FUNCTION_INVOCATION_FAILED (they type-check and work in `pnpm dev`):
 *   1. More than MAX_FUNCTIONS files in api/ (Hobby plan cap — the deploy fails).
 *   2. Relative imports without a `.js` extension anywhere an API route reaches.
 *   3. Runtime (non-type) imports of `@minute-menus/*` — packages export `./src/index.ts`,
 *      which isn't in the deployed bundle. Use `lib/server/workspace/<pkg>.js` instead.
 *
 * Usage: node scripts/check-api.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FUNCTIONS = 12;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORT_RE = /(?:^|[;\n}])\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|^\s*import\s+["']([^"']+)["']/gm;

const listApiFiles = (dir) =>
    readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return listApiFiles(path);
        return /\.ts$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
    });

const lineOf = (source, index) => source.slice(0, index).split("\n").length;

/** `import { type A, type B } from` is erased by TypeScript just like `import type`. */
const isTypeOnly = (typeKeyword, clause) =>
    Boolean(typeKeyword) || /^\{\s*(type\s+\w+(\s+as\s+\w+)?\s*,?\s*)+\}$/.test(clause.trim());

const resolveRelative = (fromFile, spec) => {
    const base = resolve(dirname(fromFile), spec.replace(/\.js$/, ""));
    return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((candidate) => existsSync(candidate));
};

const checkImport = (file, spec, errors) => {
    const where = relative(ROOT, file);
    if (spec.startsWith("@minute-menus/")) {
        const pkg = spec.split("/")[1];
        errors.push(`${where}: runtime import of "${spec}" — import from lib/server/workspace/${pkg}.js (relative path) instead`);
        return null;
    }
    if (!spec.startsWith(".")) return null;
    if (!spec.endsWith(".js") && !spec.endsWith(".json")) {
        errors.push(`${where}: relative import "${spec}" needs an explicit .js extension`);
    }
    return resolveRelative(file, spec) ?? null;
};

const scanFile = (file, errors) => {
    const source = readFileSync(file, "utf8");
    const next = [];
    for (const match of source.matchAll(IMPORT_RE)) {
        const [, , typeKeyword, clause = "", fromSpec, dynamicSpec, sideEffectSpec] = match;
        const spec = fromSpec ?? dynamicSpec ?? sideEffectSpec;
        if (fromSpec && isTypeOnly(typeKeyword, clause)) continue;
        const before = errors.length;
        const target = checkImport(file, spec, errors);
        if (errors.length > before) errors[errors.length - 1] += ` (line ${lineOf(source, match.index)})`;
        if (target) next.push(target);
    }
    return next;
};

const apiFiles = listApiFiles(join(ROOT, "api"));
const errors = [];
if (apiFiles.length > MAX_FUNCTIONS) {
    errors.push(
        `api/ has ${apiFiles.length} function files; Vercel Hobby allows ${MAX_FUNCTIONS}. ` +
            "Merge the new endpoint into an existing route with ?action= (see .claude/rules/vercel-api.md).",
    );
}

const seen = new Set();
const queue = [...apiFiles];
while (queue.length > 0) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...scanFile(file, errors));
}

if (errors.length > 0) {
    console.error(`\n✗ API function check failed (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n`);
    for (const error of errors) console.error(`  - ${error}`);
    console.error("\nThese crash Vercel functions at load (FUNCTION_INVOCATION_FAILED). See .claude/rules/vercel-api.md.\n");
    process.exit(1);
}
console.log(`✓ API functions OK — ${apiFiles.length}/${MAX_FUNCTIONS} functions, ${seen.size} files checked`);
