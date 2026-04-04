import { CalendarClock } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Accueil : bouton centré « Programmer une séance » au-dessus de la barre d’onglets.
 * Colonne carte (itinéraire, style, GPS, plein écran) reste à droite.
 */
export function FloatingCreateSessionButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCreateSession, hideBottomNav } = useAppContext();
  const { t } = useLanguage();

  if (hideBottomNav || location.pathname !== "/") return null;

  const handleClick = () => {
    if (location.pathname === "/") {
      openCreateSession();
    } else {
      navigate("/");
      window.setTimeout(() => openCreateSession(), 100);
    }
  };

  const label = t("navigation.scheduleSession");

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "pointer-events-auto fixed z-[105] flex max-w-[min(22rem,calc(100vw-2rem))] items-center justify-center gap-2 rounded-full",
        "border border-primary/20 bg-primary px-4 py-2.5 text-primary-foreground shadow-lg",
        "text-sm font-semibold leading-tight ring-[3px] ring-background transition-transform duration-200 ease-ios",
        "active:scale-[0.97] touch-manipulation dark:ring-background",
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+0.5rem)]",
        "left-1/2 -translate-x-1/2"
      )}
      data-tutorial="create-session"
      aria-label={label}
    >
      <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
