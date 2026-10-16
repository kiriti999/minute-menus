import { Check, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { getErrorMessage } from "@minute-menus/errors";
import type { KitchenOrder, OrderStatus } from "@minute-menus/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  rejected: "Rejected",
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  rejected: null,
};

const REJECTION_REASONS = [
  "Item unavailable",
  "Kitchen closed",
  "Unable to fulfil order",
  "Other",
] as const;

const ORDERS_PER_PAGE = 10;

interface OrderQueueViewProps {
  orders: KitchenOrder[];
  currency: string;
  isDarkTheme: boolean;
  isLoading: boolean;
  error: string;
  telegramChatId: string;
  onSaveTelegramChatId: (chatId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, rejectionReason?: string) => Promise<void>;
  onRefundOrder: (orderId: string, pin: string) => Promise<void>;
  onTestSound: () => void;
  isTestSoundPlaying: boolean;
}

const PinModal = ({ onSubmit, onCancel }: { onSubmit: (pin: string) => void; onCancel: () => void }) => {
  const [pin, setPin] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => e.key === "Escape" && onCancel()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-pin-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (pin.length === 4) onSubmit(pin);
        }}
        className="w-full max-w-sm rounded-xl bg-white p-6 text-gray-900 shadow-2xl dark:bg-zinc-900 dark:text-gray-100"
      >
        <h3 id="refund-pin-title" className="text-lg font-semibold">Confirm refund</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter your 4-digit refund PIN to continue.</p>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          aria-label="Refund PIN"
          className="mt-4 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-amber-500 dark:border-zinc-700"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pin.length !== 4}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Refund
          </button>
        </div>
      </form>
    </div>
  );
};

const RefundStatus = ({ order, onRefund }: { order: KitchenOrder; onRefund: (orderId: string, pin: string) => Promise<void> }) => {
  const [busy, setBusy] = useState(false);
  const [askingPin, setAskingPin] = useState(false);
  if (order.refundId) return <span className="text-sm font-medium text-green-500">Refunded</span>;
  if (order.paymentProvider !== "razorpay") return <span className="text-sm text-red-500">Rejected</span>;
  const submitPin = async (pin: string) => {
    setAskingPin(false);
    setBusy(true);
    try {
      await onRefund(order.id, pin);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setAskingPin(true)}
        className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-60"
      >
        {busy ? "Refunding…" : "Retry refund"}
      </button>
      {askingPin && <PinModal onSubmit={submitPin} onCancel={() => setAskingPin(false)} />}
    </>
  );
};

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

const elapsedBetween = (from: string, to: string | undefined, now: number): number =>
  (to ? new Date(to).getTime() : now) - new Date(from).getTime();

const OrderTimers = ({ order, now, mutedText }: { order: KitchenOrder; now: number; mutedText: string }) => {
  if (order.status === "rejected") return null;
  const acceptEnd = order.confirmedAt;
  const finishEnd = order.completedAt;
  const isOpen = order.status !== "completed";
  return (
    <div className={`mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs ${mutedText}`}>
      <span>
        Accept: <b className={order.status === "pending" ? "text-amber-500" : ""}>
          {order.status === "pending" || acceptEnd ? formatDuration(elapsedBetween(order.createdAt, acceptEnd, now)) : "—"}
        </b>
      </span>
      <span>
        {isOpen ? "Elapsed" : "Total"}: <b className={isOpen ? "text-amber-500" : "text-green-500"}>
          {formatDuration(elapsedBetween(order.createdAt, finishEnd, now))}
        </b>
      </span>
    </div>
  );
};

const formatOrderTime = (createdAt: string): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(createdAt));

