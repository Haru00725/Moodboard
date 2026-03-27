import React from "react";
import { cn } from "@/lib/utils";

interface SelectionPillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const SelectionPill: React.FC<SelectionPillProps> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-full text-sm font-body transition-all duration-200 border",
      selected
        ? "bg-primary text-primary-foreground border-primary shadow-md"
        : "bg-background text-foreground border-border hover:border-primary/40 hover:shadow-sm"
    )}
  >
    {label}
  </button>
);

export default SelectionPill;
