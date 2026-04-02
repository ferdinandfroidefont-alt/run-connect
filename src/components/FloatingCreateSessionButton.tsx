import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Accueil : FAB création de séance seul (cloche / réglages / itinéraire : header + colonne carte).
 * Aligné à droite comme la colonne GPS / plein écran (`InteractiveMap`).
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
    <button
      type="button"
      onClick={handlePlusClick}
      className={cn(
        "pointer-events-auto fixed z-[105] flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.45),0_4px_14px_-8px_rgb(0_0_0/0.2)]",
        "ring-[3px] ring-background transition-transform duration-200 ease-ios",
        "active:scale-[0.94] touch-manipulation dark:ring-background",
        "bottom-[calc(var(--layout-bottom-inset)+var(--safe-area-bottom)+0.5rem)]",
        "right-[max(1rem,env(safe-area-inset-right,0px))]"
      )}
      data-tutorial="create-session"
      aria-label={t("navigation.createSession")}
    >
      <Plus className="h-6 w-6" strokeWidth={2.35} aria-hidden />
    </button>
  );
}
