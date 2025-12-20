import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

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

  const getRankEmoji = (rank: string) => {
    switch (rank) {
      case 'diamant': return '💎';
      case 'platine': return '💍';
      case 'or': return '🥇';
      case 'argent': return '🥈';
      case 'bronze': return '🥉';
      default: return '⭐';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Votre rang</p>
            <p className="text-3xl font-bold">#{currentRank}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl">{getRankEmoji(userRank)}</p>
            <p className="text-sm font-medium capitalize">{userRank}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prochain : {nextRankName}</span>
            <span className="font-medium">{currentPoints} pts</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pointsToNext > 0 ? `${pointsToNext} pts restants` : 'Max atteint'}</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              <span>Top {topPercentage}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
