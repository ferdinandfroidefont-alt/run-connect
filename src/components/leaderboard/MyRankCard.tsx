import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp } from "lucide-react";
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
      case 'diamant': return 'from-cyan-400 to-blue-500';
      case 'platine': return 'from-purple-500 to-pink-500';
      case 'or': return 'from-yellow-400 to-yellow-600';
      case 'argent': return 'from-gray-400 to-gray-600';
      case 'bronze': return 'from-amber-600 to-amber-800';
      default: return 'from-gray-300 to-gray-500';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-lg">Mon Rang Actuel</h3>
          </div>
          <Badge className={`bg-gradient-to-r ${getRankColor(userRank)} text-white border-0`}>
            {userRank === 'diamant' ? '💎' : userRank === 'platine' ? '💍' : userRank === 'or' ? '🥇' : userRank === 'argent' ? '🥈' : userRank === 'bronze' ? '🥉' : '⭐'}
            {' '}{userRank.charAt(0).toUpperCase() + userRank.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">#{currentRank}</span>
            <span className="text-sm text-muted-foreground">sur {totalUsers.toLocaleString()} participants</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Prochain rang : {nextRankName}</span>
              <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {pointsToNext > 0 ? `${pointsToNext} points restants` : 'Rang maximum atteint !'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">
              Classement: Top {topPercentage}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
