import { cn } from "@/lib/utils";

interface ModelTabsProps {
  value: "mine" | "base";
  onChange: (value: "mine" | "base") => void;
  maquette?: boolean;
}

const ACTION_BLUE = "#007AFF";

export function ModelTabs({ value, onChange, maquette }: ModelTabsProps) {
  if (maquette) {
    return (
      <div className="flex rounded-[12px] p-1" style={{ background: "#E5E5EA" }}>
        {(
          [
            { id: "mine" as const, label: "Mes modèles" },
            { id: "base" as const, label: "Modèles de base" },
          ] as const
        ).map((s) => {
          const sel = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(s.id)}
              className="flex-1 transition-all"
              style={{
                background: sel ? "#fff" : "transparent",
                color: sel ? ACTION_BLUE : "#8E8E93",
                fontWeight: sel ? 700 : 600,
                fontSize: 15,
                padding: "8px",
                borderRadius: 9,
                boxShadow: sel ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                letterSpacing: "-0.01em",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    );
  }

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

