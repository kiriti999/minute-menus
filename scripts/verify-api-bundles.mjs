#!/usr/bin/env node
/**
 * Loads every built Vercel function exactly as deployed — run after `vercel build --yes`.
 *
 * Each `.vercel/output/functions/**.func` is copied to an isolated temp dir together with
 * only the files Vercel ships (its `.vc-config.json` filePathMap), then its handler is
 * imported in a fresh Node process. Loading in place is NOT a valid test: Node falls back
 * to the repo's own node_modules / .ts sources and hides crashes that happen on Vercel.
 *
 * Usage: vercel build --yes && node scripts/verify-api-bundles.mjs
 * Best run on the Node major in .vc-config.json `runtime` (e.g. nodejs24.x).
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FUNCTIONS = 12;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FUNCTIONS_DIR = join(ROOT, ".vercel/output/functions");

const findFunctions = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (!entry.isDirectory()) return [];
        return entry.name.endsWith(".func") ? [path] : findFunctions(path);
    });

/** Copies the function dir plus every filePathMap entry Vercel uploads alongside it. */
const isolate = (funcDir, workDir) => {
    const dest = join(workDir, relative(FUNCTIONS_DIR, funcDir).replaceAll("/", "_"));
    cpSync(funcDir, dest, { recursive: true, verbatimSymlinks: true });
    const config = JSON.parse(readFileSync(join(dest, ".vc-config.json"), "utf8"));
    for (const [outPath, sourcePath] of Object.entries(config.filePathMap ?? {})) {
        const target = join(dest, outPath);
        const source = join(ROOT, sourcePath);
        if (existsSync(target) || !existsSync(source)) continue;
        mkdirSync(dirname(target), { recursive: true });
        if (lstatSync(source).isSymbolicLink()) symlinkSync(readlinkSync(source), target);
        else cpSync(source, target, { recursive: true, verbatimSymlinks: true });
    }
    return { dest, handler: config.handler, runtime: config.runtime };
};

const loadHandler = ({ dest, handler }) => {
    const script = `import("./${handler}").then((m) => { if (typeof m.default !== "function") throw new Error("no default export"); })`;
    const result = spawnSync(process.execPath, ["-e", script], {
        cwd: dest,
        encoding: "utf8",
        env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    const firstError = (result.stderr.match(/^\w*Error.*$/m) ?? [result.stderr.trim().split("\n").pop()])[0];
    return result.status === 0 ? null : firstError;
};

if (!existsSync(FUNCTIONS_DIR)) {
    console.error("No .vercel/output/functions — run `vercel build --yes` first.");
    process.exit(1);
}

const functions = findFunctions(FUNCTIONS_DIR).sort();
const workDir = mkdtempSync(join(tmpdir(), "mm-api-verify-"));
let failures = 0;
try {
    for (const funcDir of functions) {
        const bundle = isolate(funcDir, workDir);
        const error = loadHandler(bundle);
        const name = relative(FUNCTIONS_DIR, funcDir).replace(/\.func$/, "");
        if (error) failures += 1;
        console.log(`${error ? "✗" : "✓"} ${name.padEnd(30)} ${error ?? `loads (${bundle.runtime})`}`);
    }
} finally {
    rmSync(workDir, { recursive: true, force: true });
}

if (functions.length > MAX_FUNCTIONS) {
    failures += 1;
    console.error(`✗ ${functions.length} functions built; Vercel Hobby allows ${MAX_FUNCTIONS}.`);
}
console.log(`\nNode ${process.version} — ${functions.length}/${MAX_FUNCTIONS} functions, ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
