import type { ReactNode, MouseEventHandler } from "react";
import { cn } from "@/lib/utils";
import { ChevronGlyph } from "./ChevronGlyph";

type Accessory = "chevron" | "check" | "none" | ReactNode;

export interface CellProps {
  /** SVG/emoji affiché dans le carré coloré (29×29 rounded-6.5) */
  icon?: ReactNode;
  /** Couleur de fond du carré icône (défaut : Action Blue) */
  iconBg?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Valeur secondaire à droite (ex. langue : "Français") */
  value?: ReactNode;
  /** Accessoire à droite : chevron (>), check (✓), ou node custom */
  accessory?: Accessory;
  /** Dernière cellule du group : pas de séparateur bas */
  last?: boolean;
  /** Cellule destructive (texte rouge) */
  danger?: boolean;
  /** Cellule "lien" (texte primaire en bleu, comme Réglages > Mises à jour) */
  accent?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  className?: string;
  children?: ReactNode;
}

function renderAccessory(accessory: Accessory) {
  if (accessory === "none") return null;
  if (accessory === "chevron") return <ChevronGlyph />;
  if (accessory === "check") {
    return (
      <svg width="14" height="11" viewBox="0 0 14 11" aria-hidden style={{ color: "hsl(var(--primary))" }}>
        <path d="M1 5.5l4 4 8-8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  return accessory ?? null;
}

export function Cell({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  accessory = "chevron",
  last,
  danger,
  accent,
  onClick,
  className,
  children,
}: CellProps) {
  const titleColor = danger ? "text-[color:hsl(var(--destructive))]" : accent ? "text-primary" : "text-foreground";

  return (
    <div
      className={cn("apple-cell", last && "apple-cell-last", !onClick && "cursor-default", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {icon ? (
        <div className="apple-cell-icon" style={iconBg ? { background: iconBg } : undefined}>
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className={cn("apple-cell-title", titleColor)}>{title}</div>
        {subtitle ? <div className="apple-cell-subtitle">{subtitle}</div> : null}
      </div>
      {children}
      {value ? <div className="apple-cell-value">{value}</div> : null}
      {renderAccessory(accessory)}
    </div>
  );
}
