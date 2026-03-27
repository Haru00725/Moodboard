import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { STAGES, generateStageImages, selectStageImage, type StageKey, type GeneratedImage } from "@/lib/services/aiService";
import { saveMoodboard, addLogo, downloadMoodboard } from "@/lib/services/databaseService";
import { Sparkles, RefreshCw, ChevronRight, Check, Save, Image as ImageIcon, Download, Upload, FileText, Presentation, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MoodboardOptions } from "./SelectionPanel";

interface StageWizardProps {
  options: MoodboardOptions;
  moodboardId: string;
  onClose: () => void;
}

// ── Image Card — renders real image or fallback ──
const ImageCard: React.FC<{
  image: GeneratedImage;
  selected: boolean;
  onClick: () => void;
}> = ({ image, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`relative rounded-xl overflow-hidden aspect-square transition-all duration-300 group ${
      selected
        ? "ring-3 ring-primary shadow-lg scale-[1.02]"
        : "ring-1 ring-border hover:ring-primary/40 hover:shadow-md"
    }`}
  >
    {image.url ? (
      <img
        src={image.url}
        alt={image.label}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          // On error, hide image and show fallback
          (e.target as HTMLImageElement).style.display = "none";
          const fallback = (e.target as HTMLImageElement).nextElementSibling;
          if (fallback) (fallback as HTMLElement).style.display = "flex";
        }}
      />
    ) : null}
    {/* Fallback (shown if no url or on image error) */}
    <div
      className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-3 p-4"
      style={{ display: image.url ? "none" : "flex" }}
    >
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <ImageIcon className="text-primary" size={24} />
      </div>
      <span className="text-sm font-body text-foreground font-medium text-center leading-tight">
        {image.label}
      </span>
      <span className="text-xs text-muted-foreground font-body">{image.stageName}</span>
    </div>

    {/* Hover overlay */}
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />

    {/* Label overlay */}
    {image.url && (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <span className="text-white text-xs font-body font-medium">{image.label}</span>
      </div>
    )}

    {/* Selected check */}
    {selected && (
      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <Check size={14} className="text-primary-foreground" />
      </div>
    )}
  </button>
);

// ── Collage cell for drag-and-drop moodboard ──
interface CollageItem {
  id: string;
  stageKey: string;
  stageLabel: string;
  stageIcon: string;
  selectionLabel: string;
  imageUrl: string | null;
}

