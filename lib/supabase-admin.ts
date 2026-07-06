/**
 * Server-side Supabase admin client for use in Vercel API routes only.
 * Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS — never expose client-side.
 *
 * Lazy init: never throw at module load — missing env vars return errors at query time
 * instead of crashing the entire serverless function on import.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./server/database.types";

let adminClient: SupabaseClient<Database> | null = null;

const resolveSupabaseConfig = (): { url: string; key: string } | null => {
    const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) return null;
    return { url, key };
};

/** Returns the admin client, or null when server env is not configured. */
export const getSupabaseAdmin = (): SupabaseClient<Database> | null => {
    if (adminClient) return adminClient;
    const config = resolveSupabaseConfig();
    if (!config) return null;
    adminClient = createClient<Database>(config.url, config.key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
    return adminClient;
};

/** Returns the admin client, or throws when server env is not configured. */
export const requireSupabaseAdmin = (): SupabaseClient<Database> => {
    const client = getSupabaseAdmin();
    if (!client) {
        throw new Error("Server is not configured (missing Supabase env vars)");
    }
    return client;
};

/**
 * @deprecated Prefer requireSupabaseAdmin() — kept for existing call sites.
 * Lazily created; may be null-equivalent via Proxy when env is missing.
 */
export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
    get(_target, prop) {
        const client = getSupabaseAdmin();
        if (!client) {
            throw new Error("Server is not configured (missing Supabase env vars)");
        }
        const value = Reflect.get(client, prop);
        return typeof value === "function" ? value.bind(client) : value;
    },
});

type AdminUser = { id: string; email?: string | null };
type AuthUserResult = { data: { user: AdminUser | null }; error: { message: string } | null };

type AdminAuthApi = {
    getUser(jwt?: string): Promise<AuthUserResult>;
    admin: { getUserById(userId: string): Promise<AuthUserResult> };
};

const adminAuthApi = (client: { auth: unknown }): AdminAuthApi =>
    client.auth as AdminAuthApi;

export const getUserFromAccessToken = async (
    client: { auth: unknown },
    accessToken: string,
): Promise<AdminUser | null> => {
    const { data, error } = await adminAuthApi(client).getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
};

export const getUserEmailById = async (userId: string): Promise<string | null> => {
    const client = getSupabaseAdmin();
    if (!client) return null;
    const { data } = await adminAuthApi(client).admin.getUserById(userId);
    return data.user?.email ?? null;
};
