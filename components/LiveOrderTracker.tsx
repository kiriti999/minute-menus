import type { CustomerOrder } from "@minute-menus/types";
import { CUSTOMER_STATUS_COPY, ORDER_STEPS } from "./orderStatus";

interface LiveOrderTrackerProps {
  order: CustomerOrder;
  extraCount: number;
  isDarkTheme: boolean;
}

/** Slim header strip that follows the newest in-flight order until it is completed or rejected. */
export const LiveOrderTracker = ({ order, extraCount, isDarkTheme }: LiveOrderTrackerProps) => {
  const current = ORDER_STEPS.indexOf(order.status);
  const copy = CUSTOMER_STATUS_COPY[order.status];

  return (
    <div
      className={`pointer-events-auto flex h-10 items-center gap-3 border-t px-4 text-xs sm:px-8 lg:px-10 ${
        isDarkTheme ? "border-zinc-800 text-zinc-200" : "border-zinc-200 text-zinc-700"
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <span className="shrink-0 font-bold">{copy.label}</span>
      <ol className="flex flex-1 items-center gap-1" aria-label="Order progress">
        {ORDER_STEPS.map((step, index) => (
          <li
            key={step}
            className={`h-1 flex-1 rounded-full ${index <= current ? "bg-green-500" : isDarkTheme ? "bg-zinc-700" : "bg-zinc-300"}`}
          />
        ))}
      </ol>
      <span className="hidden min-w-0 truncate opacity-70 sm:block">{copy.message}</span>
      <span className="shrink-0 opacity-60">
        #{order.id.slice(0, 8)}
        {extraCount > 0 ? ` +${extraCount}` : ""}
      </span>
    </div>
  );
};
