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
  if (points >= 5000) return { emoji: "💎", name: "Diamant", color: "bg-cyan-500" };
  if (points >= 3000) return { emoji: "💍", name: "Platine", color: "bg-purple-500" };
  if (points >= 2000) return { emoji: "🥇", name: "Or", color: "bg-yellow-500" };
  if (points >= 1000) return { emoji: "🥈", name: "Argent", color: "bg-gray-400" };
  if (points >= 500) return { emoji: "🥉", name: "Bronze", color: "bg-orange-500" };
  return { emoji: "⭐", name: "Novice", color: "bg-blue-500" };
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
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
          <div className="flex-1 h-5 bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Classement Row */}
      <button
        onClick={onRankClick}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", badge.color)}>
          <Trophy className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[17px] text-foreground">Classement</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary">
              <span className="text-lg">{badge.emoji}</span>
              <span className="text-[13px] font-medium text-foreground">{badge.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold text-primary">#{rank}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>

      <div className="h-px bg-border ml-[54px]" />

      {/* Points Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-green-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">XP</span>
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Points</span>
          <span className="text-[17px] font-semibold text-foreground">{points.toLocaleString()}</span>
        </div>
      </div>

      <div className="h-px bg-border ml-[54px]" />

      {/* Badges Row */}
      <button
        onClick={onBadgesClick}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
          <Medal className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Badges</span>
          <div className="flex items-center gap-2">
            {badges.length > 0 ? (
              <div className="flex -space-x-1">
                {badges.slice(0, 4).map((b, i) => (
                  <div
                    key={b.id}
                    className="h-6 w-6 rounded-full bg-yellow-100 border-2 border-card flex items-center justify-center text-sm"
                    style={{ zIndex: 4 - i }}
                  >
                    {b.badge_icon || "🏅"}
                  </div>
                ))}
                {badges.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{badges.length - 4}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[15px] text-muted-foreground">Aucun</span>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>
    </div>
  );
};
