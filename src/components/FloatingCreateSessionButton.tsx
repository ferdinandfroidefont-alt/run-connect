import { Plus, PenLine, Settings } from "lucide-react";
import { lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { RUNCONNECT_OPEN_HOME_SETTINGS_EVENT } from "@/lib/homeMapEvents";
import { cn } from "@/lib/utils";

const NotificationCenter = lazy(() =>
  import("@/components/NotificationCenter").then((m) => ({ default: m.NotificationCenter }))
);

const homeMapIconButtonClass = cn(
  "touch-manipulation relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-white",
  "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] outline-none transition-[opacity,transform] active:scale-[0.96] active:opacity-90",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "dark:border-[#1f1f1f] dark:bg-[#0a0a0a] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.55)]"
);

/** Itinéraire : se démarque des icônes neutres (accent primaire) */
const homeMapItineraryButtonClass = cn(
  homeMapIconButtonClass,
  "border-primary/35 bg-primary/[0.08] ring-1 ring-primary/15 dark:border-primary/40 dark:bg-primary/15 dark:ring-primary/25"
);

/**
 * Accueil : rangée fusionnée (itinéraire + notifications + réglages) + FAB création de séance.
 * `fixed` au-dessus de la tab bar ; le conteneur est en `pointer-events-none`, les contrôles en `auto`.
 */
export function FloatingCreateSessionButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCreateSession, hideBottomNav, refreshSessions } = useAppContext();
  const { t } = useLanguage();

  if (hideBottomNav || location.pathname !== "/") return null;

  const handlePlusClick = () => {
    if (location.pathname === "/") {
      openCreateSession();
    } else {
      navigate("/");
      window.setTimeout(() => openCreateSession(), 100);
    }
  };

  const openHomeSettings = () => {
    window.dispatchEvent(new Event(RUNCONNECT_OPEN_HOME_SETTINGS_EVENT));
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[105] flex flex-row items-center gap-2.5 sm:gap-3",
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+0.5rem)]",
        "right-[max(1rem,env(safe-area-inset-right,0px))]"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto flex flex-row items-center gap-2.5 rounded-[22px] border border-black/[0.06] bg-white/95 p-1.5 shadow-[0_10px_28px_-12px_rgba(0,0,0,0.22),0_2px_8px_-4px_rgba(0,0,0,0.08)] backdrop-blur-[8px]",
          "dark:border-[#1f1f1f] dark:bg-[#0a0a0a]/95 dark:shadow-[0_12px_36px_-16px_rgba(0,0,0,0.65)]"
        )}
      >
      <button
        type="button"
        onClick={() => navigate("/route-create")}
        className={cn("pointer-events-auto", homeMapItineraryButtonClass)}
        aria-label="Créer un itinéraire"
      >
        <PenLine className="h-[22px] w-[22px] text-primary" strokeWidth={2.25} aria-hidden />
      </button>

      <div data-tutorial="notifications" className="pointer-events-auto flex shrink-0 items-center justify-center">
        <Suspense
          fallback={
            <div
              className="h-[42px] w-[42px] shrink-0 rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-[#1f1f1f] dark:bg-[#0a0a0a]"
              aria-hidden
            />
          }
        >
          <NotificationCenter onSessionUpdated={refreshSessions} />
        </Suspense>
      </div>

      <button
        type="button"
        onClick={openHomeSettings}
        className={cn("pointer-events-auto", homeMapIconButtonClass)}
        aria-label="Paramètres"
      >
        <Settings className="h-[22px] w-[22px] text-[#1A1A1A] dark:text-white" strokeWidth={1.85} aria-hidden />
      </button>

      <button
        type="button"
        onClick={handlePlusClick}
        className={cn(
          "pointer-events-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.45),0_4px_14px_-8px_rgb(0_0_0/0.2)]",
          "ring-[3px] ring-background transition-transform duration-200 ease-ios",
          "active:scale-[0.94] touch-manipulation dark:ring-background"
        )}
        data-tutorial="create-session"
        aria-label={t("navigation.createSession")}
      >
        <Plus className="h-6 w-6" strokeWidth={2.35} aria-hidden />
      </button>
      </div>
    </div>
  );
}
