import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type FloatingCreateSessionButtonProps = {
  /**
   * Lorsque true, le bouton est positionné en `absolute` dans la barre du bas (même logique visuelle que les onglets).
   * Les autres pages n’utilisent pas ce mode.
   */
  dockInBottomNav?: boolean;
};

/**
 * Création de séance : FAB rond, visible uniquement sur l’accueil (carte), pas sur les autres onglets ni le profil.
 */
export function FloatingCreateSessionButton({ dockInBottomNav = false }: FloatingCreateSessionButtonProps) {
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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "pointer-events-auto z-[105] flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full sm:h-16 sm:w-16",
        dockInBottomNav ? "absolute" : "fixed",
        "bg-primary text-primary-foreground shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.45),0_4px_14px_-8px_rgb(0_0_0/0.2)]",
        "ring-[3px] ring-background transition-transform duration-200 ease-ios",
        "active:scale-[0.94] touch-manipulation dark:ring-background",
        dockInBottomNav
          ? [
              "bottom-[calc(var(--safe-area-bottom)+max(0px,((var(--nav-height)-3.75rem)/2)))]",
              "right-[max(0.5rem,env(safe-area-inset-right,0px))]",
              "sm:bottom-[calc(var(--safe-area-bottom)+max(0px,((var(--nav-height)-4rem)/2)))]",
            ]
          : [
              "bottom-[calc(var(--layout-bottom-inset)+env(safe-area-inset-bottom,0px)+0.5rem)]",
              "right-[max(1rem,env(safe-area-inset-right,0px))]",
            ]
      )}
      data-tutorial="create-session"
      aria-label={t("navigation.createSession")}
    >
      <Plus className="h-[1.65rem] w-[1.65rem] sm:h-7 sm:w-7" strokeWidth={2.35} aria-hidden />
    </button>
  );
}
