import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const AdminSearchBar = ({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
}) => (
  <div className="p-3">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou pseudo..."
        className="pl-10 h-[38px] text-[15px]"
      />
    </div>
  </div>
);
