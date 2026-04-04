import * as React from "react";
import { cn } from "@/lib/utils";

export type MapIosFabTone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "red"
  | "teal"
  | "yellow"
  | "gray"
  | "pink"
  | "indigo";

/** Même teintes que les carrés `ios-list-row-icon` du hub Paramètres (`SettingsDialog` / sous-pages). */
const TONE_CLASS: Record<MapIosFabTone, string> = {
  blue: "bg-[#007AFF]",
  green: "bg-[#34C759]",
  orange: "bg-[#FF9500]",
  purple: "bg-[#5856D6]",
  red: "bg-[#FF3B30]",
  teal: "bg-[#30B0C7]",
  /** Classement : comme « Aide & Support » (#FF9500), pas le jaune vif #FFCC00 */
  yellow: "bg-[#FF9500]",
  gray: "bg-[#8E8E93]",
  pink: "bg-[#AF52DE]",
  indigo: "bg-[#5E5CE6]",
};

export type MapIosColoredFabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: MapIosFabTone;
  /** Anneau type « sélectionné » (filtre actif, etc.) */
  active?: boolean;
  /** Pastille compteur (ex. nombre de filtres) */
  badgeCount?: number;
};

/**
 * Bouton flottant carré façon icônes colorées iOS (Réglages / Profil), sans la rangée liste complète.
 */
export const MapIosColoredFab = React.forwardRef<HTMLButtonElement, MapIosColoredFabProps>(
  function MapIosColoredFab(
    { tone, active, badgeCount, className, children, disabled, type = "button", ...props },
    ref
  ) {
    const showBadge = typeof badgeCount === "number" && badgeCount > 0;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        data-active={active ? "true" : undefined}
        className={cn(
          "map-ios-colored-fab relative",
          TONE_CLASS[tone],
          active && "ring-2 ring-white/90 ring-offset-2 ring-offset-background",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-center text-white [&_svg]:stroke-white [&_svg]:text-white">
          {children}
        </span>
        {showBadge && (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-[#5856D6] shadow-md dark:bg-[#111111] dark:text-primary dark:ring-1 dark:ring-[#1f1f1f]"
            aria-hidden
          >
            {badgeCount! > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>
    );
  }
);
