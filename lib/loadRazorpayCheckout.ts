let loadPromise: Promise<void> | null = null;

/** Load Razorpay checkout.js only when customer checkout runs (not on owner dashboard). */
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

export const getRazorpayConstructor = async (): Promise<
  new (opts: Record<string, unknown>) => { open: () => void }
> => {
  await loadRazorpayCheckout();
  const RzpClass = (window as Window & typeof globalThis & {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }).Razorpay;
  if (!RzpClass) throw new Error("Razorpay checkout is unavailable");
  return RzpClass;
};
