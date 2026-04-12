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

/**
 * Convert a restaurant name to a URL-friendly slug.
 * Example: "Fresh & Fusion" -> "fresh-and-fusion"
 */
const slugify = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50) || "my-restaurant";
};

/**
 * Generate a unique slug by appending a random suffix if needed.
 */
const generateUniqueSlug = async (baseName: string): Promise<string> => {
    const baseSlug = slugify(baseName);

    // Check if base slug is available
    const { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", baseSlug)
        .single();

    if (!existing) return baseSlug;

    // Add random suffix for uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${suffix}`;
};

const getRestaurantId = async (): Promise<string> => {
    // getUser() is more reliable than getSession() right after OAuth redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

    // PGRST116 = no rows found — auto-create the restaurant instead of failing
    if (error && error.code !== "PGRST116") {
        throw new Error(`DB error: ${error.message}`);
    }

    if (!data) {
        // First-time user: bootstrap restaurant row then try again
        const newId = await bootstrapRestaurant(user.id);
        return newId;
    }

    return data.id;
};

/** Creates the restaurant + subscription for a brand-new user. */
const bootstrapRestaurant = async (userId: string): Promise<string> => {
    const defaultName = "My Restaurant";
    const slug = await generateUniqueSlug(defaultName);

    const { data: restaurant, error } = await supabase
        .from("restaurants")
        .insert({ owner_id: userId, name: defaultName, slug, currency: "USD" })
        .select("id")
        .single();

    if (error || !restaurant) {
        // Might already exist due to a race — try fetching again
        const { data: existing } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .single();
        if (existing) return existing.id;
        throw new Error(`Failed to create restaurant: ${error?.message}`);
    }

    // Bootstrap free subscription (ignore conflict if already exists)
    try {
        await supabase
            .from("subscriptions")
            .insert({ restaurant_id: restaurant.id, tier: "free" });
    } catch (_) { /* ignore */ }

    return restaurant.id;
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
        stock_quantity?: number | null;
        manual_sold_out?: boolean | null;
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
                        stockQuantity: d.stock_quantity ?? undefined,
                        manualSoldOut: d.manual_sold_out ?? false,
                    }),
                ),
        }));

