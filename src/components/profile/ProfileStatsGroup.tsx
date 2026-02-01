import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, BarChart3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MyRankCard } from "@/components/leaderboard/MyRankCard";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

interface ProfileStatsGroupProps {
  userId: string;
}

interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_icon: string | null;
  badge_description: string | null;
  unlocked_at: string | null;
}

interface WeeklyActivity {
  week: string;
  weekLabel: string;
  sessionsCreated: number;
  sessionsJoined: number;
}

const getRankBadge = (points: number) => {
  if (points >= 5000) return { emoji: "💎", name: "Diamant", color: "bg-cyan-500", rank: "diamant" };
  if (points >= 3000) return { emoji: "💍", name: "Platine", color: "bg-purple-500", rank: "platine" };
  if (points >= 2000) return { emoji: "🥇", name: "Or", color: "bg-yellow-500", rank: "or" };
  if (points >= 1000) return { emoji: "🥈", name: "Argent", color: "bg-gray-400", rank: "argent" };
  if (points >= 500) return { emoji: "🥉", name: "Bronze", color: "bg-orange-500", rank: "bronze" };
  return { emoji: "⭐", name: "Novice", color: "bg-blue-500", rank: "novice" };
};

const getNextRankInfo = (points: number) => {
  if (points >= 5000) return { name: "Maximum", points: 5000 };
  if (points >= 3000) return { name: "Diamant", points: 5000 };
  if (points >= 2000) return { name: "Platine", points: 3000 };
  if (points >= 1000) return { name: "Or", points: 2000 };
  if (points >= 500) return { name: "Argent", points: 1000 };
  return { name: "Bronze", points: 500 };
};

