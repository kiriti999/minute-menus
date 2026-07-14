/**
 * POST /api/counter-invoice?action=create|mark-paid|get
 * Owner-authenticated counter billing (Phase 1).
 */

import { calculateOrderTax, enrichOrderItemsWithGst } from "@minute-menus/currency";
import type { SalesInvoiceLine, SalesPaymentMethod } from "@minute-menus/types";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createCounterRazorpayArtifacts } from "../lib/server/razorpayCounterPayments";
import { requireSupabaseAdminOrThrow, verifyOwnerForRestaurant } from "../lib/server/verifyOwnerRestaurant";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

const getErrorDetail = (err: unknown): string =>
	err instanceof Error ? err.message : String(err);

const normalizeAction = (action: string | string[] | undefined): string => {
	if (!action) return "";
	return Array.isArray(action) ? action[0] ?? "" : action;
};

async function handleCreate(req: VercelRequest, res: VercelResponse) {
	const { restaurantId, items, customerPhone, currency = "INR" } = req.body as {
		restaurantId?: string;
		items?: SalesInvoiceLine[];
		customerPhone?: string;
		currency?: string;
	};

	if (!restaurantId || !items?.length) {
		return res.status(400).json({ error: "restaurantId and items are required" });
	}

	const owner = await verifyOwnerForRestaurant(req, restaurantId);
	if (!owner) return res.status(401).json({ error: "Unauthorized" });

	const lines = items.map((i) => ({ price: Number(i.price), quantity: Number(i.quantity) }));
	const tax = calculateOrderTax(lines, currency);
	if (tax.total <= 0) {
		return res.status(400).json({ error: "Bill total must be greater than zero" });
	}

	const admin = requireSupabaseAdminOrThrow();
	const { data: seqRows, error: seqErr } = await admin.rpc("next_sales_invoice_label", {
		p_restaurant_id: restaurantId,
	});
	if (seqErr || !seqRows?.[0]) {
		return res.status(500).json({ error: "Failed to allocate invoice number", detail: seqErr?.message });
	}

	const seq = seqRows[0] as { invoice_num: number; invoice_label: string };
	const enrichedItems = enrichOrderItemsWithGst(
		items.map((i) => ({
			dishId: i.dishId,
			name: i.name,
			price: Number(i.price),
			quantity: Number(i.quantity),
		})),
		currency,
	);

	const { data: invoice, error: insertErr } = await admin
		.from("sales_invoices")
		.insert({
			restaurant_id: restaurantId,
			invoice_num: seq.invoice_num,
			invoice_label: seq.invoice_label,
			items: enrichedItems as unknown as Json,
			subtotal_amount: tax.subtotal,
			gst_amount: tax.gstAmount,
			total_amount: tax.total,
			payment_status: "pending",
			customer_phone: customerPhone?.trim() || null,
		})
		.select("*")
		.single();

	if (insertErr || !invoice) {
		return res.status(500).json({ error: "Failed to create invoice", detail: insertErr?.message });
	}

	try {
		const amountPaise = Math.round(tax.total * 100);
		const razorpay = await createCounterRazorpayArtifacts({
			amountPaise,
			currency,
			invoiceId: invoice.id,
			invoiceLabel: seq.invoice_label,
			restaurantId,
			customerPhone: customerPhone?.trim() || null,
		});

		const { data: updated, error: updErr } = await admin
			.from("sales_invoices")
			.update({
				razorpay_order_id: razorpay.orderId,
				razorpay_qr_id: razorpay.qrId,
				razorpay_qr_image_url: razorpay.qrImageUrl,
				razorpay_payment_link_id: razorpay.paymentLinkId,
				payment_link_url: razorpay.paymentLinkUrl,
			})
			.eq("id", invoice.id)
			.select("*")
			.single();

		if (updErr || !updated) {
			return res.status(502).json({ error: "Invoice created but Razorpay setup failed", invoiceId: invoice.id });
		}

		return res.status(200).json(mapInvoiceRow(updated));
	} catch (e) {
		return res.status(502).json({
			error: "Razorpay not configured or request failed",
			detail: getErrorDetail(e),
			invoiceId: invoice.id,
		});
	}
}

