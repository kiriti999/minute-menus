import { createLogger } from "@minute-menus/logger";
import { persistMenu } from "@minute-menus/menu-persistence";
import { syncMealPlanDishLinks, upsertMealPlanRow } from "@minute-menus/meal-plan-persistence";
import { buildAggregatedMetrics, buildAnalyticsReport, sinceIso } from "@minute-menus/metrics";
import type {
    AggregatedMetrics,
    AnalyticsReport,
    Category,
    CustomerAddress,
    CustomerDirectoryEntry,
    CustomerProfile,
    CustomerSubscription,
    DailyOrder,
    DeliveryTicket,
    DishRecipeLine,
    Ingredient,
    IngredientInvoice,
    InvoiceLineItem,
    MealPlan,
    OrderItem,
    PurchaseUnit,
    RestaurantOverhead,
    RefundRequest,
    RefundStatus,
    SubDeliveryType,
    SubStatus,
    TicketReason,
    TicketStatus,
    TimeSlot,
    WatchSession,
    DeliveryFeeMode,
} from "@minute-menus/types";
import { UserTier } from "@minute-menus/types";
import type { Json } from "@minute-menus/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";
import { mapDailyOrders, rowsToCategoryTree } from "./mappers";
import { createRestaurantContext } from "./restaurantContext";

const log = createLogger("supabaseService");

export class SupabaseService {
    private readonly client: SupabaseClient<Database>;
    private readonly getRestaurantId: () => Promise<string>;
    private readonly generateUniqueSlug: (baseName: string, excludeRestaurantId?: string) => Promise<string>;

    constructor(client: SupabaseClient<Database>) {
        this.client = client;
        const ctx = createRestaurantContext(client);
        this.getRestaurantId = ctx.getRestaurantId;
        this.generateUniqueSlug = ctx.generateUniqueSlug;
    }

    // ── Menu ────────────────────────────────────────────────────────────────────

    async getMenu(restaurantId?: string): Promise<Category[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());

        const [{ data: cats, error: catErr }, { data: dishes, error: dishErr }] =
            await Promise.all([
                this.client.from("categories").select("*").eq("restaurant_id", rid).order("sort_order"),
                this.client.from("dishes").select("*").eq("restaurant_id", rid).order("sort_order"),
            ]);

        if (catErr) throw catErr;
        if (dishErr) throw dishErr;

