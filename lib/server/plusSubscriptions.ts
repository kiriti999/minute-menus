import type { SupabaseClient } from "@supabase/supabase-js";

type SubscriptionRow = {
	tier: string | null;
	current_period_end: string | null;
};

/** Active Plus = tier plus and period end missing (legacy) or still in the future. */
export function isActivePlusSubscription(row: SubscriptionRow | null | undefined): boolean {
	if (!row || row.tier !== "plus") return false;
	if (!row.current_period_end) return true;
	return new Date(row.current_period_end).getTime() > Date.now();
}

export async function fetchRestaurantSubscription(
	admin: SupabaseClient,
	restaurantId: string,
): Promise<SubscriptionRow | null> {
	const { data, error } = await admin
		.from("subscriptions")
		.select("tier, current_period_end")
		.eq("restaurant_id", restaurantId)
		.maybeSingle();
	if (error || !data) return null;
	return data as SubscriptionRow;
}

/** Downgrade Plus rows whose period has ended. Returns count updated. */
export async function expirePlusSubscriptions(admin: SupabaseClient): Promise<number> {
	const nowIso = new Date().toISOString();
	const { data, error } = await admin
		.from("subscriptions")
		.update({
			tier: "free",
			provider: null,
			provider_subscription_id: null,
			current_period_end: null,
		})
		.eq("tier", "plus")
		.not("current_period_end", "is", null)
		.lt("current_period_end", nowIso)
		.select("restaurant_id");

	if (error) throw error;
	return data?.length ?? 0;
}
