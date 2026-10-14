import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestaurantAvailability } from "@minute-menus/types";

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

export async function getRestaurantAvailability(
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

export async function assertRestaurantCanAcceptOrders(
  admin: SupabaseClient,
  restaurantId: string,
): Promise<void> {
  const status = getAvailabilityStatus(await getRestaurantAvailability(admin, restaurantId));
  if (!status.open) throw new Error(status.message);
}
