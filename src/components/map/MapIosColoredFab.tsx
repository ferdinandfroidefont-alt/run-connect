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

/**
 * Contrôles carte : palette resserrée — gris neutre, olive outdoor (#6B7A1F), corail pour l’emphase (clubs / actif).
 * Les noms historiques (blue, green, …) sont mappés vers ces trois familles pour ne pas casser les call sites.
 */
const TONE_CLASS: Record<MapIosFabTone, string> = {
  gray: "bg-[#6B6B6B]",
  blue: "bg-outdoor",
  green: "bg-outdoor",
  teal: "bg-outdoor",
  indigo: "bg-outdoor",
  purple: "bg-outdoor",
  pink: "bg-outdoor",
  orange: "bg-primary",
  yellow: "bg-outdoor",
  red: "bg-primary",
};

export type MapIosColoredFabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: MapIosFabTone;
  active?: boolean;
  badgeCount?: number;
};

export const MapIosColoredFab = React.forwardRef<HTMLButtonElement, MapIosColoredFabProps>(
  function MapIosColoredFab(
    { tone, active, badgeCount, className, children, disabled, type = "button", ...props },
    ref,
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
          className,
        )}
        {...props}
      >
        <span className="flex items-center justify-center text-white [&_svg]:stroke-white [&_svg]:text-white">
          {children}
        </span>
        {showBadge && (
          <span
            className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-card px-1 text-[10px] font-bold leading-none text-foreground shadow-md ring-1 ring-border dark:bg-card dark:text-foreground"
            aria-hidden
          >
            {badgeCount! > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>
    );
  },
);
