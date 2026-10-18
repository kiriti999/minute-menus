/**
 * POST /api/create-razorpay-order
 * Creates a Razorpay order for cart checkout or meal-plan subscription.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";
import {
    calculateTermMealPlanTax,
    parseCartLineIds,
    priceCartLines,
    type CartLineInput,
    type PricedCartLine,
} from "../lib/server/workspace/currency.js";
import {
    getMealPlanPricingOption,
    normalizeMealPlanPricingOptions,
    restaurantDate,
    type RestaurantAvailability,
} from "../lib/server/workspace/types.js";

// ── Inlined helpers (Vercel cannot resolve lib/server imports for this route) ──

// Runtime logic is inlined: Vercel functions cannot load value imports from the
// TypeScript-source workspace package. Keep in sync with getAvailabilityStatus in @minute-menus/types.
const DEFAULT_SLOT = [{ start: "09:00", end: "22:00" }];
const DEFAULT_OPERATING_HOURS: RestaurantAvailability["operatingHours"] = {
  0: DEFAULT_SLOT, 1: DEFAULT_SLOT, 2: DEFAULT_SLOT, 3: DEFAULT_SLOT, 4: DEFAULT_SLOT, 5: DEFAULT_SLOT, 6: DEFAULT_SLOT,
};

const toMinutes = (value: string): number => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

function getAvailabilityStatus(availability: RestaurantAvailability, now = new Date()): { open: boolean; message: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: availability.timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.find((part) => part.type === "weekday")?.value ?? "Sun",
  );
  const current =
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const hours = availability.operatingHours;
  const openToday = (hours[weekday] ?? []).some((slot) => {
    const start = toMinutes(slot.start);
    const end = toMinutes(slot.end);
    return end > start && current >= start && current < end;
  });
  const openFromYesterday = (hours[(weekday + 6) % 7] ?? []).some((slot) => {
    const end = toMinutes(slot.end);
    return end < toMinutes(slot.start) && current < end;
  });
  if (!availability.deliveryEnabled) return { open: false, message: "Ordering is temporarily unavailable." };
  return openToday || openFromYesterday
    ? { open: true, message: "" }
    : { open: false, message: "The kitchen is currently closed." };
}

async function getRestaurantAvailability(
  admin: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantAvailability> {
  const { data, error } = await admin
    .from("restaurants")
    .select("timezone, delivery_enabled, operating_hours")
    .eq("id", restaurantId)
    .single();
  if (error || !data) throw new Error("Restaurant not found");
  return {
    timezone: data.timezone || "Asia/Kolkata",
    deliveryEnabled: data.delivery_enabled ?? true,
    operatingHours: (data.operating_hours as RestaurantAvailability["operatingHours"]) ?? DEFAULT_OPERATING_HOURS,
  };
}

async function assertRestaurantCanAcceptOrders(
  admin: SupabaseClient,
  restaurantId: string,
): Promise<void> {
  const status = getAvailabilityStatus(await getRestaurantAvailability(admin, restaurantId));
  if (!status.open) throw new Error(status.message);
}


// ── Supabase admin (inline — no lib imports) ─────────────────────────────────
let adminClient: SupabaseClient | null = null;

const requireSupabaseAdmin = (): SupabaseClient => {
    if (adminClient) return adminClient;
    const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) throw new Error("Server is not configured (missing Supabase env vars)");
    adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return adminClient;
};

// ── Razorpay helpers (inline) ───────────────────────────────────────────────
const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
};

const createRazorpayOrder = async (input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
}) => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");

    const amountSmallest = Math.round(input.amount * 100);
    const currency = input.currency.toUpperCase();
    const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
    const order = await razorpay.orders.create({
        amount: amountSmallest,
        currency,
        receipt: input.receipt,
        notes: input.notes,
    });

    return { orderId: order.id, amount: amountSmallest, currency, keyId: creds.keyId };
};

const INDIAN_RESTAURANT_GST_RATE = 0.05;
const round2 = (value: number): number => Math.round(value * 100) / 100;

type CartLine = { price: number; quantity: number };

const computeCartTotals = (items: CartLine[], currency: string) => {
    const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    if (currency.toUpperCase() !== "INR") {
        return { subtotal, gstAmount: 0, total: subtotal };
    }
    const gstAmount = round2(
        items.reduce(
            (sum, item) => sum + round2(item.price * item.quantity * INDIAN_RESTAURANT_GST_RATE),
            0,
        ),
    );
    return { subtotal, gstAmount, total: round2(subtotal + gstAmount) };
};

const getErrorDetail = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    const rz = err as { error?: { description?: string }; statusCode?: number; message?: string };
    return rz?.error?.description ?? rz?.message ?? JSON.stringify(err);
};

// Keep in sync with priceCartFromMenu in api/confirm-payment.ts — both price the
// cart from the database so the amount charged never comes from the browser.
const priceCartFromMenu = async (
    admin: SupabaseClient,
    restaurantId: string,
    lines: CartLineInput[],
): Promise<{ items: PricedCartLine[]; currency: string }> => {
    const dishIds = [...new Set(lines.map((line) => parseCartLineIds(line).dishId))];
    const [restaurant, dishes, categories, stock] = await Promise.all([
        admin.from("restaurants").select("currency").eq("id", restaurantId).single(),
        admin
            .from("dishes")
            .select("id, name, price, variants, discount_percent, category_id, is_active, manual_sold_out, stock_quantity")
            .eq("restaurant_id", restaurantId)
            .in("id", dishIds),
        admin.from("categories").select("id, discount_percent").eq("restaurant_id", restaurantId),
        admin
            .from("dish_stock_daily")
            .select("dish_id, quantity_sold")
            .eq("restaurant_id", restaurantId)
            .eq("sold_date", restaurantDate()),
    ]);
    const loadError = restaurant.error ?? dishes.error ?? categories.error ?? stock.error;
    if (loadError || !restaurant.data) throw new Error(`Menu lookup failed: ${loadError?.message ?? "restaurant missing"}`);
    return {
        items: priceCartLines(
            lines,
            dishes.data ?? [],
            categories.data ?? [],
            new Map((stock.data ?? []).map((row) => [row.dish_id as string, Number(row.quantity_sold)])),
        ),
        currency: String(restaurant.data.currency || "INR").toUpperCase(),
    };
};

// ── Handlers ────────────────────────────────────────────────────────────────
const handleCartOrder = async (req: VercelRequest, res: VercelResponse) => {
    const { items: lines, restaurantId, customerName } = req.body as {
        items?: CartLineInput[];
        restaurantId?: string;
        customerName?: string;
    };

    if (!Array.isArray(lines) || !lines.length || !restaurantId || !customerName) {
        return res.status(400).json({ error: "items, restaurantId and customerName are required" });
    }

    const admin = requireSupabaseAdmin();
    let priced: Awaited<ReturnType<typeof priceCartFromMenu>>;
    try {
        priced = await priceCartFromMenu(admin, restaurantId, lines);
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-razorpay-order] cart pricing failed", msg);
        const isLookupFailure = msg.startsWith("Menu lookup failed");
        return res.status(isLookupFailure ? 500 : 400).json({ error: isLookupFailure ? "Could not load the menu" : msg });
    }

    const { currency } = priced;
    const { subtotal, gstAmount, total } = computeCartTotals(priced.items, currency);
    if (total <= 0) {
        return res.status(400).json({ error: "Order total must be greater than zero" });
    }

    try {
        await assertRestaurantCanAcceptOrders(admin, restaurantId);
        const result = await createRazorpayOrder({
            amount: total,
            currency,
            receipt: `order_${restaurantId.slice(0, 8)}_${Date.now()}`,
            notes: {
                restaurantId,
                customerName,
                subtotal: String(subtotal),
                gstAmount: String(gstAmount),
            },
        });
        return res.status(200).json({ ...result, subtotal, gstAmount, total });
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-razorpay-order] cart failed", msg);
        const status = msg.includes("closed") || msg.includes("unavailable") ? 409 : msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

// Keep in sync with phone_key() in supabase/schema.sql and api/confirm-payment.ts.
const phoneKey = (phone: string | null | undefined): string =>
    (phone ?? "").replace(/\D/g, "").slice(-10);

const getSignedInUserId = async (req: VercelRequest): Promise<string | null> => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (!token) return null;
    const { data, error } = await requireSupabaseAdmin().auth.getUser(token);
    return error || !data.user ? null : data.user.id;
};

/** An active plan already held by this account or this phone (any format). */
const findActiveSubscription = async (restaurantId: string, userId: string, phone: string) => {
    const { data, error } = await requireSupabaseAdmin()
        .from("customer_subscriptions")
        .select("id, customer_user_id, phone")
        .eq("restaurant_id", restaurantId)
        .eq("status", "active")
        .gte("end_date", restaurantDate());
    if (error) throw new Error(error.message);
    return (data ?? []).find(
        (sub) => sub.customer_user_id === userId || phoneKey(sub.phone) === phoneKey(phone),
    ) ?? null;
};

