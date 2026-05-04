import { Search } from "lucide-react";

interface PlanningSearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

/** Barre recherche h36, fond `var(--c-search-fill)` maquette, coins 10px. */
export function PlanningSearchBar({ value, onChange }: PlanningSearchBarProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-2">
      <div className="apple-search min-h-9 w-full gap-1.5 px-2 py-0">
        <Search className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un athlète ou un groupe"
          className="min-h-9 min-w-0 flex-1 border-0 bg-transparent py-1 text-[17px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
          autoCorrect="off"
          autoCapitalize="none"
        />
      </div>
    </div>
  );
}
