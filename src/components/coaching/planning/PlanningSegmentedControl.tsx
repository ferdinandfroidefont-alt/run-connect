import { cn } from "@/lib/utils";

interface PlanningSegmentedControlProps {
  active: "planning" | "create";
  onChange: (next: "planning" | "create") => void;
}

export function PlanningSegmentedControl({ active, onChange }: PlanningSegmentedControlProps) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-card p-1.5">
      <button
        type="button"
        onClick={() => onChange("planning")}
        className={cn(
          "rounded-xl py-2 text-[13px] font-semibold transition-all duration-200",
          active === "planning" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
        )}
      >
        Planification
      </button>
      <button
        type="button"
        onClick={() => onChange("create")}
        className={cn(
          "rounded-xl py-2 text-[13px] font-semibold transition-all duration-200",
          active === "create" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
        )}
      >
        Créer une séance
      </button>
    </div>
  );
}