/** Maps raw subscription_daily_orders rows to DailyOrder app type */
const mapDailyOrders = (
    rows: Array<{
        id: string; subscription_id: string; restaurant_id: string;
        delivery_date: string; dish_id: string | null; dish_name: string;
        status: string; cancelled_by: string | null;
        cancellation_reason: string | null; created_at: string; updated_at: string;
    }>,
): import("../types").DailyOrder[] =>
    rows.map((r) => ({
        id: r.id,
        subscriptionId: r.subscription_id,
        restaurantId: r.restaurant_id,
        deliveryDate: r.delivery_date,
        dishId: r.dish_id ?? undefined,
        dishName: r.dish_name,
        status: r.status as import("../types").DailyOrderStatus,
        cancelledBy: r.cancelled_by ?? undefined,
        cancellationReason: r.cancellation_reason ?? undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
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

        // Guard: remap any stale non-UUID IDs (e.g. old "cat_timestamp" format)
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const safeCategories = categories.map((cat) => ({
            ...cat,
            id: UUID_RE.test(cat.id) ? cat.id : crypto.randomUUID(),
            items: cat.items.map((dish) => ({
                ...dish,
                id: UUID_RE.test(dish.id) ? dish.id : crypto.randomUUID(),
            })),
        }));

        // Upsert categories
        const catRows = safeCategories.map((c, idx) => ({
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
        const dishRows = safeCategories.flatMap((c) =>
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
                stock_quantity: d.stockQuantity ?? null,
                manual_sold_out: d.manualSoldOut ?? false,
            })),
        );
        const { error: dishErr } = await supabase
            .from("dishes")
            .upsert(dishRows, { onConflict: "id" });
        if (dishErr) throw dishErr;

        // Delete removed dishes
        const keptDishIds = safeCategories.flatMap((c) => c.items.map((d) => d.id));
        if (keptDishIds.length > 0) {
            await supabase
                .from("dishes")
                .delete()
                .eq("restaurant_id", rid)
                .not("id", "in", `(${keptDishIds.join(",")})`);
        } else {
            // If no dishes left, delete all dishes for this restaurant
            await supabase
                .from("dishes")
                .delete()
                .eq("restaurant_id", rid);
        }

        // Delete removed categories (cascade deletes their dishes via FK)
        const keptCatIds = safeCategories.map((c) => c.id);
        await supabase
            .from("categories")
            .delete()
            .eq("restaurant_id", rid)
            .not("id", "in", `(${keptCatIds.join(",")})`);
    }

    /**
     * Toggle the manual sold-out flag for a single dish.
     * Auto-saves directly to the DB without a full menu save.
     * Sends a sold-out email notification when enabling.
     */
    async toggleManualSoldOut(dishId: string, dishName: string, soldOut: boolean): Promise<void> {
        const { error } = await supabase
            .from("dishes")
            .update({ manual_sold_out: soldOut })
            .eq("id", dishId);
        if (error) throw new Error(`Failed to update sold-out status: ${error.message}`);

        if (soldOut) {
            await this.sendSoldOutEmail(dishId, dishName, "manual");
        }
    }

    /**
     * Sends a sold-out notification email to the restaurant owner.
     * POSTs to the Vercel API route /api/sold-out-email which uses
     * Nodemailer with exponential back-off retry (up to 3 attempts).
     * Failures are logged but never throw — email is best-effort.
     */
    async sendSoldOutEmail(
        dishId: string,
        dishName: string,
        reason: "stock" | "manual",
    ): Promise<void> {
        try {
            const rid = await getRestaurantId();
            const [{ data: { user } }, { data: restaurant }] = await Promise.all([
                supabase.auth.getUser(),
                supabase.from("restaurants").select("name").eq("id", rid).single(),
            ]);

            await fetch("/api/sold-out-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: user?.email ?? "",
                    restaurantName: restaurant?.name ?? "Your Restaurant",
                    dishName,
                    reason,
                }),
            });
        } catch (err) {
            console.error("sendSoldOutEmail failed:", err);
        }
    }

    // ── Analytics Recording ──────────────────────────────────────────────────────

    /**
     * Returns the total ordered quantity per dish for today (UTC date).
     * Reads from `dish_stock_daily` which is publicly readable (no PII).
     * Safe to call from unauthenticated customer sessions.
     */
    async getDishSoldCounts(restaurantId?: string): Promise<Record<string, number>> {
        const rid = restaurantId;
        if (!rid) return {};

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        const { data } = await supabase
            .from("dish_stock_daily")
            .select("dish_id, quantity_sold")
            .eq("restaurant_id", rid)
            .eq("sold_date", today);

        const counts: Record<string, number> = {};
        (data ?? []).forEach((row) => {
            counts[row.dish_id] = row.quantity_sold;
        });
        return counts;
    }

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
        /** Dishes that became sold-out as a result of this order */
        newlySoldOutDishes?: Array<{ id: string; name: string }>,
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

        // Update daily sold counts for each ordered dish (upsert per dish+date)
        const today = new Date().toISOString().slice(0, 10);
        await Promise.allSettled(
            items.map((item) =>
                supabase.rpc("increment_dish_stock", {
                    p_dish_id: item.dishId,
                    p_restaurant_id: rid,
                    p_sold_date: today,
                    p_quantity: item.quantity,
                }),
            ),
        );

        // Send sold-out email for any dishes that just hit their stock limit
        if (newlySoldOutDishes && newlySoldOutDishes.length > 0) {
            await Promise.allSettled(
                newlySoldOutDishes.map((d) => this.sendSoldOutEmail(d.id, d.name, "stock")),
            );
        }
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

    // ── Analytics Report ─────────────────────────────────────────────────────────
    //
    // Builds a rich, structured snapshot from internal data only.
    // Source tables: watch_sessions, orders (JSONB items), customer_subscriptions,
    //                subscription_daily_orders, meal_plans, dishes.
    // No GA4 or external source needed — all restaurant KPIs live in Supabase.

    async buildAnalyticsReport(
        timeWindow: "24h" | "7d" | "30d" = "24h",
    ): Promise<import("../types").AnalyticsReport> {
        const rid = await getRestaurantId();
        const now = new Date();
        const msMap = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 } as const;
        const since = new Date(now.getTime() - msMap[timeWindow]).toISOString();
        const todayStr = now.toISOString().slice(0, 10);

        const [
            { data: sessions },
            { data: orders },
            { data: dishes },
            { data: subs },
            { data: subOrders },
            { data: plans },
            { data: restaurant },
        ] = await Promise.all([
            supabase
                .from("watch_sessions")
                .select("dish_id, duration, completed")
                .eq("restaurant_id", rid)
                .gte("created_at", since),
            supabase
                .from("orders")
                .select("items, total_amount, time_to_order")
                .eq("restaurant_id", rid)
                .gte("created_at", since),
            supabase
                .from("dishes")
                .select("id, name")
                .eq("restaurant_id", rid),
            supabase
                .from("customer_subscriptions")
                .select("id, status, plan_id, created_at")
                .eq("restaurant_id", rid),
            supabase
                .from("subscription_daily_orders")
                .select("status")
                .eq("restaurant_id", rid)
                .lte("delivery_date", todayStr),
            supabase
                .from("meal_plans")
                .select("id, name, price_monthly")
                .eq("restaurant_id", rid),
            supabase
                .from("restaurants")
                .select("currency")
                .eq("id", rid)
                .single(),
        ]);

        const s = sessions ?? [];
        const o = orders ?? [];
        const d = dishes ?? [];
        const allSubs = subs ?? [];
        const allSubOrders = subOrders ?? [];
        const allPlans = plans ?? [];
        const currency = (restaurant as { currency?: string } | null)?.currency ?? "USD";

        // Revenue
        const totalRevenue = o.reduce((sum, ord) => sum + Number(ord.total_amount), 0);
        const orderCount = o.length;
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        type OrderItem = { dishId: string; name: string; price: number; quantity: number };
        const dishRevenueMap = new Map<string, { name: string; revenue: number; units: number }>();
        o.forEach((ord) => {
            (Array.isArray(ord.items) ? ord.items as OrderItem[] : []).forEach((item) => {
                const cur = dishRevenueMap.get(item.dishId) ?? { name: item.name, revenue: 0, units: 0 };
                cur.revenue += item.price * item.quantity;
                cur.units += item.quantity;
                dishRevenueMap.set(item.dishId, cur);
            });
        });
        const topDishRevenue = Array.from(dishRevenueMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Engagement
        const totalViews = s.length;
        const engagedViews = s.filter((ws) => Number(ws.duration) > 5).length;
        const engagementRate = totalViews > 0 ? (engagedViews / totalViews) * 100 : 0;
        const avgWatchDuration = totalViews > 0 ? s.reduce((sum, ws) => sum + Number(ws.duration), 0) / totalViews : 0;
        const completionRate = totalViews > 0 ? (s.filter((ws) => ws.completed).length / totalViews) * 100 : 0;

        const dishViewMap = new Map<string, { views: number; completions: number }>();
        s.forEach((ws) => {
            const cur = dishViewMap.get(ws.dish_id) ?? { views: 0, completions: 0 };
            cur.views++;
            if (ws.completed) cur.completions++;
            dishViewMap.set(ws.dish_id, cur);
        });

        const dishOrderMap = new Map<string, number>();
        o.forEach((ord) => {
            (Array.isArray(ord.items) ? ord.items as OrderItem[] : []).forEach((item) => {
                dishOrderMap.set(item.dishId, (dishOrderMap.get(item.dishId) ?? 0) + item.quantity);
            });
        });

        const dishPerf = Array.from(dishViewMap.entries()).map(([id, stats]) => ({
            name: d.find((dish) => dish.id === id)?.name ?? "Unknown",
            views: stats.views,
            conversionRate: stats.views > 0 ? ((dishOrderMap.get(id) ?? 0) / stats.views) * 100 : 0,
        }));
        const topDishes = [...dishPerf].sort((a, b) => b.views - a.views).slice(0, 3);
        const lowConversionDishes = dishPerf
            .filter((dp) => dp.views >= 3)
            .sort((a, b) => a.conversionRate - b.conversionRate)
            .slice(0, 3);

        // Subscriptions
        const active = allSubs.filter((sub) => sub.status === "active").length;
        const paused = allSubs.filter((sub) => sub.status === "paused").length;
        const cancelled = allSubs.filter((sub) => sub.status === "cancelled").length;
        const deliveredOrders = allSubOrders.filter((subOrd) => subOrd.status === "delivered").length;
        const totalSubOrders = allSubOrders.length;
        const deliveryRate = totalSubOrders > 0 ? (deliveredOrders / totalSubOrders) * 100 : 0;
        const planBreakdown = allPlans.map((p) => {
            const count = allSubs.filter((sub) => sub.plan_id === p.id && sub.status === "active").length;
            return { planName: p.name, count, monthlyRevenue: count * Number(p.price_monthly) };
        });

        return {
            period: timeWindow,
            generatedAt: now.toISOString(),
            currency,
            revenue: { total: totalRevenue, avgOrderValue, orderCount, topDishRevenue },
            engagement: { totalViews, engagementRate, avgWatchDuration, completionRate, topDishes, lowConversionDishes },
            subscriptions: { active, paused, cancelled, totalOrders: totalSubOrders, deliveredOrders, deliveryRate, planBreakdown },
            customers: { total: allSubs.length, newThisPeriod: allSubs.filter((sub) => sub.created_at >= since).length },
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

    // ── Public Restaurant Access (for QR code flow) ─────────────────────────────

    /**
     * Get restaurant info by slug (for customers accessing via QR code).
     * No authentication required.
     */
    async getRestaurantBySlug(slug: string): Promise<{
        id: string;
        name: string;
        slug: string;
        currency: string;
    } | null> {
        const { data, error } = await supabase
            .from("restaurants")
            .select("id, name, slug, currency")
            .eq("slug", slug)
            .maybeSingle();

        if (error || !data) return null;
        return { ...data, currency: data.currency || "USD" };
    }

    /**
     * Get the current restaurant's slug (for QR code generation).
     * Requires authentication.
     */
    async getRestaurantSlug(): Promise<string> {
        const rid = await getRestaurantId();
        const { data, error } = await supabase
            .from("restaurants")
            .select("slug, name")
            .eq("id", rid)
            .single();

        if (error || !data) throw new Error("Restaurant not found");
        return data.slug;
    }

    /**
     * Get restaurant details including name (for QR code display).
     */
    async getRestaurantDetails(): Promise<{ id: string; name: string; slug: string; currency: string }> {
        const rid = await getRestaurantId();
        const { data, error } = await supabase
            .from("restaurants")
            .select("id, name, slug, currency")
            .eq("id", rid)
            .single();

        if (error || !data) throw new Error("Restaurant not found");
        return { ...data, currency: data.currency || "USD" };
    }

    /**
     * Update the restaurant's slug.
     */
    async updateRestaurantSlug(newSlug: string): Promise<void> {
        const rid = await getRestaurantId();

        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(newSlug)) {
            throw new Error("Slug must be lowercase letters, numbers, and hyphens only");
        }

        // Check if slug is already taken
        const { data: existing } = await supabase
            .from("restaurants")
            .select("id")
            .eq("slug", newSlug)
            .neq("id", rid)
            .single();

        if (existing) {
            throw new Error("This URL is already taken");
        }

        const { error } = await supabase
            .from("restaurants")
            .update({ slug: newSlug })
            .eq("id", rid);

        if (error) throw error;
    }

    /**
     * Update restaurant name and optionally regenerate slug.
     */
    async updateRestaurantName(newName: string, regenerateSlug = true): Promise<{ name: string; slug: string }> {
        const rid = await getRestaurantId();

        const updateData: { name: string; slug?: string } = { name: newName };

        if (regenerateSlug) {
            updateData.slug = await generateUniqueSlug(newName);
        }

        const { data, error } = await supabase
            .from("restaurants")
            .update(updateData)
            .eq("id", rid)
            .select("name, slug")
            .single();

        if (error || !data) throw error ?? new Error("Failed to update restaurant");
        return data;
    }

    /**
     * Update restaurant currency.
     */
    async updateRestaurantCurrency(currency: string): Promise<void> {
        const rid = await getRestaurantId();
        const { error } = await supabase
            .from("restaurants")
            .update({ currency })
            .eq("id", rid);
        if (error) throw error;
    }

    /**
     * Fix legacy UUID slugs by regenerating from restaurant name.
     */
    async fixLegacySlug(): Promise<string> {
        const rid = await getRestaurantId();
        const { data } = await supabase
            .from("restaurants")
            .select("name, slug")
            .eq("id", rid)
            .single();

        if (!data) throw new Error("Restaurant not found");

        // Check if current slug looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(data.slug)) {
            const newSlug = await generateUniqueSlug(data.name);
            await supabase
                .from("restaurants")
                .update({ slug: newSlug })
                .eq("id", rid);
            return newSlug;
        }

        return data.slug;
    }

    // ── Meal Plan Management (owner) ────────────────────────────────────────────

    async getMealPlans(restaurantId?: string): Promise<import("../types").MealPlan[]> {
        const rid = restaurantId ?? (await getRestaurantId());

        const { data: plans, error: planErr } = await supabase
            .from("meal_plans")
            .select("*")
            .eq("restaurant_id", rid)
            .order("created_at");

        if (planErr) throw planErr;

        const planIds = (plans ?? []).map((p) => p.id);
        const { data: links } = planIds.length > 0
            ? await supabase.from("meal_plan_dishes").select("plan_id, dish_id").in("plan_id", planIds)
            : { data: [] as Array<{ plan_id: string; dish_id: string }> };

        const dishIdsByPlan: Record<string, string[]> = {};
        (links ?? []).forEach((l) => {
            dishIdsByPlan[l.plan_id] = [...(dishIdsByPlan[l.plan_id] ?? []), l.dish_id];
        });

        return (plans ?? []).map((p) => ({
            id: p.id,
            restaurantId: p.restaurant_id,
            name: p.name,
            description: p.description,
            priceMonthly: p.price_monthly,
            deliveryFee: p.delivery_fee,
            isActive: p.is_active,
            dishIds: dishIdsByPlan[p.id] ?? [],
            createdAt: p.created_at,
        }));
    }

    async saveMealPlan(
        plan: Omit<import("../types").MealPlan, "id" | "restaurantId" | "createdAt">,
        planId?: string,
    ): Promise<string> {
        const rid = await getRestaurantId();
        const row = {
            restaurant_id: rid,
            name: plan.name,
            description: plan.description,
            price_monthly: plan.priceMonthly,
            delivery_fee: plan.deliveryFee,
            is_active: plan.isActive,
        };

        let id = planId;
        if (id) {
            const { error } = await supabase.from("meal_plans").update(row).eq("id", id);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from("meal_plans").insert({ ...row }).select("id").single();
            if (error || !data) throw error ?? new Error("Failed to create plan");
            id = data.id;
        }

        // Sync dish links: upsert new, delete removed (two-step to avoid gap)
        const newLinks = plan.dishIds.map((dish_id) => ({ plan_id: id!, dish_id }));
        if (newLinks.length > 0) {
            const { error: upsertErr } = await supabase
                .from("meal_plan_dishes")
                .upsert(newLinks, { onConflict: "plan_id,dish_id" });
            if (upsertErr) throw upsertErr;
        }
        // Delete links for dishes no longer in the plan
        if (plan.dishIds.length > 0) {
            await supabase
                .from("meal_plan_dishes")
                .delete()
                .eq("plan_id", id!)
                .not("dish_id", "in", `(${plan.dishIds.join(",")})`);
        } else {
            await supabase.from("meal_plan_dishes").delete().eq("plan_id", id!);
        }

        return id!;
    }

    async deleteMealPlan(planId: string): Promise<void> {
        const { error } = await supabase.from("meal_plans").delete().eq("id", planId);
        if (error) throw error;
    }

    // ── Owner: Subscription Operations ─────────────────────────────────────────

    async getCustomerSubscriptions(restaurantId?: string): Promise<import("../types").CustomerSubscription[]> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { data, error } = await supabase
            .from("customer_subscriptions")
            .select("*, meal_plans(name)")
            .eq("restaurant_id", rid)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data ?? []).map((s) => ({
            id: s.id,
            restaurantId: s.restaurant_id,
            planId: s.plan_id,
            planName: (s as unknown as { meal_plans?: { name?: string } }).meal_plans?.name ?? "",
            customerName: s.customer_name,
            phone: s.phone,
            email: s.email ?? undefined,
            deliveryType: s.delivery_type as import("../types").SubDeliveryType,
            deliveryFeeMode: ((s as unknown as Record<string, unknown>).delivery_fee_mode ?? "cash_on_delivery") as import("../types").DeliveryFeeMode,
            timeSlot: s.time_slot as import("../types").TimeSlot,
            status: s.status as import("../types").SubStatus,
            pauseUntil: s.pause_until ?? undefined,
            pausedDaysUsed: s.paused_days_used,
            startDate: s.start_date,
            endDate: s.end_date,
            createdAt: s.created_at,
            rotationDishIds: ((s as unknown as Record<string, unknown>).rotation_dish_ids ?? []) as string[],
        }));
    }

    async getCustomerDirectory(restaurantId?: string): Promise<import("../types").CustomerDirectoryEntry[]> {
        const rid = restaurantId ?? (await getRestaurantId());

        const [{ data: subs, error: subErr }, { data: orders }] = await Promise.all([
            supabase
                .from("customer_subscriptions")
                .select("id, customer_name, phone, email, status, created_at, meal_plans(name)")
                .eq("restaurant_id", rid)
                .order("created_at", { ascending: false }),
            supabase
                .from("subscription_daily_orders")
                .select("subscription_id, status, delivery_date")
                .eq("restaurant_id", rid)
                .neq("status", "cancelled"),
        ]);

        if (subErr) throw subErr;

        type OrderRow = { subscription_id: string; status: string; delivery_date: string };
        const statsMap = new Map<string, { total: number; delivered: number; lastDate: string | null }>();
        for (const o of (orders ?? []) as OrderRow[]) {
            const s = statsMap.get(o.subscription_id) ?? { total: 0, delivered: 0, lastDate: null };
            s.total++;
            if (o.status === "delivered") s.delivered++;
            if (!s.lastDate || o.delivery_date > s.lastDate) s.lastDate = o.delivery_date;
            statsMap.set(o.subscription_id, s);
        }

        return (subs ?? []).map((s) => ({
            id: s.id,
            name: s.customer_name,
            phone: s.phone,
            email: s.email ?? null,
            planName: (s as unknown as { meal_plans?: { name?: string } }).meal_plans?.name ?? "—",
            subStatus: s.status as import("../types").SubStatus,
            totalOrders: statsMap.get(s.id)?.total ?? 0,
            deliveredOrders: statsMap.get(s.id)?.delivered ?? 0,
            lastActiveDate: statsMap.get(s.id)?.lastDate ?? null,
            joinedAt: s.created_at,
        }));
    }

    async getTomorrowsOrders(restaurantId?: string): Promise<import("../types").DailyOrder[]> {
        const rid = restaurantId ?? (await getRestaurantId());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const date = tomorrow.toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from("subscription_daily_orders")
            .select("*")
            .eq("restaurant_id", rid)
            .eq("delivery_date", date)
            .neq("status", "cancelled");

        if (error) throw error;
        return mapDailyOrders(data ?? []);
    }

    async cancelDailyOrder(orderId: string, reason: string): Promise<void> {
        const { data, error } = await supabase
            .from("subscription_daily_orders")
            .update({
                status: "cancelled",
                cancelled_by: "restaurant",
                cancellation_reason: reason,
                updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .select("subscription_id, delivery_date, dish_name, restaurant_id")
            .single();

        if (error) throw error;

        // Fire cancel email best-effort
        if (data) {
            const sub = await supabase
                .from("customer_subscriptions")
                .select("email, customer_name")
                .eq("id", data.subscription_id)
                .single();

            await fetch("/api/subscription/cancel-order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(import.meta.env.VITE_INTERNAL_API_SECRET
                        ? { "x-internal-secret": import.meta.env.VITE_INTERNAL_API_SECRET }
                        : {}),
                },
                body: JSON.stringify({
                    subscriptionId: data.subscription_id,
                    restaurantId: data.restaurant_id,
                    deliveryDate: data.delivery_date,
                    dishName: data.dish_name,
                    reason,
                    customerEmail: sub.data?.email ?? null,
                    customerName: sub.data?.customer_name ?? null,
                }),
            }).catch(console.error);
        }
    }

    async getDeliveryTickets(restaurantId?: string): Promise<import("../types").DeliveryTicket[]> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { data, error } = await supabase
            .from("delivery_tickets")
            .select("*, delivery_adjustments(*)")
            .eq("restaurant_id", rid)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data ?? []).map((t) => ({
            id: t.id,
            subscriptionId: t.subscription_id,
            dailyOrderId: t.daily_order_id,
            restaurantId: t.restaurant_id,
            reason: t.reason as import("../types").TicketReason,
            notes: t.notes ?? undefined,
            status: t.status as import("../types").TicketStatus,
            createdAt: t.created_at,
            adjustments: ((t as unknown as { delivery_adjustments?: Array<{ id: string; ticket_id: string; notes: string; created_at: string }> }).delivery_adjustments ?? []).map((a) => ({
                id: a.id,
                ticketId: a.ticket_id,
                notes: a.notes,
                createdAt: a.created_at,
            })),
        }));
    }

    async resolveDeliveryTicket(ticketId: string, notes: string): Promise<void> {
        const { error: ticketErr } = await supabase
            .from("delivery_tickets")
            .update({ status: "resolved" })
            .eq("id", ticketId);
        if (ticketErr) throw ticketErr;

        const { error: adjErr } = await supabase
            .from("delivery_adjustments")
            .insert({ ticket_id: ticketId, notes });
        if (adjErr) throw adjErr;
    }

    async getRefundRequests(restaurantId?: string): Promise<import("../types").RefundRequest[]> {
        const rid = restaurantId ?? (await getRestaurantId());
        const { data, error } = await supabase
            .from("subscription_refund_requests")
            .select("*")
            .eq("restaurant_id", rid)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data ?? []).map((r) => ({
            id: r.id,
            subscriptionId: r.subscription_id,
            restaurantId: r.restaurant_id,
            reason: r.reason,
            amount: r.amount,
            status: r.status as import("../types").RefundStatus,
            restaurantNotes: r.restaurant_notes ?? undefined,
            createdAt: r.created_at,
            processedAt: r.processed_at ?? undefined,
        }));
    }

    async updateRefundStatus(
        refundId: string,
        status: import("../types").RefundStatus,
        notes?: string,
    ): Promise<void> {
        const update: Record<string, unknown> = { status };
        if (notes) update.restaurant_notes = notes;
        if (status === "processed") update.processed_at = new Date().toISOString();

        const { error } = await supabase
            .from("subscription_refund_requests")
            .update(update)
            .eq("id", refundId);
        if (error) throw error;
    }

    // ── Customer: Subscription Operations (no auth) ─────────────────────────────

    async getCustomerSubscription(
        phone: string,
        restaurantId: string,
    ): Promise<import("../types").CustomerSubscription | null> {
        const { data } = await supabase
            .from("customer_subscriptions")
            .select("*, meal_plans(name)")
            .eq("phone", phone)
            .eq("restaurant_id", restaurantId)
            .single();

        if (!data) return null;

        return {
            id: data.id,
            restaurantId: data.restaurant_id,
            planId: data.plan_id,
            planName: (data as unknown as { meal_plans?: { name?: string } }).meal_plans?.name ?? "",
            customerName: data.customer_name,
            phone: data.phone,
            email: data.email ?? undefined,
            deliveryType: data.delivery_type as import("../types").SubDeliveryType,
            deliveryFeeMode: ((data as unknown as Record<string, unknown>).delivery_fee_mode ?? "cash_on_delivery") as import("../types").DeliveryFeeMode,
            timeSlot: data.time_slot as import("../types").TimeSlot,
            status: data.status as import("../types").SubStatus,
            pauseUntil: data.pause_until ?? undefined,
            pausedDaysUsed: data.paused_days_used,
            startDate: data.start_date,
            endDate: data.end_date,
            createdAt: data.created_at,
            rotationDishIds: ((data as unknown as Record<string, unknown>).rotation_dish_ids ?? []) as string[],
        };
    }

    async createCustomerSubscription(params: {
        restaurantId: string;
        planId: string;
        customerName: string;
        phone: string;
        email?: string;
        deliveryType: import("../types").SubDeliveryType;
        deliveryFeeMode: import("../types").DeliveryFeeMode;
        timeSlot: import("../types").TimeSlot;
        rotationDishIds?: string[];
    }): Promise<string> {
        const startDate = new Date().toISOString().slice(0, 10);
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const endDate = end.toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from("customer_subscriptions")
            .insert({
                restaurant_id: params.restaurantId,
                plan_id: params.planId,
                customer_name: params.customerName,
                phone: params.phone,
                email: params.email ?? null,
                delivery_type: params.deliveryType,
                delivery_fee_mode: params.deliveryFeeMode,
                time_slot: params.timeSlot,
                start_date: startDate,
                end_date: endDate,
                rotation_dish_ids: params.rotationDishIds ?? [],
            })
            .select("id")
            .single();

        if (error) throw new Error(error.message);
        return data.id;
    }

    async selectDailyDish(
        phone: string,
        restaurantId: string,
        deliveryDate: string,
        dishId: string,
    ): Promise<void> {
        const { error } = await supabase.rpc("upsert_daily_selection", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_delivery_date: deliveryDate,
            p_dish_id: dishId,
        });
        if (error) throw new Error(error.message);
    }

    async pauseSubscription(phone: string, restaurantId: string, pauseUntil: string): Promise<void> {
        const { error } = await supabase.rpc("update_subscription_status", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_new_status: "paused",
            p_pause_until: pauseUntil,
        });
        if (error) throw new Error(error.message);
    }

    async resumeSubscription(phone: string, restaurantId: string): Promise<void> {
        const { error } = await supabase.rpc("update_subscription_status", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_new_status: "active",
        });
        if (error) throw new Error(error.message);
    }

    async cancelCustomerSubscription(
        phone: string,
        restaurantId: string,
        reason: string,
    ): Promise<void> {
        const { error } = await supabase.rpc("update_subscription_status", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_new_status: "cancelled",
            p_cancel_reason: reason,
        });
        if (error) throw new Error(error.message);
    }

    async getCustomerDailyOrders(subscriptionId: string, fromDate: string): Promise<import("../types").DailyOrder[]> {
        const { data, error } = await supabase
            .from("subscription_daily_orders")
            .select("*")
            .eq("subscription_id", subscriptionId)
            .gte("delivery_date", fromDate)
            .order("delivery_date");

        if (error) throw error;
        return mapDailyOrders(data ?? []);
    }

    async raiseDeliveryTicket(params: {
        subscriptionId: string;
        dailyOrderId: string;
        restaurantId: string;
        reason: import("../types").TicketReason;
        notes?: string;
    }): Promise<void> {
        const { error } = await supabase.from("delivery_tickets").insert({
            subscription_id: params.subscriptionId,
            daily_order_id: params.dailyOrderId,
            restaurant_id: params.restaurantId,
            reason: params.reason,
            notes: params.notes ?? null,
        });
        if (error) throw error;
    }
}

export const supabaseService = new SupabaseService();
