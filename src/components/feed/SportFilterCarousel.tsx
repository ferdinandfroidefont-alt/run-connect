import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

export type SportFilterItem = {
  id: string;
  emoji: string;
  label: string;
  color: string;
};

type SportFilterCarouselProps = {
  sports: SportFilterItem[];
  selected: string | string[];
  onToggle: (id: string) => void;
  multi?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE_DIMS = {
  sm: { card: 64, badge: 38, emoji: 18, label: 11 },
  md: { card: 76, badge: 44, emoji: 22, label: 12 },
  lg: { card: 86, badge: 52, emoji: 26, label: 12.5 },
} as const;

/** Carrousel sports maquette Feed Découvrir — cartes verticales scrollables. */
export function SportFilterCarousel({
  sports,
  selected,
  onToggle,
  multi = false,
  size = "md",
}: SportFilterCarouselProps) {
  const isSelected = (id: string) =>
    multi ? Array.isArray(selected) && selected.includes(id) : selected === id;
  const dims = SIZE_DIMS[size];

  return (
    <div
      className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide"
      style={{ scrollSnapType: "x proximity" }}
    >
      {sports.map((sp) => {
        const sel = isSelected(sp.id);
        return (
          <button
            key={sp.id}
            type="button"
            onClick={() => onToggle(sp.id)}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 transition-opacity active:opacity-70"
            style={{
              padding: "8px 8px 6px",
              width: dims.card,
              background: sel ? `${ACTION_BLUE}15` : "var(--card-bg, white)",
              border: sel ? `1.5px solid ${ACTION_BLUE}` : "1.5px solid transparent",
              borderRadius: 14,
              boxShadow: sel
                ? "none"
                : "0 1px 2px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
              scrollSnapAlign: "start",
            }}
          >
            <div
              className="flex flex-shrink-0 items-center justify-center"
              style={{
                width: dims.badge,
                height: dims.badge,
                borderRadius: 12,
                background: sp.color,
                fontSize: dims.emoji,
                lineHeight: 1,
              }}
            >
              <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">{sp.emoji}</span>
            </div>
            <span
              className="whitespace-nowrap text-center leading-[1.15]"
              style={{
                fontSize: dims.label,
                fontWeight: sel ? 800 : 700,
                letterSpacing: "-0.01em",
                color: sel ? ACTION_BLUE : "var(--text-primary, #0A0F1F)",
              }}
            >
              {sp.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
