import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MyRankCardProps {
  currentRank: number;
  totalUsers: number;
  currentPoints: number;
  nextRankName: string;
  nextRankPoints: number;
  userRank: string;
}

export const MyRankCard = ({ 
  currentRank, 
  totalUsers, 
  currentPoints, 
  nextRankName, 
  nextRankPoints,
  userRank 
}: MyRankCardProps) => {
  const pointsToNext = nextRankPoints - currentPoints;
  const progressPercentage = Math.min((currentPoints / nextRankPoints) * 100, 100);
  const topPercentage = ((currentRank / totalUsers) * 100).toFixed(1);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'diamant': return { gradient: 'from-cyan-400 to-blue-500', shadow: 'shadow-cyan-500/30' };
      case 'platine': return { gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/30' };
      case 'or': return { gradient: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/30' };
      case 'argent': return { gradient: 'from-gray-400 to-gray-500', shadow: 'shadow-gray-500/30' };
      case 'bronze': return { gradient: 'from-amber-600 to-orange-500', shadow: 'shadow-amber-500/30' };
      default: return { gradient: 'from-gray-300 to-gray-500', shadow: 'shadow-gray-500/30' };
    }
  };

  const rankColors = getRankColor(userRank);

  return (
    <Card className="glass-card overflow-hidden card-hover-glow">
      {/* Animated gradient top bar */}
      <div className={`h-1 bg-gradient-to-r ${rankColors.gradient} animate-[shimmer_3s_ease-in-out_infinite]`} style={{ backgroundSize: '200% 100%' }} />
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${rankColors.gradient} ${rankColors.shadow} shadow-lg`}>
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-bold text-lg">Mon Rang</h3>
          </div>
          <Badge className={`bg-gradient-to-r ${rankColors.gradient} text-white border-0 shadow-lg ${rankColors.shadow}`}>
            {userRank === 'diamant' ? '💎' : userRank === 'platine' ? '💍' : userRank === 'or' ? '🥇' : userRank === 'argent' ? '🥈' : userRank === 'bronze' ? '🥉' : '⭐'}
            {' '}{userRank.charAt(0).toUpperCase() + userRank.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-3xl font-bold bg-gradient-to-r ${rankColors.gradient} bg-clip-text text-transparent`}>#{currentRank}</span>
            <span className="text-sm text-muted-foreground">sur {totalUsers.toLocaleString()} participants</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-muted-foreground">Prochain : {nextRankName}</span>
              </div>
              <span className="font-medium text-primary">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="relative">
              <Progress value={progressPercentage} className="h-2.5" />
              <div 
                className={`absolute top-0 left-0 h-2.5 rounded-full bg-gradient-to-r ${rankColors.gradient} transition-all duration-500`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pointsToNext > 0 ? `${pointsToNext} points restants` : '🎉 Rang maximum atteint !'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">
                Top {topPercentage}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
