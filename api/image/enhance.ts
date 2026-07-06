/**
 * POST /api/image/enhance
 * Owner-authenticated AI food photo enhancement via Gemini.
 */

import { getErrorDetail, rejectUnlessPost } from "@minute-menus/api-helpers";
import { createLogger } from "@minute-menus/logger";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { enhanceFoodPhoto, parseDataUrl } from "../../lib/imageEditor/enhanceFoodPhoto";
import {
  isPhotographyStyleId,
  toGeminiAspectRatio,
  type PhotographyStyleId,
} from "../../lib/imageEditor/styles";

const log = createLogger("image/enhance");

/** Vercel Pro+ — allows Replicate polling (15–60s typical). */
export const maxDuration = 120;

type EnhancePayload = {
  restaurantId: string;
  imageDataUrl: string;
  styleId: PhotographyStyleId;
  outputWidth?: number;
  outputHeight?: number;
};

const getBearerToken = (req: VercelRequest): string | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
};

type RawEnhancePayload = {
  restaurantId?: string;
  imageDataUrl?: string;
  styleId?: string;
  outputWidth?: number;
  outputHeight?: number;
};

const parsePayload = (body: unknown): EnhancePayload | null => {
  if (!body || typeof body !== "object") return null;
  const payload = body as RawEnhancePayload;
  if (!payload.restaurantId || !payload.imageDataUrl || !payload.styleId) return null;
  if (!payload.imageDataUrl.startsWith("data:image/")) return null;
  if (!isPhotographyStyleId(payload.styleId)) return null;
  return {
    restaurantId: payload.restaurantId,
    imageDataUrl: payload.imageDataUrl,
    styleId: payload.styleId,
    outputWidth: payload.outputWidth,
    outputHeight: payload.outputHeight,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (rejectUnlessPost(req, res)) return;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return res.status(500).json({ error: "Server is not configured" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const payload = parsePayload(req.body);
    if (!payload) {
      return res.status(400).json({
        error: "Missing or invalid fields: restaurantId, imageDataUrl, styleId",
      });
    }

    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData.user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data: restaurant, error: restaurantErr } = await admin
      .from("restaurants")
      .select("id")
      .eq("id", payload.restaurantId)
      .eq("owner_id", authData.user.id)
      .maybeSingle();

    if (restaurantErr || !restaurant) {
      return res.status(403).json({ error: "Not allowed to enhance images for this restaurant" });
    }

    const { mimeType, base64 } = parseDataUrl(payload.imageDataUrl);
    const aspectRatio =
      payload.outputWidth && payload.outputHeight
        ? toGeminiAspectRatio(payload.outputWidth, payload.outputHeight)
        : undefined;

    const result = await enhanceFoodPhoto({
      imageBase64: base64,
      mimeType,
      styleId: payload.styleId,
      aspectRatio,
    });

    return res.status(200).json({
      imageDataUrl: result.imageDataUrl,
      summary: result.summary,
      provider: result.provider,
    });
  } catch (error) {
    const msg = getErrorDetail(error);
    log.error("enhance failed", { message: msg });
    const status = msg.includes("GEMINI_API_KEY") ? 503 : 502;
    return res.status(status).json({ error: msg });
  }
}
