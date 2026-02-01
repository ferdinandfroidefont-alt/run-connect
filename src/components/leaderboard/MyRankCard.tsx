import { Progress } from "@/components/ui/progress";
import { Trophy, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const getRankConfig = (rank: string) => {
    switch (rank) {
      case 'diamant': return { emoji: "💎", name: "Diamant", color: "text-cyan-500", bg: "bg-cyan-500" };
      case 'platine': return { emoji: "💍", name: "Platine", color: "text-purple-500", bg: "bg-purple-500" };
      case 'or': return { emoji: "🥇", name: "Or", color: "text-yellow-500", bg: "bg-yellow-500" };
      case 'argent': return { emoji: "🥈", name: "Argent", color: "text-gray-400", bg: "bg-gray-400" };
      case 'bronze': return { emoji: "🥉", name: "Bronze", color: "text-amber-600", bg: "bg-amber-600" };
      default: return { emoji: "⭐", name: "Novice", color: "text-blue-500", bg: "bg-blue-500" };
    }
  };

  const rankConfig = getRankConfig(userRank);

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header avec rang */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", rankConfig.bg)}>
          <Trophy className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] font-semibold text-foreground">Mon Classement</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary">
            <span className="text-base">{rankConfig.emoji}</span>
            <span className={cn("text-[13px] font-medium", rankConfig.color)}>{rankConfig.name}</span>
          </div>
        </div>
      </div>

      {/* Position */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-blue-500 flex items-center justify-center">
          <TrendingUp className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Position</span>
          <div className="flex items-center gap-2">
            <span className="text-[22px] font-bold text-primary">#{currentRank}</span>
            <span className="text-[15px] text-muted-foreground">/ {totalUsers.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Progress vers prochain rang */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] text-muted-foreground">Prochain : {nextRankName}</span>
          <span className="text-[15px] font-medium text-foreground">{progressPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-[13px] text-muted-foreground mt-1.5">
          {pointsToNext > 0 ? `${pointsToNext.toLocaleString()} points restants` : 'Rang maximum atteint'}
        </p>
      </div>

      {/* Top percentage */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-medium text-green-500">Top {topPercentage}%</span>
          <span className="text-[15px] text-muted-foreground">des participants</span>
        </div>
      </div>
    </div>
  );
};
