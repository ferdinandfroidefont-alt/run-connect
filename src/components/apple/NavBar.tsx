import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NavBarProps {
  title: ReactNode;
  /** Large title style (Settings.app, Mail) — par défaut */
  large?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Classe extra sur le wrapper */
  className?: string;
}

/**
 * NavBar iOS — large title (par défaut) ou compact title.
 * - Pas de fond (transparent), à poser sur la canvas iOS.
 * - safe-area top géré par le parent (Layout/Page).
 */
export function NavBar({ title, large = true, leading, trailing, className }: NavBarProps) {
  return (
    <div className={cn("px-4 pt-2", className)}>
      <div className="flex h-11 items-center justify-between">
        <div className="min-w-[60px]">{leading}</div>
        {!large && <div className="apple-navbar-title truncate">{title}</div>}
        <div className="flex min-w-[60px] justify-end gap-4">{trailing}</div>
      </div>
      {large && <div className="apple-navbar-large mt-1.5 mb-1.5">{title}</div>}
    </div>
  );
}
