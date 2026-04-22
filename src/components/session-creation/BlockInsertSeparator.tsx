import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  label?: string;
  onClick: () => void;
  ariaLabel?: string;
};

export function BlockInsertSeparator({
  className,
  label = "Ajouter ici",
  onClick,
  ariaLabel,
}: Props) {
  return (
    <div className={cn("flex items-center gap-3 px-1", className)}>
      <div className="h-px flex-1 bg-border/80" aria-hidden />
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border/90 bg-background px-4 text-[13px] font-semibold text-foreground shadow-[0_14px_36px_-24px_hsl(var(--foreground)/0.35)] transition-all hover:bg-secondary/80 active:scale-[0.98]"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-primary shadow-[0_8px_18px_-12px_hsl(var(--foreground)/0.45)]">
          <Plus className="h-4 w-4" />
        </span>
        <span>{label}</span>
      </button>
      <div className="h-px flex-1 bg-border/80" aria-hidden />
    </div>
  );
}