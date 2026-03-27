/**
 * Auth Service — Abstraction layer for authentication.
 * Backed by the custom LoversAI backend API.
 */

import api from "@/lib/apiClient";

// ── Types ──

export interface User {
  _id: string;
  email: string;
  name: string;
  displayName: string;
  avatar: string;
  role: string;
  plan: "FREE" | "PRO" | "PRO_PLUS";
  credits: number;
  inviteCode: string;
  referredBy: string | null;
  referralCodeUsed: string | null;
  hasUsedReferral: boolean;
  isEmailVerified: boolean;
  lastCreditReset: string;
  purchasedTemplates: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
  emailVerified?: boolean;
}

// ── Auth API calls ──

export const signUp = async (
  email: string,
  password: string,
  name: string,
  inviteCode?: string
): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/register", {
    email,
    password,
    name,
    inviteCode,
  });
  return data.data;
};

export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/login", { email, password });
  return data.data;
};

export const googleAuth = async (payload: {
  email: string;
  googleId: string;
  name?: string;
  avatar?: string;
  idToken?: string;
}): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/google", payload);
  return data.data;
};

export const signOut = async (): Promise<void> => {
  const refreshToken = localStorage.getItem("refresh_token");
  try {
    await api.post("/auth/logout", { refreshToken });
  } catch {
    // Silently fail — we clear local state regardless
  }
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<AuthResponse> => {
  const { data } = await api.post("/auth/refresh-token", { refreshToken });
  return data.data;
};

// ── User profile API calls ──

export const getProfile = async (): Promise<{ user: User & { moodboardCount: number } }> => {
  const { data } = await api.get("/user/profile");
  return data.data;
};

export const getCredits = async (): Promise<{
  credits: number;
  plan: string;
  isUnlimited: boolean;
  lastCreditReset: string;
}> => {
  const { data } = await api.get("/user/credits");
  return data.data;
};

export const updateProfile = async (
  displayName: string
): Promise<{ user: User }> => {
  const { data } = await api.patch("/user/profile", { displayName });
  return data.data;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await api.post("/user/change-password", { currentPassword, newPassword });
};

export const deleteAccount = async (password?: string): Promise<void> => {
  await api.delete("/user/account", { data: { password } });
};

// ── Email verification ──

export const resendVerification = async (email: string): Promise<void> => {
  await api.post("/auth/resend-verification", { email });
};

export const forgotPassword = async (email: string): Promise<void> => {
  await api.post("/auth/forgot-password", { email });
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await api.post("/auth/reset-password", { token, newPassword });
};