async function handleMarkPaid(req: VercelRequest, res: VercelResponse) {
	const { invoiceId, restaurantId, paymentMethod } = req.body as {
		invoiceId?: string;
		restaurantId?: string;
		paymentMethod?: SalesPaymentMethod;
	};

	if (!invoiceId || !restaurantId || !paymentMethod) {
		return res.status(400).json({ error: "invoiceId, restaurantId and paymentMethod are required" });
	}
	if (paymentMethod !== "cash" && paymentMethod !== "paytm_card") {
		return res.status(400).json({ error: "paymentMethod must be cash or paytm_card" });
	}

	const owner = await verifyOwnerForRestaurant(req, restaurantId);
	if (!owner) return res.status(401).json({ error: "Unauthorized" });

	const admin = requireSupabaseAdminOrThrow();
	const { data, error } = await admin
		.from("sales_invoices")
		.update({
			payment_status: "paid",
			payment_method: paymentMethod,
			paid_at: new Date().toISOString(),
		})
		.eq("id", invoiceId)
		.eq("restaurant_id", restaurantId)
		.eq("payment_status", "pending")
		.select("*")
		.single();

	if (error || !data) {
		return res.status(404).json({ error: "Invoice not found or already paid" });
	}

	return res.status(200).json(mapInvoiceRow(data));
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
	const invoiceId = (req.query.invoiceId ?? req.body?.invoiceId) as string | undefined;
	const restaurantId = (req.query.restaurantId ?? req.body?.restaurantId) as string | undefined;

	if (!invoiceId || !restaurantId) {
		return res.status(400).json({ error: "invoiceId and restaurantId are required" });
	}

	const owner = await verifyOwnerForRestaurant(req, restaurantId);
	if (!owner) return res.status(401).json({ error: "Unauthorized" });

	const admin = requireSupabaseAdminOrThrow();
	const { data, error } = await admin
		.from("sales_invoices")
		.select("*")
		.eq("id", invoiceId)
		.eq("restaurant_id", restaurantId)
		.maybeSingle();

	if (error || !data) return res.status(404).json({ error: "Invoice not found" });
	return res.status(200).json(mapInvoiceRow(data));
}

function mapInvoiceRow(row: Record<string, unknown>) {
	return {
		id: row.id as string,
		restaurantId: row.restaurant_id as string,
		invoiceNum: row.invoice_num as number,
		invoiceLabel: row.invoice_label as string,
		items: row.items as SalesInvoiceLine[],
		subtotalAmount: Number(row.subtotal_amount),
		gstAmount: Number(row.gst_amount),
		totalAmount: Number(row.total_amount),
		paymentMethod: (row.payment_method as SalesPaymentMethod | null) ?? null,
		paymentStatus: row.payment_status as string,
		customerPhone: (row.customer_phone as string | null) ?? null,
		razorpayOrderId: (row.razorpay_order_id as string | null) ?? null,
		razorpayPaymentId: (row.razorpay_payment_id as string | null) ?? null,
		paymentLinkUrl: (row.payment_link_url as string | null) ?? null,
		razorpayQrImageUrl: (row.razorpay_qr_image_url as string | null) ?? null,
		paidAt: (row.paid_at as string | null) ?? null,
		createdAt: row.created_at as string,
	};
}

const ROUTES: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<unknown>> = {
	create: handleCreate,
	"mark-paid": handleMarkPaid,
	get: handleGet,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
	if (req.method === "OPTIONS") return res.status(200).end();
	if (req.method !== "POST" && req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const action = normalizeAction(req.query.action as string | string[] | undefined);
	const routeHandler = ROUTES[action];
	if (!routeHandler) {
		return res.status(404).json({ error: `Unknown action: ${action || "(none)"}` });
	}

	try {
		await routeHandler(req, res);
	} catch (error) {
		const message = getErrorDetail(error);
		console.error(`[counter-invoice/${action}]`, message);
		if (!res.writableEnded) {
		 res.status(500).json({ error: "counter-invoice failed", detail: message });
		}
	}
}
