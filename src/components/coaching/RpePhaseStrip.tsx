import { cn } from "@/lib/utils";
import { rpeChipColor } from "@/lib/sessionBlockRpe";
import type { SessionRpePhases } from "@/lib/sessionBlockRpe";

const ROWS: { key: keyof SessionRpePhases; label: string }[] = [
  { key: "warmup", label: "Échauffement" },
  { key: "main", label: "Séance" },
  { key: "cooldown", label: "Récup" },
];

interface RpePhaseStripProps {
  value: SessionRpePhases;
  onChange: (next: SessionRpePhases) => void;
  className?: string;
}

export function RpePhaseStrip({ value, onChange, className }: RpePhaseStripProps) {
  const setPhase = (key: keyof SessionRpePhases, n: number) => {
    onChange({ ...value, [key]: n });
  };

  return (
    <div className={cn("space-y-2.5", className)}>
      {ROWS.map(({ key, label }) => {
        const current = typeof value[key] === "number" ? Math.min(10, Math.max(1, value[key]!)) : 5;
        return (
          <div key={key} className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="w-[5.5rem] shrink-0 text-[12px] font-medium text-foreground sm:w-28 sm:text-[13px]">
              {label}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => {
                const n = i + 1;
                const active = n === current;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPhase(key, n)}
                    className={cn(
                      "h-8 min-w-[1.65rem] flex-1 rounded-md text-[12px] font-bold tabular-nums transition-colors sm:min-w-[1.75rem] sm:flex-none",
                      active
                        ? "text-white shadow-sm"
                        : "border border-border/70 bg-secondary/60 text-muted-foreground active:bg-secondary",
                    )}
                    style={active ? { backgroundColor: rpeChipColor(n) } : undefined}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
