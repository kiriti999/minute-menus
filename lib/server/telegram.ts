import type { SupabaseClient } from "@supabase/supabase-js";
import { createLogger } from "./logger";

const log = createLogger("telegram");

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

export const sendTelegramOrderAlert = async (
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
                chat_id: settings.telegram_chat_id,
                text: buildOrderMessage(restaurant.name, alert),
            }),
        });
        if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}`);
    } catch (error) {
        log.error("Failed to send order alert", {
            restaurantId: alert.restaurantId,
            message: error instanceof Error ? error.message : String(error),
        });
    }
};
