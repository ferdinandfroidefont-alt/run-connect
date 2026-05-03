import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GroupProps {
  title?: ReactNode;
  footer?: ReactNode;
  /** false : pas de padding horizontal autour du group (utile pour groupes pleine largeur) */
  inset?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Section iOS « inset-grouped » (Settings.app) :
 * - titre majuscule en muted au-dessus
 * - empilement de cellules dans une carte rounded-10
 * - footer optionnel sous la carte
 */
export function Group({ title, footer, inset = true, className, children }: GroupProps) {
  return (
    <div className={cn(inset ? "apple-group" : "mb-6", className)}>
      {title ? <div className="apple-group-title">{title}</div> : null}
      <div className="apple-group-stack">{children}</div>
      {footer ? <div className="apple-group-footer">{footer}</div> : null}
    </div>
  );
}
