import { Settings } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MainTopHeader } from "@/components/layout/MainTopHeader";

interface PlanningHeaderProps {
  onOpenMenu: () => void;
  /** Titre de l’écran (remplace la marque dans la barre du haut). */
  title: string;
  /** Sous-titre optionnel (ex. vue athlète « Mon plan »). */
  subtitle?: string;
  tabs?: Array<{ id: string; label: string; active: boolean; onClick: () => void }>;
}

export function PlanningHeader({ onOpenMenu, title, subtitle, tabs }: PlanningHeaderProps) {
  return (
    <MainTopHeader
      title={title}
      subtitle={subtitle}
      tabs={tabs}
      tabsAriaLabel={`Navigation ${title}`}
      right={
        <>
          <div className="flex shrink-0 items-center justify-center">
            <NotificationCenter scope="coaching" />
          </div>
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-[40px] w-[40px] shrink-0 touch-manipulation items-center justify-center rounded-[12px] border border-[#E5E5EA] bg-white text-[#1A1A1A] shadow-none transition-[opacity,transform] duration-200 active:scale-[0.97] active:opacity-80 dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:text-foreground"
            aria-label="Ouvrir le menu coaching"
          >
            <Settings className="h-[20px] w-[20px]" />
          </button>
        </>
      }
    />
  );
}

