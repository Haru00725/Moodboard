/**
 * AI Service — Abstraction layer for AI moodboard generation.
 * Backed by the custom LoversAI backend API.
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

// ── AI generation API calls ──

/** Generate images for a specific stage of a moodboard */
export const generateStageImages = async (
  moodboardId: string,
  stage: StageKey
): Promise<GeneratedResult> => {
  const { data } = await api.post(`/moodboard/${moodboardId}/generate-stage`, {
    stage,
  });

  // Backend returns images as string[] (URLs), normalize to GeneratedImage[]
  const rawImages: (string | { url: string; label?: string })[] = data.data.images ?? [];
  const images: GeneratedImage[] = rawImages.map(
    (img, idx: number) => {
      const url = typeof img === "string" ? img : img.url;
      const label = typeof img === "object" && img.label ? img.label : `Option ${idx + 1}`;
      return {
        id: `${stage}-${idx}`,
        url,
        label,
        stageName: stage,
      };
    }
  );

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
