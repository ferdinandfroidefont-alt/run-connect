import { useState } from "react";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const options = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-ios-subheadline leading-snug text-foreground min-w-0">{label}</p>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          disabled={disabled || !onChange}
          onClick={() => {
            setDraft(String(value));
            setOpen(true);
          }}
          className={cn(
            "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-left",
            "text-ios-subheadline font-semibold tabular-nums text-foreground",
            (disabled || !onChange) && "opacity-60"
          )}
        >
          RPE : {value}
        </button>
      </div>
      <WheelValuePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        columns={[{ items: options, value: draft, onChange: setDraft }]}
        onConfirm={() => {
          onChange?.(Math.max(0, Math.min(10, Number.parseInt(draft, 10) || 0)));
          setOpen(false);
        }}
      />
    </div>
  );
}
