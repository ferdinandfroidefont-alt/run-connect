import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfileRankCardProps {
  userId: string;
}

const getRankBadge = (points: number) => {
  if (points >= 5000) return { emoji: "💎", name: "Diamant", color: "text-cyan-400" };
  if (points >= 3000) return { emoji: "💍", name: "Platine", color: "text-purple-400" };
  if (points >= 2000) return { emoji: "🥇", name: "Or", color: "text-yellow-400" };
  if (points >= 1000) return { emoji: "🥈", name: "Argent", color: "text-gray-300" };
  if (points >= 500) return { emoji: "🥉", name: "Bronze", color: "text-orange-400" };
  return { emoji: "⭐", name: "Novice", color: "text-blue-400" };
};

const getNextRankThreshold = (points: number) => {
  if (points < 500) return { target: 500, name: "Bronze" };
  if (points < 1000) return { target: 1000, name: "Argent" };
  if (points < 2000) return { target: 2000, name: "Or" };
  if (points < 3000) return { target: 3000, name: "Platine" };
  if (points < 5000) return { target: 5000, name: "Diamant" };
  return null; // Max rank
};

export const ProfileRankCard = ({ userId }: ProfileRankCardProps) => {
  const [rank, setRank] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankData();
  }, [userId]);

  const fetchRankData = async () => {
    try {
      setLoading(true);

      // Récupérer les points de l'utilisateur
      const { data: scoreData } = await supabase
        .from('user_scores')
        .select('total_points')
        .eq('user_id', userId)
        .single();

      const userPoints = scoreData?.total_points || 0;
      setPoints(userPoints);

      // Récupérer le classement complet
      const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      if (leaderboardData) {
        const userIndex = leaderboardData.findIndex((u: any) => u.user_id === userId);
        setRank(userIndex + 1);
        setTotalUsers(leaderboardData.length);
      }
    } catch (error) {
      console.error('Error fetching rank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const badge = getRankBadge(points);
  const nextRank = getNextRankThreshold(points);
  const progress = nextRank 
    ? ((points % nextRank.target) / nextRank.target) * 100 
    : 100;

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/10">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-primary/10 rounded w-1/2" />
            <div className="h-8 bg-primary/10 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 backdrop-blur-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mon Classement</p>
              <h3 className="text-2xl font-bold">
                #{rank} <span className="text-sm text-muted-foreground">/ {totalUsers}</span>
              </h3>
            </div>
          </div>
          <div className="text-center">
            <p className={`text-4xl ${badge.color}`}>{badge.emoji}</p>
            <p className={`text-xs font-semibold ${badge.color} mt-1`}>{badge.name}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Points totaux</span>
            <span className="text-lg font-bold text-primary">{points}</span>
          </div>

          {nextRank && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {nextRank.target - points} points avant {nextRank.name}
                </span>
              </div>
            </>
          )}

          {!nextRank && (
            <div className="text-center py-2">
              <p className="text-sm text-primary font-semibold">🎉 Rang maximum atteint !</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
