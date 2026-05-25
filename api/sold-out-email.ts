/**
 * Vercel Serverless Function: POST /api/sold-out-email
 */

import {
    getErrorDetail,
    parseSoldOutPayload,
    rejectUnlessPost,
    soldOutEmailSubject,
} from "@minute-menus/api-helpers";
import { buildSoldOutEmailHtml } from "@minute-menus/email-templates";
import { createLogger } from "@minute-menus/logger";
import { sendMail } from "@minute-menus/mailer";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const log = createLogger("sold-out-email");

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

async function withRetry<T>(
    fn: () => Promise<T>,
    retries = MAX_RETRIES,
    delayMs = BASE_DELAY_MS,
): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 0) throw err;
        await new Promise((res) => setTimeout(res, delayMs));
        return withRetry(fn, retries - 1, delayMs * 2);
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (rejectUnlessPost(req, res)) return;

    if (!process.env.BREVO_SMTP_KEY) {
        log.error("BREVO_SMTP_KEY not configured");
        return res.status(500).json({ error: "Email not configured" });
    }

    const payload = parseSoldOutPayload(req.body);
    if (!payload) {
        return res.status(400).json({
            error: "Missing required fields: to, restaurantName, dishName, reason",
        });
    }

    const { to, restaurantName, dishName, reason } = payload;
    const fromEmail = process.env.FROM_EMAIL ?? "minutemenus@outlook.com";

    try {
        await withRetry(() =>
            sendMail({
                from: `Minute Menus <${fromEmail}>`,
                to,
                subject: soldOutEmailSubject(restaurantName, dishName, reason),
                html: buildSoldOutEmailHtml(dishName, restaurantName, reason),
            }),
        );

        return res.status(200).json({ ok: true });
    } catch (err) {
        log.error("all retries exhausted", { message: getErrorDetail(err) });
        return res.status(502).json({
            error: "Failed to send email after retries",
            detail: getErrorDetail(err),
        });
    }
}
