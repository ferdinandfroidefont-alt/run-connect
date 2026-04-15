import { ListChecks } from "lucide-react";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { NotificationCenter } from "@/components/NotificationCenter";

interface PlanningHeaderProps {
  onOpenMenu: () => void;
}

export function PlanningHeader({ onOpenMenu }: PlanningHeaderProps) {
  return (
    <div className="pt-[var(--safe-area-top)]">
      <IosPageHeaderBar
        left={
          <button
            type="button"
            onClick={onOpenMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground"
            aria-label="Ouvrir le menu coach"
          >
            <ListChecks className="h-5 w-5" />
          </button>
        }
        title={<span className="text-[17px] font-semibold">RunConnect</span>}
        right={<NotificationCenter />}
      />
    </div>
  );
}

