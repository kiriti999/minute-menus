/**
 * POST /api/confirm-payment?action=confirm-order|confirm-subscription|confirm-plus|verify|send-phone-otp|verify-phone-otp
 * Confirms a Razorpay payment and records the order/subscription server-side.
 */

import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { RestaurantAvailability } from "@minute-menus/types";

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


const log = { warn: (...a: unknown[]) => console.warn("[telegram]", ...a), error: (...a: unknown[]) => console.error("[telegram]", ...a), info: (...a: unknown[]) => console.info("[telegram]", ...a) };

type OrderItem = {
    name: string;
    quantity: number;
    variantName?: string;
};

type OrderAlert = {
    restaurantId: string;
    orderId: string;
    items: OrderItem[];
    total: number;
    currency: string;
};

const buildOrderMessage = (restaurantName: string, alert: OrderAlert): string => {
    const itemLines = alert.items
        .map((item) => `- ${item.quantity} x ${item.name}${item.variantName ? ` — ${item.variantName.toUpperCase()}` : ""}`)
        .join("\n");
    return [
        `New paid order for ${restaurantName}`,
        `Order #${alert.orderId.slice(0, 8)}`,
        itemLines,
        `Total: ${alert.currency.toUpperCase()} ${alert.total.toFixed(2)}`,
        "Status: Pending",
    ].join("\n");
};

// Group/channel IDs are "-100…"; owners often paste them without the minus sign.
const normalizeTelegramChatId = (raw: string): string => {
    const id = raw.trim();
    return /^100\d{10}$/.test(id) ? `-${id}` : id;
};

