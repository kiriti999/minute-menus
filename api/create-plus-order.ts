/**
 * POST /api/create-plus-order
 * Owner-authenticated. Creates a Razorpay order for Plus upgrade in the
 * visitor's regional currency (converted from the USD catalog).
 */

import {
	getPlusPlanAmount,
	normalizeCheckoutCurrency,
	toRazorpayAmountSubunits,
	type PlusPlanId,
} from "@minute-menus/currency";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

const PLUS_PLAN_LABELS: Record<PlusPlanId, string> = {
	annual: "Plus — Annual Plan",
	monthly: "Plus — Monthly Plan",
};

let adminClient: SupabaseClient | null = null;

const requireSupabaseAdmin = (): SupabaseClient => {
	if (adminClient) return adminClient;
	const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
	if (!url || !key) throw new Error("Server is not configured (missing Supabase env vars)");
	adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
	return adminClient;
};

const getBearerToken = (req: VercelRequest): string | null => {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) return null;
	return header.slice("Bearer ".length).trim() || null;
};

type AdminUser = { id: string };
type AuthUserResult = { data: { user: AdminUser | null }; error: { message: string } | null };

const getUserFromAccessToken = async (
	client: SupabaseClient,
	accessToken: string,
): Promise<AdminUser | null> => {
	const auth = client.auth as { getUser(jwt?: string): Promise<AuthUserResult> };
	const { data, error } = await auth.getUser(accessToken);
	if (error || !data.user) return null;
	return data.user;
};

const getRazorpayCredentials = (): { keyId: string; keySecret: string } | null => {
	const keyId = process.env.RAZORPAY_KEY_ID;
	const keySecret = process.env.RAZORPAY_KEY_SECRET;
	if (!keyId || !keySecret) return null;
	return { keyId, keySecret };
};

const createRazorpayOrder = async (input: {
	amountSubunits: number;
	currency: string;
	receipt: string;
	notes: Record<string, string>;
}) => {
	const creds = getRazorpayCredentials();
	if (!creds) throw new Error("Razorpay not configured");

	const currency = input.currency.toUpperCase();
	const razorpay = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
	const order = await razorpay.orders.create({
		amount: input.amountSubunits,
		currency,
		receipt: input.receipt,
		notes: input.notes,
	});

	return { orderId: order.id, amount: input.amountSubunits, currency, keyId: creds.keyId };
};

const getErrorDetail = (err: unknown): string =>
	err instanceof Error ? err.message : String(err);

const isPlusPlanId = (value: unknown): value is PlusPlanId =>
	value === "annual" || value === "monthly";

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") return res.status(200).end();
	if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

	const { plan, restaurantId, currency: rawCurrency } = req.body as {
		plan?: unknown;
		restaurantId?: string;
		currency?: string;
	};

	if (!isPlusPlanId(plan) || !restaurantId) {
		return res.status(400).json({ error: "A valid plan and restaurantId are required" });
	}

	const currency = normalizeCheckoutCurrency(rawCurrency);
	const amountMajor = getPlusPlanAmount(plan, currency);
	const amountSubunits = toRazorpayAmountSubunits(amountMajor, currency);

	const token = getBearerToken(req);
	if (!token) return res.status(401).json({ error: "Missing authorization token" });

	try {
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

		const result = await createRazorpayOrder({
			amountSubunits,
			currency,
			receipt: `plus_${restaurantId.slice(0, 8)}_${Date.now()}`,
			notes: {
				restaurantId,
				plan,
				planName: PLUS_PLAN_LABELS[plan],
				ownerId: user.id,
				amountMajor: String(amountMajor),
				catalogCurrency: "USD",
			},
		});
		return res.status(200).json({ ...result, amountMajor });
	} catch (e) {
		const msg = getErrorDetail(e);
		console.error("[create-plus-order] failed", msg);
		const status = msg === "Razorpay not configured" ? 500 : 502;
		return res.status(status).json({ error: "Failed to create payment order", detail: msg });
	}
}
