import type { Category, SalesInvoice } from "@minute-menus/types";
import { INDIAN_RESTAURANT_GST_PERCENT, calculateOrderTax, formatPriceInCurrency } from "@minute-menus/currency";
import { getErrorMessage } from "@minute-menus/errors";
import { Copy, Loader2, Minus, Plus, Smartphone } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createCounterInvoice,
	getCounterInvoice,
	markCounterInvoicePaid,
	whatsAppPaymentLink,
} from "../lib/counterInvoiceClient";

type CartLine = { dishId: string; name: string; price: number; quantity: number };

export interface CounterBillViewProps {
	menuItems: Category[];
	restaurantId: string;
	currency: string;
	isDarkTheme: boolean;
}

export const CounterBillView: React.FC<CounterBillViewProps> = ({
	menuItems,
	restaurantId,
	currency,
	isDarkTheme,
}) => {
	const [cart, setCart] = useState<CartLine[]>([]);
	const [customerPhone, setCustomerPhone] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [invoice, setInvoice] = useState<SalesInvoice | null>(null);

	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";
	const muted = isDarkTheme ? "text-zinc-400" : "text-zinc-500";
	const input = isDarkTheme
		? "bg-zinc-950 border-zinc-700 text-white"
		: "bg-zinc-50 border-zinc-300 text-zinc-900";

	const tax = useMemo(
		() => calculateOrderTax(cart.map((c) => ({ price: c.price, quantity: c.quantity })), currency),
		[cart, currency],
	);

	const addItem = (dishId: string, name: string, price: number) => {
		setCart((prev) => {
			const existing = prev.find((l) => l.dishId === dishId);
			if (existing) {
				return prev.map((l) => (l.dishId === dishId ? { ...l, quantity: l.quantity + 1 } : l));
			}
			return [...prev, { dishId, name, price, quantity: 1 }];
		});
	};

	const changeQty = (dishId: string, delta: number) => {
		setCart((prev) =>
			prev
				.map((l) => (l.dishId === dishId ? { ...l, quantity: l.quantity + delta } : l))
				.filter((l) => l.quantity > 0),
		);
	};

	const createBill = async () => {
		if (!cart.length) return;
		setBusy(true);
		setError(null);
		try {
			const created = await createCounterInvoice({
				restaurantId,
				items: cart,
				customerPhone: customerPhone.trim() || undefined,
				currency,
			});
			setInvoice(created);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};

	const markPaid = async (method: "cash" | "paytm_card") => {
		if (!invoice) return;
		setBusy(true);
		setError(null);
		try {
			const updated = await markCounterInvoicePaid({
				invoiceId: invoice.id,
				restaurantId,
				paymentMethod: method,
			});
			setInvoice(updated);
		} catch (err) {
			setError(getErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};

	const pollInvoice = useCallback(async () => {
		if (!invoice || invoice.paymentStatus === "paid") return;
		try {
			const fresh = await getCounterInvoice(invoice.id, restaurantId);
			if (fresh.paymentStatus === "paid") setInvoice(fresh);
		} catch {
			/* ignore poll errors */
		}
	}, [invoice, restaurantId]);

	useEffect(() => {
		if (!invoice || invoice.paymentStatus === "paid") return;
		const t = setInterval(() => void pollInvoice(), 4000);
		return () => clearInterval(t);
	}, [invoice, pollInvoice]);

	const reset = () => {
		setCart([]);
		setInvoice(null);
		setCustomerPhone("");
		setError(null);
	};

	const copyLink = async () => {
		if (!invoice?.paymentLinkUrl) return;
		await navigator.clipboard.writeText(invoice.paymentLinkUrl);
	};

	return (
		<div className="space-y-6 pb-16">
			<div>
				<h1 className={`text-3xl font-light tracking-tight mb-1 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
					Counter bill
				</h1>
				<p className={`text-sm ${muted}`}>
					Dynamic Razorpay QR & payment link (UPI + card). Cash / Paytm card marked manually.
				</p>
			</div>

			{error && (
				<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
					{error}
				</div>
			)}

			{!invoice && (
				<div className="grid gap-6 lg:grid-cols-2">
					<div className={`rounded-xl border p-4 max-h-[60vh] overflow-y-auto ${card}`}>
						{menuItems.map((cat) => (
							<div key={cat.id} className="mb-4">
								<h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${muted}`}>{cat.title}</h3>
								<div className="space-y-1">
									{cat.items.map((dish) => (
										<button
											key={dish.id}
											type="button"
											onClick={() => addItem(dish.id, dish.name, dish.price)}
											className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-lg text-sm ${
												isDarkTheme ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
											}`}
										>
											<span className={isDarkTheme ? "text-white" : "text-zinc-900"}>{dish.name}</span>
											<span className={muted}>{formatPriceInCurrency(dish.price, currency)}</span>
										</button>
									))}
								</div>
							</div>
						))}
					</div>

					<div className={`rounded-xl border p-4 space-y-4 ${card}`}>
						<h2 className={`font-semibold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>Cart</h2>
						{cart.length === 0 && <p className={`text-sm ${muted}`}>Tap menu items to add.</p>}
						{cart.map((line) => (
							<div key={line.dishId} className="flex items-center justify-between gap-2 text-sm">
								<span className={`flex-1 ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>{line.name}</span>
								<div className="flex items-center gap-2">
									<button type="button" onClick={() => changeQty(line.dishId, -1)} className="p-1 rounded border border-zinc-600">
										<Minus size={14} />
									</button>
									<span>{line.quantity}</span>
									<button type="button" onClick={() => changeQty(line.dishId, 1)} className="p-1 rounded border border-zinc-600">
										<Plus size={14} />
									</button>
								</div>
							</div>
						))}
						<input
							type="tel"
							placeholder="Customer mobile (optional, for WhatsApp link)"
							value={customerPhone}
							onChange={(e) => setCustomerPhone(e.target.value)}
							className={`w-full rounded-lg border px-3 py-2 text-sm ${input}`}
						/>
						<div className={`text-sm space-y-1 pt-2 border-t ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
							<div className="flex justify-between">
								<span className={muted}>Subtotal</span>
								<span>{formatPriceInCurrency(tax.subtotal, currency)}</span>
							</div>
							{currency === "INR" && (
								<div className="flex justify-between">
									<span className={muted}>GST ({INDIAN_RESTAURANT_GST_PERCENT}%)</span>
									<span>{formatPriceInCurrency(tax.gstAmount, currency)}</span>
								</div>
							)}
							<div className={`flex justify-between font-bold text-lg ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
								<span>Total</span>
								<span>{formatPriceInCurrency(tax.total, currency)}</span>
							</div>
						</div>
						<button
							type="button"
							disabled={busy || cart.length === 0}
							onClick={() => void createBill()}
							className={`w-full py-3 rounded-lg font-bold text-sm ${
								isDarkTheme ? "bg-white text-black" : "bg-zinc-900 text-white"
							} disabled:opacity-50`}
						>
							{busy ? <Loader2 className="animate-spin mx-auto" size={18} /> : "Create bill & payment QR"}
						</button>
					</div>
				</div>
			)}

			{invoice && (
				<div className={`rounded-xl border p-6 space-y-4 max-w-lg mx-auto ${card}`}>
					<div className="text-center">
						<p className={`text-xs uppercase tracking-widest ${muted}`}>Invoice</p>
						<p className={`text-2xl font-bold ${isDarkTheme ? "text-white" : "text-zinc-900"}`}>
							{invoice.invoiceLabel}
						</p>
						<p className={`text-xl font-mono mt-1 ${isDarkTheme ? "text-emerald-400" : "text-emerald-600"}`}>
							{formatPriceInCurrency(invoice.totalAmount, currency)}
						</p>
						<p className={`text-sm mt-2 ${invoice.paymentStatus === "paid" ? "text-emerald-400" : muted}`}>
							{invoice.paymentStatus === "paid"
								? `Paid via ${invoice.paymentMethod ?? "—"}`
								: "Awaiting payment"}
						</p>
					</div>

					{invoice.paymentStatus === "pending" && invoice.razorpayQrImageUrl && (
						<div className="flex flex-col items-center gap-2">
							<img
								src={invoice.razorpayQrImageUrl}
								alt="UPI QR code"
								className="w-48 h-48 rounded-lg border border-zinc-700 bg-white object-contain"
							/>
							<p className={`text-xs text-center ${muted}`}>Scan to pay exact amount (UPI)</p>
						</div>
					)}

					{invoice.paymentStatus === "pending" && invoice.paymentLinkUrl && (
						<div className="flex flex-wrap gap-2 justify-center">
							<button
								type="button"
								onClick={() => void copyLink()}
								className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${
									isDarkTheme ? "border-zinc-600 text-white" : "border-zinc-300"
								}`}
							>
								<Copy size={14} /> Copy payment link
							</button>
							<a
								href={whatsAppPaymentLink(invoice.paymentLinkUrl, invoice.invoiceLabel, invoice.totalAmount)}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white"
							>
								<Smartphone size={14} /> WhatsApp link
							</a>
						</div>
					)}

					{invoice.paymentStatus === "pending" && (
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								disabled={busy}
								onClick={() => void markPaid("cash")}
								className={`py-2 rounded-lg text-xs font-bold border ${isDarkTheme ? "border-zinc-600" : "border-zinc-300"}`}
							>
								Paid — Cash
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => void markPaid("paytm_card")}
								className={`py-2 rounded-lg text-xs font-bold border ${isDarkTheme ? "border-zinc-600" : "border-zinc-300"}`}
							>
								Paid — Paytm card
							</button>
						</div>
					)}

					<button
						type="button"
						onClick={reset}
						className={`w-full py-2 text-sm ${muted} hover:underline`}
					>
						New bill
					</button>
				</div>
			)}
		</div>
	);
};
