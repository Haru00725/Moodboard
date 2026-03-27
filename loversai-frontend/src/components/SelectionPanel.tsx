import React from "react";
import SelectionPill from "./SelectionPill";

interface MoodboardOptions {
  function: string;
  theme: string;
  celebration: string;
  time: string;
  vibe: string;
}

interface SelectionPanelProps {
  options: MoodboardOptions;
  onChange: (options: MoodboardOptions) => void;
}

const categories: { key: keyof MoodboardOptions; label: string; pills: string[] }[] = [
  { key: "function", label: "Function", pills: ["Haldi", "Mehendi", "Sangeet", "Shaadi", "Reception"] },
  { key: "theme", label: "Theme", pills: ["Royal", "Minimal", "Boho", "Traditional", "Pastel", "Art Deco"] },
  { key: "celebration", label: "Celebration Type", pills: ["Palace", "Banquet", "Open Lawn", "Resort", "Beach", "Heritage Haveli"] },
  { key: "time", label: "Time", pills: ["Daytime", "Nighttime", "Golden Hour", "Twilight"] },
];

const SelectionPanel: React.FC<SelectionPanelProps> = ({ options, onChange }) => {
  const update = (key: keyof MoodboardOptions, value: string) =>
    onChange({ ...options, [key]: value });

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-5rem)]">
      <div>
        <h2 className="font-heading text-2xl text-foreground mb-1">Create Moodboard</h2>
        <p className="text-sm text-muted-foreground font-body">Select your wedding details</p>
      </div>

      {categories.map((cat) => (
        <div key={cat.key}>
          <label className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
            {cat.label}
          </label>
          <div className="flex flex-wrap gap-2">
            {cat.pills.map((pill) => (
              <SelectionPill
                key={pill}
                label={pill}
                selected={options[cat.key] === pill}
                onClick={() => update(cat.key, pill)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SelectionPanel;
export type { MoodboardOptions };
