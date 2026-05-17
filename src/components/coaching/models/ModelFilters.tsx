import { cn } from "@/lib/utils";
import type { ModelSportFilter } from "@/components/coaching/models/types";

const FILTERS: Array<{ id: ModelSportFilter; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "running", label: "Course à pied" },
  { id: "cycling", label: "Vélo" },
  { id: "strength", label: "Renforcement" },
];

interface ModelFiltersProps {
  value: ModelSportFilter;
  onChange: (value: ModelSportFilter) => void;
  /** Style inline maquette assistant création de séance */
  maquette?: boolean;
}

const ACTION_BLUE = "#007AFF";

export function ModelFilters({ value, onChange, maquette }: ModelFiltersProps) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 pb-1 touch-pan-x">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            "flex-shrink-0 whitespace-nowrap rounded-full transition-transform active:scale-[0.96]",
            !maquette && "px-3 py-1.5 text-[12px] font-semibold",
            !maquette && value === filter.id && "bg-primary text-primary-foreground",
            !maquette && value !== filter.id && "bg-secondary text-muted-foreground"
          )}
          style={
            maquette
              ? {
                  background: value === filter.id ? ACTION_BLUE : "#E5E5EA",
                  color: value === filter.id ? "#fff" : "#0A0F1F",
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  border: "none",
                  padding: "8px 18px",
                }
              : undefined
          }
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

