/**
 * POST /api/parse-invoice
 * Owner-authenticated. Accepts a purchase invoice (PDF or image data URL),
 * extracts ingredient line items via Anthropic Claude vision, and returns a
 * normalized table the UI can review and save. Self-contained (npm imports
 * only) so Vercel bundles it reliably.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Vision on multi-page PDFs can take a while. */
export const maxDuration = 60;

/** Overridable; defaults to the Claude Haiku model used elsewhere in the org. */
const CLAUDE_MODEL = process.env.INVOICE_AI_MODEL ?? "claude-haiku-4-5";

type PurchaseUnit = "kg" | "g" | "l" | "ml" | "piece";
type LineItem = { name: string; quantity: number; unit: PurchaseUnit; amount: number };

const VALID_UNITS: PurchaseUnit[] = ["kg", "g", "l", "ml", "piece"];

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

const parseDataUrl = (dataUrl: string): { mimeType: string; base64: string } | null => {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    return { mimeType: match[1], base64: match[2] };
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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
        const { data: userData, error: userErr } = await admin.auth.getUser(token);
        if (userErr || !userData.user) {
            return res.status(401).json({ error: "Invalid or expired session" });
        }

        const { data: restaurant, error: restErr } = await admin
            .from("restaurants")
            .select("id")
            .eq("id", restaurantId)
            .eq("owner_id", userData.user.id)
            .maybeSingle();
        if (restErr || !restaurant) {
            return res.status(403).json({ error: "Not allowed to parse invoices for this restaurant" });
        }

        const lineItems = await extractLineItems(parsed.mimeType, parsed.base64);
        const total = Math.round(lineItems.reduce((s, i) => s + i.amount, 0) * 100) / 100;

        return res.status(200).json({ lineItems, total, unitsAllowed: VALID_UNITS });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[parse-invoice] failed", message);
        const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 502;
        return res.status(status).json({ error: "Failed to parse invoice", detail: message });
    }
}
