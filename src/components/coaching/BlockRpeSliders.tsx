import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function RpeBlockSliderRow({
  label,
  value,
  onChange,
  disabled,
  className,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-ios-subheadline leading-snug text-foreground min-w-0">{label}</p>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">0</span>
          <Slider
            value={[value]}
            onValueChange={(v) => onChange?.(v[0] ?? 0)}
            min={0}
            max={10}
            step={1}
            disabled={disabled}
            className="min-w-0 flex-1 py-1"
          />
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">10</span>
        </div>
        <p className="shrink-0 text-center text-ios-subheadline font-semibold tabular-nums text-foreground sm:min-w-[4.5rem] sm:text-right">
          RPE : {value}
        </p>
      </div>
    </div>
  );
}
