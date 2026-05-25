/**
 * ensure-storage — Creates the public dish-media bucket if missing.
 *
 * Usage:
 *   pnpm storage:ensure
 *
 * Required env vars in .env:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
} catch {
    /* rely on process.env */
}

const { ensureDishMediaStorage } = await import("../lib/ensure-dish-media-storage");

const result = await ensureDishMediaStorage();
console.log(
    result.created
        ? "✓ Created dish-media storage bucket"
        : "✓ dish-media storage bucket already exists",
);
