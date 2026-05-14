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
  /** En-tête bleu iOS 17 (chevron 24px, libellé semibold) comme l’écran « Suivi athlète ». */
  suiviAthleteStyle?: boolean;
};

export function CoachingFullscreenHeader({
  title,
  onBack,
  backLabel = "Retour",
  rightSlot,
  className,
  suiviAthleteStyle = false,
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
            className={cn(
              "flex touch-manipulation items-center gap-0.5 text-primary",
              suiviAthleteStyle && "gap-0 text-[#007AFF]",
            )}
          >
            <ChevronLeft className={cn("h-5 w-5 shrink-0", suiviAthleteStyle && "h-6 w-6")} strokeWidth={suiviAthleteStyle ? 2.6 : 2} />
            <span className={cn("text-[17px]", suiviAthleteStyle && "font-semibold")}>{backLabel}</span>
          </button>
        }
        title={title}
        titleClassName={suiviAthleteStyle ? "font-bold text-[#0A0F1F]" : undefined}
        right={rightSlot}
      />
    </header>
  );
}