const handleSubscriptionOrder = async (req: VercelRequest, res: VercelResponse) => {
    const {
        planId, restaurantId, phone, deliveryFeeMode, deliveryType,
        durationDays, mealsPerDay,
    } = req.body as {
        planId?: string;
        restaurantId?: string;
        phone?: string;
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        deliveryType?: "delivery" | "pickup";
        durationDays?: number;
        mealsPerDay?: number;
    };

    if (
        !planId || !restaurantId || !phone ||
        !["delivery", "pickup"].includes(deliveryType ?? "") ||
        // No cash on delivery: delivery fees are always paid upfront online.
        deliveryFeeMode !== "upfront" ||
        typeof durationDays !== "number" || !Number.isInteger(durationDays) || durationDays < 1 ||
        typeof mealsPerDay !== "number" || !Number.isInteger(mealsPerDay)
    ) {
        return res.status(400).json({ error: "A valid plan, phone, term, meal count and delivery choice are required" });
    }

    // Plans are tied to the buyer's account so only they can manage them later.
    const userId = await getSignedInUserId(req);
    if (!userId) return res.status(401).json({ error: "Please sign in to buy a meal plan." });

    // Reject before payment — confirm-subscription would otherwise capture the
    // payment and then refuse to create a second active subscription.
    try {
        if (await findActiveSubscription(restaurantId, userId, phone)) {
            return res.status(409).json({ error: "An active subscription already exists for this phone number" });
        }
    } catch (e) {
        console.error("[create-razorpay-order] active subscription lookup failed", getErrorDetail(e));
        return res.status(500).json({ error: "Failed to check existing subscription" });
    }

    const { data: plan, error } = await requireSupabaseAdmin()
        .from("meal_plans")
        .select("price_monthly, delivery_fee, pricing_options, name, restaurants(currency)")
        .eq("id", planId)
        .eq("restaurant_id", restaurantId)
        .single();

    if (error || !plan) {
        return res.status(404).json({ error: "Plan not found" });
    }
    // Plan prices are in the restaurant's menu currency — never the browser's choice.
    const restaurant = plan.restaurants as unknown as { currency?: string } | null;
    const currency = String(restaurant?.currency || "INR").toUpperCase();

    const pricing = getMealPlanPricingOption(
        normalizeMealPlanPricingOptions(plan.pricing_options, Number(plan.price_monthly) / 30),
        durationDays,
        mealsPerDay,
    );
    if (!pricing) {
        return res.status(400).json({ error: "This term and meal count are not available for the selected plan" });
    }

    const breakdown = calculateTermMealPlanTax(
        pricing.pricePerMeal,
        durationDays,
        mealsPerDay,
        Number(plan.delivery_fee),
        deliveryType === "delivery" && deliveryFeeMode === "upfront",
        currency,
    );

    try {
        const result = await createRazorpayOrder({
            amount: breakdown.total,
            currency,
            receipt: `sub_${planId.slice(0, 8)}_${Date.now()}`,
            notes: {
                planId,
                restaurantId,
                planName: plan.name,
                phone,
                customerUserId: userId,
                durationDays: String(durationDays),
                mealsPerDay: String(mealsPerDay),
                subtotal: String(breakdown.subtotal),
                gstAmount: String(breakdown.gstAmount),
            },
        });
        return res.status(200).json({
            ...result,
            subtotal: breakdown.subtotal,
            gstAmount: breakdown.gstAmount,
            total: breakdown.total,
            pricePerMeal: pricing.pricePerMeal,
        });
    } catch (e) {
        const msg = getErrorDetail(e);
        console.error("[create-razorpay-order] subscription failed", msg);
        const status = msg === "Razorpay not configured" ? 500 : 502;
        return res.status(status).json({ error: "Failed to create payment order", detail: msg });
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const body = req.body as { planId?: string };
        if (body?.planId) await handleSubscriptionOrder(req, res);
        else await handleCartOrder(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error("[create-razorpay-order] unhandled", message);
        if (!res.writableEnded) {
            res.status(500).json({ error: "create-razorpay-order failed", detail: message });
        }
    }
};
