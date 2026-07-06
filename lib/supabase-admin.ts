/**
 * Server-side Supabase admin client for use in Vercel API routes only.
 * Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS — never expose client-side.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./server/database.types";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
    throw new Error(
        "Missing VITE_SUPABASE_URL / SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
}

export const supabaseAdmin = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
});
