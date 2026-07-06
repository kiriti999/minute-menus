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

type AdminUser = { id: string; email?: string | null };
type AuthUserResult = { data: { user: AdminUser | null }; error: { message: string } | null };

/**
 * Narrow view of the admin auth surface we rely on. Some TypeScript module
 * resolutions (notably Vercel's serverless build) fail to see the GoTrueClient
 * methods inherited by SupabaseAuthClient, so we assert this shape at one
 * boundary instead of casting at every call site.
 */
type AdminAuthApi = {
    getUser(jwt?: string): Promise<AuthUserResult>;
    admin: { getUserById(userId: string): Promise<AuthUserResult> };
};

const adminAuthApi = (client: { auth: unknown }): AdminAuthApi =>
    client.auth as AdminAuthApi;

/** Resolves the authenticated user for a bearer access token, or null if invalid. */
export const getUserFromAccessToken = async (
    client: { auth: unknown },
    accessToken: string,
): Promise<AdminUser | null> => {
    const { data, error } = await adminAuthApi(client).getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
};

/** Looks up a user's email by id via the service-role admin API. */
export const getUserEmailById = async (userId: string): Promise<string | null> => {
    const { data } = await adminAuthApi(supabaseAdmin).admin.getUserById(userId);
    return data.user?.email ?? null;
};
