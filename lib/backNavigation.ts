import type { RecipeBookRole } from "@minute-menus/types";

/** Where a back button leads: the owner dashboard, or a URL path. */
export const DASHBOARD = "dashboard";
export type BackTo = typeof DASHBOARD | (string & {});

export interface BackDestination {
	label: string;
	to: BackTo;
}

/**
 * One rule for every back button, by who is looking:
 * - owner → the dashboard
 * - team member → one level up (recipe book → SOP, SOP → the restaurant menu)
 * - public visitor → the restaurant menu
 */
export function staffBack(page: "sop" | "recipe-book", role: RecipeBookRole | null, slug: string): BackDestination {
	if (role === "owner") return { label: "Dashboard", to: DASHBOARD };
	if (page === "recipe-book" && role === "team") return { label: "SOP", to: `/${slug}/sop` };
	return { label: "Menu", to: `/${slug}` };
}

/** Customer pages (e.g. My orders) return to the restaurant's menu. */
export const customerBack = (slug: string): BackDestination => ({ label: "Menu", to: `/${slug}` });

/** The public price list: the owner returns to the dashboard, everyone else to the home page. */
export const priceListBack = (role: RecipeBookRole | null): BackDestination =>
	role === "owner" ? { label: "Dashboard", to: DASHBOARD } : { label: "Home", to: "/" };
