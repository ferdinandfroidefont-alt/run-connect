import { ListChecks } from "lucide-react";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { NotificationCenter } from "@/components/NotificationCenter";

interface PlanningHeaderProps {
  onOpenMenu: () => void;
  /** Titre de l’écran (remplace la marque dans la barre du haut). */
  title: string;
  /** Sous-titre optionnel (ex. vue athlète « Mon plan »). */
  subtitle?: string;
}

export function PlanningHeader({ onOpenMenu, title, subtitle }: PlanningHeaderProps) {
  return (
    <div className="pt-[var(--safe-area-top)]">
      {/* Header unifié : px-4 / py-3 (cohérent avec Messages, MySessions, Home). */}
      <IosPageHeaderBar
        className="px-4 py-3"
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
        title={
          <span className="flex min-w-0 flex-col items-center gap-0.5 text-center">
            <span className="text-[17px] font-semibold leading-tight">{title}</span>
            {subtitle ? (
              <span className="line-clamp-2 max-w-[280px] text-[12px] font-normal leading-snug text-muted-foreground">
                {subtitle}
              </span>
            ) : null}
          </span>
        }
        right={<NotificationCenter scope="coaching" />}
      />
    </div>
  );
}

