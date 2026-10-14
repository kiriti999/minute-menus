import { Check, LogOut, X } from "lucide-react";
import type { CustomerOrder, OrderStatus } from "@minute-menus/types";

export const CUSTOMER_STATUS_COPY: Record<OrderStatus, { label: string; message: string }> = {
  pending: { label: "Placed", message: "Waiting for the restaurant to accept your order." },
  confirmed: { label: "Accepted", message: "The restaurant has accepted your order." },
  preparing: { label: "Preparing", message: "Your order is being prepared." },
  ready: { label: "Ready", message: "Your order is ready for pickup / on its way." },
  completed: { label: "Completed", message: "Order completed. Enjoy!" },
  rejected: { label: "Rejected", message: "The restaurant could not fulfil this order." },
};

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed"];

interface CustomerOrdersPanelProps {
  isOpen: boolean;
  isDarkTheme: boolean;
  email: string;
  orders: CustomerOrder[];
  isLoading: boolean;
  error: string;
  currency: string;
  onClose: () => void;
  onSignOut: () => void;
}

const formatPlacedAt = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(value));

const OrderProgress = ({ status }: { status: OrderStatus }) => {
  const current = STEPS.indexOf(status);
  return (
    <ol className="mt-3 flex items-center gap-1">
      {STEPS.map((step, index) => (
        <li key={step} className="flex flex-1 flex-col items-center gap-1">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${index <= current ? "bg-green-500 text-white" : "bg-zinc-500/30 text-zinc-400"}`}>
            {index <= current ? <Check size={11} /> : index + 1}
          </span>
          <span className={`text-[10px] ${index === current ? "font-bold" : "opacity-60"}`}>
            {CUSTOMER_STATUS_COPY[step].label}
          </span>
        </li>
      ))}
    </ol>
  );
};

export const CustomerOrdersPanel = ({
  isOpen, isDarkTheme, email, orders, isLoading, error, currency, onClose, onSignOut,
}: CustomerOrdersPanelProps) => {
  if (!isOpen) return null;
  const surface = isDarkTheme ? "bg-zinc-950 text-white border-zinc-800" : "bg-white text-zinc-900 border-zinc-200";
  const card = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className={`flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border p-5 sm:rounded-2xl ${surface}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">My Orders</h2>
            <p className="truncate text-xs opacity-60">{email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-zinc-500/20">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {error && <p className="rounded border border-red-500/40 bg-red-500/10 p-2 text-sm text-red-500">{error}</p>}
          {isLoading && orders.length === 0 && <p className="text-sm opacity-60">Loading orders...</p>}
          {!isLoading && !error && orders.length === 0 && (
            <p className="text-sm opacity-60">No orders yet. Orders you place while signed in appear here.</p>
          )}
          {orders.map((order) => (
            <article key={order.id} className={`rounded-xl border p-3 ${card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{order.restaurantName}</p>
                  <p className="text-xs opacity-60">#{order.id.slice(0, 8)} · {formatPlacedAt(order.createdAt)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${order.status === "rejected" ? "bg-red-500/15 text-red-500" : order.status === "completed" ? "bg-green-500/15 text-green-500" : "bg-amber-500/15 text-amber-500"}`}>
                  {CUSTOMER_STATUS_COPY[order.status].label}
                </span>
              </div>
              <ul className="mt-2 space-y-0.5 text-sm">
                {order.items.map((item, index) => (
                  <li key={`${item.dishId}-${index}`}>
                    {item.quantity} x {item.name}
                    {item.variantName ? <b> — {item.variantName.toUpperCase()}</b> : null}
                  </li>
                ))}
              </ul>
              {order.status === "rejected" ? (
                <p className="mt-2 text-xs text-red-500">
                  {CUSTOMER_STATUS_COPY.rejected.message}
                  {order.rejectionReason ? ` Reason: ${order.rejectionReason}.` : ""} Please contact the restaurant about a refund.
                </p>
              ) : (
                <>
                  <OrderProgress status={order.status} />
                  <p className="mt-2 text-xs opacity-70">{CUSTOMER_STATUS_COPY[order.status].message}</p>
                </>
              )}
              <p className="mt-2 text-sm font-semibold">{currency.toUpperCase()} {order.totalAmount.toFixed(2)}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-zinc-500/40 px-4 py-2 text-sm hover:bg-zinc-500/10"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </div>
  );
};
