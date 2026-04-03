import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  STAGES,
  generateStageImages,
  selectStageImage,
  fileToBase64,
  type StageKey,
  type GeneratedImage,
  type StageGenerationInputs,
} from "@/lib/services/aiService";
import { saveMoodboard, addLogo, downloadMoodboard } from "@/lib/services/databaseService";
import {
  Sparkles,
  RefreshCw,
  ChevronRight,
  Check,
  Save,
  Image as ImageIcon,
  Download,
  Upload,
  FileText,
  Presentation,
  GripVertical,
  Camera,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ── Selection pill ──
const Pill: React.FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-body transition-all border ${
      selected
        ? "bg-primary/15 border-primary/40 text-primary font-medium shadow-sm"
        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:border-border"
    }`}
  >
    {label}
  </button>
);

// ── Image Card ──
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
          (e.target as HTMLImageElement).style.display = "none";
          const fallback = (e.target as HTMLImageElement).nextElementSibling;
          if (fallback) (fallback as HTMLElement).style.display = "flex";
        }}
      />
    ) : null}
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
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
    {image.url && (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <span className="text-white text-xs font-body font-medium">{image.label}</span>
      </div>
    )}
    {selected && (
      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
        <Check size={14} className="text-primary-foreground" />
      </div>
    )}
  </button>
);

// ── Collage item type ──
interface CollageItem {
  id: string;
  stageKey: string;
  stageLabel: string;
  stageIcon: string;
  selectionLabel: string;
  imageUrl: string | null;
}

// ── Selection categories for the per-stage sidebar ──
const FUNCTION_OPTIONS = ["Haldi", "Mehendi", "Sangeet", "Shaadi", "Reception"];
const THEME_OPTIONS = ["Royal", "Minimal", "Boho", "Traditional", "Pastel", "Art Deco"];
const CELEBRATION_OPTIONS = ["Palace", "Banquet", "Open Lawn", "Resort", "Beach", "Heritage Haveli"];
const TIME_OPTIONS = ["Daytime", "Nighttime", "Golden Hour", "Twilight"];

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

  // ── Per-stage inputs ──
  const [stageVenueFile, setStageVenueFile] = useState<File | null>(null);
  const [stageDecorFile, setStageDecorFile] = useState<File | null>(null);
  const [stageFunctionType, setStageFunctionType] = useState(options.function || "");
  const [stageTheme, setStageTheme] = useState(options.theme || "");
  const [stageCelebration, setStageCelebration] = useState(options.celebration || "");
  const [stageTime, setStageTime] = useState(options.time || "");
  const [stageVibe, setStageVibe] = useState(options.vibe || "");

  const venueInputRef = useRef<HTMLInputElement>(null);
  const decorInputRef = useRef<HTMLInputElement>(null);

  const currentStage = STAGES[currentStageIdx];

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setStageImages([]);
    setSelectedImage(null);
    setGenError(null);

    try {
      // Convert files to base64 if present
      let venueBase64: string | null = null;
      let decorBase64: string | null = null;

      if (stageVenueFile) {
        venueBase64 = await fileToBase64(stageVenueFile);
      }
      if (stageDecorFile) {
        decorBase64 = await fileToBase64(stageDecorFile);
      }

      const inputs: StageGenerationInputs = {
        stage: currentStage.key as StageKey,
        venueImageBase64: venueBase64,
        decorImageBase64: decorBase64,
        functionType: stageFunctionType,
        theme: stageTheme,
        celebrationType: stageCelebration,
        timeOfDay: stageTime,
        vibeDescription: stageVibe,
      };

      const result = await generateStageImages(moodboardId, inputs);
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
  }, [currentStage, moodboardId, stageVenueFile, stageDecorFile, stageFunctionType, stageTheme, stageCelebration, stageTime, stageVibe]);

  const handleRetry = async () => {
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
      setCurrentStageIdx(nextIdx);
      // Reset per-stage files for the next stage (keep selections persisted)
      setStageVenueFile(null);
      setStageDecorFile(null);
      setStageImages([]);
      setSelectedImage(null);
      setGenError(null);
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
                    <div className="absolute top-0 left-0 right-0 p-2.5 flex items-start justify-between">
                      <div className="px-3 py-1 rounded-full text-[10px] font-body font-semibold uppercase tracking-wider bg-black/30 text-white backdrop-blur-sm">
                        {item.stageIcon} {item.stageLabel}
                      </div>
                      <div className="opacity-0 group-hover:opacity-60 transition-opacity">
                        <GripVertical size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
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
  // WIZARD: Stage-by-stage generation with per-stage inputs
  // ════════════════════════════════════════════
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
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
          Upload reference images & select options, then generate
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Per-stage input panel ── */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-5">
          <div className="glass rounded-2xl p-5 space-y-4">
            {/* Venue Image Upload */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                <Camera size={12} className="inline mr-1" /> Venue Photo
              </label>
              <input
                type="file"
                ref={venueInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => setStageVenueFile(e.target.files?.[0] || null)}
              />
              {stageVenueFile ? (
                <div className="relative group">
                  <img
                    src={URL.createObjectURL(stageVenueFile)}
                    alt="Venue"
                    className="w-full h-24 object-cover rounded-lg border border-white/30"
                  />
                  <button
                    onClick={() => setStageVenueFile(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full glass font-body text-xs"
                  onClick={() => venueInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  Upload Venue Image
                </Button>
              )}
            </div>

            {/* Decor Reference Upload */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                <Palette size={12} className="inline mr-1" /> Decor Reference
              </label>
              <input
                type="file"
                ref={decorInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => setStageDecorFile(e.target.files?.[0] || null)}
              />
              {stageDecorFile ? (
                <div className="relative group">
                  <img
                    src={URL.createObjectURL(stageDecorFile)}
                    alt="Decor"
                    className="w-full h-24 object-cover rounded-lg border border-white/30"
                  />
                  <button
                    onClick={() => setStageDecorFile(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full glass font-body text-xs"
                  onClick={() => decorInputRef.current?.click()}
                >
                  <Upload size={14} className="mr-1.5" />
                  Upload Decor Reference
                </Button>
              )}
            </div>

            {/* Vibe Description */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Vibe Description
              </label>
              <Input
                value={stageVibe}
                onChange={(e) => setStageVibe(e.target.value)}
                placeholder="e.g. Romantic garden with cascading florals"
                className="bg-background/50 font-body text-sm"
              />
            </div>

            {/* Function */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Function
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FUNCTION_OPTIONS.map((f) => (
                  <Pill key={f} label={f} selected={stageFunctionType === f} onClick={() => setStageFunctionType(stageFunctionType === f ? "" : f)} />
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Theme
              </label>
              <div className="flex flex-wrap gap-1.5">
                {THEME_OPTIONS.map((t) => (
                  <Pill key={t} label={t} selected={stageTheme === t} onClick={() => setStageTheme(stageTheme === t ? "" : t)} />
                ))}
              </div>
            </div>

            {/* Celebration Type */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Celebration Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CELEBRATION_OPTIONS.map((c) => (
                  <Pill key={c} label={c} selected={stageCelebration === c} onClick={() => setStageCelebration(stageCelebration === c ? "" : c)} />
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Time of Day
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TIME_OPTIONS.map((t) => (
                  <Pill key={t} label={t} selected={stageTime === t} onClick={() => setStageTime(stageTime === t ? "" : t)} />
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating}
            size="lg"
            className="w-full font-body bg-lovers-blush/80 hover:bg-lovers-blush text-white border border-white/20 backdrop-blur-sm shadow-lg"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                Generate {currentStage.label}
              </>
            )}
          </Button>
        </div>

        {/* ── Right: Generated images area ── */}
        <div className="flex-1 min-w-0">
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
                  <span className="font-body text-sm italic">Crafting {currentStage.label} designs via AI pipeline...</span>
                </div>
                <p className="text-center text-xs text-muted-foreground font-body mt-2">
                  This may take 1-3 minutes (Groq analysis + Flux generation)
                </p>
              </motion.div>
            ) : stageImages.length > 0 ? (
              <motion.div
                key="images"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
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
                    Regenerate
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/40 dark:bg-black/30 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-2xl p-12 shadow-lg flex flex-col items-center justify-center text-center min-h-[400px]"
              >
                {genError ? (
                  <>
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4">
                      <p className="text-sm text-destructive font-body">{genError}</p>
                    </div>
                    <Button
                      variant="outline"
                      className="glass font-body text-sm mt-2"
                      onClick={handleRetry}
                    >
                      <RefreshCw size={14} className="mr-2" />
                      Try Again
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Sparkles className="text-primary" size={32} />
                    </div>
                    <h4 className="font-heading text-lg text-foreground mb-2">
                      Ready to Generate
                    </h4>
                    <p className="text-sm text-muted-foreground font-body max-w-sm leading-relaxed">
                      Upload your venue & decor reference images, select your preferences on the left, then click <strong>"Generate {currentStage.label}"</strong> to create 4 AI-powered design variations.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StageWizard;
