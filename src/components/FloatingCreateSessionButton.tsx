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
        "pointer-events-none fixed z-[105] flex flex-col items-center gap-2",
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+0.5rem)]",
        "left-1/2 -translate-x-1/2"
      )}
    >
      <button
        type="button"
        onClick={handlePlusClick}
        className={cn(
          "pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.45),0_4px_14px_-8px_rgb(0_0_0/0.2)]",
          "ring-[3px] ring-background transition-transform duration-200 ease-ios",
          "active:scale-[0.94] touch-manipulation dark:ring-background"
        )}
        data-tutorial="create-session"
        aria-label={t("navigation.createSession")}
      >
        <Plus className="h-6 w-6" strokeWidth={2.35} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => navigate("/route-create")}
        className={cn(
          "pointer-events-auto flex h-8 min-h-[32px] items-center justify-center gap-1.5 rounded-full px-3",
          "border border-border/60 bg-background/95 text-[11px] font-semibold text-foreground shadow-[0_4px_16px_-6px_rgb(0_0_0/0.2)] backdrop-blur-md",
          "ring-[2px] ring-background/90 transition-transform duration-200 ease-ios active:scale-[0.97] touch-manipulation dark:ring-background/80"
        )}
        aria-label="Créer un itinéraire"
      >
        <PenLine className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
        <span className="truncate">Itinéraire</span>
      </button>
    </div>
  );
}
