import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

/** Carte blanche type maquette Découvrir (RunConnect 6). */
export function MaquetteSheetCard({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl bg-white">{children}</div>;
}

export function MaquetteFilterRowDivider() {
  return <div className="ml-[72px] h-px bg-[#F2F2F7]" />;
}

type MaquetteFilterRowProps = {
  emoji: string;
  /** Couleur pleine du carré emoji (maquette). */
  color: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  badge?: ReactNode;
  chevron?: boolean;
  onClick: () => void;
};

/** Ligne filtre type maquette Figma : carré 48×48, titre gras, sous-texte gris. */
export function MaquetteFilterRow({
  emoji,
  color,
  title,
  subtitle,
  selected,
  badge,
  chevron,
  onClick,
}: MaquetteFilterRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F2F2F7]"
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-[24px] leading-none"
        style={{
          background: color || "#8E8E93",
        }}
      >
        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">{emoji}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold text-[#0A0F1F]">{title}</p>
        {subtitle ? <p className="truncate text-[14px] text-[#8E8E93]">{subtitle}</p> : null}
      </div>
      {badge !== undefined ? (
        <span className="flex-shrink-0 text-[15px] font-medium text-[#8E8E93]">{badge}</span>
      ) : null}
      {selected ? <Check className="h-5 w-5 flex-shrink-0" color={ACTION_BLUE} strokeWidth={3} aria-hidden /> : null}
      {chevron ? <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#C7C7CC]" aria-hidden /> : null}
    </button>
  );
}
