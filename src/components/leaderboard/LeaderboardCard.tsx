import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
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
  userRank,
  onClick,
  highlight = false
}: LeaderboardCardProps) => {
  // iOS-style rank indicator (simple colored line)
  const getRankIndicator = () => {
    switch (userRank) {
      case 'diamant': return 'bg-cyan-400';
      case 'platine': return 'bg-purple-500';
      case 'or': return 'bg-yellow-500';
      case 'argent': return 'bg-gray-400';
      case 'bronze': return 'bg-amber-600';
      default: return 'bg-transparent';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-card cursor-pointer active:bg-secondary transition-colors relative",
        highlight && "bg-primary/5"
      )}
    >
      {/* Rank indicator bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r", getRankIndicator())} />
      
      {/* Rank number */}
      <div className="w-8 text-center pl-2">
        <span className="text-[15px] font-semibold text-muted-foreground">#{rank}</span>
      </div>

      {/* Avatar */}
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="text-sm font-semibold bg-secondary">
          {username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-[17px] font-medium truncate">{username}</p>
      </div>

      {/* Points */}
      <div className="flex items-center gap-2">
        <span className="text-[15px] text-muted-foreground">{points.toLocaleString()} pts</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
      </div>
    </div>
  );
};
