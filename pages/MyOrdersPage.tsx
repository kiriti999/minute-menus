import { getErrorMessage } from "@minute-menus/errors";
import type { CustomerOrder } from "@minute-menus/types";
import { LoadingScreen } from "@minute-menus/ui";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2, LogOut } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { CUSTOMER_STATUS_COPY } from "../components/orderStatus";
import { downloadOrderInvoice, orderNumber } from "../lib/orderInvoicePdf";
import { supabaseService } from "../services/supabaseService";

const PAGE_SIZE = 10;

export interface MyOrdersPageProps {
	slug: string;
	isDarkTheme: boolean;
	onBack: () => void;
}

const formatOrderDate = (value: string): string =>
	new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(
		new Date(value),
	);

interface OrderRowProps {
	order: CustomerOrder;
	currency: string;
	isDarkTheme: boolean;
	isOpen: boolean;
	isDownloading: boolean;
	onToggle: () => void;
	onDownload: () => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, currency, isDarkTheme, isOpen, isDownloading, onToggle, onDownload }) => {
	const isRejected = order.status === "rejected";
	const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200";
	const badge = isRejected ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500";

	return (
		<article className={`rounded-xl border ${card}`}>
			<button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-left">
				<div className="min-w-0 flex-1">
					<p className="text-xs opacity-60">
						#{orderNumber(order)} · {formatOrderDate(order.createdAt)}
					</p>
					<ul className="mt-1.5 space-y-0.5 text-sm">
						{order.items.map((item, index) => (
							<li key={`${item.dishId}-${index}`} className="flex justify-between gap-3">
								<span className="min-w-0 truncate">
									{item.name}
									{item.variantName ? <b> — {item.variantName.toUpperCase()}</b> : null}
								</span>
								<span className="shrink-0 opacity-70">x {item.quantity}</span>
							</li>
						))}
					</ul>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1.5">
					<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badge}`}>
						{CUSTOMER_STATUS_COPY[order.status].label}
					</span>
					<span className="text-sm font-semibold">
						{currency.toUpperCase()} {order.totalAmount.toFixed(2)}
					</span>
					<ChevronDown size={16} className={`opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</div>
			</button>

			{isOpen && (
				<div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${isDarkTheme ? "border-zinc-800" : "border-zinc-200"}`}>
					{isRejected ? (
						<p className="text-xs text-red-500">
							{order.rejectionReason ? `Reason: ${order.rejectionReason}. ` : ""}Please contact {order.restaurantName} about a refund.
						</p>
					) : (
						<>
							<p className="text-xs opacity-60">{order.restaurantName}</p>
							<button
								type="button"
								onClick={onDownload}
								disabled={isDownloading}
								className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-zinc-200 disabled:opacity-50"
							>
								{isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
								Download invoice
							</button>
						</>
					)}
				</div>
			)}
		</article>
	);
};

const Pagination: React.FC<{ page: number; totalPages: number; onChange: (page: number) => void }> = ({ page, totalPages, onChange }) => {
	if (totalPages <= 1) return null;
	const buttonClass = "flex items-center gap-1 rounded-lg border border-zinc-500/40 px-3 py-2 text-xs font-bold uppercase disabled:opacity-40";
	return (
		<nav className="mt-5 flex items-center justify-between" aria-label="Order history pages">
			<button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onChange(page - 1)}>
				<ChevronLeft size={14} /> Prev
			</button>
			<span className="text-xs opacity-70">
				Page {page} of {totalPages}
			</span>
			<button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
				Next <ChevronRight size={14} />
			</button>
		</nav>
	);
};

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ slug, isDarkTheme, onBack }) => {
	const [restaurant, setRestaurant] = useState<{ name: string; currency: string } | null>(null);
	const [email, setEmail] = useState<string | null | undefined>(undefined);
	const [page, setPage] = useState(1);
	const [orders, setOrders] = useState<CustomerOrder[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [openId, setOpenId] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	useEffect(() => {
		supabaseService
			.getRestaurantBySlug(slug)
			.then((r) => setRestaurant(r ? { name: r.name, currency: r.currency } : null))
			.catch((e) => setError(getErrorMessage(e)));
		supabaseService
			.getCurrentCustomer()
			.then((customer) => setEmail(customer?.email ?? null))
			.catch(() => setEmail(null));
	}, [slug]);

	const loadPage = useCallback(async (nextPage: number) => {
		setLoading(true);
		setError("");
		try {
			const result = await supabaseService.getMyOrderHistory(nextPage, PAGE_SIZE);
			setOrders(result.orders);
			setTotal(result.total);
			setPage(nextPage);
			setOpenId(null);
		} catch (e) {
			setError(`Could not load orders: ${getErrorMessage(e)}`);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (email) void loadPage(1);
		else if (email === null) setLoading(false);
	}, [email, loadPage]);

	const handleDownload = async (order: CustomerOrder) => {
		setDownloadingId(order.id);
		try {
			await downloadOrderInvoice(order, restaurant?.currency ?? "INR");
		} catch (e) {
			setError(`Could not create invoice: ${getErrorMessage(e)}`);
		} finally {
			setDownloadingId(null);
		}
	};

	const handleSignOut = async () => {
		await supabaseService.customerSignOut();
		onBack();
	};

	if (email === undefined) return <LoadingScreen label="Loading your orders..." />;

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const shell = isDarkTheme ? "bg-zinc-950 text-white" : "bg-white text-zinc-900";

	return (
		<div className={`h-screen w-full overflow-y-auto ${shell}`}>
			<header className={`sticky top-0 z-10 border-b backdrop-blur-md ${isDarkTheme ? "border-zinc-800 bg-zinc-950/95" : "border-zinc-200 bg-white/95"}`}>
				<div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
					<button type="button" onClick={onBack} className="flex items-center gap-2 text-sm hover:opacity-80">
						<ArrowLeft size={18} /> {restaurant?.name ?? "Back"}
					</button>
					{email && (
						<button type="button" onClick={() => void handleSignOut()} className="flex items-center gap-2 text-xs opacity-70 hover:opacity-100">
							<LogOut size={14} /> Sign out
						</button>
					)}
				</div>
			</header>

			<main className="mx-auto max-w-2xl px-4 py-6">
				<h1 className="text-xl font-semibold">My Orders</h1>
				{email && <p className="mt-0.5 truncate text-xs opacity-60">{email}</p>}

				<div className="mt-5 space-y-3">
					{error && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-500">{error}</p>}
					{email === null && <p className="text-sm opacity-60">Sign in on the menu page to see your orders.</p>}
					{email && loading && <p className="text-sm opacity-60">Loading orders...</p>}
					{email && !loading && !error && orders.length === 0 && (
						<p className="text-sm opacity-60">No past orders yet. Completed and rejected orders appear here.</p>
					)}
					{!loading &&
						orders.map((order) => (
							<OrderRow
								key={order.id}
								order={order}
								currency={restaurant?.currency ?? "INR"}
								isDarkTheme={isDarkTheme}
								isOpen={openId === order.id}
								isDownloading={downloadingId === order.id}
								onToggle={() => setOpenId(openId === order.id ? null : order.id)}
								onDownload={() => void handleDownload(order)}
							/>
						))}
				</div>

				{email && <Pagination page={page} totalPages={totalPages} onChange={(next) => void loadPage(next)} />}
			</main>
		</div>
	);
};
