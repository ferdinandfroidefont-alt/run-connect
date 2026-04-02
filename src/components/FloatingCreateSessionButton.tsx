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
  "touch-manipulation relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[13px] border border-[#E5E7EB] bg-white",
  "shadow-[0_1px_3px_rgba(0,0,0,0.06)] outline-none transition-[opacity,transform] active:scale-[0.97] active:opacity-90",
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "dark:border-border dark:bg-card"
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
        "pointer-events-none fixed z-[105] flex flex-row items-center gap-2 sm:gap-3",
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+0.5rem)]",
        "right-[max(1rem,env(safe-area-inset-right,0px))]"
      )}
    >
      <button
        type="button"
        onClick={() => navigate("/route-create")}
        className={cn("pointer-events-auto", homeMapIconButtonClass)}
        aria-label="Créer un itinéraire"
      >
        <PenLine className="h-[22px] w-[22px] text-primary" strokeWidth={2.25} aria-hidden />
      </button>

      <div data-tutorial="notifications" className="pointer-events-auto flex shrink-0 items-center justify-center">
        <Suspense
          fallback={
            <div
              className="h-[40px] w-[40px] shrink-0 rounded-[13px] border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card"
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
        <Settings className="h-[22px] w-[22px] text-[#1A1A1A] dark:text-foreground" strokeWidth={1.85} aria-hidden />
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
  );
}
