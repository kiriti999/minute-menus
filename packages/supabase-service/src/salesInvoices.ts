import type { SalesDailySummary, SalesInvoice } from "@minute-menus/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@minute-menus/types/db";

type Client = SupabaseClient<Database>;

function mapRow(row: Record<string, unknown>): SalesInvoice {
	return {
		id: row.id as string,
		restaurantId: row.restaurant_id as string,
		invoiceNum: row.invoice_num as number,
		invoiceLabel: row.invoice_label as string,
		items: row.items as SalesInvoice["items"],
		subtotalAmount: Number(row.subtotal_amount),
		gstAmount: Number(row.gst_amount),
		totalAmount: Number(row.total_amount),
		paymentMethod: (row.payment_method as SalesInvoice["paymentMethod"]) ?? null,
		paymentStatus: row.payment_status as SalesInvoice["paymentStatus"],
		customerPhone: (row.customer_phone as string | null) ?? null,
		razorpayOrderId: (row.razorpay_order_id as string | null) ?? null,
		razorpayPaymentId: (row.razorpay_payment_id as string | null) ?? null,
		paymentLinkUrl: (row.payment_link_url as string | null) ?? null,
		razorpayQrImageUrl: (row.razorpay_qr_image_url as string | null) ?? null,
		paidAt: (row.paid_at as string | null) ?? null,
		createdAt: row.created_at as string,
	};
}

function startOfTodayIso(): string {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}

export async function listTodaySalesInvoices(client: Client, restaurantId: string): Promise<SalesInvoice[]> {
	const { data, error } = await client
		.from("sales_invoices")
		.select("*")
		.eq("restaurant_id", restaurantId)
		.gte("created_at", startOfTodayIso())
		.order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getTodaySalesSummary(client: Client, restaurantId: string): Promise<SalesDailySummary> {
	const { data, error } = await client
		.from("sales_invoices")
		.select("total_amount, payment_method, payment_status")
		.eq("restaurant_id", restaurantId)
		.eq("payment_status", "paid")
		.gte("created_at", startOfTodayIso());
	if (error) throw error;

	let cashTotal = 0;
	let paytmCardTotal = 0;
	let razorpayTotal = 0;

	for (const row of data ?? []) {
		const amt = Number(row.total_amount);
		if (row.payment_method === "cash") cashTotal += amt;
		else if (row.payment_method === "paytm_card") paytmCardTotal += amt;
		else if (row.payment_method === "razorpay") razorpayTotal += amt;
	}

	const round = (n: number) => Math.round(n * 100) / 100;

	return {
		cashTotal: round(cashTotal),
		paytmCardTotal: round(paytmCardTotal),
		razorpayTotal: round(razorpayTotal),
		grandTotal: round(cashTotal + paytmCardTotal + razorpayTotal),
		invoiceCount: data?.length ?? 0,
	};
}
