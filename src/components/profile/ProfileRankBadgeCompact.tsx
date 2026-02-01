import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileRankBadgeCompactProps {
  userId: string;
  onRankClick?: () => void;
  onBadgesClick?: () => void;
}

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string | null;
}

const getRankBadge = (points: number) => {
  if (points >= 5000) return { emoji: "💎", name: "Diamant", color: "from-cyan-400 to-cyan-600" };
  if (points >= 3000) return { emoji: "💍", name: "Platine", color: "from-purple-400 to-purple-600" };
  if (points >= 2000) return { emoji: "🥇", name: "Or", color: "from-yellow-400 to-yellow-600" };
  if (points >= 1000) return { emoji: "🥈", name: "Argent", color: "from-gray-300 to-gray-500" };
  if (points >= 500) return { emoji: "🥉", name: "Bronze", color: "from-orange-400 to-orange-600" };
  return { emoji: "⭐", name: "Novice", color: "from-blue-400 to-blue-600" };
};

export const ProfileRankBadgeCompact = ({ 
  userId, 
  onRankClick, 
  onBadgesClick 
}: ProfileRankBadgeCompactProps) => {
  const [rank, setRank] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch points
      const { data: scoreData } = await supabase
        .from('user_scores')
        .select('total_points')
        .eq('user_id', userId)
        .single();

      const userPoints = scoreData?.total_points || 0;
      setPoints(userPoints);

      // Fetch rank
      const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      if (leaderboardData) {
        const userIndex = leaderboardData.findIndex((u: any) => u.user_id === userId);
        setRank(userIndex + 1);
      }

      // Fetch badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('id, badge_id, badge_name, badge_icon')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false })
        .limit(5);

      setBadges(badgesData || []);
    } catch (error) {
      console.error('Error fetching rank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const badge = getRankBadge(points);

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="h-7 w-7 rounded-[6px] bg-secondary animate-pulse" />
          <div className="flex-1 h-4 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Classement Row */}
      <button
        onClick={onRankClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-secondary/50 transition-colors"
      >
        <div className={cn(
          "h-7 w-7 rounded-[6px] flex items-center justify-center bg-gradient-to-br shadow-sm",
          badge.color
        )}>
          <Trophy className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-foreground">Classement</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/80">
              <span className="text-sm">{badge.emoji}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{badge.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold text-primary">#{rank}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
      </button>

      <div className="h-px bg-border/50 ml-[52px]" />

      {/* Points Row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="h-7 w-7 rounded-[6px] bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-[11px] font-bold">XP</span>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[15px] text-foreground">Points</span>
          <span className="text-[15px] font-semibold text-foreground">{points.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-px bg-border/50 ml-[52px]" />

      {/* Badges Row */}
      <button
        onClick={onBadgesClick}
        className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-secondary/50 transition-colors"
      >
        <div className="h-7 w-7 rounded-[6px] bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-sm">
          <Medal className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[15px] text-foreground">Badges</span>
          <div className="flex items-center gap-1.5">
            {badges.length > 0 ? (
              <div className="flex -space-x-1.5">
                {badges.slice(0, 4).map((b, i) => (
                  <div
                    key={b.id}
                    className="h-5 w-5 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-xs shadow-sm"
                    style={{ zIndex: 4 - i }}
                  >
                    {b.badge_icon || "🏅"}
                  </div>
                ))}
                {badges.length > 4 && (
                  <div className="h-5 w-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                    +{badges.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[13px] text-muted-foreground">Aucun</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          </div>
        </div>
      </button>
    </div>
  );
};
