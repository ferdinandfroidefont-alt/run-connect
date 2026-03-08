import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { FilterBar, FilterType, ActivityType } from "@/components/leaderboard/FilterBar";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LeaderboardUser {
  user_id: string;
  total_points: number;
  weekly_points: number;
  seasonal_points: number;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string;
    is_premium?: boolean;
  };
  rank: number;
  user_rank: string;
}

interface Club {
  id: string;
  name: string;
}

const USERS_PER_PAGE = 20;

const getRankColor = (rank: string) => {
  switch (rank) {
    case 'diamant': return 'from-cyan-400 to-cyan-500';
    case 'platine': return 'from-purple-400 to-purple-600';
    case 'or': return 'from-yellow-400 to-yellow-600';
    case 'argent': return 'from-gray-300 to-gray-500';
    case 'bronze': return 'from-amber-500 to-amber-700';
    default: return 'from-muted to-muted';
  }
};

const getRankRing = (rank: string) => {
  switch (rank) {
    case 'diamant': return 'ring-2 ring-cyan-400';
    case 'platine': return 'ring-2 ring-purple-500';
    case 'or': return 'ring-2 ring-yellow-500';
    case 'argent': return 'ring-2 ring-gray-400';
    case 'bronze': return 'ring-2 ring-amber-600';
    default: return 'ring-1 ring-border';
  }
};

const getUserRank = (points: number): string => {
  if (points >= 5000) return 'diamant';
  if (points >= 3000) return 'platine';
  if (points >= 2000) return 'or';
  if (points >= 1000) return 'argent';
  if (points >= 500) return 'bronze';
  return 'novice';
};

const getCurrentSeasonDates = () => {
  const startRef = new Date('2024-08-15');
  const now = new Date();
  const seasonDuration = 45 * 24 * 60 * 60 * 1000;
  const timeSinceStart = now.getTime() - startRef.getTime();
  const seasonsElapsed = Math.floor(timeSinceStart / seasonDuration);
  const currentSeasonStart = new Date(startRef.getTime() + (seasonsElapsed * seasonDuration));
  const currentSeasonEnd = new Date(currentSeasonStart.getTime() + seasonDuration - 1);
  return { start: currentSeasonStart, end: currentSeasonEnd, number: seasonsElapsed + 1 };
};

/* ───── Podium ───── */
const Podium = ({ top3, onTap, getRankRing }: { top3: LeaderboardUser[]; onTap: (id: string) => void; getRankRing: (r: string) => string }) => {
  if (top3.length === 0) return null;
  const [first, second, third] = top3;

  const PodiumSlot = ({ u, size, barH, barColor, pos }: { u?: LeaderboardUser; size: number; barH: string; barColor: string; pos: number }) => {
    if (!u) return <div className="w-20" />;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: pos * 0.1, duration: 0.4 }}
        className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
        onClick={() => onTap(u.user_id)}
      >
        {pos === 0 && <Crown className="h-5 w-5 text-yellow-500 mb-1" />}
        <Avatar className={cn(`mb-1.5`, getRankRing(u.user_rank))} style={{ width: size, height: size }}>
          <AvatarImage src={u.profile?.avatar_url} />
          <AvatarFallback className="text-sm font-bold bg-secondary">
            {u.profile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <p className="font-semibold text-[13px] truncate max-w-[80px] text-center">{u.profile?.username}</p>
        <p className="text-[12px] text-muted-foreground font-medium">{u.seasonal_points.toLocaleString()} pts</p>
        <div className={cn("w-[72px] rounded-t-xl flex items-center justify-center mt-2", barH, barColor)}>
          <span className="text-lg font-black text-white">{u.rank}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="pt-4 pb-0 px-4">
      <div className="flex items-end justify-center gap-3">
        <PodiumSlot u={second} size={56} barH="h-12" barColor="bg-gradient-to-t from-gray-500 to-gray-400" pos={1} />
        <PodiumSlot u={first} size={68} barH="h-16" barColor="bg-gradient-to-t from-yellow-600 to-yellow-400" pos={0} />
        <PodiumSlot u={third} size={52} barH="h-10" barColor="bg-gradient-to-t from-amber-700 to-amber-500" pos={2} />
      </div>
    </div>
  );
};