export const ProfileStatsGroup = ({ userId }: ProfileStatsGroupProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Rank data
  const [rank, setRank] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  
  // Badges data
  const [badges, setBadges] = useState<Badge[]>([]);
  
  // Activity data
  const [activityData, setActivityData] = useState<WeeklyActivity[]>([]);
  const [totalCreated, setTotalCreated] = useState(0);
  const [totalJoined, setTotalJoined] = useState(0);
  
  // Dialog states
  const [showRankDialog, setShowRankDialog] = useState(false);
  const [showBadgesDialog, setShowBadgesDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRankData(),
        fetchBadgesData(),
        fetchActivityData()
      ]);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRankData = async () => {
    // Fetch points
    const { data: scoreData } = await supabase
      .from('user_scores')
      .select('total_points')
      .eq('user_id', userId)
      .maybeSingle();

    const userPoints = scoreData?.total_points || 0;
    setPoints(userPoints);

    // Fetch rank and total users
    const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
      limit_count: 10000,
      offset_count: 0,
      order_by_column: 'total_points'
    });

    if (leaderboardData) {
      setTotalUsers(leaderboardData.length);
      const userIndex = leaderboardData.findIndex((u: any) => u.user_id === userId);
      setRank(userIndex >= 0 ? userIndex + 1 : leaderboardData.length + 1);
    }
  };

  const fetchBadgesData = async () => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (!error) {
      setBadges(data || []);
    }
  };

  const fetchActivityData = async () => {
    const weeksAgo = 8;
    const startDate = startOfWeek(subWeeks(new Date(), weeksAgo), { locale: fr });

    const [createdRes, joinedRes] = await Promise.all([
      supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('organizer_id', userId)
        .gte('scheduled_at', startDate.toISOString()),
      supabase
        .from('session_participants')
        .select('joined_at')
        .eq('user_id', userId)
        .gte('joined_at', startDate.toISOString())
    ]);

    // Initialize weeks
    const weeklyData: Map<string, WeeklyActivity> = new Map();
    for (let i = weeksAgo - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: fr });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const weekLabel = format(weekStart, 'dd MMM', { locale: fr });
      weeklyData.set(weekKey, { week: weekKey, weekLabel, sessionsCreated: 0, sessionsJoined: 0 });
    }

    // Count created sessions
    let created = 0;
    createdRes.data?.forEach(session => {
      const weekStart = startOfWeek(new Date(session.scheduled_at), { locale: fr });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const week = weeklyData.get(weekKey);
      if (week) week.sessionsCreated++;
      created++;
    });

    // Count joined sessions
    let joined = 0;
    joinedRes.data?.forEach(participant => {
      const weekStart = startOfWeek(new Date(participant.joined_at), { locale: fr });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const week = weeklyData.get(weekKey);
      if (week) week.sessionsJoined++;
      joined++;
    });

    setTotalCreated(created);
    setTotalJoined(joined);
    setActivityData(Array.from(weeklyData.values()).sort((a, b) => a.week.localeCompare(b.week)));
  };

  const rankBadge = getRankBadge(points);
  const nextRank = getNextRankInfo(points);

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
            <div className="flex-1 h-5 bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-[10px] overflow-hidden">
        {/* Classement Row */}
        <button
          onClick={() => setShowRankDialog(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
        >
          <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", rankBadge.color)}>
            <Trophy className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[17px] text-foreground">Classement</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary">
                <span className="text-lg">{rankBadge.emoji}</span>
                <span className="text-[13px] font-medium text-foreground">{rankBadge.name}</span>
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
          onClick={() => setShowBadgesDialog(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
        >
          <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
            <Medal className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <span className="text-[17px] text-foreground">Badges débloqués</span>
            <div className="flex items-center gap-2">
              {badges.length > 0 ? (
                <div className="flex -space-x-1">
                  {badges.slice(0, 4).map((b, i) => (
                    <div
                      key={b.id}
                      className="h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border-2 border-card flex items-center justify-center text-sm"
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

        <div className="h-px bg-border ml-[54px]" />

        {/* Activités Row */}
        <button
          onClick={() => setShowActivityDialog(true)}
          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
        >
          <div className="h-[30px] w-[30px] rounded-[7px] bg-blue-500 flex items-center justify-center">
            <BarChart3 className="h-[18px] w-[18px] text-white" />
          </div>
          <div className="flex-1 flex items-center justify-between">
            <span className="text-[17px] text-foreground">Activités récentes</span>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-muted-foreground">{totalCreated + totalJoined} séances</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </div>
        </button>
      </div>

      {/* Rank Dialog */}
      <Dialog open={showRankDialog} onOpenChange={setShowRankDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <MyRankCard
              currentRank={rank}
              totalUsers={totalUsers}
              currentPoints={points}
              nextRankName={nextRank.name}
              nextRankPoints={nextRank.points}
              userRank={rankBadge.rank}
            />
            <button
              onClick={() => {
                setShowRankDialog(false);
                navigate('/leaderboard');
              }}
              className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-[10px] font-semibold active:opacity-90"
            >
              Voir le classement complet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Badges Dialog */}
      <Dialog open={showBadgesDialog} onOpenChange={setShowBadgesDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Medal className="h-5 w-5 text-yellow-500" />
              Badges débloqués ({badges.length})
            </h3>
            {badges.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="text-center">
                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/30 flex items-center justify-center text-3xl mb-1">
                      {badge.badge_icon || "🏅"}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{badge.badge_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-secondary/50 rounded-lg">
                <div className="text-5xl mb-4">🎯</div>
                <p className="text-base font-semibold mb-2">Aucun badge pour l'instant !</p>
                <p className="text-sm text-muted-foreground">
                  Participe à des sessions pour débloquer tes premiers succès 💪
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Activités récentes
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Séances créées et rejointes sur les 8 dernières semaines
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="weekLabel" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '11px' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
                <Line type="monotone" dataKey="sessionsCreated" stroke="hsl(217, 91%, 60%)" strokeWidth={2} name="Créées" dot={{ fill: 'hsl(217, 91%, 60%)', r: 3 }} />
                <Line type="monotone" dataKey="sessionsJoined" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Rejointes" dot={{ fill: 'hsl(142, 71%, 45%)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-around mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">🔵 {totalCreated}</div>
                <div className="text-xs text-muted-foreground">créées</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">🟢 {totalJoined}</div>
                <div className="text-xs text-muted-foreground">rejointes</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
