/**
 * SupabaseService — production data layer.
 *
 * Drop-in replacement for the localStorage DataService in mockData.ts.
 * All methods take an optional `restaurantId`; when omitted they resolve it
 * from the current Supabase session automatically.
 *
 * Usage:
 *   import { supabaseService } from '../services/supabaseService';
 *   const menu = await supabaseService.getMenu();
 */

import type { Json } from "../lib/database.types";
import { supabase } from "../lib/supabase";
import type {
    AggregatedMetrics,
    Category,
    Dish,
    DishPerformance,
    OrderItem,
    UserTier,
    WatchSession,
} from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getRestaurantId = async (): Promise<string> => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", userId)
        .single();

    if (error || !data) throw new Error("Restaurant not found for this user");
    return data.id;
};

/** Maps a raw DB row to the app-level Category + Dish shape */
const rowsToCategoryTree = (
    categoryRows: Array<{ id: string; title: string; sort_order: number }>,
    dishRows: Array<{
        id: string;
        category_id: string;
        name: string;
        description: string;
        price: number;
        image_url: string;
        video_url: string;
        popularity_score: number;
        prep_time: number;
        media_transform: unknown;
    }>,
): Category[] =>
    categoryRows
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat) => ({
            id: cat.id,
            title: cat.title,
            items: dishRows
                .filter((d) => d.category_id === cat.id)
                .map(
                    (d): Dish => ({
                        id: d.id,
                        name: d.name,
                        description: d.description,
                        price: d.price,
                        imageUrl: d.image_url,
                        videoUrl: d.video_url,
                        category: cat.id,
                        popularityScore: d.popularity_score,
                        prepTime: d.prep_time,
                        mediaTransform: d.media_transform as Dish["mediaTransform"],
                    }),
                ),
        }));

// ─── Service ──────────────────────────────────────────────────────────────────

class SupabaseService {
    // ── Menu ────────────────────────────────────────────────────────────────────

    async getMenu(restaurantId?: string): Promise<Category[]> {
        const rid = restaurantId ?? (await getRestaurantId());

        const [{ data: cats, error: catErr }, { data: dishes, error: dishErr }] =
            await Promise.all([
                supabase.from("categories").select("*").eq("restaurant_id", rid),
                supabase.from("dishes").select("*").eq("restaurant_id", rid),
            ]);

        if (catErr) throw catErr;
        if (dishErr) throw dishErr;

        return rowsToCategoryTree(cats ?? [], dishes ?? []);
    }

    async saveMenu(categories: Category[]): Promise<void> {
        const rid = await getRestaurantId();

        // Upsert categories
        const catRows = categories.map((c, idx) => ({
            id: c.id,
            restaurant_id: rid,
            title: c.title,
            sort_order: idx,
        }));
        const { error: catErr } = await supabase
            .from("categories")
            .upsert(catRows, { onConflict: "id" });
        if (catErr) throw catErr;

        // Upsert all dishes
        const dishRows = categories.flatMap((c) =>
            c.items.map((d) => ({
                id: d.id,
                category_id: c.id,
                restaurant_id: rid,
                name: d.name,
                description: d.description,
                price: d.price,
                image_url: d.imageUrl,
                video_url: d.videoUrl,
                popularity_score: d.popularityScore,
                prep_time: d.prepTime,
                media_transform: d.mediaTransform ?? null,
            })),
        );
        const { error: dishErr } = await supabase
            .from("dishes")
            .upsert(dishRows, { onConflict: "id" });
        if (dishErr) throw dishErr;

        // Delete removed categories (cascade deletes their dishes via FK)
        const keptCatIds = categories.map((c) => c.id);
        await supabase
            .from("categories")
            .delete()
            .eq("restaurant_id", rid)
            .not("id", "in", `(${keptCatIds.join(",")})`);
    }

    // ── Analytics Recording ──────────────────────────────────────────────────────

