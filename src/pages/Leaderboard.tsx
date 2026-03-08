import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, ArrowLeft, ChevronRight, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { FilterBar, FilterType, ActivityType } from "@/components/leaderboard/FilterBar";
import { ScrollToMyRankButton } from "@/components/leaderboard/ScrollToMyRankButton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  rank_change?: number;
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

const getRankGlow = (rank: string) => {
  switch (rank) {
    case 'diamant': return '0 0 24px 4px rgba(34,211,238,0.4)';
    case 'platine': return '0 0 24px 4px rgba(168,85,247,0.35)';
    case 'or': return '0 0 24px 4px rgba(234,179,8,0.4)';
    case 'argent': return '0 0 20px 4px rgba(156,163,175,0.3)';
    case 'bronze': return '0 0 20px 4px rgba(217,119,6,0.3)';
    default: return 'none';
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

const getRankName = (rank: string) => {
  switch (rank) {
    case 'diamant': return 'Diamant';
    case 'platine': return 'Platine';
    case 'or': return 'Or';
    case 'argent': return 'Argent';
    case 'bronze': return 'Bronze';
    default: return 'Novice';
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

/* ───── Rank Movement Indicator ───── */
const RankMovement = ({ change }: { change?: number }) => {
  if (!change || change === 0) return <Minus className="h-3 w-3 text-muted-foreground/40" />;
  if (change > 0) return (
    <div className="flex items-center gap-0.5">
      <TrendingUp className="h-3 w-3 text-green-500" />
      <span className="text-[11px] font-semibold text-green-500">{change}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-0.5">
      <TrendingDown className="h-3 w-3 text-destructive" />
      <span className="text-[11px] font-semibold text-destructive">{Math.abs(change)}</span>
    </div>
  );
};

/* ───── Podium ───── */
const Podium = ({ top3, onTap }: { top3: LeaderboardUser[]; onTap: (id: string) => void }) => {
  if (top3.length === 0) return null;
  const [first, second, third] = top3;

  const PodiumSlot = ({ u, size, barH, pos, medal }: { u?: LeaderboardUser; size: number; barH: string; pos: number; medal: string }) => {
    if (!u) return <div className="w-24" />;
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: pos * 0.12, duration: 0.5, type: "spring", stiffness: 120 }}
        className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
        onClick={() => onTap(u.user_id)}
      >
        <div className="relative">
          {pos === 0 && (
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 z-10"
            >
              <Crown className="h-5 w-5 text-yellow-500 drop-shadow-lg" />
            </motion.div>
          )}
          <Avatar
            className={cn("border-2 border-card", getRankRing(u.user_rank))}
            style={{
              width: size, height: size,
              boxShadow: getRankGlow(u.user_rank),
            }}
          >
            <AvatarImage src={u.profile?.avatar_url} />
            <AvatarFallback className="text-sm font-bold bg-secondary">
              {u.profile?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
        <p className="font-semibold text-[13px] truncate max-w-[80px] text-center mt-2">
          {u.profile?.username}
        </p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + pos * 0.1 }}
          className="text-[12px] text-muted-foreground font-medium"
        >
          {u.seasonal_points.toLocaleString()} pts
        </motion.p>
        {/* Podium bar */}
        <div className={cn(
          "w-20 rounded-t-2xl flex items-center justify-center mt-2 backdrop-blur-sm relative overflow-hidden",
          barH
        )}>
          <div className="absolute inset-0 bg-gradient-to-t opacity-90" style={{
            background: pos === 0
              ? 'linear-gradient(to top, hsl(43, 96%, 40%), hsl(45, 93%, 55%))'
              : pos === 1
                ? 'linear-gradient(to top, hsl(0, 0%, 55%), hsl(0, 0%, 72%))'
                : 'linear-gradient(to top, hsl(28, 80%, 40%), hsl(30, 80%, 55%))'
          }} />
          <div className="absolute inset-0 bg-white/10" />
          <span className="text-2xl z-10">{medal}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card via-card to-secondary/30" />
      <div className="relative pt-6 pb-0 px-4">
        <div className="flex items-end justify-center gap-4">
          <PodiumSlot u={second} size={60} barH="h-14" pos={1} medal="🥈" />
          <PodiumSlot u={first} size={76} barH="h-20" pos={0} medal="🥇" />
          <PodiumSlot u={third} size={54} barH="h-11" pos={2} medal="🥉" />
        </div>
      </div>
    </div>
  );
};

/* ───── Row ───── */
const LeaderboardRow = ({ u, isMe, onClick, index }: { u: LeaderboardUser; isMe: boolean; onClick: () => void; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.2 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-secondary/60 transition-colors",
      isMe && "bg-primary/[0.06]"
    )}
  >
    {/* Rank + movement */}
    <div className="w-10 flex flex-col items-center gap-0.5">
      <span className={cn("text-[15px] font-bold tabular-nums", isMe ? "text-primary" : "text-muted-foreground")}>
        {u.rank}
      </span>
      <RankMovement change={u.rank_change} />
    </div>

    {/* Avatar with rank dot */}
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
  const [userPoints, setUserPoints] = useState<number>(0);
  const [userRankLabel, setUserRankLabel] = useState<string>('novice');
  const [userRankChange, setUserRankChange] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterType>('general');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyRankPill, setShowMyRankPill] = useState(false);
  const myRankRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMoreUsers || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMoreUsers && !loading) setCurrentPage(p => p + 1); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreUsers, loading]);

  // Show/hide floating pill
  useEffect(() => {
    if (!myRankRef.current || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowMyRankPill(!entry.isIntersecting),
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(myRankRef.current);
    return () => observer.disconnect();
  }, [leaderboard]);

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

  const scrollToMyRank = useCallback(() => {
    myRankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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

        // Get user's own points and rank
        if (rankIndex !== undefined && rankIndex >= 0 && allData) {
          const myData = allData[rankIndex];
          setUserPoints(myData.seasonal_points || 0);
          setUserRankLabel(getUserRank(myData.seasonal_points || 0));
        }

        // Calculate rank change from score_history
        try {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { data: historyData } = await supabase
            .from('score_history')
            .select('rank')
            .eq('user_id', user.id)
            .lte('recorded_at', weekAgo.toISOString())
            .order('recorded_at', { ascending: false })
            .limit(1);
          if (historyData?.[0]?.rank && currentUserRank) {
            setUserRankChange(historyData[0].rank - currentUserRank);
          }
        } catch { /* ignore */ }
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
        user_rank: getUserRank(activeFilter === 'general' ? item.seasonal_points : item.total_points),
        rank_change: 0
      })) || [];

      if (currentPage === 1) setLeaderboard(formatted);
      else setLeaderboard(prev => [...prev, ...formatted]);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filteredLeaderboard = searchQuery.trim()
    ? leaderboard.filter(u =>
        u.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leaderboard;

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

  const top3 = filteredLeaderboard.slice(0, 3);
  const rest = filteredLeaderboard.slice(3);
  const userInTop = userRank !== null && userRank <= USERS_PER_PAGE;
  const topPercentage = userRank && totalUsers ? ((userRank / totalUsers) * 100).toFixed(1) : null;

  return (
    <div ref={scrollContainerRef} className="h-full bg-background overflow-y-auto scroll-momentum">
      {/* ── Sticky Header with Hero Stats ── */}
      <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/40">
        {/* Nav row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-primary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h1 className="text-[17px] font-semibold">Classement</h1>
          </div>
          <div className="w-8" />
        </div>

        {/* Hero rank strip */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-[22px] font-black text-primary tabular-nums">#{userRank}</span>
              {topPercentage && (
                <span className="text-[13px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  Top {topPercentage}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[15px] font-semibold tabular-nums">{userPoints.toLocaleString()}</span>
                <span className="text-[12px] text-muted-foreground">pts</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary">
                <span className="text-sm">{getRankEmoji(userRankLabel)}</span>
                <span className="text-[12px] font-medium">{getRankName(userRankLabel)}</span>
              </div>
              {userRankChange !== 0 && (
                <div className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold",
                  userRankChange > 0 ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                )}>
                  {userRankChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(userRankChange)}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Subtitle */}
        <div className="px-4 pb-2">
          <p className="text-[12px] text-muted-foreground">
            {totalUsers.toLocaleString()} participants · Saison {getCurrentSeasonDates().number}
          </p>
        </div>

        {/* Segmented filter */}
        <div className="px-2 pb-2">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={(f) => { setActiveFilter(f); setCurrentPage(1); setSearchQuery(''); }}
            selectedClubs={selectedClubs}
            onClubsChange={setSelectedClubs}
            userClubs={userClubs}
          />
        </div>
      </div>

      {/* ── Podium ── */}
      {!searchQuery && <Podium top3={top3} onTap={navigateToProfile} />}

      {/* ── Search bar ── */}
      <div className="px-4 py-3 bg-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un participant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-[15px] rounded-lg bg-secondary"
          />
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* ── Ranking list ── */}
      <div className="bg-card">
        {filteredLeaderboard.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <span className="text-4xl mb-3">🏅</span>
            <p className="text-[17px] font-semibold text-foreground mb-1">Aucun résultat</p>
            <p className="text-[14px] text-muted-foreground text-center">
              {searchQuery ? "Aucun participant ne correspond à votre recherche" : "Aucun participant pour ce filtre"}
            </p>
          </div>
        ) : (
          (() => {
            const listUsers = searchQuery ? filteredLeaderboard : rest;
            if (!searchQuery && currentPage === 1 && !userInTop && userRank !== null) {
              const topUsers = listUsers.filter(u => u.rank <= USERS_PER_PAGE);
              const contextUsers = listUsers.filter(u => u.rank > USERS_PER_PAGE);
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
            return listUsers.map((u, i) => {
              const isMe = u.user_id === user?.id;
              return (
                <div key={u.user_id} ref={isMe ? myRankRef : null}>
                  <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={i} />
                  {i < listUsers.length - 1 && <div className="h-px bg-border/30 ml-14" />}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMoreUsers && !searchQuery && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loading && currentPage > 1 && (
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
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
