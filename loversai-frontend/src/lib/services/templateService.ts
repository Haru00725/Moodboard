/**
 * Template Service — Abstraction layer for template browsing and purchase.
 * Backed by the custom LoversAI backend API.
 */

import api from "@/lib/apiClient";
import { getLocalTemplates, LOCAL_TEMPLATES, type LocalTemplate } from "@/data/localTemplates";

// ── Types ──

export interface Template extends LocalTemplate {
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
  // Use local templates instead of backend
  return getLocalTemplates(params as any) as Template[];
};

export const getTemplate = async (id: string): Promise<Template> => {
  // Fetch from local templates
  const template = LOCAL_TEMPLATES.find((t) => t._id === id);
  if (!template) {
    throw new Error("Template not found");
  }
  return template as Template;
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
