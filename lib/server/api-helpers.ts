/** Server-only API helpers (inlined for Vercel — do not import from browser code). */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export const setCorsPreflightHeaders = (res: VercelResponse): void => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-internal-secret");
};

export const rejectUnlessMethod = (
    req: VercelRequest,
    res: VercelResponse,
    method: string,
): boolean => {
    if (req.method === "OPTIONS") {
        setCorsPreflightHeaders(res);
        res.status(200).end();
        return true;
    }
    if (req.method !== method) {
        res.status(405).json({ error: "Method not allowed" });
        return true;
    }
    return false;
};

export const rejectUnlessPost = (req: VercelRequest, res: VercelResponse): boolean =>
    rejectUnlessMethod(req, res, "POST");

/**
 * Vercel sends `Authorization: Bearer $CRON_SECRET` to cron routes when the
 * CRON_SECRET env var is set. Fails closed: without the secret, nobody can
 * trigger the job (otherwise anyone could e.g. mark tonight's meals delivered).
 */
export const verifyCronRequest = (req: VercelRequest, res: VercelResponse): boolean => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        res.status(503).json({ error: "CRON_SECRET is not configured" });
        return false;
    }
    if (req.headers.authorization !== `Bearer ${secret}`) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }
    return true;
};

export const parseSoldOutPayload = (
    body: unknown,
): { to: string; restaurantName: string; dishName: string; reason: "stock" | "manual" } | null => {
    const payload = body as Partial<{
        to: string;
        restaurantName: string;
        dishName: string;
        reason: "stock" | "manual";
    }>;
    if (!payload.to || !payload.restaurantName || !payload.dishName || !payload.reason) {
        return null;
    }
    return {
        to: payload.to,
        restaurantName: payload.restaurantName,
        dishName: payload.dishName,
        reason: payload.reason,
    };
};

export const soldOutEmailSubject = (
    restaurantName: string,
    dishName: string,
    reason: "stock" | "manual",
): string =>
    reason === "manual"
        ? `[${restaurantName}] "${dishName}" marked as Sold Out`
        : `[${restaurantName}] "${dishName}" is now Sold Out (stock depleted)`;

export const getErrorDetail = (err: unknown): string =>
    err instanceof Error ? err.message : String(err);

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

/** Wraps a POST-only payment handler with consistent error JSON (never raw Vercel crash). */
export const runPostHandler = async (
    req: VercelRequest,
    res: VercelResponse,
    handler: Handler,
    scope: string,
): Promise<void> => {
    try {
        if (rejectUnlessPost(req, res)) return;
        await handler(req, res);
    } catch (error) {
        const message = getErrorDetail(error);
        console.error(`[${scope}] unhandled error`, message);
        if (!res.writableEnded) {
            res.status(500).json({ error: `${scope} failed`, detail: message });
        }
    }
};
