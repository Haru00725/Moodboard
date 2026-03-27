/**
 * Template Service — Abstraction layer for template browsing and purchase.
 * Backed by the custom LoversAI backend API.
 */

import api from "@/lib/apiClient";

// ── Types ──

export interface Template {
  _id: string;
  title: string;
  theme: string;
  price: number;
  images: string[];
  isActive: boolean;
  isPurchased?: boolean;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Template API calls ──

export const getTemplates = async (params?: {
  theme?: string;
  style?: string;
}): Promise<Template[]> => {
  const { data } = await api.get("/templates", { params });
  return data.data.templates ?? [];
};

export const getTemplate = async (id: string): Promise<Template> => {
  const { data } = await api.get(`/templates/${id}`);
  return data.data.template;
};

/** Step A: initiate template purchase → get Razorpay order */
export const purchaseTemplate = async (
  id: string
): Promise<{ orderId: string; amount: number; currency: string; razorpayKeyId: string }> => {
  const { data } = await api.post(`/templates/${id}/purchase`);
  return data.data;
};

/** Step B: verify template payment after Razorpay callback */
export const verifyTemplatePurchase = async (
  id: string,
  payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
): Promise<Template> => {
  const { data } = await api.post(`/templates/${id}/verify-payment`, payload);
  return data.data.template;
};
