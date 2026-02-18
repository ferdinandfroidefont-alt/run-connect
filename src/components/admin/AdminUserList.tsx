import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Loader2 } from "lucide-react";
import type { UserResult } from "../AdminPremiumManager";

export const AdminUserList = ({
  results,
  searching,
  search,
  onSelect,
}: {
  results: UserResult[];
  searching: boolean;
  search: string;
  onSelect: (user: UserResult) => void;
}) => (
  <div className="max-h-[200px] overflow-y-auto border-b border-border">
    {searching && (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )}
    {!searching && results.length === 0 && search.trim().length >= 2 && (
      <p className="text-center text-muted-foreground py-4 text-[13px]">Aucun utilisateur trouvé</p>
    )}
    {!searching &&
      results.map((user) => (
        <button
          key={user.user_id}
          onClick={() => onSelect(user)}
          className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-secondary transition-colors border-b border-border/50"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {(user.display_name || user.username)?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left min-w-0">
            <p className="text-[14px] font-medium text-foreground truncate">
              {user.display_name || user.username}
            </p>
            <p className="text-[12px] text-muted-foreground truncate">@{user.username}</p>
          </div>
          {user.is_premium && (
            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-[10px] px-1.5 py-0.5">
              <Crown className="h-2.5 w-2.5 mr-0.5" />
              Premium
            </Badge>
          )}
        </button>
      ))}
  </div>
);
