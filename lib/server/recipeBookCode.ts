/**
 * POST /api/keepalive?action=recipe-code  { slug, email }
 * Emails a recipe-book sign-in code, but only to the owner or an active team member,
 * so strangers cannot create accounts (or burn the email quota) from the sign-in card.
 * Always answers 200 for a well-formed request so the response never reveals who is on the team.
 */
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin, getUserEmailById } from "../supabase-admin.js";
import { getErrorDetail, rejectUnlessPost } from "./api-helpers.js";
import { createLogger } from "./logger.js";

const log = createLogger("recipe-book-code");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Admin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function isTeamEmail(admin: Admin, slug: string, email: string): Promise<boolean> {
	const { data: restaurant } = await admin
		.from("restaurants")
		.select("id, owner_id")
		.eq("slug", slug)
		.maybeSingle();
	if (!restaurant) return false;
	const { data: staff } = await admin
		.from("restaurant_staff")
		.select("id")
		.eq("restaurant_id", restaurant.id)
		.eq("active", true)
		.ilike("email", email)
		.limit(1);
	if (staff?.length) return true;
	const ownerEmail = restaurant.owner_id ? await getUserEmailById(restaurant.owner_id) : null;
	return ownerEmail?.toLowerCase() === email;
}

async function sendCode(email: string): Promise<string | null> {
	const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
	const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
	if (!url || !anonKey) return "Server is not configured";
	const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
	const { error } = await client.auth.signInWithOtp({ email });
	return error?.message ?? null;
}

export async function handleRecipeBookCode(req: VercelRequest, res: VercelResponse) {
	if (rejectUnlessPost(req, res)) return;
	const { slug, email: rawEmail } = (req.body ?? {}) as { slug?: string; email?: string };
	const email = String(rawEmail ?? "").trim().toLowerCase();
	if (!slug || !EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "slug and a valid email are required" });

	const admin = getSupabaseAdmin();
	if (!admin) return res.status(500).json({ error: "Server is not configured" });

	try {
		if (await isTeamEmail(admin, slug, email)) {
			const failure = await sendCode(email);
			if (failure) return res.status(502).json({ error: failure });
		}
		return res.status(200).json({ ok: true });
	} catch (error) {
		log.error("send failed", { message: getErrorDetail(error) });
		return res.status(500).json({ error: "Could not send the code" });
	}
}
