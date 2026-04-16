import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PlanningSearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

export function PlanningSearchBar({ value, onChange }: PlanningSearchBarProps) {
  return (
    <div className="-mx-ios-4 border-b border-border bg-card px-ios-4 py-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un athlète ou un groupe"
          className="h-11 rounded-lg border-border/50 bg-secondary/40 pl-9 text-[15px]"
        />
      </div>
    </div>
  );
}

