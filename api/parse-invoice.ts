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
	category: string;
	storagePlace: string;
	shelfLifeFridge: string;
	shelfLifeOutside: string;
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

const CATEGORY_ALIASES: Record<string, string> = {
	veg: "Vegetables",
	veggie: "Vegetables",
	veggies: "Vegetables",
	vegetable: "Vegetables",
	vegetables: "Vegetables",
	fruit: "Fruits",
	fruits: "Fruits",
	herb: "Herbs",
	herbs: "Herbs",
	"herbs & greens": "Herbs",
	greens: "Herbs",
	dairy: "Dairy",
	milk: "Dairy",
	protein: "Proteins",
	proteins: "Proteins",
	meat: "Proteins",
	seafood: "Proteins",
	egg: "Proteins",
	eggs: "Proteins",
	grain: "Grains & staples",
	grains: "Grains & staples",
	"grains & staples": "Grains & staples",
	staple: "Grains & staples",
	staples: "Grains & staples",
	spice: "Spices & condiments",
	spices: "Spices & condiments",
	"spices & condiments": "Spices & condiments",
	condiment: "Spices & condiments",
	oil: "Oils & fats",
	oils: "Oils & fats",
	"oils & fats": "Oils & fats",
	fat: "Oils & fats",
};

const normalizeAdviceCategory = (raw: string): string => {
	const key = raw.trim().toLowerCase();
	if (!key) return "Other";
	return CATEGORY_ALIASES[key] ?? raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Cold bain marie, small freezer (ice cream), or outside wooden racks. */
const FRIDGE_LABEL = "Cold bain marie (under fridge)";
const FREEZER_LABEL = "Freezer (ice cream)";
const RACK_LABEL = "Outside wooden racks";

const normalizeStoragePlace = (raw: string): string => {
	const t = raw.trim().toLowerCase();
	if (!t) return FRIDGE_LABEL;
	if (/freezer|ice.?cream|frozen/.test(t)) return FREEZER_LABEL;
	if (/fridge|refrigerat|chill|cold|bain|marie/.test(t)) return FRIDGE_LABEL;
	if (/rack|outside|room.?temp|ambient|wooden|pantry|counter|cupboard|cabinet|shelf|dry/.test(t)) {
		return RACK_LABEL;
	}
	return FRIDGE_LABEL;
};

const simplifyKitchenHacks = (raw: string): string =>
	raw
		.replace(/\bcrisper drawers?\b/gi, "cold bain marie")
		.replace(/\bcrisper\b/gi, "cold bain marie")
		.replace(/\b(vegetable|veggie) drawer\b/gi, "cold bain marie")
		.replace(/\bpantry\b/gi, "wooden racks")
		.replace(/\s{2,}/g, " ")
		.trim();

const coerceAdviceRow = (row: unknown): IngredientStorageAdvice | null => {
	if (!row || typeof row !== "object") return null;
	const item = row as Record<string, unknown>;
	const dishes = item.usedInDishes ?? item.used_in_dishes ?? item.dishes;
	const advice: IngredientStorageAdvice = {
		ingredient: String(item.ingredient ?? "").trim(),
		category: normalizeAdviceCategory(String(item.category ?? item.group ?? "").trim()),
		storagePlace: normalizeStoragePlace(String(item.storagePlace ?? item.storage_place ?? "").trim()),
		shelfLifeFridge: String(
			item.shelfLifeFridge ?? item.shelf_life_fridge ?? item.shelfLife ?? item.shelf_life ?? "",
		).trim(),
		shelfLifeOutside: String(
			item.shelfLifeOutside ?? item.shelf_life_outside ?? "",
		).trim() || "Do not store outside",
		simpleHacks: simplifyKitchenHacks(
			String(item.simpleHacks ?? item.simple_hacks ?? item.hacks ?? "").trim(),
		),
		usedInDishes: Array.isArray(dishes)
			? dishes.map((d) => String(d).trim()).filter(Boolean)
			: [],
	};
	return advice.ingredient.length > 0 ? advice : null;
};

/** Fix common Claude JSON glitches before JSON.parse. */
const repairJsonText = (text: string): string =>
	text
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2018\u2019]/g, "'")
		.replace(/,\s*([}\]])/g, "$1");

/** Pull complete `{...}` objects from a possibly truncated/broken array. */
const extractObjectChunks = (text: string): string[] => {
	const chunks: string[] = [];
	let depth = 0;
	let start = -1;
	let inString = false;
	let escape = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escape) escape = false;
			else if (ch === "\\") escape = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === "{") {
			if (depth === 0) start = i;
			depth++;
		} else if (ch === "}") {
			depth--;
			if (depth === 0 && start >= 0) {
				chunks.push(text.slice(start, i + 1));
				start = -1;
			}
		}
	}
	return chunks;
};

