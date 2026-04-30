import { ListChecks } from "lucide-react";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";

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
      {tabs && tabs.length > 0 ? (
        <div role="tablist" aria-label={`Navigation ${title}`} className="flex items-end gap-8 border-b border-[#ECECEE] px-4 pb-1.5 pt-0.5 dark:border-[#1f1f1f]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.active}
              onClick={tab.onClick}
              className={cn(
                "touch-manipulation pb-1 pt-0.5 text-[15px] font-semibold leading-tight tracking-tight transition-colors",
                tab.active ? "text-[#007AFF] dark:text-[#0A84FF]" : "text-[#8E8E93] dark:text-[#8E8E93]"
              )}
            >
              <span className="relative inline-block pb-2">
                {tab.label}
                {tab.active ? (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#007AFF] dark:bg-[#0A84FF]"
                    aria-hidden
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

