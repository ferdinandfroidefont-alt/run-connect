import { Settings } from "lucide-react";
import { NotificationCenter } from "@/components/NotificationCenter";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { cn } from "@/lib/utils";

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
  /** Fond du bloc header (défaut : liste groupée iOS). */
  surfaceClassName?: string;
  /** Grand titre (maquette RunConnect.jsx : Mon plan 40px / Planification 36px, extrablack). */
  largeTitleClassName?: string;
  /**
   * Pastille initiale utilisateur (#007AFF) à droite du grand titre — maquette page Coaching
   * (prioritaire sur RC / avatar club quand défini avec hideDrawerActions).
   */
  userInitialAccentBadge?: string | null;
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
  surfaceClassName,
  largeTitleClassName,
  userInitialAccentBadge,
}: PlanningHeaderProps) {
  const showBellAndSettings = !coachLandingBrand && !hideDrawerActions;
  /** Même disposition que StickyPage Coaching (titre 36/40 + pastille, fond #F2F2F7). */
  const largeTitleOnlyLayout =
    hideDrawerActions && (title === "Planification" || title === "Mon plan");
  /** Dès qu’une action fiche club est fournie, afficher le bouton (initiale de secours si pas encore nom/photo). */
  const showClubMark = Boolean(onPressClubAvatar);
  const showOnlyClubAction = showClubMark && !showBellAndSettings;
  /**
   * Mon plan / Planification : pas de cloche ni réglages dans la barre compacte.
   * Tant que les clubs ne sont pas résolus, éviter la pastille RC en haut puis un saut vers l’avatar à côté du titre :
   * on aligne toujours marque ou avatar sur la ligne du grand titre.
   */
  const brandBesideLargeTitle = hideDrawerActions && !coachLandingBrand;
  const clubInitial = (clubName || "Club").trim().slice(0, 1).toUpperCase() || "C";
  const clubCompactBarClass =
    "inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-2xl bg-primary/12 text-[14px] font-semibold text-primary active:opacity-80";
  /** À côté du grand titre : hauteur proche du libellé 34px, alignée en bas avec la ligne titre. */
  const clubLargeTitleClass =
    "inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center overflow-hidden rounded-[10px] bg-primary/12 text-[13px] font-semibold text-primary active:opacity-80";
  const userMaquetteBadge =
    userInitialAccentBadge != null && userInitialAccentBadge !== "" ? (
      <div
        className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-[15px] font-bold leading-none text-white"
        style={{ background: "#007AFF" }}
        aria-hidden
      >
        {userInitialAccentBadge.slice(0, 1).toUpperCase()}
      </div>
    ) : null;

  const clubMarkButton = (
    <button
      type="button"
      onClick={onPressClubAvatar}
      className={showOnlyClubAction ? clubLargeTitleClass : clubCompactBarClass}
      aria-label="Fiche du club"
    >
      {clubAvatarUrl ? (
        <img src={clubAvatarUrl} alt={clubName || "Club"} className="h-full w-full object-cover" />
      ) : (
        clubInitial
      )}
    </button>
  );
  const largeTitleAccessory =
    brandBesideLargeTitle ? (
      userMaquetteBadge ? (
        userMaquetteBadge
      ) : showClubMark ? (
        clubMarkButton
      ) : (
        <RunConnectHeaderMark />
      )
    ) : showOnlyClubAction ? (
      clubMarkButton
    ) : undefined;

  const alignLargeTitleAccessory =
    Boolean(largeTitleAccessory) && (brandBesideLargeTitle || showOnlyClubAction);

  return (
    <MainTopHeader
      title={title}
      subtitle={subtitle}
      className={cn(
        surfaceClassName ?? "apple-grouped-bg",
        largeTitleOnlyLayout &&
          '[font-family:-apple-system,BlinkMacSystemFont,"SF_Pro_Display",system-ui,sans-serif] [-webkit-font-smoothing:antialiased]',
      )}
      disableScrollCollapse
      groupedStickyScrollBlur={largeTitleOnlyLayout}
      largeTitleOnly={largeTitleOnlyLayout}
      largeTitleClassName={largeTitleClassName}
      tabs={tabs}
      tabsAriaLabel={`Navigation ${title}`}
      largeTitleRight={largeTitleAccessory}
      largeTitleFlexClassName={alignLargeTitleAccessory ? "items-end" : undefined}
      largeTitleAccessoryWrapperClassName={alignLargeTitleAccessory ? "pb-px" : undefined}
      right={
        <>
          {showClubMark && showBellAndSettings ? clubMarkButton : null}
          {!showClubMark && !brandBesideLargeTitle ? <RunConnectHeaderMark /> : null}
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
