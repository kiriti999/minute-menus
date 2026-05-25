/**
 * POST /api/menu/upload-media
 *
 * Owner-authenticated dish media upload via service role (bypasses Storage RLS).
 * Used for images during menu save; keeps uploads under Vercel body limits.
 */

import { rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const log = createLogger("menu-upload-media");

type UploadPayload = {
    restaurantId?: string;
    dishId?: string;
    kind?: "image" | "video";
    dataUrl?: string;
};

const parsePayload = (body: unknown): UploadPayload | null => {
    if (!body || typeof body !== "object") return null;
    const payload = body as UploadPayload;
    if (!payload.restaurantId || !payload.dishId || !payload.kind || !payload.dataUrl) {
        return null;
    }
    if (payload.kind !== "image" && payload.kind !== "video") return null;
    if (!payload.dataUrl.startsWith("data:")) return null;
    return payload;
};

const getBearerToken = (req: VercelRequest): string | null => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice("Bearer ".length).trim() || null;
};

const getAdminClient = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) return null;
    return createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    const admin = getAdminClient();
    if (!admin) {
        log.error("missing supabase env");
        return res.status(500).json({ error: "Server storage is not configured" });
    }

    const token = getBearerToken(req);
    if (!token) {
        return res.status(401).json({ error: "Missing authorization token" });
    }

    const payload = parsePayload(req.body);
    if (!payload) {
        return res.status(400).json({
            error: "Missing or invalid fields: restaurantId, dishId, kind, dataUrl",
        });
    }

    if (payload.kind === "video") {
        return res.status(400).json({
            error: "Large videos must upload directly from the browser.",
        });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData.user) {
        return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data: restaurant, error: restaurantErr } = await admin
        .from("restaurants")
        .select("id")
        .eq("id", payload.restaurantId!)
        .eq("owner_id", authData.user.id)
        .maybeSingle();

    if (restaurantErr || !restaurant) {
        return res.status(403).json({ error: "Not allowed to upload for this restaurant" });
    }

    try {
        const { putDishMediaFromDataUrl } = await import("@minute-menus/menu-persistence");
        const publicUrl = await putDishMediaFromDataUrl(
            admin,
            payload.restaurantId!,
            payload.dishId!,
            payload.dataUrl!,
            payload.kind!,
        );
        return res.status(200).json({ publicUrl });
    } catch (error) {
        log.error("upload failed", {
            message: error instanceof Error ? error.message : String(error),
        });
        return res.status(500).json({
            error: error instanceof Error ? error.message : "Upload failed",
        });
    }
}
