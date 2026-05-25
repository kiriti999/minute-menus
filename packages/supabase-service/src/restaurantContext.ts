import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";

/**
 * Convert a restaurant name to a URL-friendly slug.
 * Example: "Fresh & Fusion" -> "fresh-and-fusion"
 */
export const slugify = (name: string): string =>
    name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50) || "my-restaurant";

/** Generate a unique slug by appending a random suffix if needed. */
export const generateUniqueSlug = async (
    client: SupabaseClient<Database>,
    baseName: string,
): Promise<string> => {
    const baseSlug = slugify(baseName);

    const { data: existing } = await client
        .from("restaurants")
        .select("id")
        .eq("slug", baseSlug)
        .single();

    if (!existing) return baseSlug;

    const suffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${suffix}`;
};

/** Creates the restaurant + subscription for a brand-new user. */
const bootstrapRestaurant = async (
    client: SupabaseClient<Database>,
    userId: string,
    resolveSlug: (baseName: string) => Promise<string>,
): Promise<string> => {
    const defaultName = "My Restaurant";
    const slug = await resolveSlug(defaultName);

    const { data: restaurant, error } = await client
        .from("restaurants")
        .insert({ owner_id: userId, name: defaultName, slug, currency: "USD" })
        .select("id")
        .single();

    if (error || !restaurant) {
        const { data: existing } = await client
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .single();
        if (existing) return existing.id;
        throw new Error(`Failed to create restaurant: ${error?.message}`);
    }

    try {
        await client
            .from("subscriptions")
            .insert({ restaurant_id: restaurant.id, tier: "free" });
    } catch (_) {
        /* ignore */
    }

    return restaurant.id;
};

export const createRestaurantContext = (client: SupabaseClient<Database>) => {
    const boundGenerateUniqueSlug = (baseName: string) =>
        generateUniqueSlug(client, baseName);

    let cachedRestaurantId: string | null = null;
    let cachedForUserId: string | null = null;
    let inflightLookup: Promise<string> | null = null;

    const clearRestaurantCache = (): void => {
        cachedRestaurantId = null;
        cachedForUserId = null;
        inflightLookup = null;
    };

    const getRestaurantId = async (): Promise<string> => {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        if (cachedForUserId === user.id && cachedRestaurantId) {
            return cachedRestaurantId;
        }

        if (inflightLookup) return inflightLookup;

        inflightLookup = (async () => {
            const { data, error } = await client
                .from("restaurants")
                .select("id")
                .eq("owner_id", user.id)
                .single();

            if (error && error.code !== "PGRST116") {
                throw new Error(`DB error: ${error.message}`);
            }

            const restaurantId = data
                ? data.id
                : await bootstrapRestaurant(client, user.id, boundGenerateUniqueSlug);

            cachedRestaurantId = restaurantId;
            cachedForUserId = user.id;
            return restaurantId;
        })();

        try {
            return await inflightLookup;
        } finally {
            inflightLookup = null;
        }
    };

    return { getRestaurantId, generateUniqueSlug: boundGenerateUniqueSlug, clearRestaurantCache };
};