export const OrderQueueView = ({
  orders,
  currency,
  isDarkTheme,
  isLoading,
  error,
  telegramChatId,
  onSaveTelegramChatId,
  onUpdateOrderStatus,
  onRefundOrder,
  onTestSound,
  isTestSoundPlaying,
}: OrderQueueViewProps) => {
  const [chatId, setChatId] = useState(telegramChatId);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [chatError, setChatError] = useState("");
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>(REJECTION_REASONS[0]);
  const [currentPage, setCurrentPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => setChatId(telegramChatId), [telegramChatId]);

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const pageStart = currentPage * ORDERS_PER_PAGE;
  const pageOrders = orders.slice(pageStart, pageStart + ORDERS_PER_PAGE);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages - 1));
  }, [totalPages]);

  const saveChatId = async () => {
    setIsSavingChat(true);
    setChatError("");
    try {
      await onSaveTelegramChatId(chatId);
    } catch (saveError) {
      setChatError(`Failed to save Telegram chat ID: ${getErrorMessage(saveError)}`);
    } finally {
      setIsSavingChat(false);
    }
  };

  const rejectOrder = async (orderId: string) => {
    await onUpdateOrderStatus(orderId, "rejected", rejectionReason);
    setRejectingOrderId(null);
  };

  const text = isDarkTheme ? "text-white" : "text-zinc-900";
  const mutedText = isDarkTheme ? "text-zinc-400" : "text-zinc-600";
  const panel = isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200";

  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-10 pb-24 ${isDarkTheme ? "bg-black" : "bg-zinc-50"}`}>
      <header className="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={`text-3xl font-light tracking-tight ${text}`}>Kitchen Orders</h1>
          <p className={`mt-2 text-sm ${mutedText}`}>Paid orders appear here and move through the kitchen workflow.</p>
        </div>
        <button
          type="button"
          onClick={onTestSound}
          className={`flex items-center justify-center gap-2 rounded border px-4 py-2 text-sm font-medium ${isDarkTheme ? "border-zinc-700 text-white hover:bg-zinc-800" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"}`}
        >
          {isTestSoundPlaying ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {isTestSoundPlaying ? "Stop sound" : "Test sound"}
        </button>
      </header>

      <section className={`mb-8 rounded-xl border p-4 ${panel}`}>
        <h2 className={`font-medium ${text}`}>Telegram alerts</h2>
        <p className={`mt-1 text-sm ${mutedText}`}>
          Send <code className="font-mono">/start</code> once to your configured Telegram bot. It will not reply until a paid order is placed; retrieve its chat ID with Telegram's getUpdates API, then enter it here.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={chatId}
            onChange={(event) => setChatId(event.target.value)}
            inputMode="numeric"
            placeholder="Telegram chat ID"
            className={`min-w-0 flex-1 rounded border px-3 py-2 text-sm ${isDarkTheme ? "border-zinc-700 bg-black text-white" : "border-zinc-300 bg-white text-zinc-900"}`}
          />
          <button
            type="button"
            disabled={isSavingChat}
            onClick={() => void saveChatId()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSavingChat ? "Saving..." : "Save alerts"}
          </button>
        </div>
        {chatError && <p className="mt-2 text-sm text-red-500">{chatError}</p>}
      </section>

      {error && <p className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
      {isLoading && orders.length === 0 ? (
        <p className={mutedText}>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className={mutedText}>No paid orders yet.</p>
      ) : (
        <>
          <div className={`mb-3 flex items-center justify-between text-sm ${mutedText}`}>
            <span>Showing {pageStart + 1}–{Math.min(pageStart + ORDERS_PER_PAGE, orders.length)} of {orders.length} orders</span>
            <span>Page {currentPage + 1} of {totalPages}</span>
          </div>
          <div className="space-y-3">
          {pageOrders.map((order) => {
            const nextStatus = NEXT_STATUS[order.status];
            return (
              <article key={order.id} className={`rounded-xl border p-4 ${panel}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`font-medium ${text}`}>Order #{order.id.slice(0, 8)}</p>
                    <p className={`mt-1 text-sm ${mutedText}`}>{formatOrderTime(order.createdAt)}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${order.status === "completed" ? "bg-green-500/15 text-green-500" : order.status === "rejected" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-500"}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <ul className={`mt-4 space-y-1 text-sm ${text}`}>
                  {order.items.map((item, index) => (
                    <li key={`${item.dishId}-${index}`}>
                      {item.quantity} x {item.name}
                      {item.variantName ? ` — ${item.variantName.toUpperCase()}` : ""}
                    </li>
                  ))}
                </ul>
                <OrderTimers order={order} now={now} mutedText={mutedText} />
                {order.status === "rejected" && order.rejectionReason && (
                  <p className="mt-3 text-sm text-red-500">Reason: {order.rejectionReason}</p>
                )}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className={`font-medium ${text}`}>{currency.toUpperCase()} {order.totalAmount.toFixed(2)}</span>
                  {nextStatus ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void onUpdateOrderStatus(order.id, nextStatus)}
                        className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        Mark {STATUS_LABELS[nextStatus]}
                        <ChevronRight size={15} />
                      </button>
                      {(order.status === "pending" || order.status === "confirmed") && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingOrderId(order.id);
                            setRejectionReason(REJECTION_REASONS[0]);
                          }}
                          className="rounded border border-red-500/50 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  ) : order.status === "rejected" ? (
                    <RefundStatus order={order} onRefund={onRefundOrder} />
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                      <Check size={15} />
                      Complete
                    </span>
                  )}
                </div>
                {rejectingOrderId === order.id && (
                  <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                    <label className={`block text-sm font-medium ${text}`} htmlFor={`reject-reason-${order.id}`}>
                      Rejection reason
                    </label>
                    <select
                      id={`reject-reason-${order.id}`}
                      value={rejectionReason}
                      onChange={(event) => setRejectionReason(event.target.value)}
                      className={`mt-2 w-full rounded border px-3 py-2 text-sm ${isDarkTheme ? "border-zinc-700 bg-black text-white" : "border-zinc-300 bg-white text-zinc-900"}`}
                    >
                      {REJECTION_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                    </select>
                    <p className="mt-2 text-xs text-red-500">This marks the order as rejected. Online payments are refunded to the customer automatically.</p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setRejectingOrderId(null)} className={`rounded px-3 py-2 text-sm ${mutedText}`}>
                        Cancel
                      </button>
                      <button type="button" onClick={() => void rejectOrder(order.id)} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500">
                        Confirm rejection
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((page) => page - 1)}
                className={`rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${isDarkTheme ? "border-zinc-700 text-white hover:bg-zinc-800" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"}`}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages - 1}
                onClick={() => setCurrentPage((page) => page + 1)}
                className={`rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${isDarkTheme ? "border-zinc-700 text-white hover:bg-zinc-800" : "border-zinc-300 text-zinc-900 hover:bg-zinc-100"}`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