const StageWizard: React.FC<StageWizardProps> = ({ options, moodboardId, onClose }) => {
  const { user, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [stageImages, setStageImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [stageSelections, setStageSelections] = useState<Record<string, GeneratedImage>>({});
  const [completed, setCompleted] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [collageItems, setCollageItems] = useState<CollageItem[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  const currentStage = STAGES[currentStageIdx];
  const isFirstStage = currentStageIdx === 0;

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setStageImages([]);
    setSelectedImage(null);
    setGenError(null);

    try {
      const result = await generateStageImages(
        moodboardId,
        currentStage.key as StageKey
      );
      setStageImages(result.images);
      if (result.images.length === 0) {
        setGenError("No images were generated. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Image generation failed";
      setGenError(msg);
      toast({ title: "Generation Failed", description: msg, variant: "destructive" });
    }

    setGenerating(false);
  }, [currentStage, moodboardId]);

  // Auto-generate on mount or stage change
  React.useEffect(() => {
    if (!completed) handleGenerate();
  }, [currentStageIdx]); // eslint-disable-line

  const handleRetry = async () => {
    if ((user?.credits ?? 0) <= 0) {
      toast({ title: "No Credits", description: "Upgrade your plan to retry.", variant: "destructive" });
      return;
    }
    handleGenerate();
  };

  const handleNext = async () => {
    if (!selectedImage) return;

    const img = stageImages.find((i) => i.id === selectedImage);
    if (img) {
      setStageSelections((prev) => ({ ...prev, [currentStage.key]: img }));

      // Notify backend of the selection
      try {
        await selectStageImage(moodboardId, currentStage.key as StageKey, img.url);
        await refreshCredits();
      } catch {
        // Selection saved locally even if API fails
      }
    }

    if (currentStageIdx < STAGES.length - 1) {
      const nextIdx = currentStageIdx + 1;
      if (nextIdx >= 1 && user?.plan === "FREE") {
        setShowPaywall(true);
        return;
      }
      setCurrentStageIdx(nextIdx);
    } else {
      // Build collage items from selections
      const items: CollageItem[] = STAGES.map((stage) => {
        const sel = stageSelections[stage.key] || img;
        return {
          id: stage.key,
          stageKey: stage.key,
          stageLabel: stage.label,
          stageIcon: stage.icon,
          selectionLabel: sel?.label || "Selected",
          imageUrl: sel?.url || null,
        };
      });
      setCollageItems(items);
      setCompleted(true);
    }
  };

  const handleSave = async () => {
    try {
      const title = `Moodboard — ${new Date().toLocaleDateString("en-IN")}`;
      await saveMoodboard(moodboardId, title);
      toast({ title: "Saved!", description: "Moodboard saved to your projects." });
    } catch {
      toast({ title: "Error", description: "Failed to save moodboard.", variant: "destructive" });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
      try {
        const uploadedUrl = await addLogo(moodboardId, file);
        setLogoUrl(uploadedUrl);
      } catch {
        toast({ title: "Error", description: "Failed to upload logo.", variant: "destructive" });
      }
    }
  };

  const handleDownload = async (format: string) => {
    try {
      await downloadMoodboard(moodboardId);
      toast({ title: "Download Started", description: `Preparing ${format.toUpperCase()} file...` });
    } catch {
      toast({ title: "Error", description: "Failed to download moodboard.", variant: "destructive" });
    }
  };

  // ════════════════════════════════════════════
  // COMPLETED: Interactive Editorial Collage with REAL IMAGES
  // ════════════════════════════════════════════
  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-5xl mx-auto space-y-6"
      >
        <div className="text-center">
          <h2 className="font-heading text-3xl text-foreground mb-2">
            Your <span className="text-gradient-gold">Moodboard</span>
          </h2>
          <p className="text-muted-foreground font-body text-sm">
            Your curated 5-stage wedding vision · <span className="text-lovers-blush font-medium">Drag to rearrange</span>
          </p>
        </div>

        {/* Editorial Collage — Drag-and-Drop */}
        <div className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-3xl p-5 shadow-xl shadow-black/5">
          <Reorder.Group
            axis="y"
            values={collageItems}
            onReorder={setCollageItems}
            className="grid grid-cols-4 grid-rows-3 gap-3 auto-rows-fr"
            style={{ minHeight: "520px" }}
          >
            {collageItems.map((item, idx) => {
              const gridStyles: Record<number, React.CSSProperties> = {
                0: { gridColumn: "1 / 3", gridRow: "1 / 3" },
                1: { gridColumn: "3 / 5", gridRow: "1 / 2" },
                2: { gridColumn: "3 / 4", gridRow: "2 / 3" },
                3: { gridColumn: "4 / 5", gridRow: "2 / 3" },
                4: { gridColumn: "1 / 5", gridRow: "3 / 4" },
              };

              const isHero = idx === 0;

              return (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  style={gridStyles[idx] || {}}
                  whileDrag={{
                    scale: 1.03,
                    boxShadow: "0 20px 40px rgba(170, 116, 132, 0.25)",
                    zIndex: 50,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="relative group cursor-grab active:cursor-grabbing"
                >
                  <div className={`
                    w-full h-full rounded-2xl overflow-hidden
                    backdrop-blur-md border border-white/40 dark:border-gray-600/30
                    shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-lovers-blush/10
                    transition-all duration-300 relative
                  `}>
                    {/* Real Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.stageLabel}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-lovers-cream via-white/60 to-lovers-blush/10 dark:from-gray-800/60 dark:via-gray-900/50 dark:to-lovers-blush/5 flex flex-col items-center justify-center gap-3 p-4">
                        <div className={`${isHero ? "w-20 h-20" : "w-14 h-14"} rounded-full bg-lovers-blush/10 flex items-center justify-center`}>
                          <ImageIcon className="text-lovers-blush" size={isHero ? 32 : 22} />
                        </div>
                        <span className={`${isHero ? "text-base" : "text-sm"} font-heading text-foreground text-center leading-snug`}>
                          {item.selectionLabel}
                        </span>
                      </div>
                    )}

                    {/* Overlay with Stage Badge */}
                    <div className="absolute top-0 left-0 right-0 p-2.5 flex items-start justify-between">
                      <div className="px-3 py-1 rounded-full text-[10px] font-body font-semibold uppercase tracking-wider bg-black/30 text-white backdrop-blur-sm">
                        {item.stageIcon} {item.stageLabel}
                      </div>
                      <div className="opacity-0 group-hover:opacity-60 transition-opacity">
                        <GripVertical size={16} className="text-white" />
                      </div>
                    </div>

                    {/* Shimmer */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {/* Logo */}
          {logoUrl && (
            <div className="mt-5 flex justify-center">
              <img src={logoUrl} alt="Company logo" className="h-12 object-contain opacity-80" />
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-xl p-4 flex flex-wrap items-center justify-center gap-3 shadow-lg shadow-black/5">
          <Button
            onClick={handleSave}
            className="font-body bg-lovers-blush/80 hover:bg-lovers-blush text-white border border-white/20 backdrop-blur-sm shadow-md"
          >
            <Save size={16} className="mr-2" />
            Save Moodboard
          </Button>

          <div>
            <input
              type="file"
              ref={logoInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              className="glass font-body"
              onClick={() => logoInputRef.current?.click()}
            >
              <Upload size={16} className="mr-2" />
              {logoFile ? "Change Logo" : "Add Company Logo"}
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="glass font-body">
                <Download size={16} className="mr-2" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/50">
              <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                <FileText size={14} className="mr-2" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("ppt")}>
                <Presentation size={14} className="mr-2" />
                Download as PPT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" onClick={onClose} className="font-body text-muted-foreground">
            Start Over
          </Button>
        </div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════
  // WIZARD: Stage-by-stage generation
  // ════════════════════════════════════════════
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Stage progress */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {STAGES.map((stage, idx) => (
          <React.Fragment key={stage.key}>
            <div
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-body transition-all ${
                idx === currentStageIdx
                  ? "bg-white/50 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-gray-600/30 text-foreground font-medium shadow-md"
                  : idx < currentStageIdx
                  ? "bg-lovers-blush/15 text-lovers-blush"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{stage.icon}</span>
              <span className="hidden sm:inline">{stage.label}</span>
              {idx < currentStageIdx && <Check size={12} />}
            </div>
            {idx < STAGES.length - 1 && (
              <ChevronRight size={12} className="text-muted-foreground shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="text-center">
        <h3 className="font-heading text-xl text-foreground">
          Stage {currentStageIdx + 1}: {currentStage.label} {currentStage.icon}
        </h3>
        <p className="text-xs text-muted-foreground font-body mt-1">
          {isFirstStage ? "Free generation" : "Select your favorite design"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {generating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-2xl p-8 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted overflow-hidden relative">
                  <div
                    className="absolute inset-0 animate-shimmer"
                    style={{
                      backgroundImage: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-lovers-blush">
              <Sparkles className="animate-pulse" size={16} />
              <span className="font-body text-sm italic">Crafting {currentStage.label} designs...</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="images"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Error state */}
            {genError && stageImages.length === 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm text-destructive font-body">{genError}</p>
              </div>
            )}

            <div className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-2 gap-4">
                {stageImages.map((img) => (
                  <ImageCard
                    key={img.id}
                    image={img}
                    selected={selectedImage === img.id}
                    onClick={() => setSelectedImage(img.id)}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 mt-6">
              {selectedImage && (
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="font-body px-8 bg-lovers-blush/80 hover:bg-lovers-blush text-white border border-white/20 backdrop-blur-sm shadow-lg"
                >
                  <Check size={16} className="mr-2" />
                  {currentStageIdx < STAGES.length - 1 ? "Add to Moodboard & Next" : "Complete Moodboard"}
                </Button>
              )}
              <Button
                variant="outline"
                className="glass font-body text-sm"
                onClick={handleRetry}
                disabled={generating}
              >
                <RefreshCw size={14} className="mr-2" />
                Retry (Uses 1 Credit)
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paywall Modal */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/30 dark:border-gray-700/50 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl flex items-center gap-2">
              <Sparkles className="text-lovers-blush" size={22} />
              Unlock Full Moodboard
            </DialogTitle>
            <DialogDescription className="font-body">
              Stage 1 (Entry) is free! Upgrade to Pro to continue generating all 5 stages
              of your wedding moodboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-xl p-4 space-y-2 border border-white/30 dark:border-white/10">
              <p className="font-body font-medium text-foreground">Pro Plan — ₹999/month</p>
              <ul className="text-sm text-muted-foreground font-body space-y-1">
                <li>✓ 3 complete moodboard generations</li>
                <li>✓ All 5 stages unlocked</li>
                <li>✓ Advanced AI model</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1 font-body bg-lovers-blush/80 hover:bg-lovers-blush text-white border border-white/20"
                onClick={() => { navigate("/billing"); setShowPaywall(false); }}
              >
                Upgrade Now
              </Button>
              <Button variant="ghost" className="font-body" onClick={() => setShowPaywall(false)}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StageWizard;
