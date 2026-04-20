import { cn } from "@/lib/utils";

interface ModelTabsProps {
  value: "mine" | "base";
  onChange: (value: "mine" | "base") => void;
}

export function ModelTabs({ value, onChange }: ModelTabsProps) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-secondary p-1">
      <button
        type="button"
        className={cn(
          "rounded-lg py-2 text-[13px] font-semibold",
          value === "mine" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
        )}
        onClick={() => onChange("mine")}
      >
        Mes modèles
      </button>
      <button
        type="button"
        className={cn(
          "rounded-lg py-2 text-[13px] font-semibold",
          value === "base" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
        )}
        onClick={() => onChange("base")}
      >
        Modèles de base
      </button>
    </div>
  );
}

