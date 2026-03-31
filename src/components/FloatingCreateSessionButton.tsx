import { Plus, PenLine } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Accueil : FAB création de séance + accès secondaire « Créer un itinéraire ».
 * `fixed` au-dessus de la tab bar ; le conteneur est en `pointer-events-none`, les boutons en `auto`.
 */
export function FloatingCreateSessionButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCreateSession, hideBottomNav } = useAppContext();
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

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[105] flex flex-col items-end gap-2.5",
        /* Légèrement remonté pour respirer au-dessus de la tab bar + secondaire en dessous */
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+1rem)]",
        "right-[max(1rem,env(safe-area-inset-right,0px))]"
      )}
    >
      <button
        type="button"
        onClick={handlePlusClick}
        className={cn(
          "pointer-events-auto flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full sm:h-16 sm:w-16",
          "bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.45),0_4px_14px_-8px_rgb(0_0_0/0.2)]",
          "ring-[3px] ring-background transition-transform duration-200 ease-ios",
          "active:scale-[0.94] touch-manipulation dark:ring-background"
        )}
        data-tutorial="create-session"
        aria-label={t("navigation.createSession")}
      >
        <Plus className="h-[1.65rem] w-[1.65rem] sm:h-7 sm:w-7" strokeWidth={2.35} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => navigate("/route-create")}
        className={cn(
          "pointer-events-auto flex h-11 min-h-[44px] max-w-[min(calc(100vw-2rem),17.5rem)] items-center justify-center gap-2 rounded-full px-4 sm:px-5",
          "border border-border/70 bg-background/95 text-[14px] font-semibold text-foreground shadow-[0_6px_22px_-8px_rgb(0_0_0/0.28)] backdrop-blur-md",
          "ring-[2.5px] ring-background/90 transition-transform duration-200 ease-ios active:scale-[0.97] touch-manipulation dark:ring-background/80"
        )}
        aria-label="Créer un itinéraire"
      >
        <PenLine className="h-[18px] w-[18px] shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
        <span className="truncate">Créer un itinéraire</span>
      </button>
    </div>
  );
}
