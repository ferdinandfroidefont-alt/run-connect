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
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs border-0 shadow-lg shadow-purple-500/30">Elite</Badge>;
      case 'confirmed':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs border-0 shadow-lg shadow-blue-500/30">Confirmé</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Novice</Badge>;
    }
  };

  const getRankStyles = () => {
    switch (userRank) {
      case 'diamant': return { border: 'border-l-4 border-l-cyan-400', bg: 'from-cyan-500/10 to-blue-500/10', shadow: 'shadow-cyan-500/20' };
      case 'platine': return { border: 'border-l-4 border-l-purple-500', bg: 'from-purple-500/10 to-pink-500/10', shadow: 'shadow-purple-500/20' };
      case 'or': return { border: 'border-l-4 border-l-yellow-500', bg: 'from-yellow-500/10 to-amber-500/10', shadow: 'shadow-yellow-500/20' };
      case 'argent': return { border: 'border-l-4 border-l-gray-400', bg: 'from-gray-400/10 to-gray-500/10', shadow: 'shadow-gray-500/20' };
      case 'bronze': return { border: 'border-l-4 border-l-amber-600', bg: 'from-amber-600/10 to-orange-500/10', shadow: 'shadow-amber-500/20' };
      default: return { border: '', bg: '', shadow: '' };
    }
  };

  const rankStyles = getRankStyles();

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-300 cursor-pointer glass-card overflow-hidden",
        rankStyles.border,
        highlight && "bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30 animate-pulse-glow"
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div className={cn("absolute inset-0 bg-gradient-to-r opacity-30 pointer-events-none", rankStyles.bg)} />
      
      <CardContent className="p-2.5 flex items-center gap-3 relative">
        {/* Rank with gradient background for top 10 */}
        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-lg text-center",
          rank <= 3 && "bg-gradient-to-br from-yellow-500/20 to-amber-500/20",
          rank > 3 && rank <= 10 && "bg-gradient-to-br from-primary/10 to-accent/10"
        )}>
          <span className={cn(
            "text-sm font-bold",
            rank <= 3 ? "text-yellow-500" : "text-muted-foreground"
          )}>#{rank}</span>
        </div>

        {/* Avatar with glow effect */}
        <Avatar className={cn(
          "h-11 w-11 shrink-0 ring-2 transition-all duration-300",
          userRank === 'diamant' && "ring-cyan-400/50",
          userRank === 'platine' && "ring-purple-500/50",
          userRank === 'or' && "ring-yellow-500/50",
          userRank === 'argent' && "ring-gray-400/50",
          userRank === 'bronze' && "ring-amber-600/50",
          !userRank && "ring-border/50"
        )}>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-accent/20">
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
          <p className="font-bold text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text text-sm">{points.toLocaleString()} pts</p>
          <div className="flex items-center gap-1">
            {hasRecentActivity && <Flame className="h-3.5 w-3.5 text-orange-500 animate-pulse" />}
            {hasRecentRace && <Flag className="h-3.5 w-3.5 text-green-500" />}
            {isPremium && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />}
            {rankChange !== undefined && rankChange !== 0 && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                rankChange > 0 ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
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
