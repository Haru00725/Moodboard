/**
 * Local Templates Configuration
 * Define your custom templates here with images and metadata
 */

import dinningPreview from "@/assets/previews/DINNING-preview.png?url";
import mehendiBg from "@/assets/previews/MEHENDI -preview.png?url";
import myraImage from "@/assets/previews/MYRA -preview.png?url";
import neonSangatImage from "@/assets/previews/NEON SANGEET-preview.png?url";
import stradaImage from "@/assets/previews/STRADA GLOBAL-preview.png?url";

// Fallback placeholder images (if previews not generated)
const PLACEHOLDER_IMAGES = {
  dinning: dinningPreview || "https://images.unsplash.com/photo-1428515613728-6b8e6dc89e4f?w=600&h=400&fit=crop",
  mehendi: mehendiBg || "https://images.unsplash.com/photo-1600195077909-46e573870d99?w=600&h=400&fit=crop",
  myra: myraImage || "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
  neonSangeet: neonSangatImage || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop",
  strada: stradaImage || "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=600&h=400&fit=crop",
};

export interface LocalTemplate {
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

export const LOCAL_TEMPLATES: LocalTemplate[] = [
  {
    _id: "507f1f77bcf86cd799439011",
    title: "Dining Setup",
    theme: "Elegant Dining",
    price: 999,
    images: [PLACEHOLDER_IMAGES.dinning],
    isActive: true,
    isPurchased: false,
    purchaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "507f1f77bcf86cd799439012",
    title: "Mehendi Celebration",
    theme: "Traditional Mehendi",
    price: 999,
    images: [PLACEHOLDER_IMAGES.mehendi],
    isActive: true,
    isPurchased: false,
    purchaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "507f1f77bcf86cd799439013",
    title: "Myra Wedding",
    theme: "Modern Elegance",
    price: 999,
    images: [PLACEHOLDER_IMAGES.myra],
    isActive: true,
    isPurchased: false,
    purchaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "507f1f77bcf86cd799439014",
    title: "Neon Sangeet Night",
    theme: "Contemporary Vibes",
    price: 999,
    images: [PLACEHOLDER_IMAGES.neonSangeet],
    isActive: true,
    isPurchased: false,
    purchaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: "507f1f77bcf86cd799439015",
    title: "Strada Global Collection",
    theme: "International Fusion",
    price: 999,
    images: [PLACEHOLDER_IMAGES.strada],
    isActive: true,
    isPurchased: false,
    purchaseCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const getLocalTemplates = (filters?: {
  theme?: string;
  style?: string;
}): LocalTemplate[] => {
  let filtered = [...LOCAL_TEMPLATES];

  if (filters?.theme) {
    filtered = filtered.filter((t) =>
      t.theme.toLowerCase().includes(filters.theme!.toLowerCase())
    );
  }

  return filtered;
};

export const getLocalTemplate = (id: string): LocalTemplate | undefined => {
  return LOCAL_TEMPLATES.find((t) => t._id === id);
};
