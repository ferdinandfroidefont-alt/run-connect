import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanningSearchBarProps {
  value: string;
  onChange: (next: string) => void;
  /** true : pas de bandeau carte / séparateur — sur fond groupé (maquette 16). */
  bare?: boolean;
  placeholder?: string;
}

/** Barre recherche h36, fond `var(--c-search-fill)` maquette, coins 10px. */
export function PlanningSearchBar({ value, onChange, bare, placeholder }: PlanningSearchBarProps) {
  return (
    <div className={cn("px-4 py-2", !bare && "border-b border-border bg-card")}>
      <div className="apple-search min-h-9 w-full gap-1.5 px-2 py-0">
        <Search className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Rechercher un athlète ou un groupe"}
          className="min-h-9 min-w-0 flex-1 border-0 bg-transparent py-1 text-[17px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
          autoCorrect="off"
          autoCapitalize="none"
        />
      </div>
    </div>
  );
}
