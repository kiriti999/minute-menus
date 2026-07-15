/**
 * POST /api/parse-invoice
 * Owner-authenticated. Accepts a purchase invoice (PDF or image data URL),
 * uploads it to Supabase Storage (organized by month), extracts ingredient
 * line items via Anthropic Claude vision, and returns a normalized table the
 * UI can review and save. Self-contained (npm imports only) so Vercel bundles
 * it reliably.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Self-contained (npm imports only). On this Vercel project, any `../lib/*`
 * relative import crashes the serverless function with FUNCTION_INVOCATION_FAILED.
 * Proven working pattern: api/create-razorpay-order.ts, api/confirm-payment.ts.
 */

/** Vision on multi-page PDFs / storage-guide AI can take a while. */
export const maxDuration = 60;

/** Overridable; defaults to the Claude Haiku model used elsewhere in the org. */
const CLAUDE_MODEL = process.env.INVOICE_AI_MODEL ?? "claude-haiku-4-5";
const STORAGE_GUIDE_MODEL = "claude-haiku-4-5";

type PurchaseUnit = "kg" | "g" | "l" | "ml" | "piece";
type LineItem = { name: string; quantity: number; unit: PurchaseUnit; amount: number };
type MenuItemForStorageGuide = { name: string; category: string; ingredients: string };
type IngredientStorageAdvice = {
	ingredient: string;
	storagePlace: string;
	shelfLife: string;
	simpleHacks: string;
	usedInDishes: string[];
};

const VALID_UNITS: PurchaseUnit[] = ["kg", "g", "l", "ml", "piece"];
const INVOICE_BUCKET = "invoices";

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

type AdminUser = { id: string; email?: string | null };
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

const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string; buffer: Buffer } | null => {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    return { 
        mimeType: match[1], 
        base64: match[2],
        buffer: Buffer.from(match[2], 'base64')
    };
};

const normalizeUnit = (raw: unknown): PurchaseUnit => {
    const u = String(raw ?? "").toLowerCase().trim();
    if (u === "kg" || u === "kgs" || u === "kilogram" || u === "kilograms") return "kg";
    if (u === "g" || u === "gram" || u === "grams" || u === "gm" || u === "gms") return "g";
    if (u === "l" || u === "litre" || u === "litres" || u === "liter" || u === "liters") return "l";
    if (u === "ml" || u === "millilitre" || u === "milliliter") return "ml";
    return "piece";
};

const toNumber = (raw: unknown): number => {
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
};

const coerceLineItems = (raw: unknown): LineItem[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((r) => {
            const item = r as Record<string, unknown>;
            return {
                name: String(item.name ?? "").trim(),
                quantity: toNumber(item.quantity),
                unit: normalizeUnit(item.unit),
                amount: toNumber(item.amount),
            };
        })
        .filter((i) => i.name.length > 0);
};

const PROMPT = `You are reading a restaurant purchase/supplier invoice. Extract every purchased ingredient/item line.
Return ONLY a JSON array (no prose, no markdown fences). Each element:
{"name": string, "quantity": number, "unit": "kg"|"g"|"l"|"ml"|"piece", "amount": number}
- "amount" is the total money paid for that line (not unit price).
- "quantity" is the purchased quantity in the given unit.
- Use "piece" for countable items with no weight/volume.
- Omit taxes, totals, discounts, and non-ingredient rows.
If nothing is found, return [].`;

const parseJsonArray = (text: string): LineItem[] => {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
        return coerceLineItems(JSON.parse(cleaned));
    } catch {
        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start === -1 || end === -1) return [];
        return coerceLineItems(JSON.parse(cleaned.slice(start, end + 1)));
    }
};

const buildContentBlock = (mimeType: string, base64: string): Anthropic.ContentBlockParam => {
    if (mimeType === "application/pdf") {
        return {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
        };
    }
    return {
        type: "image",
        source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
            data: base64,
        },
    };
};

const extractLineItems = async (mimeType: string, base64: string): Promise<LineItem[]> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        messages: [
            {
                role: "user",
                content: [buildContentBlock(mimeType, base64), { type: "text", text: PROMPT }],
            },
        ],
    });

    const block = response.content[0];
    return block && block.type === "text" ? parseJsonArray(block.text) : [];
};

/**
 * Uploads invoice file to Supabase Storage with month-based folder structure.
 * Path: {restaurantId}/YYYY-MM/YYYY-MM-DD-HHmmss-{randomId}.{ext}
 * Returns the file URL.
 */
