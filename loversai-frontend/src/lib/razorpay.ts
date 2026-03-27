/**
 * Razorpay Checkout — Wrapper for the Razorpay payment gateway SDK.
 *
 * When the backend returns a dev-mode order ID (starts with "order_dev_"),
 * purchases auto-complete without opening Razorpay.
 * When the backend returns a real Razorpay order ID, the real checkout opens.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string };
  onSuccess: (response: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => void;
  onFailure: (error: { message: string } | null) => void;
}

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

const loadRazorpayScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.head.appendChild(script);
  });

export const openRazorpayCheckout = async (opts: RazorpayCheckoutOptions) => {
  // Dev mode: backend returned a mock order ID — auto-complete without Razorpay
  if (opts.orderId.startsWith("order_dev_")) {
    console.log("[Dev Mode] Auto-completing payment for order:", opts.orderId);
    await new Promise((r) => setTimeout(r, 800));
    opts.onSuccess({
      razorpayOrderId: opts.orderId,
      razorpayPaymentId: `pay_dev_${Date.now()}`,
      razorpaySignature: "dev_mode_signature",
    });
    return;
  }

  // Real mode: open Razorpay checkout with the real order ID
  if (!RAZORPAY_KEY) {
    opts.onFailure({ message: "Razorpay key not configured. Set VITE_RAZORPAY_KEY_ID in .env" });
    return;
  }

  try {
    await loadRazorpayScript();
  } catch {
    opts.onFailure({ message: "Could not load Razorpay. Check your internet connection." });
    return;
  }

  if (!window.Razorpay) {
    opts.onFailure({ message: "Razorpay SDK not available." });
    return;
  }

  const razorpay = new window.Razorpay({
    key: RAZORPAY_KEY,
    amount: opts.amount,
    currency: opts.currency,
    name: opts.name,
    description: opts.description,
    order_id: opts.orderId,
    prefill: opts.prefill,
    theme: { color: "#AA7484" },
    handler: (response: Record<string, string>) => {
      opts.onSuccess({
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => {
        opts.onFailure({ message: "Payment cancelled" });
      },
    },
  });

  razorpay.open();
};
