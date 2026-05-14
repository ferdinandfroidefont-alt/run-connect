import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanningSearchBarProps {
  value: string;
  onChange: (next: string) => void;
  /** true : pas de bandeau carte / séparateur — sur fond groupé (maquette 16). */
  bare?: boolean;
  placeholder?: string;
  /**
   * Pixel-match `PlanifierSemainePage` (RunConnect 6.jsx) ·
   * `w-full bg-[#E5E5EA] rounded-xl px-3 py-2.5 gap-2 active:bg-[#D1D1D6]` + Search 16² #8E8E93 stroke 2.5 + ligne 15px medium #8E8E93.
   */
  variant?: "default" | "planifierSemaine";
}

/** Barre recherche h36, fond `var(--c-search-fill)` maquette, coins 10px. */
export function PlanningSearchBar({ value, onChange, bare, placeholder, variant = "default" }: PlanningSearchBarProps) {
  const planifier = variant === "planifierSemaine";
  return (
    <div
      className={cn(
        planifier ? "py-0" : "px-4 py-2",
        !bare && !planifier && "border-b border-border bg-card"
      )}
    >
      <div
        className={cn(
          planifier
            ? "flex w-full touch-manipulation items-center gap-2 rounded-xl bg-[#E5E5EA] px-3 py-2.5 transition-colors duration-150 active:bg-[#D1D1D6]"
            : "apple-search min-h-9 w-full gap-1.5 px-2 py-0"
        )}
      >
        <Search
          className={cn(
            "pointer-events-none shrink-0",
            planifier ? "h-4 w-4 text-[#8E8E93]" : "h-3.5 w-3.5 text-muted-foreground"
          )}
          strokeWidth={planifier ? 2.5 : 1.8}
          aria-hidden
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Rechercher un athlète ou un groupe"}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent p-0 outline-none",
            planifier
              ? "[font:inherit] text-[15px] font-medium text-[#0A0F1F] placeholder:font-medium placeholder:text-[#8E8E93]"
              : "min-h-9 py-1 text-[17px] leading-snug text-foreground placeholder:text-muted-foreground"
          )}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
