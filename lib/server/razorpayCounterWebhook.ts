/**
 * Razorpay webhook handler for counter sales invoices.
 * Invoked from /api/counter-invoice when x-razorpay-signature is present.
 */

import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSupabaseAdminOrThrow } from "./verifyOwnerRestaurant";

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
		console.error("[counter-invoice/webhook] update failed", error.message);
		return false;
	}
	return Boolean(data);
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

	const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
	const signature = req.headers["x-razorpay-signature"] as string | undefined;

	if (process.env.RAZORPAY_WEBHOOK_SECRET && !verifyWebhookSignature(rawBody, signature)) {
		res.status(400).json({ error: "Invalid webhook signature" });
		return;
	}

	try {
		const event = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
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

		await markInvoicePaid(invoiceId, paymentId);
		res.status(200).json({ ok: true, invoiceId });
	} catch (error) {
		console.error("[counter-invoice/webhook]", getErrorDetail(error));
		res.status(500).json({ error: "webhook processing failed" });
	}
}
