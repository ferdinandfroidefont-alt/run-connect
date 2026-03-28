import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type CoachingFullscreenHeaderProps = {
  title: string;
  onBack: () => void;
  backLabel?: string;
  rightSlot?: ReactNode;
  className?: string;
};

export function CoachingFullscreenHeader({
  title,
  onBack,
  backLabel = "Retour",
  rightSlot,
  className,
}: CoachingFullscreenHeaderProps) {
  return (
    <header
      className={cn(
        "shrink-0 border-b border-border bg-card",
        "pt-[max(0.25rem,var(--safe-area-top))]",
        className
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5">
        <div className="flex min-w-0 justify-start">
          <button
            type="button"
            onClick={onBack}
            className="flex touch-manipulation items-center gap-0.5 text-primary"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="text-[17px]">{backLabel}</span>
          </button>
        </div>
        <h1 className="max-w-[min(240px,46vw)] truncate text-center text-[17px] font-semibold leading-tight text-foreground">
          {title}
        </h1>
        <div className="flex min-w-0 justify-end">
          {rightSlot ?? <div className="h-9 w-12 shrink-0" aria-hidden />}
        </div>
      </div>
    </header>
  );
}
