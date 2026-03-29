import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";

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
      <IosPageHeaderBar
        className="py-2.5"
        left={
          <button
            type="button"
            onClick={onBack}
            className="flex touch-manipulation items-center gap-0.5 text-primary"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="text-[17px]">{backLabel}</span>
          </button>
        }
        title={title}
        right={rightSlot}
      />
    </header>
  );
}