        return rowsToCategoryTree(cats ?? [], dishes ?? []);
    }

    async saveMenu(categories: Category[]): Promise<Category[]> {
        const rid = await this.getRestaurantId();
        return persistMenu(this.client, rid, categories);
    }

    /**
     * Toggle the manual sold-out flag for a single dish.
     * Auto-saves directly to the DB without a full menu save.
     * Sends a sold-out email notification when enabling.
     */
    async toggleManualSoldOut(dishId: string, dishName: string, soldOut: boolean): Promise<void> {
        const { error } = await this.client
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
            const rid = await this.getRestaurantId();
            const [{ data: { user } }, { data: restaurant }] = await Promise.all([
                this.client.auth.getUser(),
                this.client.from("restaurants").select("name").eq("id", rid).single(),
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
            log.error("sendSoldOutEmail failed", { message: String(err) });
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

        const { data } = await this.client
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
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { error } = await this.client.from("watch_sessions").insert({
            dish_id: session.reelId,
            restaurant_id: rid,
            duration: session.duration,
            completed: session.completed,
        });
        if (error) log.error("Failed to record watch session", { message: error.message });
    }

    async recordOrder(
        items: OrderItem[],
        timeToOrder: number,
        restaurantId?: string,
        /** Dishes that became sold-out as a result of this order */
        newlySoldOutDishes?: Array<{ id: string; name: string }>,
    ): Promise<void> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const { error } = await this.client.from("orders").insert({
            restaurant_id: rid,
            items: items as unknown as Json,
            total_amount: totalAmount,
            time_to_order: timeToOrder,
            status: "pending",
        });
        if (error) log.error("Failed to record order", { message: error.message });

        // Update daily sold counts for each ordered dish (upsert per dish+date)
        const today = new Date().toISOString().slice(0, 10);
        await Promise.allSettled(
            items.map((item) =>
                this.client.rpc("increment_dish_stock", {
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
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data } = await this.client
            .from("subscriptions")
            .select("tier")
            .eq("restaurant_id", rid)
            .single();

        return data?.tier === "plus" ? UserTier.PLUS : UserTier.FREE;
    }

    async setTier(tier: UserTier, restaurantId?: string): Promise<void> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        await this.client
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
        const rid = restaurantId ?? (await this.getRestaurantId());
        const now = new Date();
        const since = sinceIso(timeWindow, now);

        const [{ data: sessions }, { data: orders }, { data: dishes }] =
            await Promise.all([
                this.client
                    .from("watch_sessions")
                    .select("*")
                    .eq("restaurant_id", rid)
                    .gte("created_at", since),
                this.client
                    .from("orders")
                    .select("*")
                    .eq("restaurant_id", rid)
                    .gte("created_at", since),
                this.client.from("dishes").select("id, name").eq("restaurant_id", rid),
            ]);

        return buildAggregatedMetrics(
            sessions ?? [],
            orders ?? [],
            dishes ?? [],
            timeWindow,
            now,
        );
    }

    // ── Analytics Report ─────────────────────────────────────────────────────────
    //
    // Builds a rich, structured snapshot from internal data only.
    // Source tables: watch_sessions, orders (JSONB items), customer_subscriptions,
    //                subscription_daily_orders, meal_plans, dishes.
    // No GA4 or external source needed — all restaurant KPIs live in Supabase.

    async buildAnalyticsReport(
        timeWindow: "24h" | "7d" | "30d" = "24h",
    ): Promise<AnalyticsReport> {
        const rid = await this.getRestaurantId();
        const now = new Date();
        const since = sinceIso(timeWindow, now);
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
            this.client
                .from("watch_sessions")
                .select("dish_id, duration, completed")
                .eq("restaurant_id", rid)
                .gte("created_at", since),
            this.client
                .from("orders")
                .select("items, total_amount, time_to_order")
                .eq("restaurant_id", rid)
                .gte("created_at", since),
            this.client
                .from("dishes")
                .select("id, name")
                .eq("restaurant_id", rid),
            this.client
                .from("customer_subscriptions")
                .select("id, status, plan_id, created_at")
                .eq("restaurant_id", rid),
            this.client
                .from("subscription_daily_orders")
                .select("status")
                .eq("restaurant_id", rid)
                .lte("delivery_date", todayStr),
            this.client
                .from("meal_plans")
                .select("id, name, price_monthly")
                .eq("restaurant_id", rid),
            this.client
                .from("restaurants")
                .select("currency")
                .eq("id", rid)
                .single(),
        ]);

        return buildAnalyticsReport({
            timeWindow,
            generatedAt: now.toISOString(),
            currency: (restaurant as { currency?: string } | null)?.currency ?? "USD",
            since,
            sessions: sessions ?? [],
            orders: orders ?? [],
            dishes: dishes ?? [],
            subscriptions: subs ?? [],
            subOrders: subOrders ?? [],
            plans: plans ?? [],
        });
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
        const { data: session } = await this.client.auth.getSession();
        const userId = session.session?.user.id;
        if (!userId) throw new Error("Not authenticated");

        // Check if restaurant already exists
        const { data: existing } = await this.client
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .single();

        if (existing) return existing.id;

        // Create new restaurant
        const { data: restaurant, error } = await this.client
            .from("restaurants")
            .insert({ owner_id: userId, name, slug })
            .select("id")
            .single();

        if (error || !restaurant)
            throw error ?? new Error("Failed to create restaurant");

        // Bootstrap a free subscription
        await this.client
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
        const { data, error } = await this.client
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
        const rid = await this.getRestaurantId();
        const { data, error } = await this.client
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
        const rid = await this.getRestaurantId();
        const { data, error } = await this.client
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
        const rid = await this.getRestaurantId();

        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(newSlug)) {
            throw new Error("Slug must be lowercase letters, numbers, and hyphens only");
        }

        // Check if slug is already taken
        const { data: existing } = await this.client
            .from("restaurants")
            .select("id")
            .eq("slug", newSlug)
            .neq("id", rid)
            .single();

        if (existing) {
            throw new Error("This URL is already taken");
        }

        const { error } = await this.client
            .from("restaurants")
            .update({ slug: newSlug })
            .eq("id", rid);

        if (error) throw error;
    }

    /**
     * Update restaurant name and optionally regenerate slug.
     */
    async updateRestaurantName(newName: string, regenerateSlug = true): Promise<{ name: string; slug: string }> {
        const rid = await this.getRestaurantId();

        const updateData: { name: string; slug?: string } = { name: newName };

        if (regenerateSlug) {
            updateData.slug = await this.generateUniqueSlug(newName, rid);
        }

        const { data, error } = await this.client
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
        const rid = await this.getRestaurantId();
        const { error } = await this.client
            .from("restaurants")
            .update({ currency })
            .eq("id", rid);
        if (error) throw error;
    }

    /**
     * Fix legacy UUID slugs by regenerating from restaurant name.
     */
    async fixLegacySlug(): Promise<string> {
        const rid = await this.getRestaurantId();
        const { data } = await this.client
            .from("restaurants")
            .select("name, slug")
            .eq("id", rid)
            .single();

        if (!data) throw new Error("Restaurant not found");

        // Check if current slug looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(data.slug)) {
            const newSlug = await this.generateUniqueSlug(data.name, rid);
            await this.client
                .from("restaurants")
                .update({ slug: newSlug })
                .eq("id", rid);
            return newSlug;
        }

        return data.slug;
    }

    // ── Meal Plan Management (owner) ────────────────────────────────────────────

    async getMealPlans(restaurantId?: string): Promise<MealPlan[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());

        const { data: plans, error: planErr } = await this.client
            .from("meal_plans")
            .select("*")
            .eq("restaurant_id", rid)
            .order("created_at");

        if (planErr) throw planErr;

        const planIds = (plans ?? []).map((p) => p.id);
        const { data: links } = planIds.length > 0
            ? await this.client.from("meal_plan_dishes").select("plan_id, dish_id").in("plan_id", planIds)
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
        plan: Omit<MealPlan, "id" | "restaurantId" | "createdAt">,
        planId?: string,
    ): Promise<string> {
        const rid = await this.getRestaurantId();
        const id = await upsertMealPlanRow(
            this.client,
            rid,
            {
                name: plan.name,
                description: plan.description,
                priceMonthly: plan.priceMonthly,
                deliveryFee: plan.deliveryFee,
                isActive: plan.isActive,
            },
            planId,
        );
        await syncMealPlanDishLinks(this.client, id, plan.dishIds);
        return id;
    }

    async deleteMealPlan(planId: string): Promise<void> {
        const { error } = await this.client.from("meal_plans").delete().eq("id", planId);
        if (error) throw error;
    }

    // ── Owner: Subscription Operations ─────────────────────────────────────────

    async getCustomerSubscriptions(restaurantId?: string): Promise<CustomerSubscription[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
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
            deliveryType: s.delivery_type as SubDeliveryType,
            deliveryFeeMode: ((s as unknown as Record<string, unknown>).delivery_fee_mode ?? "cash_on_delivery") as DeliveryFeeMode,
            timeSlot: s.time_slot as TimeSlot,
            status: s.status as SubStatus,
            pauseUntil: s.pause_until ?? undefined,
            pausedDaysUsed: s.paused_days_used,
            startDate: s.start_date,
            endDate: s.end_date,
            createdAt: s.created_at,
            rotationDishIds: ((s as unknown as Record<string, unknown>).rotation_dish_ids ?? []) as string[],
        }));
    }

    async getCustomerDirectory(restaurantId?: string): Promise<CustomerDirectoryEntry[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());

        const [{ data: subs, error: subErr }, { data: orders }] = await Promise.all([
            this.client
                .from("customer_subscriptions")
                .select("id, customer_name, phone, email, status, created_at, meal_plans(name)")
                .eq("restaurant_id", rid)
                .order("created_at", { ascending: false }),
            this.client
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
            subStatus: s.status as SubStatus,
            totalOrders: statsMap.get(s.id)?.total ?? 0,
            deliveredOrders: statsMap.get(s.id)?.delivered ?? 0,
            lastActiveDate: statsMap.get(s.id)?.lastDate ?? null,
            joinedAt: s.created_at,
        }));
    }

    async getTomorrowsOrders(restaurantId?: string): Promise<DailyOrder[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const date = tomorrow.toISOString().slice(0, 10);

        const { data, error } = await this.client
            .from("subscription_daily_orders")
            .select("*")
            .eq("restaurant_id", rid)
            .eq("delivery_date", date)
            .neq("status", "cancelled");

        if (error) throw error;
        return mapDailyOrders(data ?? []);
    }

    async cancelDailyOrder(orderId: string, reason: string): Promise<void> {
        const { data, error } = await this.client
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
            const sub = await this.client
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
            }).catch((err) => log.error("cancel notification email failed", { message: String(err) }));
        }
    }

    async getDeliveryTickets(restaurantId?: string): Promise<DeliveryTicket[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
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
            reason: t.reason as TicketReason,
            notes: t.notes ?? undefined,
            status: t.status as TicketStatus,
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
        const { error: ticketErr } = await this.client
            .from("delivery_tickets")
            .update({ status: "resolved" })
            .eq("id", ticketId);
        if (ticketErr) throw ticketErr;

        const { error: adjErr } = await this.client
            .from("delivery_adjustments")
            .insert({ ticket_id: ticketId, notes });
        if (adjErr) throw adjErr;
    }

    async getRefundRequests(restaurantId?: string): Promise<RefundRequest[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
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
            status: r.status as RefundStatus,
            restaurantNotes: r.restaurant_notes ?? undefined,
            createdAt: r.created_at,
            processedAt: r.processed_at ?? undefined,
        }));
    }

    async updateRefundStatus(
        refundId: string,
        status: RefundStatus,
        notes?: string,
    ): Promise<void> {
        const update: Record<string, unknown> = { status };
        if (notes) update.restaurant_notes = notes;
        if (status === "processed") update.processed_at = new Date().toISOString();

        const { error } = await this.client
            .from("subscription_refund_requests")
            .update(update)
            .eq("id", refundId);
        if (error) throw error;
    }

    // ── Customer: Subscription Operations (no auth) ─────────────────────────────

    async getCustomerSubscription(
        phone: string,
        restaurantId: string,
    ): Promise<CustomerSubscription | null> {
        const { data } = await this.client
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
            deliveryType: data.delivery_type as SubDeliveryType,
            deliveryFeeMode: ((data as unknown as Record<string, unknown>).delivery_fee_mode ?? "cash_on_delivery") as DeliveryFeeMode,
            timeSlot: data.time_slot as TimeSlot,
            status: data.status as SubStatus,
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
        deliveryType: SubDeliveryType;
        deliveryFeeMode: DeliveryFeeMode;
        timeSlot: TimeSlot;
        rotationDishIds?: string[];
    }): Promise<string> {
        const startDate = new Date().toISOString().slice(0, 10);
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const endDate = end.toISOString().slice(0, 10);

        const { data, error } = await this.client
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
        const { error } = await this.client.rpc("upsert_daily_selection", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_delivery_date: deliveryDate,
            p_dish_id: dishId,
        });
        if (error) throw new Error(error.message);
    }

    async pauseSubscription(phone: string, restaurantId: string, pauseUntil: string): Promise<void> {
        const { error } = await this.client.rpc("update_subscription_status", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_new_status: "paused",
            p_pause_until: pauseUntil,
        });
        if (error) throw new Error(error.message);
    }

    async resumeSubscription(phone: string, restaurantId: string): Promise<void> {
        const { error } = await this.client.rpc("update_subscription_status", {
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
        const { error } = await this.client.rpc("update_subscription_status", {
            p_phone: phone,
            p_restaurant_id: restaurantId,
            p_new_status: "cancelled",
            p_cancel_reason: reason,
        });
        if (error) throw new Error(error.message);
    }

    async getCustomerDailyOrders(subscriptionId: string, fromDate: string): Promise<DailyOrder[]> {
        const { data, error } = await this.client
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
        reason: TicketReason;
        notes?: string;
    }): Promise<void> {
        const { error } = await this.client.from("delivery_tickets").insert({
            subscription_id: params.subscriptionId,
            daily_order_id: params.dailyOrderId,
            restaurant_id: params.restaurantId,
            reason: params.reason,
            notes: params.notes ?? null,
        });
        if (error) throw error;
    }

    // ─── Customer Auth ────────────────────────────────────────────────────────

    /**
     * Sign up a new customer with email and password.
     * Sends OTP verification email automatically.
     */
    async customerSignUp(email: string, password: string): Promise<{ userId: string; needsVerification: boolean }> {
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
            },
        });
        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        // Create customer profile (email not yet verified)
        await this.client.from("customer_profiles").insert({
            user_id: data.user.id,
            email,
            email_verified: false,
        });

        return { userId: data.user.id, needsVerification: true };
    }

    /**
     * Sign in existing customer with email and password.
     */
    async customerSignIn(email: string, password: string): Promise<{ userId: string; profile: CustomerProfile | null }> {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const profile = await this.getCustomerProfile(data.user.id);
        return { userId: data.user.id, profile };
    }

    /**
     * Sign in (or sign up) with Google OAuth.
     */
    async customerGoogleSignIn(): Promise<void> {
        const { error } = await this.client.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.href,
            },
        });
        if (error) throw error;
    }

    /**
     * Verify email with OTP code.
     */
    async verifyEmailOTP(email: string, token: string): Promise<boolean> {
        const { data, error } = await this.client.auth.verifyOtp({
            email,
            token,
            type: "email",
        });
        if (error) throw error;
        if (!data.user) return false;

        // Mark profile as verified
        await this.client.from("customer_profiles")
            .update({ email_verified: true })
            .eq("user_id", data.user.id);

        return true;
    }

    /**
     * Resend OTP verification email.
     */
    async resendOTP(email: string): Promise<void> {
        const { error } = await this.client.auth.resend({
            type: "signup",
            email,
        });
        if (error) throw error;
    }

    /**
     * Get current authenticated customer user.
     */
    async getCurrentCustomer(): Promise<{ userId: string; email: string } | null> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return null;
        return { userId: user.id, email: user.email ?? "" };
    }

    /**
     * Sign out customer.
     */
    async customerSignOut(): Promise<void> {
        await this.client.auth.signOut();
    }

    /**
     * Get customer profile by user ID.
     */
    async getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
        const { data, error } = await this.client
            .from("customer_profiles")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        if (!data) return null;

        return {
            id: data.id,
            userId: data.user_id,
            email: data.email,
            emailVerified: data.email_verified,
            phone: data.phone ?? undefined,
            name: data.name ?? undefined,
            addressLine1: data.address_line1 ?? undefined,
            addressLine2: data.address_line2 ?? undefined,
            street: data.street ?? undefined,
            area: data.area ?? undefined,
            landmark: data.landmark ?? undefined,
            city: data.city ?? undefined,
            state: data.state ?? undefined,
            pincode: data.pincode ?? undefined,
            lat: data.lat ? Number(data.lat) : undefined,
            lng: data.lng ? Number(data.lng) : undefined,
            formattedAddress: data.formatted_address ?? undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    /**
     * Update customer profile (phone, name, address).
     */
    async updateCustomerProfile(userId: string, updates: Partial<CustomerAddress> & { phone?: string; name?: string }): Promise<void> {
        const { error } = await this.client.from("customer_profiles")
            .update({
                phone: updates.phone,
                name: updates.name,
                address_line1: updates.addressLine1,
                address_line2: updates.addressLine2,
                street: updates.street,
                area: updates.area,
                landmark: updates.landmark,
                city: updates.city,
                state: updates.state,
                pincode: updates.pincode,
                lat: updates.lat,
                lng: updates.lng,
                formatted_address: updates.formattedAddress,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

        if (error) throw error;
    }

    /**
     * Ensure customer profile exists after Google OAuth callback.
     * Creates profile if not exists, otherwise returns existing.
     */
    async ensureCustomerProfile(): Promise<CustomerProfile | null> {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) return null;

        // Check if profile exists
        let profile = await this.getCustomerProfile(user.id);
        if (profile) return profile;

        // Create new profile for OAuth user (email is already verified)
        const { error } = await this.client.from("customer_profiles").insert({
            user_id: user.id,
            email: user.email ?? "",
            email_verified: true, // OAuth users are verified
        });
        if (error && error.code !== "23505") throw error; // ignore duplicate key

        return this.getCustomerProfile(user.id);
    }

    /**
     * Check if customer profile has required fields for checkout.
     */
    isProfileComplete(profile: CustomerProfile | null): boolean {
        if (!profile) return false;
        return !!(
            profile.emailVerified &&
            profile.phone &&
            profile.name &&
            profile.addressLine1 &&
            profile.addressLine2 &&
            profile.street &&
            profile.area &&
            profile.city &&
            profile.pincode
        );
    }

    // ── Menu costing ──────────────────────────────────────────────────────────

    private toUnitCost(amount: number, quantity: number, unit: PurchaseUnit): number {
        const base = unit === "kg" || unit === "l" ? quantity * 1000 : quantity;
        if (base <= 0) return 0;
        return amount / base;
    }

    /** Overhead for a given month (first-of-month YYYY-MM-DD), or null. */
    async getOverhead(month: string, restaurantId?: string): Promise<RestaurantOverhead | null> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
            .from("restaurant_overhead")
            .select("*")
            .eq("restaurant_id", rid)
            .eq("month", month)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            id: data.id,
            restaurantId: data.restaurant_id,
            month: data.month,
            rent: Number(data.rent),
            wages: Number(data.wages),
            electricity: Number(data.electricity),
            gas: Number(data.gas),
            internet: Number(data.internet),
            packing: Number(data.packing),
            other: Number(data.other),
            expectedOrders: data.expected_orders,
        };
    }

    async saveOverhead(overhead: RestaurantOverhead): Promise<void> {
        const rid = overhead.restaurantId ?? (await this.getRestaurantId());
        const { error } = await this.client.from("restaurant_overhead").upsert(
            {
                restaurant_id: rid,
                month: overhead.month,
                rent: overhead.rent,
                wages: overhead.wages,
                electricity: overhead.electricity,
                gas: overhead.gas,
                internet: overhead.internet,
                packing: overhead.packing,
                other: overhead.other,
                expected_orders: overhead.expectedOrders ?? null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "restaurant_id,month" },
        );
        if (error) throw error;
    }

    /** Invoices for a given month, most recent first. */
    async getInvoices(month: string, restaurantId?: string): Promise<IngredientInvoice[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
            .from("ingredient_invoices")
            .select("*")
            .eq("restaurant_id", rid)
            .eq("month", month)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row) => ({
            id: row.id,
            restaurantId: row.restaurant_id,
            month: row.month,
            fileUrl: row.file_url,
            fileName: row.file_name,
            totalAmount: Number(row.total_amount),
            lineItems: (row.line_items as unknown as InvoiceLineItem[]) ?? [],
            createdAt: row.created_at,
        }));
    }

    async saveInvoice(
        month: string,
        lineItems: InvoiceLineItem[],
        fileName?: string,
        fileUrl?: string,
        restaurantId?: string,
    ): Promise<string> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const total = Math.round(lineItems.reduce((s, i) => s + i.amount, 0) * 100) / 100;
        const { data, error } = await this.client
            .from("ingredient_invoices")
            .insert({
                restaurant_id: rid,
                month,
                file_url: fileUrl ?? null,
                file_name: fileName ?? null,
                total_amount: total,
                line_items: lineItems as unknown as Json,
            })
            .select("id")
            .single();
        if (error) throw error;
        return data.id;
    }

    /** Ingredient library for the restaurant. */
    async getIngredients(restaurantId?: string): Promise<Ingredient[]> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { data, error } = await this.client
            .from("ingredients")
            .select("*")
            .eq("restaurant_id", rid)
            .order("name");
        if (error) throw error;
        return (data ?? []).map((row) => ({
            id: row.id,
            restaurantId: row.restaurant_id,
            name: row.name,
            purchaseUnit: row.purchase_unit,
            purchaseQuantity: Number(row.purchase_quantity),
            purchaseAmount: Number(row.purchase_amount),
            unitCost: Number(row.unit_cost),
            source: row.source ?? "manual",
            sourceInvoiceId: row.source_invoice_id,
        }));
    }

    /** Upsert an ingredient by name; unit cost is derived from purchase amount/quantity. */
    async upsertIngredient(
        input: {
            name: string;
            purchaseUnit: PurchaseUnit;
            purchaseQuantity: number;
            purchaseAmount: number;
            source?: "invoice" | "manual";
            sourceInvoiceId?: string | null;
        },
        restaurantId?: string,
    ): Promise<void> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const unitCost = this.toUnitCost(input.purchaseAmount, input.purchaseQuantity, input.purchaseUnit);
        const { error } = await this.client.from("ingredients").upsert(
            {
                restaurant_id: rid,
                name: input.name.trim(),
                purchase_unit: input.purchaseUnit,
                purchase_quantity: input.purchaseQuantity,
                purchase_amount: input.purchaseAmount,
                unit_cost: unitCost,
                source: input.source ?? (input.sourceInvoiceId ? "invoice" : "manual"),
                source_invoice_id: input.sourceInvoiceId ?? null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "restaurant_id,name" },
        );
        if (error) throw error;
    }

    async deleteIngredient(ingredientId: string): Promise<void> {
        const { error } = await this.client.from("ingredients").delete().eq("id", ingredientId);
        if (error) throw error;
    }

    /** Recipe lines for a dish, joined with ingredient name + unit cost. */
    async getRecipeLines(dishId: string): Promise<DishRecipeLine[]> {
        const { data, error } = await this.client
            .from("dish_recipe_lines")
            .select("id, dish_id, ingredient_id, quantity, ingredients(name, unit_cost)")
            .eq("dish_id", dishId);
        if (error) throw error;
        return (data ?? []).map((row) => {
            const ing = row.ingredients as unknown as { name: string; unit_cost: number } | null;
            return {
                id: row.id,
                dishId: row.dish_id,
                ingredientId: row.ingredient_id,
                ingredientName: ing?.name,
                unitCost: ing ? Number(ing.unit_cost) : undefined,
                quantity: Number(row.quantity),
            };
        });
    }

    /** Replace a dish's recipe with the given lines, then cache cost per plate. */
    async saveRecipeLines(
        dishId: string,
        lines: Array<{ ingredientId: string; quantity: number }>,
        costPerPlate: number,
        restaurantId?: string,
    ): Promise<void> {
        const rid = restaurantId ?? (await this.getRestaurantId());
        const { error: delErr } = await this.client
            .from("dish_recipe_lines")
            .delete()
            .eq("dish_id", dishId);
        if (delErr) throw delErr;

        if (lines.length > 0) {
            const { error: insErr } = await this.client.from("dish_recipe_lines").insert(
                lines.map((l) => ({
                    restaurant_id: rid,
                    dish_id: dishId,
                    ingredient_id: l.ingredientId,
                    quantity: l.quantity,
                })),
            );
            if (insErr) throw insErr;
        }

        const { error: costErr } = await this.client
            .from("dishes")
            .update({ cost_per_plate: costPerPlate })
            .eq("id", dishId);
        if (costErr) throw costErr;
    }

    /** Set a dish's selling price directly (used by costing "apply suggested price"). */
    async updateDishPrice(dishId: string, price: number): Promise<void> {
        const { error } = await this.client.from("dishes").update({ price }).eq("id", dishId);
        if (error) throw error;
    }

    // ── Staff time tracking ───────────────────────────────────────────────────

    async getStaffClockStatus(badgeToken: string) {
        const { getStaffClockStatus } = await import("./teamTime");
        return getStaffClockStatus(this.client, badgeToken);
    }

    async toggleStaffClock(badgeToken: string) {
        const { toggleStaffClock } = await import("./teamTime");
        return toggleStaffClock(this.client, badgeToken);
    }

    async listStaffBadges(restaurantId?: string) {
        const { listStaffBadges } = await import("./teamTime");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return listStaffBadges(this.client, rid);
    }

    async listRestaurantStaff(restaurantId?: string) {
        const { listRestaurantStaff } = await import("./teamTime");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return listRestaurantStaff(this.client, rid);
    }

    async createStaffBadge(label: string, restaurantId?: string) {
        const { createStaffBadge } = await import("./teamTime");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return createStaffBadge(this.client, rid, label);
    }

    async upsertRestaurantStaff(input: { id?: string; name: string; phone?: string | null; active?: boolean }) {
        const { upsertRestaurantStaff } = await import("./teamTime");
        const rid = await this.getRestaurantId();
        return upsertRestaurantStaff(this.client, rid, input);
    }

    async assignBadgeToStaff(badgeId: string, staffId: string | null) {
        const { assignBadgeToStaff } = await import("./teamTime");
        return assignBadgeToStaff(this.client, badgeId, staffId);
    }

    async deactivateRestaurantStaff(staffId: string) {
        const { deactivateRestaurantStaff } = await import("./teamTime");
        return deactivateRestaurantStaff(this.client, staffId);
    }

    async getWeeklyStaffHours(weekStartIso: string, restaurantId?: string) {
        const { getWeeklyStaffHours } = await import("./teamTime");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return getWeeklyStaffHours(this.client, rid, weekStartIso);
    }

    async listTodaySalesInvoices(restaurantId?: string) {
        const { listTodaySalesInvoices } = await import("./salesInvoices");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return listTodaySalesInvoices(this.client, rid);
    }

    async getTodaySalesSummary(restaurantId?: string) {
        const { getTodaySalesSummary } = await import("./salesInvoices");
        const rid = restaurantId ?? (await this.getRestaurantId());
        return getTodaySalesSummary(this.client, rid);
    }

    async getOwnerAiSettings() {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { getOwnerAiSettings } = await import("./ownerSettings");
        return getOwnerAiSettings(this.client, user.id);
    }

    async saveOwnerAnthropicKey(apiKey: string) {
        const { data: { user } } = await this.client.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { upsertOwnerAnthropicKey } = await import("./ownerSettings");
        return upsertOwnerAnthropicKey(this.client, user.id, apiKey);
    }
}
