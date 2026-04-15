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
}

export function ModelFilters({ value, onChange }: ModelFiltersProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold",
            value === filter.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

