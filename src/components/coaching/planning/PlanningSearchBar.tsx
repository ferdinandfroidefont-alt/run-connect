import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PlanningSearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

export function PlanningSearchBar({ value, onChange }: PlanningSearchBarProps) {
  return (
    <div className="border-b border-border bg-card px-4 py-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un athlète ou un groupe"
          className="h-10 rounded-lg border-border/60 bg-background pl-9 text-[15px]"
        />
      </div>
    </div>
  );
}

