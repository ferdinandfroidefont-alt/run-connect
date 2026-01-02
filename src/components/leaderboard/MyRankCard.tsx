import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, ChevronRight } from "lucide-react";

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
      case 'diamant': return 'text-cyan-500';
      case 'platine': return 'text-purple-500';
      case 'or': return 'text-yellow-500';
      case 'argent': return 'text-gray-500';
      case 'bronze': return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRankLabel = (rank: string) => {
    switch (rank) {
      case 'diamant': return 'Diamant';
      case 'platine': return 'Platine';
      case 'or': return 'Or';
      case 'argent': return 'Argent';
      case 'bronze': return 'Bronze';
      default: return 'Novice';
    }
  };

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
          <Trophy className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[17px] font-semibold">Mon Classement</p>
        </div>
        <span className={`text-[17px] font-semibold ${getRankColor(userRank)}`}>
          {getRankLabel(userRank)}
        </span>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[28px] font-bold text-primary">#{currentRank}</span>
          <span className="text-[15px] text-muted-foreground">sur {totalUsers.toLocaleString()}</span>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Prochain : {nextRankName}</span>
            <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-[13px] text-muted-foreground">
            {pointsToNext > 0 ? `${pointsToNext} points restants` : 'Rang maximum atteint'}
          </p>
        </div>

        {/* Top percentage */}
        <div className="pt-2 border-t border-border">
          <p className="text-[15px]">
            <span className="text-green-500 font-medium">Top {topPercentage}%</span>
            <span className="text-muted-foreground"> des participants</span>
          </p>
        </div>
      </div>
    </div>
  );
};
