import type { SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";
import { getSupabaseAdmin } from "../supabase-admin";

export async function verifyOwnerForRestaurant(
	req: VercelRequest,
	restaurantId: string,
): Promise<{ userId: string } | null> {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) return null;

	const token = header.slice(7);
	const admin = getSupabaseAdmin();
	if (!admin) return null;

	const { data: userData, error: userError } = await admin.auth.getUser(token);
	if (userError || !userData.user) return null;

	const { data: restaurant, error: restError } = await admin
		.from("restaurants")
		.select("id")
		.eq("id", restaurantId)
		.eq("owner_id", userData.user.id)
		.maybeSingle();

	if (restError || !restaurant) return null;
	return { userId: userData.user.id };
}

export function requireSupabaseAdminOrThrow(): SupabaseClient {
	const admin = getSupabaseAdmin();
	if (!admin) throw new Error("Server is not configured (missing Supabase env vars)");
	return admin;
}