const parseAdviceJson = (raw: string): IngredientStorageAdvice[] => {
	const trimmed = raw.trim();
	const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim();
	const candidate = repairJsonText(fenced ?? trimmed);

	const fromArray = (text: string): IngredientStorageAdvice[] => {
		const parsed = JSON.parse(text) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.map(coerceAdviceRow).filter((row): row is IngredientStorageAdvice => row !== null);
	};

	try {
		const start = candidate.indexOf("[");
		const end = candidate.lastIndexOf("]");
		const slice = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate;
		const tips = fromArray(repairJsonText(slice));
		if (tips.length) return tips;
	} catch {
		// Fall through to per-object recovery (handles truncation / mid-array syntax errors).
	}

	const recovered: IngredientStorageAdvice[] = [];
	for (const chunk of extractObjectChunks(candidate)) {
		try {
			const row = coerceAdviceRow(JSON.parse(repairJsonText(chunk)));
			if (row) recovered.push(row);
		} catch {
			// skip broken object
		}
	}
	if (!recovered.length) {
		throw new Error("Could not parse AI storage guide — try Export again");
	}
	return recovered;
};

const isAnthropicAuthError = (message: string): boolean =>
	/invalid x-api-key|authentication_error|401.*api.?key/i.test(message);

const normalizeAnthropicApiKey = (raw: string): string =>
	raw
		.trim()
		.replace(/^["']+|["']+$/g, "")
		.replace(/[\u200B-\u200D\uFEFF]/g, "");

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
	const apiKey = row?.anthropic_api_key ? normalizeAnthropicApiKey(row.anthropic_api_key) : "";
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
		max_tokens: 8192,
		messages: [
			{
				role: "user",
				content: `You are a cloud-kitchen food safety and prep coach for "${restaurantName}" in India.

This kitchen stores food in ONLY three places:
1) Under the cold bain marie fridge (commercial under-counter cold unit) — NOT a home fridge, NO crisper drawer
2) Small freezer — for ice cream and frozen desserts only
3) Outside wooden racks (dry goods like onion, potato, garlic)

Scan every menu dish and its ingredients below. Extract UNIQUE raw ingredients.

For EACH unique ingredient return practical storage guidance:
- category: ONE of Vegetables, Fruits, Herbs, Dairy, Proteins, Grains & staples, Spices & condiments, Oils & fats, Other
- storagePlace: ONLY "Cold bain marie (under fridge)" OR "Freezer (ice cream)" OR "Outside wooden racks" (recommended place)
- shelfLifeFridge: how long it lasts in the cold bain marie at 1-4C, e.g. "5-7 days". Use "N/A — keep frozen" for ice cream
- shelfLifeOutside: how long it lasts on outside wooden racks (room temp India kitchen), e.g. "1-2 days" or "2-3 weeks". Use "Do not store outside" for dairy, meat, ice cream, and other perishables that must stay cold
- simpleHacks: ONE short tip. Prefer starting with one of: "Wrap in paper towel", "Keep in airtight container", "Keep whole until use", "Store stem-side down", "Peel or cut just before use", "Store in jar with water". NEVER say "crisper", "crisper drawer", "pantry", or "counter"
- usedInDishes: dish names that use it

Rules:
- Plain ASCII English only (no fancy quotes)
- Keep values short so the JSON stays valid
- Merge duplicates across dishes
- Skip pure water/ice
- ALWAYS give BOTH shelfLifeFridge and shelfLifeOutside so staff can compare fridge vs outside life span
- Use Freezer (ice cream) ONLY for ice cream / frozen desserts — not for veggies or dairy that belong in the bain marie
- NEVER say pantry, counter, cupboard, or crisper
- Return ONLY a valid JSON array — no markdown fences, no prose
- Escape any double quotes inside string values as \\"

Keys exactly: ingredient, category, storagePlace, shelfLifeFridge, shelfLifeOutside, simpleHacks, usedInDishes

MENU:
${JSON.stringify(menuPayload)}`,
			},
		],
	});

	const block = response.content[0];
	if (!block || block.type !== "text") throw new Error("Unexpected AI response");
	if (response.stop_reason === "max_tokens") {
		console.warn("[storage-guide] response truncated (max_tokens); recovering partial JSON");
	}
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
            if (isAnthropicAuthError(message)) {
                return res.status(401).json({
                    error: "invalid_api_key",
                    message:
                        "Your Claude API key was rejected. Update it with a Console key from console.anthropic.com (starts with sk-ant-api).",
                });
            }
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
