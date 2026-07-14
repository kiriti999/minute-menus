import type { SalesDailySummary, SalesInvoice } from "@minute-menus/types";
import { formatPriceInCurrency } from "@minute-menus/currency";
import { getErrorMessage } from "@minute-menus/errors";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { supabaseService } from "../services/supabaseService";

export interface SalesViewProps {
	currency: string;
	isDarkTheme: boolean;
	onNewBill: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({ currency, isDarkTheme, onNewBill }) => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
	const [summary, setSummary] = useState<SalesDailySummary | null>(null);

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [rows, sum] = await Promise.all([
				supabaseService.listTodaySalesInvoices(),
				supabaseService.getTodaySalesSummary(),
			]);
			setInvoices(rows);
			setSummary(sum);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	if (loading) {
		return (
			<div className="flex justify-center py-20">
				<Loader2 className="animate-spin text-zinc-400" size={28} />
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-12">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className={`text-3xl font-light tracking-tight mb-1 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
						Sales
					</h1>
					<p className={`text-sm ${muted}`}>Today&apos;s counter invoices and payment totals.</p>
				</div>
				<button
					type="button"
					onClick={onNewBill}
					className={`px-4 py-2 rounded-lg text-sm font-bold ${
						isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
					}`}
				>
					New counter bill
				</button>
			</div>

			{error && (
				<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			{summary && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ label: "Cash", value: summary.cashTotal },
						{ label: "Razorpay", value: summary.razorpayTotal },
						{ label: "Paytm card", value: summary.paytmCardTotal },
						{ label: "Total", value: summary.grandTotal },
					].map((s) => (
						<div key={s.label} className={`rounded-xl border p-4 ${card}`}>
							<p className={`text-xs uppercase tracking-wider ${muted}`}>{s.label}</p>
							<p className={`text-xl font-bold mt-1 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
								{formatPriceInCurrency(s.value, currency)}
							</p>
						</div>
					))}
				</div>
			)}

			<div className={`rounded-xl border overflow-hidden ${card}`}>
				<table className="w-full text-sm">
					<thead className={isDarkTheme ? "bg-zinc-950" : "bg-zinc-50"}>
						<tr className={`text-left text-xs uppercase ${muted}`}>
							<th className="p-3">Invoice</th>
							<th className="p-3">Time</th>
							<th className="p-3">Payment</th>
							<th className="p-3 text-right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{invoices.length === 0 && (
							<tr>
								<td colSpan={4} className={`p-6 text-center ${muted}`}>
									No counter sales today yet.
								</td>
							</tr>
						)}
						{invoices.map((inv) => (
							<tr key={inv.id} className={isDarkTheme ? "border-t border-zinc-800" : "border-t border-zinc-100"}>
								<td className={`p-3 font-mono ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
									{inv.invoiceLabel}
								</td>
								<td className={`p-3 ${muted}`}>
									{new Date(inv.paidAt ?? inv.createdAt).toLocaleTimeString(undefined, {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</td>
								<td className={`p-3 capitalize ${muted}`}>
									{inv.paymentStatus === "paid" ? inv.paymentMethod ?? "—" : "pending"}
								</td>
								<td className={`p-3 text-right font-mono ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
									{formatPriceInCurrency(inv.totalAmount, currency)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
