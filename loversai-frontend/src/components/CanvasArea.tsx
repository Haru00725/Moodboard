import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MoodboardOptions } from "./SelectionPanel";

interface CanvasAreaProps {
  options: MoodboardOptions;
  generating: boolean;
  generatedImage: string | null;
  palette: string[];
  onGenerate: () => void;
  credits: number;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  options,
  generating,
  generatedImage,
  palette,
  onGenerate,
  credits,
}) => {
  const hasSelections = options.area || options.function || options.theme;

  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-center min-h-0 overflow-y-auto">
      <AnimatePresence mode="wait">
        {generating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-80 h-80 rounded-2xl bg-muted overflow-hidden relative">
              <div
                className="absolute inset-0 animate-shimmer"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="animate-pulse" size={18} />
              <span className="font-heading text-lg italic">Crafting your vision...</span>
            </div>
          </motion.div>
        ) : generatedImage ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-6 w-full max-w-2xl"
          >
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-border">
              <img
                src={generatedImage}
                alt="Generated moodboard"
                className="w-full h-full object-cover"
              />
            </div>

            {palette.length > 0 && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-body text-muted-foreground uppercase tracking-wider">
                  Color Palette
                </span>
                <div className="flex gap-3">
                  {palette.map((color) => (
                    <div key={color} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-body text-muted-foreground">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={onGenerate} disabled={credits <= 0} className="font-body">
                <Sparkles size={16} className="mr-2" />
                Regenerate
              </Button>
              <Button variant="outline" className="font-body">
                <Download size={16} className="mr-2" />
                Download
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 text-center max-w-md"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="text-primary" size={36} />
            </div>
            <div>
              <h3 className="font-heading text-2xl text-foreground mb-2">Your Canvas Awaits</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Select your wedding details on the left, then generate a stunning moodboard
                powered by AI.
              </p>
            </div>
            <Button
              onClick={onGenerate}
              disabled={!hasSelections || credits <= 0}
              size="lg"
              className="font-body px-8"
            >
              <Sparkles size={18} className="mr-2" />
              Generate Moodboard
            </Button>
            {credits <= 0 && (
              <p className="text-xs text-destructive font-body">
                No credits remaining. Upgrade to Pro for unlimited access.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CanvasArea;