/* ───── Row ───── */
const LeaderboardRow = ({ u, isMe, onClick, index }: { u: LeaderboardUser; isMe: boolean; onClick: () => void; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: Math.min(index * 0.03, 0.6), duration: 0.25 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-secondary/60 transition-colors",
      isMe && "bg-primary/5"
    )}
  >
    {/* Rank number */}
    <div className="w-8 text-center">
      <span className={cn("text-[15px] font-bold tabular-nums", isMe ? "text-primary" : "text-muted-foreground")}>
        {u.rank}
      </span>
    </div>

    {/* Avatar with rank indicator */}
    <div className="relative">
      <Avatar className={cn("h-10 w-10", getRankRing(u.user_rank))}>
        <AvatarImage src={u.profile?.avatar_url} />
        <AvatarFallback className="text-xs font-bold bg-secondary">
          {u.profile?.username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      {u.user_rank !== 'novice' && (
        <div className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br border-2 border-card", getRankColor(u.user_rank))} />
      )}
    </div>

    {/* Name */}
    <div className="flex-1 min-w-0">
      <p className={cn("text-[15px] truncate", isMe ? "font-bold" : "font-medium")}>
        {u.profile?.display_name || u.profile?.username}
      </p>
      {u.profile?.display_name && u.profile?.username && (
        <p className="text-[12px] text-muted-foreground truncate">@{u.profile.username}</p>
      )}
    </div>

    {/* Points */}
    <div className="flex items-center gap-1.5">
      <span className={cn("text-[15px] font-semibold tabular-nums", isMe ? "text-primary" : "text-foreground")}>
        {u.seasonal_points.toLocaleString()}
      </span>
      <span className="text-[12px] text-muted-foreground">pts</span>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
  </motion.div>
);

/* ───── Separator ───── */
const RankGap = () => (
  <div className="flex items-center justify-center py-2 px-6">
    <div className="flex-1 border-t border-dashed border-border/50" />
    <span className="px-3 text-[11px] text-muted-foreground/50 font-medium">•••</span>
    <div className="flex-1 border-t border-dashed border-border/50" />
  </div>
);