    async recordWatchSession(
        session: WatchSession,
        restaurantId?: string,
    ): Promise<void> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { error } = await supabase.from("watch_sessions").insert({
            dish_id: session.reelId,
            restaurant_id: rid,
            duration: session.duration,
            completed: session.completed,
        });
        if (error) console.error("Failed to record watch session:", error.message);
    }

    async recordOrder(
        items: OrderItem[],
        timeToOrder: number,
        restaurantId?: string,
    ): Promise<void> {
        const rid = restaurantId ?? (await getRestaurantId());
        const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const { error } = await supabase.from("orders").insert({
            restaurant_id: rid,
            items: items as unknown as Json,
            total_amount: totalAmount,
            time_to_order: timeToOrder,
            status: "pending",
        });
        if (error) console.error("Failed to record order:", error.message);
    }

    // ── Subscription Tier ────────────────────────────────────────────────────────

    async getTier(restaurantId?: string): Promise<UserTier> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { data } = await supabase
            .from("subscriptions")
            .select("tier")
            .eq("restaurant_id", rid)
            .single();

        // Dynamic import to avoid circular dependency with types
        const { UserTier } = await import("../types");
        return data?.tier === "plus" ? UserTier.PLUS : UserTier.FREE;
    }

    async setTier(tier: UserTier, restaurantId?: string): Promise<void> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { UserTier } = await import("../types");
        await supabase
            .from("subscriptions")
            .upsert(
                { restaurant_id: rid, tier: tier === UserTier.PLUS ? "plus" : "free" },
                { onConflict: "restaurant_id" },
            );
    }

    // ── Aggregated Metrics ───────────────────────────────────────────────────────

    async getAggregatedMetrics(
        timeWindow: "24h" | "7d" | "30d" = "24h",
        restaurantId?: string,
    ): Promise<AggregatedMetrics> {
        const rid = restaurantId ?? (await getRestaurantId());
        const now = new Date();
        const msMap = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
        const since = new Date(now.getTime() - msMap[timeWindow]).toISOString();

        const [{ data: sessions }, { data: orders }, { data: dishes }] =
            await Promise.all([
                supabase
                    .from("watch_sessions")
                    .select("*")
                    .eq("restaurant_id", rid)
                    .gte("created_at", since),
                supabase
                    .from("orders")
                    .select("*")
                    .eq("restaurant_id", rid)
                    .gte("created_at", since),
                supabase.from("dishes").select("id, name").eq("restaurant_id", rid),
            ]);

        const s = sessions ?? [];
        const o = orders ?? [];

        const totalViews = s.length;
        const totalWatchTime = s.reduce((acc, ws) => acc + Number(ws.duration), 0);
        const avgWatchDuration = totalViews > 0 ? totalWatchTime / totalViews : 0;
        const completedSessions = s.filter((ws) => ws.completed).length;
        const completionRate =
            totalViews > 0 ? (completedSessions / totalViews) * 100 : 0;
        const engagedViews = s.filter((ws) => Number(ws.duration) > 5).length;
        const engagementRate =
            totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;

        const totalOrders = o.length;
        const avgOrderTime =
            totalOrders > 0
                ? o.reduce((acc, ord) => acc + Number(ord.time_to_order), 0) /
                totalOrders
                : 0;
        const estimatedSessions = Math.max(1, Math.floor(totalViews / 4));
        const conversionRate = (totalOrders / estimatedSessions) * 100;

        // Dish performance map
        const dishMap = new Map<
            string,
            { views: number; watchTime: number; completions: number }
        >();
        s.forEach((ws) => {
            const cur = dishMap.get(ws.dish_id) ?? {
                views: 0,
                watchTime: 0,
                completions: 0,
            };
            cur.views += 1;
            cur.watchTime += Number(ws.duration);
            if (ws.completed) cur.completions += 1;
            dishMap.set(ws.dish_id, cur);
        });

        const dishPerformance: DishPerformance[] = Array.from(dishMap.entries())
            .map(([id, stats]) => ({
                id,
                name: (dishes ?? []).find((d) => d.id === id)?.name ?? "Unknown",
                views: stats.views,
                watchTime: stats.watchTime,
                conversions: stats.completions,
                conversionRate:
                    stats.views > 0 ? (stats.completions / stats.views) * 100 : 0,
            }))
            .sort((a, b) => b.views - a.views);

        const mostPopularDishId = dishPerformance[0]?.id ?? "";

        // Hourly / daily traffic buckets
        const points = timeWindow === "24h" ? 24 : timeWindow === "7d" ? 7 : 30;
        const interval = msMap[timeWindow] / points;
        const buckets = new Map<string, number>();

        for (let i = points - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * interval);
            const key =
                timeWindow === "24h"
                    ? `${d.getHours()}:00`
                    : `${d.getMonth() + 1}/${d.getDate()}`;
            if (!buckets.has(key)) buckets.set(key, 0);
        }
        s.forEach((ws) => {
            const d = new Date(ws.created_at);
            const key =
                timeWindow === "24h"
                    ? `${d.getHours()}:00`
                    : `${d.getMonth() + 1}/${d.getDate()}`;
            if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
        });

        const hourlyTraffic = Array.from(buckets.entries()).map(
            ([hour, views]) => ({ hour, views }),
        );

        const conversionFunnel = [
            { stage: "Menu Views", count: totalViews, fill: "#fff" },
            { stage: "Engaged (>5s)", count: engagedViews, fill: "#aaa" },
            { stage: "Orders", count: totalOrders, fill: "#4ade80" },
        ];

        return {
            totalViews,
            totalWatchTime,
            avgWatchDuration,
            completionRate,
            mostPopularDishId,
            engagementRate,
            totalOrders,
            avgOrderTime,
            conversionRate,
            hourlyTraffic,
            conversionFunnel,
            dishPerformance,
        };
    }

    // ── CSV Export ───────────────────────────────────────────────────────────────

    async getCSVData(): Promise<string> {
        const metrics = await this.getAggregatedMetrics("30d");
        const headers = [
            "Item Name",
            "Total Views",
            "Watch Time (s)",
            "Completions",
            "Est. Conversion Rate",
        ];
        const rows = metrics.dishPerformance.map((d) => [
            d.name,
            d.views.toString(),
            d.watchTime.toFixed(1),
            d.conversions.toString(),
            d.conversionRate.toFixed(1) + "%",
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    }

    // ── Restaurant Bootstrap ─────────────────────────────────────────────────────

    /**
     * Ensures the logged-in user has a restaurant row and a free subscription.
     * Call this once after Google OAuth sign-in completes.
     */
    async ensureRestaurant(name: string, slug: string): Promise<string> {
        const { data: session } = await supabase.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) throw new Error("Not authenticated");

        // Check if restaurant already exists
        const { data: existing } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .single();

        if (existing) return existing.id;

        // Create new restaurant
        const { data: restaurant, error } = await supabase
            .from("restaurants")
            .insert({ owner_id: userId, name, slug })
            .select("id")
            .single();

        if (error || !restaurant)
            throw error ?? new Error("Failed to create restaurant");

        // Bootstrap a free subscription
        await supabase
            .from("subscriptions")
            .insert({ restaurant_id: restaurant.id, tier: "free" });

        return restaurant.id;
    }
}

export const supabaseService = new SupabaseService();
