import React, { useState, useCallback, useRef, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import StudioSidebar from "@/components/StudioSidebar";
import SelectionPanel from "@/components/SelectionPanel";
import StageWizard from "@/components/StageWizard";
import type { MoodboardOptions } from "@/components/SelectionPanel";
import { startMoodboard } from "@/lib/services/databaseService";
import { Upload, Sparkles, Monitor, LayoutTemplate, ChevronDown, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const Studio: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [wizardActive, setWizardActive] = useState(false);
  const [moodboardId, setMoodboardId] = useState<string | null>(null);
  const [startingMoodboard, setStartingMoodboard] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [decorationFile, setDecorationFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decorationInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<MoodboardOptions>({
    function: "",
    theme: "",
    celebration: "",
    time: "",
    vibe: "",
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (uploadRef.current && !uploadRef.current.contains(e.target as Node)) {
        setUploadOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStartGeneration = useCallback(async () => {
    setStartingMoodboard(true);
    try {
      const formData = new FormData();
      formData.append("prompt", options.vibe || "Wedding moodboard");
      if (options.function) formData.append("functionType", options.function);
      if (options.theme) formData.append("theme", options.theme);
      if (options.celebration) formData.append("celebrationType", options.celebration);
      if (options.time) formData.append("timeOfDay", options.time);
      if (referenceFile) formData.append("venue", referenceFile);
      if (decorationFile) formData.append("design", decorationFile);

      const moodboard = await startMoodboard(formData);
      setMoodboardId(moodboard._id);
      setWizardActive(true);
    } catch {
      toast({ title: "Error", description: "Failed to start moodboard. Please try again.", variant: "destructive" });
    }
    setStartingMoodboard(false);
  }, [options, referenceFile, decorationFile]);

  const hasSelections = options.function || options.theme;

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudioSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar — Vibe + Upload Dropdowns */}
        <div className="glass m-3 mb-0 rounded-xl p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Describe the Vibe
            </label>
            <Input
              value={options.vibe}
              onChange={(e) => setOptions((o) => ({ ...o, vibe: e.target.value }))}
              placeholder="e.g. Romantic garden with cascading florals"
              className="bg-background/50 font-body"
            />
          </div>

          {/* Venue Reference Upload */}
          <div className="shrink-0 relative" ref={uploadRef}>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                setReferenceFile(e.target.files?.[0] || null);
                setUploadOpen(false);
              }}
            />
            <Button
              variant="outline"
              className="glass font-body"
              onClick={() => setUploadOpen((p) => !p)}
            >
              <Upload size={16} className="mr-2" />
              {referenceFile ? referenceFile.name.slice(0, 20) : "Upload Venue Ref"}
              <ChevronDown
                size={14}
                className={`ml-2 transition-transform duration-200 ${uploadOpen ? "rotate-180" : ""}`}
              />
            </Button>

            {/* Glassmorphic Dropdown Menu */}
            {uploadOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white/60 dark:bg-black/50 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-xl shadow-xl shadow-black/10 z-50 overflow-hidden animate-fade-in">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setUploadOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-body text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-lovers-blush/10 flex items-center justify-center shrink-0">
                    <Monitor size={16} className="text-lovers-blush" />
                  </div>
                  <div className="text-left">
                    <span className="block font-medium">Upload from Device</span>
                    <span className="block text-xs text-gray-400">JPG, PNG, WEBP</span>
                  </div>
                </button>
                <div className="h-px bg-gradient-to-r from-transparent via-lovers-blush/15 to-transparent" />
                <button
                  onClick={() => {
                    setUploadOpen(false);
                    navigate("/templates");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-body text-gray-700 dark:text-gray-200 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-lovers-gold/10 flex items-center justify-center shrink-0">
                    <LayoutTemplate size={16} className="text-lovers-gold" />
                  </div>
                  <div className="text-left">
                    <span className="block font-medium">Select a Template</span>
                    <span className="block text-xs text-gray-400">Premium moodboards</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Decoration Reference Upload */}
          <div className="shrink-0">
            <input
              type="file"
              ref={decorationInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                setDecorationFile(e.target.files?.[0] || null);
              }}
            />
            <Button
              variant="outline"
              className="glass font-body"
              onClick={() => decorationInputRef.current?.click()}
            >
              <ImageIcon size={16} className="mr-2" />
              {decorationFile ? decorationFile.name.slice(0, 18) : "Decoration Ref"}
            </Button>
          </div>
        </div>

        {/* Reference image previews */}
        {(referenceFile || decorationFile) && (
          <div className="mx-3 mt-2 flex gap-3 flex-wrap">
            {referenceFile && (
              <div className="relative group">
                <img
                  src={URL.createObjectURL(referenceFile)}
                  alt="Venue reference"
                  className="h-16 w-16 rounded-lg object-cover border border-white/30"
                />
                <span className="text-[10px] font-body text-muted-foreground block text-center mt-0.5">Venue</span>
                <button
                  onClick={() => setReferenceFile(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            )}
            {decorationFile && (
              <div className="relative group">
                <img
                  src={URL.createObjectURL(decorationFile)}
                  alt="Decoration reference"
                  className="h-16 w-16 rounded-lg object-cover border border-white/30"
                />
                <span className="text-[10px] font-body text-muted-foreground block text-center mt-0.5">Decoration</span>
                <button
                  onClick={() => setDecorationFile(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden">
          {/* Left panel — selections */}
          <div className="w-full lg:w-[340px] border-r border-border shrink-0 overflow-hidden">
            <SelectionPanel options={options} onChange={setOptions} />
          </div>

          {/* Canvas / Wizard */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
            {wizardActive && moodboardId ? (
              <StageWizard options={options} moodboardId={moodboardId} onClose={() => { setWizardActive(false); setMoodboardId(null); }} />
            ) : (
              <div className="flex flex-col items-center gap-6 text-center max-w-md">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="text-primary" size={36} />
                </div>
                <div>
                  <h3 className="font-heading text-2xl text-foreground mb-2">Your Canvas Awaits</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">
                    Select your wedding details on the left, then generate a stunning 5-stage moodboard powered by AI.
                  </p>
                </div>
                <Button
                  onClick={handleStartGeneration}
                  disabled={!hasSelections || startingMoodboard}
                  size="lg"
                  className="font-body px-8 glass-strong"
                >
                  {startingMoodboard ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      Generate Moodboard
                    </>
                  )}
                </Button>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
