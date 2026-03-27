/**
 * Database Service — Abstraction layer for moodboard CRUD.
 * Backed by the custom LoversAI backend API.
 */

import api from "@/lib/apiClient";

// ── Types ──

export interface Moodboard {
  _id: string;
  user: string;
  title: string;
  prompt: string;
  colorDirection: string;
  functionType: string;
  theme: string;
  celebrationType: string;
  timeOfDay: string;
  venueImage: string;
  designImage: string;
  logoUrl: string | null;
  stages: Record<string, {
    imageUrl: string;
    selectedImageUrl: string | null;
    generatedImages: Array<{ url: string; label: string }>;
    status: string;
  }>;
  status: string;
  currentStage: string;
  completedStages: string[];
  createdAt: string;
  updatedAt: string;
}

/** Shape used by the Projects page (flattened for UI) */
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  palette: string[];
}

// ── Moodboard API calls ──

export const getProjects = async (): Promise<Project[]> => {
  const { data } = await api.get("/moodboard");
  const moodboards: Moodboard[] = data.data.moodboards ?? [];
  // Map backend moodboards to the lightweight Project shape used by the UI
  return moodboards.map((mb) => ({
    id: mb._id,
    name: mb.title || `Moodboard — ${new Date(mb.createdAt).toLocaleDateString("en-IN")}`,
    createdAt: mb.createdAt,
    palette: [],
  }));
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/moodboard/${id}`);
};

export const startMoodboard = async (formData: FormData): Promise<Moodboard> => {
  const { data } = await api.post("/moodboard/start", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data.moodboard;
};

export const getMoodboard = async (id: string): Promise<Moodboard> => {
  const { data } = await api.get(`/moodboard/${id}`);
  return data.data.moodboard;
};

export const saveMoodboard = async (
  id: string,
  title: string
): Promise<Moodboard> => {
  const { data } = await api.patch(`/moodboard/${id}/title`, { title });
  return data.data.moodboard;
};

export const addLogo = async (
  id: string,
  logoFile: File
): Promise<string> => {
  const formData = new FormData();
  formData.append("logo", logoFile);
  const { data } = await api.post(`/moodboard/${id}/add-logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.data.logoUrl;
};

export const downloadMoodboard = async (id: string): Promise<Moodboard> => {
  const { data } = await api.get(`/moodboard/${id}/download`);
  return data.data.moodboard;
};