/* ───── Main Page ───── */
const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('general');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const myRankRef = useRef<HTMLDivElement>(null);

  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      fetchLeaderboard();
      fetchUserClubs();
    }
  }, [user, activeFilter, selectedClubs]);

  useEffect(() => {
    if (user && currentPage > 1) fetchLeaderboard();
  }, [currentPage]);

  const fetchUserClubs = async () => {
    if (!user) return;
    const { data: membershipData } = await supabase
      .from('group_members')
      .select('conversation_id')
      .eq('user_id', user.id);
    if (!membershipData?.length) { setUserClubs([]); return; }
    const clubIds = membershipData.map(m => m.conversation_id);
    const { data: clubsData } = await supabase
      .from('conversations')
      .select('id, group_name')
      .in('id', clubIds)
      .eq('is_group', true);
    if (clubsData) setUserClubs(clubsData.map(c => ({ id: c.id, name: c.group_name || 'Club sans nom' })));
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let currentUserRank: number | null = null;
      if (user && currentPage === 1) {
        const { data: allData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000, offset_count: 0, order_by_column: 'seasonal_points'
        });
        const rankIndex = allData?.findIndex((u: any) => u.user_id === user.id);
        currentUserRank = rankIndex !== undefined && rankIndex >= 0 ? rankIndex + 1 : null;
        setUserRank(currentUserRank);
        setTotalUsers(allData?.length || 0);
      }

      const userInTop = currentUserRank !== null && currentUserRank <= USERS_PER_PAGE;
      let finalData: any[] = [];

      if (currentPage === 1 && !userInTop && currentUserRank !== null) {
        const { data: topData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: USERS_PER_PAGE, offset_count: 0, order_by_column: 'seasonal_points'
        });
        const contextOffset = Math.max(0, currentUserRank - 2);
        const { data: contextData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 3, offset_count: contextOffset, order_by_column: 'seasonal_points'
        });
        const seen = new Set();
        finalData = [...(topData || []), ...(contextData || [])].filter((item: any) => {
          if (seen.has(item.user_id)) return false;
          seen.add(item.user_id);
          return true;
        });
        setHasMoreUsers(false);
      } else {
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        const activityTypes: ActivityType[] = ['running', 'cycling', 'walking', 'swimming', 'basketball', 'football', 'petanque', 'tennis'];

        if (activityTypes.includes(activeFilter as ActivityType)) {
          const { data: activityData, error: activityError } = await supabase
            .from('session_participants')
            .select('user_id, points_awarded, sessions!inner(activity_type)')
            .eq('sessions.activity_type', activeFilter)
            .gte('joined_at', getCurrentSeasonDates().start.toISOString())
            .lte('joined_at', getCurrentSeasonDates().end.toISOString());
          if (activityError) throw activityError;

          const userPtsMap = new Map<string, number>();
          activityData?.forEach(item => {
            userPtsMap.set(item.user_id, (userPtsMap.get(item.user_id) || 0) + (item.points_awarded || 0));
          });
          const userIds = Array.from(userPtsMap.keys());
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('user_id, username, display_name, avatar_url, is_premium')
              .in('user_id', userIds);
            const combined = profilesData?.map(p => ({
              user_id: p.user_id, seasonal_points: userPtsMap.get(p.user_id) || 0,
              total_points: userPtsMap.get(p.user_id) || 0, weekly_points: 0,
              username: p.username, display_name: p.display_name,
              avatar_url: p.avatar_url, is_premium: p.is_premium
            })) || [];
            combined.sort((a, b) => b.seasonal_points - a.seasonal_points);
            finalData = combined.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(combined.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < combined.length);
          }
        } else if (activeFilter === 'friends') {
          const { data: friendsData } = await supabase
            .from('user_follows').select('following_id')
            .eq('follower_id', user!.id).eq('status', 'accepted');
          const friendIds = friendsData?.map(f => f.following_id) || [];
          if (friendIds.length > 0) {
            const { data: lbData } = await supabase.rpc('get_complete_leaderboard', {
              limit_count: 10000, offset_count: 0, order_by_column: 'seasonal_points'
            });
            const filtered = lbData?.filter((u: any) => friendIds.includes(u.user_id)) || [];
            finalData = filtered.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(filtered.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < filtered.length);
          }
        } else if (activeFilter === 'clubs' && selectedClubs.length > 0) {
          const { data: membersData } = await supabase
            .from('group_members').select('user_id').in('conversation_id', selectedClubs);
          const memberIds = [...new Set(membersData?.map(m => m.user_id) || [])];
          if (memberIds.length > 0) {
            const { data: lbData } = await supabase.rpc('get_complete_leaderboard', {
              limit_count: 10000, offset_count: 0, order_by_column: 'seasonal_points'
            });
            const filtered = lbData?.filter((u: any) => memberIds.includes(u.user_id)) || [];
            finalData = filtered.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(filtered.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < filtered.length);
          }
        } else {
          const { data: totalCountData } = await supabase.rpc('get_leaderboard_total_count');
          setTotalUsers(totalCountData || 0);
          const { data, error } = await supabase.rpc('get_complete_leaderboard', {
            limit_count: USERS_PER_PAGE, offset_count: offset, order_by_column: 'seasonal_points'
          });
          if (error) throw error;
          finalData = data || [];
          setHasMoreUsers(finalData.length === USERS_PER_PAGE);
        }
      }

      const formatted = finalData?.map((item: any) => ({
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username, display_name: item.display_name,
          avatar_url: item.avatar_url, is_premium: item.is_premium
        },
        rank: finalData.findIndex((u: any) => u.user_id === item.user_id) + 1,
        user_rank: getUserRank(activeFilter === 'general' ? item.seasonal_points : item.total_points)
      })) || [];

      if (currentPage === 1) setLeaderboard(formatted);
      else setLeaderboard(prev => [...prev, ...formatted]);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading && currentPage === 1) {
    return (
      <div className="h-full bg-background overflow-y-auto scroll-momentum">
        <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-1 text-primary">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[17px] font-semibold">Classement</h1>
            <div className="w-8" />
          </div>
        </div>
        <div className="py-4"><LeaderboardSkeleton /></div>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const userInTop = userRank !== null && userRank <= USERS_PER_PAGE;

  return (
    <div className="h-full bg-background overflow-y-auto scroll-momentum">
      {/* Header — frosted glass */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-primary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-[17px] font-semibold">Classement</h1>
            <p className="text-[11px] text-muted-foreground">{totalUsers.toLocaleString()} coureurs · Saison {getCurrentSeasonDates().number}</p>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Filters */}
      <div className="pt-2">
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={(f) => { setActiveFilter(f); setCurrentPage(1); }}
          selectedClubs={selectedClubs}
          onClubsChange={setSelectedClubs}
          userClubs={userClubs}
        />
      </div>

      {/* Podium */}
      <div className="bg-card">
        <Podium top3={top3} onTap={navigateToProfile} getRankRing={getRankRing} />
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* Ranking list */}
      <div className="bg-card">
        {(() => {
          if (currentPage === 1 && !userInTop && userRank !== null) {
            const topUsers = rest.filter(u => u.rank <= USERS_PER_PAGE);
            const contextUsers = rest.filter(u => u.rank > USERS_PER_PAGE);
            return (
              <>
                {topUsers.map((u, i) => {
                  const isMe = u.user_id === user?.id;
                  return (
                    <div key={u.user_id} ref={isMe ? myRankRef : null}>
                      <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={i} />
                      {i < topUsers.length - 1 && <div className="h-px bg-border/30 ml-14" />}
                    </div>
                  );
                })}
                {contextUsers.length > 0 && <RankGap />}
                {contextUsers.map((u, i) => {
                  const isMe = u.user_id === user?.id;
                  return (
                    <div key={u.user_id} ref={isMe ? myRankRef : null}>
                      <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={topUsers.length + i} />
                      {i < contextUsers.length - 1 && <div className="h-px bg-border/30 ml-14" />}
                    </div>
                  );
                })}
              </>
            );
          }
          return rest.map((u, i) => {
            const isMe = u.user_id === user?.id;
            return (
              <div key={u.user_id} ref={isMe ? myRankRef : null}>
                <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={i} />
                {i < rest.length - 1 && <div className="h-px bg-border/30 ml-14" />}
              </div>
            );
          });
        })()}
      </div>

      {/* Load more */}
      {hasMoreUsers && !loading && (
        <div className="flex justify-center py-6">
          <Button onClick={() => setCurrentPage(p => p + 1)} variant="secondary" className="rounded-full px-8 text-[15px]">
            Voir plus
          </Button>
        </div>
      )}

      <div className="h-24" />

      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />
      )}
    </div>
  );
};

export default Leaderboard;
