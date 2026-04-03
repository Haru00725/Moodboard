/**
 * AI Service — Abstraction layer for AI moodboard generation.
 * Backed by the custom LoversAI backend API (Groq + BFL Flux pipeline).
 */

import api from "@/lib/apiClient";

// ── Types ──

export interface GeneratedImage {
  id: string;
  url: string;
  label: string;
  stageName: string;
}

export interface GeneratedResult {
  stage: string;
  images: GeneratedImage[];
  moodboardId: string;
}

// ── Stage definitions (5 stages — matches backend) ──

export const STAGES = [
  { key: "entry", label: "Entry", icon: "🚪" },
  { key: "lounge", label: "Lounge", icon: "🛋️" },
  { key: "dining", label: "Dining", icon: "🪑" },
  { key: "bar", label: "Bar", icon: "🍸" },
  { key: "stage", label: "Stage", icon: "🎭" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

// ── Per-stage generation inputs ──

export interface StageGenerationInputs {
  stage: StageKey;
  venueImageBase64?: string | null;
  decorImageBase64?: string | null;
  functionType?: string;
  theme?: string;
  celebrationType?: string;
  timeOfDay?: string;
  vibeDescription?: string;
}

// ── Helper: convert File to base64 (without data: prefix) ──

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:image/...;base64," prefix
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── AI generation API calls ──

/** Generate images for a specific stage of a moodboard with all inputs */
export const generateStageImages = async (
  moodboardId: string,
  inputs: StageGenerationInputs
): Promise<GeneratedResult> => {
  const { data } = await api.post(`/moodboard/${moodboardId}/generate-stage`, {
    stage: inputs.stage,
    venueImageBase64: inputs.venueImageBase64 || null,
    decorImageBase64: inputs.decorImageBase64 || null,
    functionType: inputs.functionType || "",
    theme: inputs.theme || "",
    celebrationType: inputs.celebrationType || "",
    timeOfDay: inputs.timeOfDay || "",
    vibeDescription: inputs.vibeDescription || "",
  });

  // Backend returns images as [{url, label}, ...] or string[]
  const rawImages: (string | { url: string; label?: string })[] =
    data.data.images ?? [];
  const images: GeneratedImage[] = rawImages.map((img, idx: number) => {
    const url = typeof img === "string" ? img : img.url;
    const label =
      typeof img === "object" && img.label ? img.label : `Option ${idx + 1}`;
    return {
      id: `${inputs.stage}-${idx}`,
      url,
      label,
      stageName: inputs.stage,
    };
  });

  return {
    stage: data.data.stage,
    images,
    moodboardId: data.data.moodboardId,
  };
};

/** Select an image for a specific stage */
export const selectStageImage = async (
  moodboardId: string,
  stage: StageKey,
  imageUrl: string
): Promise<{
  stage: string;
  selectedImage: string;
  nextStage: string | null;
  completedStages: string[];
  isComplete: boolean;
}> => {
  const { data } = await api.post(`/moodboard/${moodboardId}/select-image`, {
    stage,
    imageUrl,
  });
  return data.data;
};
