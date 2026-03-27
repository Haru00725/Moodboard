/**
 * Payment Service — Abstraction layer for payment processing.
 * Backed by the custom LoversAI backend API with Razorpay integration.
 */

import api from "@/lib/apiClient";

// ── Types ──

export interface PaymentOrder {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  prefill: {
    name: string;
    email: string;
  };
}

export interface Payment {
  _id: string;
  user: string;
  type: "subscription" | "template";
  plan: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: string;
}

// ── Payment API calls ──

export const createOrder = async (payload: {
  type: "subscription" | "template";
  plan?: string;
  templateId?: string;
}): Promise<PaymentOrder> => {
  const { data } = await api.post("/payment/create-order", payload);
  return data.data;
};

export const verifyPayment = async (payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ payment: Payment; user: unknown }> => {
  const { data } = await api.post("/payment/verify", payload);
  return data.data;
};

export const getPaymentHistory = async (): Promise<Payment[]> => {
  const { data } = await api.get("/payment/history");
  return data.data.payments ?? [];
};
