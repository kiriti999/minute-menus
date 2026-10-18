/**
 * Razorpay webhook handler for counter sales invoices.
 * Invoked from /api/counter-invoice when x-razorpay-signature is present.
 */

import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRazorpayClient } from "./razorpayCounterPayments.js";
import { requireSupabaseAdminOrThrow } from "./verifyOwnerRestaurant.js";

const getErrorDetail = (err: unknown): string =>
	err instanceof Error ? err.message : String(err);

function verifyWebhookSignature(body: string, signature: string | undefined): boolean {
	const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
	if (!secret || !signature) return false;
	const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
	const a = Buffer.from(expected, "utf8");
	const b = Buffer.from(signature, "utf8");
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * The exact bytes Razorpay signed. JSON.stringify of an already-parsed body can
 * differ (key order, spacing, unicode escapes), so read the request stream
 * before anything touches req.body; fall back only if it was already consumed.
 */
async function readRawBody(req: VercelRequest): Promise<string> {
	if (req.readable && !req.readableEnded) {
		const chunks: Buffer[] = [];
		for await (const chunk of req) {
			chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
		}
		const raw = Buffer.concat(chunks).toString("utf8");
		if (raw) return raw;
	}
	const body: unknown = req.body;
	if (typeof body === "string") return body;
	if (Buffer.isBuffer(body)) return body.toString("utf8");
	console.warn("[counter-invoice/webhook] raw body unavailable; verifying re-serialized JSON");
	return JSON.stringify(body ?? {});
}

async function markInvoicePaid(invoiceId: string, paymentId: string): Promise<boolean> {
	const admin = requireSupabaseAdminOrThrow();
	const { data, error } = await admin
		.from("sales_invoices")
		.update({
			payment_status: "paid",
			payment_method: "razorpay",
			razorpay_payment_id: paymentId,
			paid_at: new Date().toISOString(),
		})
		.eq("id", invoiceId)
		.eq("payment_status", "pending")
		.select("id")
		.maybeSingle();

	if (error) {
		// Throw so the handler returns 500 and Razorpay retries the webhook.
		throw new Error(`Invoice update failed: ${error.message}`);
	}
	return Boolean(data);
}

/**
 * Each counter bill has both a QR code and a payment link, and the cashier can
 * also mark it paid in cash. A payment arriving for an invoice that is already
 * paid by something else is a double charge — refund it in full.
 * (Razorpay sends several events for one payment; the same id is never refunded.)
 */
async function refundIfDuplicatePayment(invoiceId: string, paymentId: string): Promise<boolean> {
	if (!paymentId || paymentId === "unknown") return false;
	const admin = requireSupabaseAdminOrThrow();
	const { data: invoice, error } = await admin
		.from("sales_invoices")
		.select("payment_status, razorpay_payment_id")
		.eq("id", invoiceId)
		.maybeSingle();
	if (error) throw new Error(`Invoice lookup failed: ${error.message}`);
	if (!invoice || invoice.payment_status !== "paid" || invoice.razorpay_payment_id === paymentId) return false;

	await createRazorpayClient().payments.refund(paymentId, {
		speed: "normal",
		notes: { invoiceId, reason: "Counter bill was already paid" },
	});
	console.warn("[counter-invoice/webhook] refunded duplicate payment", { invoiceId, paymentId });
	return true;
}

async function resolveInvoiceId(payload: Record<string, unknown>): Promise<string | null> {
	const paymentWrap = payload.payment as { entity?: Record<string, unknown> } | undefined;
	const linkWrap = payload.payment_link as { entity?: Record<string, unknown> } | undefined;
	const payment = paymentWrap?.entity;
	const link = linkWrap?.entity;

	const notes =
		(payment?.notes as Record<string, string> | undefined) ??
		(link?.notes as Record<string, string> | undefined);

	if (notes?.invoiceId) return notes.invoiceId;

	const referenceId = link?.reference_id as string | undefined;
	if (referenceId) return referenceId;

	const orderId = payment?.order_id as string | undefined;
	if (!orderId) return null;

	const admin = requireSupabaseAdminOrThrow();
	const { data } = await admin
		.from("sales_invoices")
		.select("id")
		.eq("razorpay_order_id", orderId)
		.maybeSingle();

	return data?.id ?? null;
}

export async function handleRazorpayCounterWebhook(
	req: VercelRequest,
	res: VercelResponse,
): Promise<void> {
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method not allowed" });
		return;
	}

	const rawBody = await readRawBody(req);
	const signature = req.headers["x-razorpay-signature"] as string | undefined;

	// Fail closed: without the secret anyone could mark counter invoices paid.
	if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
		console.error("[counter-invoice/webhook] RAZORPAY_WEBHOOK_SECRET is not configured");
		res.status(503).json({ error: "Webhook not configured" });
		return;
	}
	if (!verifyWebhookSignature(rawBody, signature)) {
		res.status(400).json({ error: "Invalid webhook signature" });
		return;
	}

	try {
		const event = JSON.parse(rawBody) as {
			event?: string;
			payload?: Record<string, unknown>;
		};

		const eventName = event.event ?? "";
		if (
			!eventName.startsWith("payment.captured") &&
			!eventName.startsWith("payment_link.paid") &&
			!eventName.startsWith("qr_code.credited")
		) {
			res.status(200).json({ ok: true, ignored: true });
			return;
		}

		const payload = event.payload ?? {};
		const paymentWrap = payload.payment as { entity?: Record<string, unknown> } | undefined;
		const paymentEntity = paymentWrap?.entity;
		const paymentId = (paymentEntity?.id as string | undefined) ?? "unknown";

		const invoiceId = await resolveInvoiceId(payload);
		if (!invoiceId) {
			res.status(200).json({ ok: true, skipped: "no invoice match" });
			return;
		}

		if (await markInvoicePaid(invoiceId, paymentId)) {
			res.status(200).json({ ok: true, invoiceId });
			return;
		}
		const refunded = await refundIfDuplicatePayment(invoiceId, paymentId);
		res.status(200).json({ ok: true, invoiceId, duplicateRefunded: refunded });
	} catch (error) {
		console.error("[counter-invoice/webhook]", getErrorDetail(error));
		res.status(500).json({ error: "webhook processing failed" });
	}
}
