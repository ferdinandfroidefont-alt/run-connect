import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsIosPhoneLayout } from "@/hooks/useIsIosPhoneLayout";
import { cn } from "@/lib/utils";

/**
 * Accueil : bouton « Programmer » centré au-dessus de la barre d’onglets.
 * Refonte Apple (mockup 04 Discover) : pill h50, glyph + dans cercle blanc 28×28
 * à 20% d’opacité, glow Action Blue.
 */
export function FloatingCreateSessionButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openCreateSession, hideBottomNav, homeMapImmersive, homeFeedSheetSnap } = useAppContext();
  const { t } = useLanguage();
  const isIosPhone = useIsIosPhoneLayout();

  if (hideBottomNav || homeMapImmersive || homeFeedSheetSnap > 0 || location.pathname !== "/")
    return null;

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
        "pointer-events-auto fixed z-[105] flex h-[50px] items-center gap-2 rounded-full",
        "bg-primary text-primary-foreground",
        // Glow Action Blue + soft drop (mockup spec : 0 8px 20px rgba(0,102,204,0.35), 0 2px 6px rgba(0,0,0,0.12))
        "shadow-[0_8px_20px_rgba(0,102,204,0.35),0_2px_6px_rgba(0,0,0,0.12)]",
        "px-[18px] pl-[14px]",
        "text-[15px] font-semibold tracking-[-0.3px] leading-none",
        "transition-transform duration-150 ease-ios active:scale-[0.96] touch-manipulation",
        isIosPhone
          ? "bottom-[calc(var(--layout-bottom-inset)+0.65rem+var(--home-bottom-stack-gap))]"
          : "bottom-[calc(var(--layout-bottom-inset)+0.65rem+var(--home-bottom-stack-gap)-0.5rem)]",
        "left-1/2 -translate-x-1/2"
      )}
      data-tutorial="create-session"
      aria-label={label}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M7 1v12M1 7h12" />
        </svg>
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
