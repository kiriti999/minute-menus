import type { SalesInvoice, SalesInvoiceLine, SalesPaymentMethod } from "@minute-menus/types";
import { supabase } from "./supabase";

async function authHeaders(): Promise<HeadersInit> {
	const { data } = await supabase.auth.getSession();
	const token = data.session?.access_token;
	if (!token) throw new Error("Please sign in to use counter billing.");
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
}

export async function createCounterInvoice(input: {
	restaurantId: string;
	items: SalesInvoiceLine[];
	customerPhone?: string;
	currency?: string;
}): Promise<SalesInvoice> {
	const res = await fetch("/api/counter-invoice?action=create", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify(input),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error ?? data.detail ?? "Failed to create bill");
	return data as SalesInvoice;
}

export async function markCounterInvoicePaid(input: {
	invoiceId: string;
	restaurantId: string;
	paymentMethod: Extract<SalesPaymentMethod, "cash" | "paytm_card">;
}): Promise<SalesInvoice> {
	const res = await fetch("/api/counter-invoice?action=mark-paid", {
		method: "POST",
		headers: await authHeaders(),
		body: JSON.stringify(input),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error ?? "Failed to mark paid");
	return data as SalesInvoice;
}

export async function getCounterInvoice(invoiceId: string, restaurantId: string): Promise<SalesInvoice> {
	const params = new URLSearchParams({ invoiceId, restaurantId });
	const res = await fetch(`/api/counter-invoice?action=get&${params.toString()}`, {
		method: "GET",
		headers: await authHeaders(),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error ?? "Failed to load invoice");
	return data as SalesInvoice;
}

export function whatsAppPaymentLink(url: string, label: string, total: number): string {
	const text = `Please pay ₹${total.toFixed(2)} for ${label}:\n${url}`;
	return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
