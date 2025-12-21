import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Flame, Flag, Star } from "lucide-react";
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
  displayName,
  avatarUrl,
  points,
  level,
  rankChange,
  hasRecentActivity = false,
  hasRecentRace = false,
  isPremium = false,
  userRank,
  onClick,
  highlight = false
}: LeaderboardCardProps) => {
  const getLevelBadge = () => {
    switch (level) {
      case 'elite':
        return <Badge className="bg-gradient-to-r from-purple-500 to-yellow-500 text-white text-xs border-0">Elite</Badge>;
      case 'confirmed':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs border-0">Confirmé</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Novice</Badge>;
    }
  };

  const getRankBorder = () => {
    switch (userRank) {
      case 'diamant': return 'border-l-4 border-l-cyan-400';
      case 'platine': return 'border-l-4 border-l-purple-500';
      case 'or': return 'border-l-4 border-l-yellow-500';
      case 'argent': return 'border-l-4 border-l-gray-400';
      case 'bronze': return 'border-l-4 border-l-amber-600';
      default: return '';
    }
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all cursor-pointer",
        getRankBorder(),
        highlight && "bg-primary/5 border-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5 flex items-center gap-3">
        {/* Rank */}
        <div className="w-8 text-center">
          <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
        </div>

        {/* Avatar */}
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-sm font-bold">
            {username?.[0] || displayName?.[0] || '?'}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{username}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {getLevelBadge()}
          </div>
        </div>

        {/* Points & Badges */}
        <div className="flex flex-col items-end gap-1">
          <p className="font-bold text-primary text-sm">{points.toLocaleString()} pts</p>
          <div className="flex items-center gap-1">
            {hasRecentActivity && <Flame className="h-3.5 w-3.5 text-orange-500" />}
            {hasRecentRace && <Flag className="h-3.5 w-3.5 text-green-500" />}
            {isPremium && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
            {rankChange !== undefined && rankChange !== 0 && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                rankChange > 0 ? "text-green-500" : "text-red-500"
              )}>
                {rankChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(rankChange)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
