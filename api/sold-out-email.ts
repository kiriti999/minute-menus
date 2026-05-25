/**
 * Vercel Serverless Function: POST /api/sold-out-email
 *
 * Sends a sold-out notification email to the restaurant owner via Brevo SMTP.
 * Retries up to MAX_RETRIES times with exponential back-off on transient failures.
 *
 * Required env vars (set in Vercel Dashboard → Project → Environment Variables):
 *   BREVO_SMTP_USER — your Brevo login email
 *   BREVO_SMTP_KEY  — SMTP key from Brevo → Transactional → Settings → SMTP & API
 *   FROM_EMAIL      — verified sender address
 */

import { createLogger } from "@minute-menus/logger";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendMail } from "../lib/mailer";
import {
    parseSoldOutPayload,
    rejectUnlessPost,
    soldOutEmailSubject,
} from "./emailRequestHelpers";

const log = createLogger("sold-out-email");

// ─── Retry helper ──────────────────────────────────────────────────────────────

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

// ─── Email HTML builder ────────────────────────────────────────────────────────

function buildHtml(dishName: string, restaurantName: string, reason: "stock" | "manual"): string {
    const reasonText =
        reason === "manual"
            ? "You manually marked this item as sold out from your dashboard."
            : "This item's daily stock limit has been reached through customer orders.";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#000; color:#fff; margin:0; padding:0; }
    .wrapper { max-width:520px; margin:40px auto; background:#111; border:1px solid #222; border-radius:12px; overflow:hidden; }
    .header { background:#fff; padding:24px 32px; text-align:center; }
    .header span { font-size:18px; font-weight:900; color:#000; letter-spacing:-0.5px; }
    .body { padding:32px; }
    .badge { display:inline-block; background:#ef4444; color:#fff; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:4px 10px; border-radius:4px; margin-bottom:20px; }
    h2 { margin:0 0 8px; font-size:22px; color:#fff; }
    p { color:#aaa; font-size:14px; line-height:1.6; margin:0 0 16px; }
    .dish { background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:16px 20px; margin:20px 0; }
    .dish strong { color:#fff; font-size:16px; }
    .dish span { color:#666; font-size:12px; }
    .action { margin-top:24px; }
    .btn { display:inline-block; background:#fff; color:#000; font-weight:700; font-size:13px; letter-spacing:1px; text-transform:uppercase; padding:12px 24px; border-radius:6px; text-decoration:none; }
    .footer { padding:16px 32px; border-top:1px solid #1a1a1a; color:#444; font-size:11px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><span>MINUTE MENUS</span></div>
    <div class="body">
      <div class="badge">Sold Out Alert</div>
      <h2>"${dishName}" is Sold Out</h2>
      <p>${reasonText}</p>
      <div class="dish">
        <strong>${dishName}</strong><br/>
        <span>${restaurantName}</span>
      </div>
      <p>Customers will see a "Sold Out" badge and the order button will be disabled for this item.</p>
      <div class="action">
        <a class="btn" href="${process.env.VITE_SITE_URL ?? "https://minutemenus.com"}">Go to Dashboard →</a>
      </div>
    </div>
    <div class="footer">
      You're receiving this because you own ${restaurantName} on Minute Menus.
    </div>
  </div>
</body>
</html>`.trim();
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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
    const { BREVO_SMTP_KEY, FROM_EMAIL } = process.env;

    try {
        await withRetry(() =>
            sendMail({
                from: `Minute Menus <${FROM_EMAIL ?? "minutemenus@outlook.com"}>`,
                to,
                subject: soldOutEmailSubject(restaurantName, dishName, reason),
                html: buildHtml(dishName, restaurantName, reason),
            }),
        );

        return res.status(200).json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        log.error("all retries exhausted", { message });
        return res.status(502).json({ error: "Failed to send email after retries", detail: message });
    }
}
