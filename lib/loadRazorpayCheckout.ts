import { PAYMENT_API_PATHS } from "./api/paymentRouteRewrites";

let loadPromise: Promise<void> | null = null;

/** Lazily loads Razorpay checkout.js the first time a checkout is opened (customer order/subscription or owner Plus upgrade). */
export const loadRazorpayCheckout = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as Window & { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mm-razorpay="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.mmRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.head.appendChild(script);
  });

  return loadPromise;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
};

export const getRazorpayConstructor = async (): Promise<
  new (opts: Record<string, unknown>) => RazorpayInstance
> => {
  await loadRazorpayCheckout();
  const RzpClass = (window as Window & typeof globalThis & {
    Razorpay: new (opts: Record<string, unknown>) => RazorpayInstance;
  }).Razorpay;
  if (!RzpClass) throw new Error("Razorpay checkout is unavailable");
  return RzpClass;
};

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; contact?: string; email?: string };
};

/**
 * Opens the Razorpay modal and resolves with the payment response on success.
 * Rejects with "Payment cancelled" on modal dismiss, or the failure reason on
 * a payment.failed event.
 */
export const openRazorpayCheckout = (
  opts: RazorpayCheckoutOptions,
): Promise<RazorpaySuccess> =>
  getRazorpayConstructor().then(
    (RzpClass) =>
      new Promise<RazorpaySuccess>((resolve, reject) => {
        const rzp = new RzpClass({
          key: opts.keyId,
          order_id: opts.orderId,
          amount: opts.amount,
          currency: opts.currency,
          name: opts.name,
          description: opts.description,
          prefill: opts.prefill,
          theme: { color: "#000000" },
          handler: (response: RazorpaySuccess) => resolve(response),
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.on("payment.failed", (resp) =>
          reject(new Error(resp?.error?.description ?? "Payment failed")),
        );
        rzp.open();
      }),
  );

/** Verifies a Razorpay payment signature server-side. Throws if verification fails. */
export const verifyRazorpayPayment = async (success: RazorpaySuccess): Promise<void> => {
  const res = await fetch(PAYMENT_API_PATHS.verifyPayment, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(success),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Payment verification failed");
  }
};
