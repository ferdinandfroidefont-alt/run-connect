import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface RpeSessionSliderProps {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}

/** Curseur discret 1–10, repères verticaux + valeur principale (tactile). */
export function RpeSessionSlider({ value, onChange, className }: RpeSessionSliderProps) {
  const v = Math.min(10, Math.max(1, value));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-end justify-center gap-1.5">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">{v}</span>
        <span className="pb-1 text-sm font-medium text-muted-foreground">/ 10</span>
      </div>

      <div className="space-y-2 px-0.5">
        <div className="pointer-events-none flex select-none justify-between px-1" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-75",
                i + 1 <= v ? "h-5 bg-primary/85" : "h-2.5 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>

        <Slider
          min={1}
          max={10}
          step={1}
          value={[v]}
          onValueChange={(vals) => {
            const n = vals[0];
            if (typeof n === "number") onChange(n);
          }}
          className="w-full touch-pan-x"
        />

        <div className="flex justify-between px-0.5 text-[10px] font-medium tabular-nums text-muted-foreground/90 select-none">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}
