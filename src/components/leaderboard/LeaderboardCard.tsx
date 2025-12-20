import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardCardProps {
  rank: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  points: number;
  level: 'novice' | 'confirmed' | 'elite';
  rankChange?: number;
  hasRecentActivity?: boolean;
  hasRecentRace?: boolean;
  isPremium?: boolean;
  userRank: string;
  onClick?: () => void;
  highlight?: boolean;
}

export const LeaderboardCard = ({
  rank,
  username,
  avatarUrl,
  points,
  level,
  isPremium = false,
  userRank,
  onClick,
  highlight = false
}: LeaderboardCardProps) => {
  const getRankIndicator = () => {
    switch (userRank) {
      case 'diamant': return 'bg-cyan-500';
      case 'platine': return 'bg-purple-500';
      case 'or': return 'bg-yellow-500';
      case 'argent': return 'bg-gray-400';
      case 'bronze': return 'bg-amber-600';
      default: return 'bg-muted';
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case 'elite': return 'Elite';
      case 'confirmed': return 'Confirmé';
      default: return 'Novice';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left",
        highlight 
          ? "bg-primary/10 border border-primary/20" 
          : "bg-card hover:bg-muted/50 border border-border"
      )}
    >
      {/* Rank */}
      <div className="w-8 flex-shrink-0">
        <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
      </div>

      {/* Avatar with rank indicator */}
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-sm font-medium">
            {username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", getRankIndicator())} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">{username}</p>
          {isPremium && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{getLevelLabel()}</p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-sm">{points.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">pts</p>
      </div>
    </button>
  );
};
