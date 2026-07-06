import { getErrorDetail, rejectUnlessPost } from "../server/api-helpers";
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
