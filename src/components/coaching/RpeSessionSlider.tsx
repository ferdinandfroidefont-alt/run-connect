import { useState } from "react";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import { cn } from "@/lib/utils";

interface RpeSessionSliderProps {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}

/** Curseur discret 1–10, repères verticaux + valeur principale (tactile). */
export function RpeSessionSlider({ value, onChange, className }: RpeSessionSliderProps) {
  const v = Math.min(10, Math.max(1, value));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(v));
  const options = Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

  return (
    <div className={cn("space-y-4", className)}>
      <button
        type="button"
        onClick={() => {
          setDraft(String(v));
          setOpen(true);
        }}
        className="w-full rounded-xl border border-border bg-card px-3 py-3"
      >
      <div className="flex items-end justify-center gap-1.5">
        <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">{v}</span>
        <span className="pb-1 text-sm font-medium text-muted-foreground">/ 10</span>
      </div>
      </button>
      <WheelValuePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="RPE séance"
        columns={[{ items: options, value: draft, onChange: setDraft }]}
        onConfirm={() => {
          onChange(Math.max(1, Math.min(10, Number.parseInt(draft, 10) || 1)));
          setOpen(false);
        }}
      />
    </div>
  );
}