const uploadInvoiceToStorage = async (
    admin: SupabaseClient,
    restaurantId: string,
    buffer: Buffer,
    mimeType: string
): Promise<string> => {
    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets();
    if (!buckets?.some(b => b.name === INVOICE_BUCKET)) {
        const { error: createErr } = await admin.storage.createBucket(INVOICE_BUCKET, {
            public: false, // Private bucket, requires auth
            fileSizeLimit: 20 * 1024 * 1024, // 20MB
        });
        if (createErr) throw new Error(`Failed to create invoices bucket: ${createErr.message}`);
    }

    // Generate filename with upload date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const randomId = Math.random().toString(36).substring(2, 8);
    
    // Determine extension from MIME type
    let ext = 'pdf';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('jpg') || mimeType.includes('jpeg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    
    // Path: restaurantId/YYYY-MM/YYYY-MM-DD-HHmmss-randomId.ext
    const path = `${restaurantId}/${year}-${month}/${year}-${month}-${day}-${hours}${minutes}${seconds}-${randomId}.${ext}`;

    const { error: uploadErr } = await admin.storage
        .from(INVOICE_BUCKET)
        .upload(path, buffer, {
            contentType: mimeType,
            upsert: false, // Each upload is unique
        });

    if (uploadErr) {
        throw new Error(`Failed to upload invoice: ${uploadErr.message}`);
    }

    // Get signed URL (expires in 1 year for owner access)
    const { data: urlData, error: urlErr } = await admin.storage
        .from(INVOICE_BUCKET)
        .createSignedUrl(path, 365 * 24 * 60 * 60); // 1 year expiry

    if (urlErr || !urlData) {
        throw new Error(`Failed to get invoice URL: ${urlErr?.message ?? 'Unknown error'}`);
    }

    return urlData.signedUrl;
};

const parseAdviceJson = (raw: string): IngredientStorageAdvice[] => {
	const trimmed = raw.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim();
	const candidate = fenced ?? trimmed;
	const tryParse = (text: string): IngredientStorageAdvice[] => {
		const parsed = JSON.parse(text) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((row) => {
				const item = row as Record<string, unknown>;
				const dishes = item.usedInDishes ?? item.used_in_dishes ?? item.dishes;
				return {
					ingredient: String(item.ingredient ?? "").trim(),
					storagePlace: String(item.storagePlace ?? item.storage_place ?? "").trim(),
					shelfLife: String(item.shelfLife ?? item.shelf_life ?? "").trim(),
					simpleHacks: String(item.simpleHacks ?? item.simple_hacks ?? item.hacks ?? "").trim(),
					usedInDishes: Array.isArray(dishes)
						? dishes.map((d) => String(d).trim()).filter(Boolean)
						: [],
				};
			})
			.filter((row) => row.ingredient.length > 0);
	};
	try {
		return tryParse(candidate);
	} catch {
		const start = candidate.indexOf("[");
		const end = candidate.lastIndexOf("]");
		if (start === -1 || end === -1) throw new Error("Could not parse AI storage guide — try again");
		return tryParse(candidate.slice(start, end + 1));
	}
};

const fetchOwnerAnthropicKey = async (
	admin: SupabaseClient,
	ownerId: string,
): Promise<{ apiKey: string; model: string } | null> => {
	const { data, error } = await admin
		.from("owner_settings")
		.select("anthropic_api_key, anthropic_model")
		.eq("owner_id", ownerId)
		.maybeSingle();
	if (error) {
		const message = error.message ?? String(error);
		if (/relation .*owner_settings.* does not exist|Could not find the table/i.test(message)) {
			throw new Error(
				"owner_settings table is missing — run pnpm db:push (or apply supabase/schema.sql) then try again",
			);
		}
		throw error;
	}
	const row = data as { anthropic_api_key: string | null; anthropic_model: string | null } | null;
	const apiKey = row?.anthropic_api_key?.trim();
	if (!apiKey) return null;
	return { apiKey, model: row?.anthropic_model?.trim() || STORAGE_GUIDE_MODEL };
};

const generateStorageGuide = async (
	apiKey: string,
	restaurantName: string,
	menuItems: MenuItemForStorageGuide[],
	model: string,
): Promise<IngredientStorageAdvice[]> => {
	const client = new Anthropic({ apiKey });
	const menuPayload = menuItems
		.filter((item) => item.ingredients.trim() || item.name.trim())
		.map((item) => ({
			dish: item.name,
			category: item.category,
			ingredients: item.ingredients.trim() || "(see dish name)",
		}));

	const response = await client.messages.create({
		model: model || STORAGE_GUIDE_MODEL,
		max_tokens: 4096,
		messages: [
			{
				role: "user",
				content: `You are a cloud-kitchen food safety and prep coach for "${restaurantName}" in India.

Scan every menu dish and its ingredients below. Extract UNIQUE raw ingredients (veggies, fruits, dairy, grains, proteins, herbs, etc.).

For EACH unique ingredient return practical storage guidance:
- Where: fridge (which zone), counter, pantry, or freezer — be specific and simple
- Shelf life: realistic days at peak quality
- Simple hacks: 1–2 short kitchen-friendly tips (wrap, container, wash-dry, etc.)

Rules:
- Plain English, no jargon, no markdown in values
- Focus on vegetables, fruits, and perishables; include dairy/proteins when present
- Merge duplicates (e.g. "tomato" across dishes → one row with all dish names in usedInDishes)
- Cover every ingredient you can infer from the menu; skip only pure water/ice
- Return ONLY a JSON array, no prose before or after

Each object keys: ingredient, storagePlace, shelfLife, simpleHacks, usedInDishes (string array of dish names)

MENU:
${JSON.stringify(menuPayload, null, 2)}`,
			},
		],
	});

	const block = response.content[0];
	if (!block || block.type !== "text") throw new Error("Unexpected AI response");
	const tips = parseAdviceJson(block.text);
	if (!tips.length) throw new Error("AI returned no storage tips");
	return tips;
};

const handleStorageGuide = async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse> => {
	const body = (req.body ?? {}) as {
		restaurantId?: string;
		menuItems?: MenuItemForStorageGuide[];
	};
	const { restaurantId, menuItems } = body;
	if (!restaurantId || !Array.isArray(menuItems) || menuItems.length === 0) {
		return res.status(400).json({ error: "restaurantId and menuItems are required" });
	}

	const token = getBearerToken(req);
	if (!token) return res.status(401).json({ error: "Missing authorization token" });

	const admin = requireSupabaseAdmin();
	const user = await getUserFromAccessToken(admin, token);
	if (!user) return res.status(401).json({ error: "Invalid or expired session" });

	const { data: owned, error: ownErr } = await admin
		.from("restaurants")
		.select("id, name")
		.eq("id", restaurantId)
		.eq("owner_id", user.id)
		.maybeSingle();
	if (ownErr || !owned) {
		return res.status(403).json({ error: "Not allowed for this restaurant" });
	}

	const keyRow = await fetchOwnerAnthropicKey(admin, user.id);
	if (!keyRow) {
		return res.status(428).json({
			error: "missing_api_key",
			message: "Add your Claude API key to generate a storage guide.",
		});
	}

	const sanitized = menuItems
		.map((item) => ({
			name: String(item.name ?? "").trim(),
			category: String(item.category ?? "").trim(),
			ingredients: String(item.ingredients ?? "").trim(),
		}))
		.filter((item) => item.name.length > 0);
	if (!sanitized.length) {
		return res.status(400).json({ error: "No menu items with names to scan" });
	}

	const tips = await generateStorageGuide(keyRow.apiKey, owned.name, sanitized, keyRow.model);
	return res.status(200).json({
		generatedAt: new Date().toISOString(),
		restaurantName: owned.name,
		tips,
	});
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const action = (req.body as { action?: string } | null)?.action ?? "parse-invoice";
    if (action === "storage-guide") {
        try {
            return await handleStorageGuide(req, res);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("[parse-invoice] storage-guide failed", message);
            return res.status(502).json({ error: "Failed to generate storage guide", detail: message });
        }
    }

    try {
        const { restaurantId, fileDataUrl } = req.body as {
            restaurantId?: string;
            fileDataUrl?: string;
        };
        if (!restaurantId || !fileDataUrl) {
            return res.status(400).json({ error: "restaurantId and fileDataUrl are required" });
        }

        const token = getBearerToken(req);
        if (!token) return res.status(401).json({ error: "Missing authorization token" });

        const parsed = parseDataUrl(fileDataUrl);
        if (!parsed) return res.status(400).json({ error: "fileDataUrl must be a base64 data URL" });

        const admin = requireSupabaseAdmin();
        const user = await getUserFromAccessToken(admin, token);
        if (!user) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }

        const { data: restaurant, error: restErr } = await admin
            .from("restaurants")
            .select("id")
            .eq("id", restaurantId)
            .eq("owner_id", user.id)
            .maybeSingle();
        if (restErr || !restaurant) {
            return res.status(403).json({ error: "Not allowed to parse invoices for this restaurant" });
        }

        // 1. Upload file to Supabase Storage first
        const fileUrl = await uploadInvoiceToStorage(admin, restaurantId, parsed.buffer, parsed.mimeType);

        // 2. Parse line items using AI
        const lineItems = await extractLineItems(parsed.mimeType, parsed.base64);
        const total = Math.round(lineItems.reduce((s, i) => s + i.amount, 0) * 100) / 100;

        return res.status(200).json({ 
            lineItems, 
            total, 
            unitsAllowed: VALID_UNITS,
            fileUrl, // Return the uploaded file URL
            uploadedAt: new Date().toISOString(),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[parse-invoice] failed", message);
        const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 502;
        return res.status(status).json({ error: "Failed to parse invoice", detail: message });
    }
}
