import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MyRankCardProps {
  currentRank: number;
  currentPoints: number;
  nextRankName: string;
  nextRankPoints: number;
  userRank: string;
  rankChange?: number;
}

const getRankConfig = (rank: string) => {
  switch (rank) {
    case 'diamant': return { emoji: "💎", name: "Diamant", color: "text-cyan-500" };
    case 'platine': return { emoji: "💍", name: "Platine", color: "text-purple-500" };
    case 'or': return { emoji: "🥇", name: "Or", color: "text-yellow-500" };
    case 'argent': return { emoji: "🥈", name: "Argent", color: "text-muted-foreground" };
    case 'bronze': return { emoji: "🥉", name: "Bronze", color: "text-amber-600" };
    default: return { emoji: "⭐", name: "Novice", color: "text-primary" };
  }
};

export const MyRankCard = ({
  currentRank,
  currentPoints,
  nextRankName,
  nextRankPoints,
  userRank,
  rankChange = 0,
}: MyRankCardProps) => {
  const progressPercentage = Math.min((currentPoints / nextRankPoints) * 100, 100);
  const pointsToNext = nextRankPoints - currentPoints;
  const rankConfig = getRankConfig(userRank);

  return (
    <div className="mx-4 ios-card overflow-hidden">
      {/* Top row: rank + points + level */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Rank */}
        <div className="flex flex-col items-center">
          <span className="text-[28px] font-black text-primary tabular-nums leading-none">#{currentRank}</span>
        </div>

        <div className="h-8 w-px bg-border/50" />

        {/* Points */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-bold tabular-nums">{currentPoints.toLocaleString()}</span>
            <span className="text-[13px] text-muted-foreground">pts</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm">{rankConfig.emoji}</span>
            <span className={cn("text-[13px] font-medium", rankConfig.color)}>{rankConfig.name}</span>
          </div>
        </div>

        {/* Rank change */}
        {rankChange !== 0 && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[13px] font-bold",
            rankChange > 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
          )}>
            <span>{rankChange > 0 ? "🔼" : "🔽"}</span>
            <span>{rankChange > 0 ? `+${rankChange}` : rankChange} place{Math.abs(rankChange) > 1 ? 's' : ''}</span>
            {rankChange > 0 && <span>🔥</span>}
          </div>
        )}
      </div>

      {/* XP progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-muted-foreground">Prochain : {nextRankName}</span>
          <span className="text-[12px] font-medium text-foreground">{progressPercentage.toFixed(0)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
        {pointsToNext > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            {pointsToNext.toLocaleString()} pts restants
          </p>
        )}
      </div>
    </div>
  );
};