const sendTelegramOrderAlert = async (
    admin: SupabaseClient,
    alert: OrderAlert,
): Promise<void> => {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) {
        log.warn("TELEGRAM_BOT_TOKEN is not configured");
        return;
    }

    try {
        const { data: restaurant, error: restaurantError } = await admin
            .from("restaurants")
            .select("name, owner_id")
            .eq("id", alert.restaurantId)
            .single();
        if (restaurantError) throw restaurantError;

        const { data: settings, error: settingsError } = await admin
            .from("owner_settings")
            .select("telegram_chat_id")
            .eq("owner_id", restaurant.owner_id)
            .maybeSingle();
        if (settingsError) throw settingsError;
        if (!settings?.telegram_chat_id) {
            log.warn("Telegram chat ID is not configured", { restaurantId: alert.restaurantId });
            return;
        }

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                chat_id: normalizeTelegramChatId(settings.telegram_chat_id),
                text: buildOrderMessage(restaurant.name, alert),
            }),
        });
        if (!response.ok) {
            throw new Error(`Telegram returned HTTP ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        log.error("Failed to send order alert", {
            restaurantId: alert.restaurantId,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};


type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Supabase admin (inline) ───────────────────────────────────────────────────
let adminClient: SupabaseClient | null = null;

const requireSupabaseAdmin = (): SupabaseClient => {
    if (adminClient) return adminClient;
    const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!url || !key) throw new Error("Server is not configured (missing Supabase env vars)");
    adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    return adminClient;
};

// ── Razorpay signature verification (inline) ──────────────────────────────────
const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
};

const safeVerifyRazorpaySignature = (input: {
    orderId: string;
    paymentId: string;
    signature: string;
}): { verified: boolean; status: 200 | 400 | 500 | 502; error: string } => {
    try {
        const creds = getRazorpayCredentials();
        if (!creds) throw new Error("Razorpay not configured");

        const expected = crypto
            .createHmac("sha256", creds.keySecret)
            .update(`${input.orderId}|${input.paymentId}`)
            .digest("hex");

        const expectedBuf = Buffer.from(expected, "utf8");
        const actualBuf = Buffer.from(input.signature, "utf8");
        const match =
            expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

        if (!match) return { verified: false, status: 400, error: "Payment signature mismatch" };
        return { verified: true, status: 200, error: "" };
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return {
            verified: false,
            status: message === "Razorpay not configured" ? 500 : 502,
            error: "Failed to verify payment",
        };
    }
};

const normalizeAction = (action: string | string[] | undefined): string => {
    if (!action) return "";
    return Array.isArray(action) ? action[0] ?? "" : action;
};

const getErrorDetail = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

const INDIAN_RESTAURANT_GST_RATE = 0.05;
const round2 = (value: number): number => Math.round(value * 100) / 100;

type OrderItemInput = {
    dishId: string;
    quantity: number;
    name: string;
    price: number;
    variantName?: string;
};

const computeCartTotals = (items: Array<{ price: number; quantity: number }>, currency: string) => {
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

const enrichItemsWithGst = (items: OrderItemInput[], currency: string) => {
    const applyGst = currency.toUpperCase() === "INR";
    return items.map((item) => {
        const lineSubtotal = round2(item.price * item.quantity);
        const gstAmount = applyGst ? round2(lineSubtotal * INDIAN_RESTAURANT_GST_RATE) : 0;
        return {
            ...item,
            ...(applyGst
                ? {
                      gstRate: INDIAN_RESTAURANT_GST_RATE,
                      gstAmount,
                      lineTotal: round2(lineSubtotal + gstAmount),
                  }
                : { lineTotal: lineSubtotal }),
        };
    });
};

// ── confirm-order ─────────────────────────────────────────────────────────────

const handleConfirmOrder = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, items, timeToOrder, currency = "INR",
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        items?: OrderItemInput[];
        timeToOrder?: number;
        currency?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !items?.length) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const { subtotal, gstAmount, total } = computeCartTotals(items, currency);
    const itemsWithGst = enrichItemsWithGst(items, currency);
    const admin = requireSupabaseAdmin();
    const customerToken = getBearerToken(req);
    const customer = customerToken ? await getUserFromAccessToken(admin, customerToken) : null;
    try {
        await assertRestaurantCanAcceptOrders(admin, restaurantId);
    } catch (error) {
        return res.status(409).json({ error: getErrorDetail(error) });
    }
    const { data: order, error: insertError } = await admin
        .from("orders")
        .insert({
            restaurant_id: restaurantId,
            items: itemsWithGst as unknown as Json,
            subtotal_amount: subtotal,
            gst_amount: gstAmount,
            total_amount: total,
            time_to_order: timeToOrder ?? 0,
            status: "pending",
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
            customer_user_id: customer?.id ?? null,
        })
        .select("id")
        .single();

    if (insertError || !order) {
        console.error("[confirm-order] insert failed", insertError?.message);
        return res.status(500).json({ error: "Payment verified but failed to record order" });
    }

    const today = new Date().toISOString().slice(0, 10);
    await Promise.allSettled([
        ...items.map((item) =>
            admin.rpc("increment_dish_stock", {
                p_dish_id: item.dishId,
                p_restaurant_id: restaurantId,
                p_sold_date: today,
                p_quantity: item.quantity,
            }),
        ),
        sendTelegramOrderAlert(admin, {
            restaurantId,
            orderId: order.id,
            items,
            total,
            currency,
        }),
    ]);

    return res.status(200).json({ success: true, orderId: order.id });
};

// ── confirm-subscription ──────────────────────────────────────────────────────
const handleConfirmSubscription = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
        restaurantId, planId, customerName, phone, email,
        deliveryType, deliveryFeeMode, timeSlot, rotationDishIds, currency = "INR",
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        planId?: string;
        customerName?: string;
        phone?: string;
        email?: string;
        deliveryType?: "delivery" | "pickup";
        deliveryFeeMode?: "upfront" | "cash_on_delivery";
        timeSlot?: "08-09" | "12-14" | "19-21";
        rotationDishIds?: string[];
        currency?: string;
    };

    if (
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature ||
        !restaurantId || !planId || !customerName || !phone || !deliveryType || !deliveryFeeMode || !timeSlot
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const { data: plan, error: planError } = await requireSupabaseAdmin()
        .from("meal_plans")
        .select("price_monthly, delivery_fee")
        .eq("id", planId)
        .eq("restaurant_id", restaurantId)
        .single();

    if (planError || !plan) {
        return res.status(404).json({ error: "Plan not found" });
    }

    const includeDelivery = deliveryType === "delivery" && deliveryFeeMode === "upfront";
    const monthlySubtotal = round2(
        Number(plan.price_monthly) + (includeDelivery ? Number(plan.delivery_fee) * 30 : 0),
    );
    const { subtotal, gstAmount } = computeCartTotals(
        [{ price: monthlySubtotal, quantity: 1 }],
        currency,
    );

    const startDate = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endDate = end.toISOString().slice(0, 10);

    const { data, error } = await requireSupabaseAdmin()
        .from("customer_subscriptions")
        .insert({
            restaurant_id: restaurantId,
            plan_id: planId,
            customer_name: customerName,
            phone,
            email: email ?? null,
            delivery_type: deliveryType,
            delivery_fee_mode: deliveryFeeMode,
            time_slot: timeSlot,
            start_date: startDate,
            end_date: endDate,
            rotation_dish_ids: rotationDishIds ?? [],
            payment_provider: "razorpay",
            payment_id: razorpay_payment_id,
            subtotal_amount: subtotal,
            gst_amount: gstAmount,
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error("[confirm-subscription] insert failed", error?.message);
        return res.status(500).json({ error: "Payment verified but failed to create subscription" });
    }

    return res.status(200).json({ success: true, subscriptionId: data.id });
};

// ── confirm-plus ──────────────────────────────────────────────────────────────
type PlusPlanId = "annual" | "monthly";
const PLAN_PERIOD_DAYS: Record<PlusPlanId, number> = { annual: 365, monthly: 30 };

type AdminUser = { id: string };
type AuthUserResult = { data: { user: AdminUser | null }; error: { message: string } | null };

const getBearerToken = (req: VercelRequest): string | null => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length).trim() || null;
};

const getUserFromAccessToken = async (
    client: SupabaseClient,
    accessToken: string,
): Promise<AdminUser | null> => {
    const auth = client.auth as { getUser(jwt?: string): Promise<AuthUserResult> };
    const { data, error } = await auth.getUser(accessToken);
    if (error || !data.user) return null;
    return data.user;
};

const handleConfirmPlus = async (req: VercelRequest, res: VercelResponse) => {
    const {
        razorpay_order_id, razorpay_payment_id, razorpay_signature, restaurantId, plan,
    } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        restaurantId?: string;
        plan?: PlusPlanId;
    };

    const periodDays = plan ? PLAN_PERIOD_DAYS[plan] : undefined;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !restaurantId || !periodDays) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Missing authorization token" });

    const admin = requireSupabaseAdmin();
    const user = await getUserFromAccessToken(admin, token);
    if (!user) return res.status(401).json({ error: "Invalid or expired session" });

    const { data: restaurant, error: restErr } = await admin
        .from("restaurants")
        .select("id")
        .eq("id", restaurantId)
        .eq("owner_id", user.id)
        .maybeSingle();
    if (restErr || !restaurant) {
        return res.status(403).json({ error: "Not allowed for this restaurant" });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        return res.status(outcome.status).json({ error: outcome.error });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);

    const { error } = await admin
        .from("subscriptions")
        .upsert(
            {
                restaurant_id: restaurantId,
                tier: "plus",
                provider: "razorpay",
                provider_subscription_id: razorpay_payment_id,
                current_period_end: periodEnd.toISOString(),
            },
            { onConflict: "restaurant_id" },
        );

    if (error) {
        console.error("[confirm-plus] upsert failed", error.message);
        return res.status(500).json({ error: "Payment verified but failed to upgrade tier" });
    }

    return res.status(200).json({ success: true });
};

// ── verify ────────────────────────────────────────────────────────────────────
const handleVerify = async (req: VercelRequest, res: VercelResponse) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
            verified: false,
            error: "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
        });
    }

    const outcome = safeVerifyRazorpaySignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
    });
    if (!outcome.verified) {
        return res.status(outcome.status).json({ verified: false, error: outcome.error });
    }
    return res.status(200).json({ verified: true });
};

// ── WhatsApp phone OTP (Meta Cloud API) ───────────────────────────────────────
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const normalizeIndianMobile = (raw: unknown): string | null => {
    const digits = String(raw ?? "").replace(/\D/g, "");
    const national = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
    return /^[6-9]\d{9}$/.test(national) ? `+91${national}` : null;
};

const hashOtp = (userId: string, phone: string, code: string): string =>
    crypto
        .createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
        .update(`${userId}:${phone}:${code}`)
        .digest("hex");

const sendWhatsAppOtp = async (phone: string, code: string): Promise<void> => {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const template = process.env.WHATSAPP_OTP_TEMPLATE;
    if (!phoneNumberId || !accessToken || !template) {
        console.error("[whatsapp-otp] missing WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN / WHATSAPP_OTP_TEMPLATE");
        throw new Error("Phone verification is temporarily unavailable. Please try again later.");
    }
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone.replace("+", ""),
            type: "template",
            template: {
                name: template,
                language: { code: process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en" },
                components: [
                    { type: "body", parameters: [{ type: "text", text: code }] },
                    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
                ],
            },
        }),
    });
    if (!response.ok) {
        console.error("[whatsapp-otp] send failed", response.status, await response.text());
        throw new Error("Could not send the WhatsApp message. Please try again.");
    }
};

const authenticateCustomer = async (req: VercelRequest, res: VercelResponse, admin: SupabaseClient) => {
    const token = getBearerToken(req);
    const user = token ? await getUserFromAccessToken(admin, token) : null;
    if (!user) res.status(401).json({ error: "Please sign in first." });
    return user;
};

const handleSendPhoneOtp = async (req: VercelRequest, res: VercelResponse) => {
    const admin = requireSupabaseAdmin();
    const user = await authenticateCustomer(req, res, admin);
    if (!user) return;
    const phone = normalizeIndianMobile((req.body as { phone?: string })?.phone);
    if (!phone) return res.status(400).json({ error: "Enter a valid 10-digit mobile number." });

    const { data: existing } = await admin.from("phone_otps").select("created_at").eq("user_id", user.id).maybeSingle();
    if (existing && Date.now() - new Date(existing.created_at as string).getTime() < OTP_RESEND_MS) {
        return res.status(429).json({ error: "Please wait 30 seconds before requesting another code." });
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const { error } = await admin.from("phone_otps").upsert({
        user_id: user.id,
        phone,
        code_hash: hashOtp(user.id, phone, code),
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
    });
    if (error) {
        console.error("[send-phone-otp] store failed", error.message);
        return res.status(500).json({ error: "Could not start phone verification. Please try again." });
    }

    try {
        await sendWhatsAppOtp(phone, code);
    } catch (sendError) {
        // Drop the challenge so the user isn't blocked by the resend cooldown after a failed send.
        await admin.from("phone_otps").delete().eq("user_id", user.id);
        console.error("[send-phone-otp] delivery failed", getErrorDetail(sendError));
        return res.status(503).json({ error: getErrorDetail(sendError) });
    }
    return res.status(200).json({ sent: true, phone });
};

const handleVerifyPhoneOtp = async (req: VercelRequest, res: VercelResponse) => {
    const admin = requireSupabaseAdmin();
    const user = await authenticateCustomer(req, res, admin);
    if (!user) return;
    const body = req.body as { phone?: string; code?: string };
    const phone = normalizeIndianMobile(body?.phone);
    const code = String(body?.code ?? "").trim();
    if (!phone || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "Enter the 6-digit code." });

    const { data: row } = await admin.from("phone_otps").select("*").eq("user_id", user.id).maybeSingle();
    if (!row || row.phone !== phone) return res.status(400).json({ error: "Request a new code first." });
    if (new Date(row.expires_at as string).getTime() < Date.now() || (row.attempts as number) >= OTP_MAX_ATTEMPTS) {
        return res.status(400).json({ error: "This code has expired. Request a new one." });
    }

    const expected = Buffer.from(row.code_hash as string);
    const actual = Buffer.from(hashOtp(user.id, phone, code));
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        await admin.from("phone_otps").update({ attempts: (row.attempts as number) + 1 }).eq("user_id", user.id);
        return res.status(400).json({ error: "Incorrect code." });
    }

    const { error } = await admin
        .from("customer_profiles")
        .update({ phone, phone_verified: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    if (error) throw error;
    await admin.from("phone_otps").delete().eq("user_id", user.id);
    return res.status(200).json({ verified: true, phone });
};

const saveUnverifiedPhone = async (admin: SupabaseClient, userId: string, phone: string): Promise<boolean> => {
    const { data: profile, error: profileError } = await admin
        .from("customer_profiles")
        .select("phone, phone_verified")
        .eq("user_id", userId)
        .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) return false;
    if (profile.phone === phone && profile.phone_verified) return true;

    const { error } = await admin
        .from("customer_profiles")
        .update({ phone, phone_verified: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    if (error) throw error;
    return true;
};

const handleSaveUnverifiedPhone = async (req: VercelRequest, res: VercelResponse) => {
    if (process.env.VITE_CUSTOMER_PHONE_OTP_ENABLED !== "false") {
        return res.status(403).json({ error: "Phone verification is enabled." });
    }
    const admin = requireSupabaseAdmin();
    const user = await authenticateCustomer(req, res, admin);
    if (!user) return;
    const phone = String((req.body as { phone?: string })?.phone ?? "").trim();
    if (!phone || phone.length > 64) {
        return res.status(400).json({ error: "Enter a phone number of 64 characters or fewer." });
    }
    if (!await saveUnverifiedPhone(admin, user.id, phone)) {
        return res.status(404).json({ error: "Customer profile not found." });
    }
    return res.status(200).json({ phone });
};

// ── Automatic refund for rejected orders ─────────────────────────────────────
type RefundableOrder = {
    id: string;
    restaurant_id: string;
    status: string;
    total_amount: number;
    payment_provider: string | null;
    payment_id: string | null;
    refund_id: string | null;
};

const issueRazorpayRefund = async (order: RefundableOrder): Promise<string> => {
    const creds = getRazorpayCredentials();
    if (!creds) throw new Error("Razorpay not configured");
    const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${order.payment_id}/refunds`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
            "X-Refund-Idempotency": order.id,
        },
        body: JSON.stringify({
            amount: Math.round(Number(order.total_amount) * 100),
            speed: "normal",
            notes: { orderId: order.id, reason: "Order rejected by kitchen" },
        }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
    if (!response.ok || !body.id) throw new Error(body.error?.description ?? `Razorpay refund failed (${response.status})`);
    return body.id;
};

const loadOrderForOwner = async (
    admin: SupabaseClient,
    orderId: string,
    ownerId: string,
): Promise<RefundableOrder | null> => {
    const { data: order } = await admin
        .from("orders")
        .select("id, restaurant_id, status, total_amount, payment_provider, payment_id, refund_id")
        .eq("id", orderId)
        .maybeSingle();
    if (!order) return null;
    const { data: restaurant } = await admin
        .from("restaurants")
        .select("id")
        .eq("id", order.restaurant_id)
        .eq("owner_id", ownerId)
        .maybeSingle();
    return restaurant ? (order as RefundableOrder) : null;
};

const handleRefundOrder = async (req: VercelRequest, res: VercelResponse) => {
    const admin = requireSupabaseAdmin();
    const token = getBearerToken(req);
    const user = token ? await getUserFromAccessToken(admin, token) : null;
    if (!user) return res.status(401).json({ error: "Please sign in again." });
    const orderId = String((req.body as { orderId?: string })?.orderId ?? "");
    const order = orderId ? await loadOrderForOwner(admin, orderId, user.id) : null;
    if (!order) return res.status(404).json({ error: "Order not found." });
    if (order.status !== "rejected") return res.status(409).json({ error: "Only rejected orders are refunded." });
    if (order.refund_id) return res.status(200).json({ refunded: true, refundId: order.refund_id });
    if (order.payment_provider !== "razorpay" || !order.payment_id) {
        return res.status(200).json({ refunded: false, reason: "No online payment to refund." });
    }
    try {
        const refundId = await issueRazorpayRefund(order);
        await admin.from("orders").update({ refund_id: refundId, refunded_at: new Date().toISOString() }).eq("id", order.id);
        return res.status(200).json({ refunded: true, refundId });
    } catch (error) {
        console.error("[confirm-payment/refund-order]", getErrorDetail(error));
        return res.status(502).json({ error: `Refund failed: ${getErrorDetail(error)}` });
    }
};

// ── Router ────────────────────────────────────────────────────────────────────
const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
    "confirm-order": handleConfirmOrder,
    "confirm-subscription": handleConfirmSubscription,
    "confirm-plus": handleConfirmPlus,
    verify: handleVerify,
    "send-phone-otp": handleSendPhoneOtp,
    "verify-phone-otp": handleVerifyPhoneOtp,
    "save-unverified-phone": handleSaveUnverifiedPhone,
    "refund-order": handleRefundOrder,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const action = normalizeAction(req.query.action as string | string[] | undefined);
    const routeHandler = ROUTES[action];
    if (!routeHandler) {
        return res.status(404).json({ error: `Unknown action: ${action || "(none)"}` });
    }

    try {
        await routeHandler(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error(`[confirm-payment/${action}] unhandled`, message);
        if (!res.writableEnded) {
            res.status(500).json({ error: `confirm-payment/${action} failed`, detail: message });
        }
    }
}
