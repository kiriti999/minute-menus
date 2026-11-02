import type { RecipeBookRole } from "@minute-menus/types";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { supabaseService } from "../services/supabaseService";

export type RecipeBookAccess =
	| { status: "checking" }
	| { status: "error"; message: string }
	| { status: "signed-out"; restaurantName: string }
	| { status: "denied"; restaurantName: string; email: string }
	| { status: "granted"; role: RecipeBookRole };

async function resolveAccess(slug: string): Promise<RecipeBookAccess> {
	const restaurant = await supabaseService.getRestaurantBySlug(slug);
	if (!restaurant) return { status: "error", message: `Restaurant "${slug}" not found` };
	const restaurantName = restaurant.name || "this restaurant";
	const role = await supabaseService.getRecipeBookRole(restaurant.id);
	if (role) return { status: "granted", role };
	const { data } = await supabase.auth.getSession();
	const email = data.session?.user.email;
	return email ? { status: "denied", restaurantName, email } : { status: "signed-out", restaurantName };
}

/**
 * Whether the visitor may open a restaurant's recipe book: the owner, or a signed-in
 * user whose verified email is on an active team member. Re-checks on every sign-in / sign-out.
 */
export function useRecipeBookAccess(slug: string): RecipeBookAccess {
	const [access, setAccess] = useState<RecipeBookAccess>({ status: "checking" });
	const [tick, setTick] = useState(0);

	useEffect(() => {
		const { data } = supabase.auth.onAuthStateChange((event) => {
			// Token refreshes keep the same user; re-checking on them would only flicker the page.
			if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(() => setTick((n) => n + 1), 0);
		});
		return () => data.subscription.unsubscribe();
	}, []);

	useEffect(() => {
		let cancelled = false;
		resolveAccess(slug)
			.then((next) => !cancelled && setAccess(next))
			.catch((e: unknown) => {
				const message = e instanceof Error ? e.message : "Could not check recipe book access";
				if (!cancelled) setAccess({ status: "error", message });
			});
		return () => {
			cancelled = true;
		};
	}, [slug, tick]);

	return access;
}
