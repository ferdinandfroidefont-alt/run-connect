import { Settings } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MainTopHeader } from "@/components/layout/MainTopHeader";

/** Maquettes 14–15 · jeton RunConnect (32×32, dégradé #0a84ff → #5e5ce6). */
function RunConnectHeaderMark() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-[11px] font-bold leading-none tracking-[0.3px] text-white shadow-[0_2px_6px_rgba(10,132,255,0.35)]"
      style={{ background: "linear-gradient(135deg, #0a84ff, #5e5ce6)" }}
      aria-hidden
    >
      RC
    </div>
  );
}

interface PlanningHeaderProps {
  onOpenMenu: () => void;
  /** Titre de l’écran (remplace la marque dans la barre du haut). */
  title: string;
  /** Sous-titre optionnel (ex. vue athlète « Mon plan »). */
  subtitle?: string;
  tabs?: Array<{ id: string; label: string; active: boolean; onClick: () => void }>;
  /**
   * Maquette 15 · Planification coach : pastille « RC » (gradient RunConnect) comme
   * `ScreenCoachPlan` dans apple-screens.jsx à la place notifications + réglages.
   */
  coachLandingBrand?: boolean;
  /** Maquette Mon plan : pas de cloche ni de bouton paramètres dans la barre (menu via drawer ailleurs). */
  hideDrawerActions?: boolean;
  /** Photo du club : même action que dans Messages (fiche club). Remplace le jeton RC quand défini. */
  clubAvatarUrl?: string | null;
  clubName?: string | null;
  onPressClubAvatar?: () => void;
}

export function PlanningHeader({
  onOpenMenu,
  title,
  subtitle,
  tabs,
  coachLandingBrand,
  hideDrawerActions,
  clubAvatarUrl,
  clubName,
  onPressClubAvatar,
}: PlanningHeaderProps) {
  const showBellAndSettings = !coachLandingBrand && !hideDrawerActions;
  /** Dès qu’une action fiche club est fournie, afficher le bouton (initiale de secours si pas encore nom/photo). */
  const showClubMark = Boolean(onPressClubAvatar);
  const clubInitial = (clubName || "Club").trim().slice(0, 1).toUpperCase() || "C";
  return (
    <MainTopHeader
      title={title}
      subtitle={subtitle}
      tabs={tabs}
      tabsAriaLabel={`Navigation ${title}`}
      right={
        <>
          {showClubMark ? (
            <button
              type="button"
              onClick={onPressClubAvatar}
              className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-2xl bg-primary/12 text-[14px] font-semibold text-primary active:opacity-80"
              aria-label="Fiche du club"
            >
              {clubAvatarUrl ? (
                <img src={clubAvatarUrl} alt={clubName || "Club"} className="h-full w-full object-cover" />
              ) : (
                clubInitial
              )}
            </button>
          ) : (
            <RunConnectHeaderMark />
          )}
          {showBellAndSettings ? (
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
          ) : null}
        </>
      }
    />
  );
}
