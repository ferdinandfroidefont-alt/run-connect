import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight, Search, TrendingUp, TrendingDown, Minus, BookOpen, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { FilterBar, FilterType, ActivityType, ScopeType } from "@/components/leaderboard/FilterBar";
import { ScrollToMyRankButton } from "@/components/leaderboard/ScrollToMyRankButton";
import { MyRankCard } from "@/components/leaderboard/MyRankCard";
import { RulesSheet } from "@/components/leaderboard/RulesSheet";
import { SeasonRewardBanner } from "@/components/leaderboard/SeasonRewardBanner";
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
  rank_change?: number;
}

interface Club {
  id: string;
  name: string;
}

const USERS_PER_PAGE = 20;

const getUserRank = (points: number): string => {
  if (points >= 5000) return 'diamant';
  if (points >= 3000) return 'platine';
  if (points >= 2000) return 'or';
  if (points >= 1000) return 'argent';
  if (points >= 500) return 'bronze';
  return 'novice';
};

const getNextRankInfo = (rank: string): { name: string; points: number } => {
  switch (rank) {
    case 'novice': return { name: 'Bronze', points: 500 };
    case 'bronze': return { name: 'Argent', points: 1000 };
    case 'argent': return { name: 'Or', points: 2000 };
    case 'or': return { name: 'Platine', points: 3000 };
    case 'platine': return { name: 'Diamant', points: 5000 };
    default: return { name: 'Max', points: 5000 };
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

/* ── Medal for top 3 ── */
const getMedal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

/* ── Rank Movement ── */
const RankMovement = ({ change }: { change?: number }) => {
  if (!change || change === 0) return null;
  if (change > 0) return (
    <span className="text-[11px] font-bold text-green-500">+{change} 🔼</span>
  );
  return (
    <span className="text-[11px] font-bold text-destructive">{change} 🔽</span>
  );
};

/* ── Row ── */
const LeaderboardRow = ({ u, isMe, onClick, index }: { u: LeaderboardUser; isMe: boolean; onClick: () => void; index: number }) => {
  const medal = getMedal(u.rank);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.4), duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer active:bg-secondary/60 transition-colors",
        isMe && "bg-primary/[0.06]"
      )}
    >
      {/* Rank */}
      <div className="w-8 flex items-center justify-center shrink-0">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className={cn("text-[14px] font-bold tabular-nums", isMe ? "text-primary" : "text-muted-foreground")}>
            #{u.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative">
        <Avatar className={cn("h-9 w-9", getRankRing(u.user_rank))}>
          <AvatarImage src={u.profile?.avatar_url} />
          <AvatarFallback className="text-xs font-bold bg-secondary">
            {u.profile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {u.user_rank !== 'novice' && (
          <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-gradient-to-br border-[1.5px] border-card", getRankColor(u.user_rank))} />
        )}
      </div>

      {/* Name + @username */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[14px] truncate leading-tight", isMe ? "font-bold" : "font-medium")}>
          {u.profile?.display_name || u.profile?.username}
        </p>
        {u.profile?.username && (
          <p className="text-[11px] text-muted-foreground truncate leading-tight">@{u.profile.username}</p>
        )}
      </div>

      {/* Points + variation */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <div className="flex items-center gap-1">
          <span className={cn("text-[14px] font-semibold tabular-nums", isMe ? "text-primary" : "text-foreground")}>
            {u.seasonal_points.toLocaleString()}
          </span>
          <span className="text-[11px] text-muted-foreground">pts</span>
        </div>
        <RankMovement change={u.rank_change} />
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
    </motion.div>
  );
};

/* ── Separator ── */
const RankGap = () => (
  <div className="flex items-center justify-center py-1.5 px-6">
    <div className="flex-1 border-t border-dashed border-border/50" />
    <span className="px-3 text-[11px] text-muted-foreground/50 font-medium">•••</span>
    <div className="flex-1 border-t border-dashed border-border/50" />
  </div>
);

/* ═══════ Main Page ═══════ */
const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [userRankLabel, setUserRankLabel] = useState<string>('novice');
  const [userRankChange, setUserRankChange] = useState<number>(0);
  const [activeScope, setActiveScope] = useState<ScopeType>('global');
  const [activeFilter, setActiveFilter] = useState<FilterType>('general');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMyRankPill, setShowMyRankPill] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const myRankRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  // Infinite scroll
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

  // Determine effective filter for fetch based on scope + sport filter
  const getEffectiveFilter = useCallback((): FilterType => {
    if (activeScope === 'friends') return 'friends';
    if (activeScope === 'clubs') return 'clubs';
    return activeFilter;
  }, [activeScope, activeFilter]);

  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      fetchLeaderboard();
      fetchUserClubs();
    }
  }, [user, activeFilter, activeScope, selectedClubs]);

  useEffect(() => {
    if (user && currentPage > 1) fetchLeaderboard();
  }, [currentPage]);

  const scrollToMyRank = useCallback(() => {
    myRankRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const fetchUserClubs = async () => {
    if (!user) return;
    const { data: membershipData } = await supabase
      .from('group_members').select('conversation_id').eq('user_id', user.id);
    if (!membershipData?.length) { setUserClubs([]); return; }
    const clubIds = membershipData.map(m => m.conversation_id);
    const { data: clubsData } = await supabase
      .from('conversations').select('id, group_name').in('id', clubIds).eq('is_group', true);
    if (clubsData) setUserClubs(clubsData.map(c => ({ id: c.id, name: c.group_name || 'Club sans nom' })));
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const effectiveFilter = getEffectiveFilter();
      let currentUserRank: number | null = null;

      if (user && currentPage === 1) {
        const { data: allData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000, offset_count: 0, order_by_column: 'seasonal_points'
        });
        const rankIndex = allData?.findIndex((u: any) => u.user_id === user.id);
        currentUserRank = rankIndex !== undefined && rankIndex >= 0 ? rankIndex + 1 : null;
        setUserRank(currentUserRank);
        setTotalUsers(allData?.length || 0);

        if (rankIndex !== undefined && rankIndex >= 0 && allData) {
          const myData = allData[rankIndex];
          setUserPoints(myData.seasonal_points || 0);
          setUserRankLabel(getUserRank(myData.seasonal_points || 0));
        }

        try {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const { data: historyData } = await supabase
            .from('score_history').select('rank').eq('user_id', user.id)
            .lte('recorded_at', weekAgo.toISOString()).order('recorded_at', { ascending: false }).limit(1);
          if (historyData?.[0]?.rank && currentUserRank) {
            setUserRankChange(historyData[0].rank - currentUserRank);
          }
        } catch { /* ignore */ }
      }

      const userInTop = currentUserRank !== null && currentUserRank <= USERS_PER_PAGE;
      let finalData: any[] = [];
      const activityTypes: ActivityType[] = ['running', 'cycling', 'walking', 'swimming', 'basketball', 'football', 'petanque', 'tennis'];

      if (currentPage === 1 && !userInTop && currentUserRank !== null && effectiveFilter === 'general') {
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
      } else if (activityTypes.includes(effectiveFilter as ActivityType) || (activeFilter !== 'general' && activeFilter !== 'friends' && activeFilter !== 'clubs')) {
        const filterValue = activeFilter;
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        const { data: activityData, error: activityError } = await supabase
          .from('session_participants')
          .select('user_id, points_awarded, sessions!inner(activity_type)')
          .eq('sessions.activity_type', filterValue)
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
            .from('profiles').select('user_id, username, display_name, avatar_url, is_premium').in('user_id', userIds);
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
      } else if (effectiveFilter === 'friends') {
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        const { data: friendsData } = await supabase
          .from('user_follows').select('following_id').eq('follower_id', user!.id).eq('status', 'accepted');
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
      } else if (effectiveFilter === 'clubs' && selectedClubs.length > 0) {
        const offset = (currentPage - 1) * USERS_PER_PAGE;
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
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        const { data: totalCountData } = await supabase.rpc('get_leaderboard_total_count');
        setTotalUsers(totalCountData || 0);
        const { data, error } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: USERS_PER_PAGE, offset_count: offset, order_by_column: 'seasonal_points'
        });
        if (error) throw error;
        finalData = data || [];
        setHasMoreUsers(finalData.length === USERS_PER_PAGE);
      }

      const formatted = finalData?.map((item: any, idx: number) => ({
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username, display_name: item.display_name,
          avatar_url: item.avatar_url, is_premium: item.is_premium
        },
        rank: finalData.findIndex((u: any) => u.user_id === item.user_id) + 1,
        user_rank: getUserRank(effectiveFilter === 'general' ? item.seasonal_points : item.total_points),
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

  const nextRankInfo = getNextRankInfo(userRankLabel);
  const userInTop = userRank !== null && userRank <= USERS_PER_PAGE;

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
            <div className="w-16" />
          </div>
        </div>
        <div className="py-4"><LeaderboardSkeleton /></div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="h-full bg-background overflow-y-auto scroll-momentum">
      {/* ── Header ── */}
      <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate('/')} className="flex items-center text-primary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-semibold">Classement</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRules(true)} className="text-primary">
              <BookOpen className="h-5 w-5" />
            </button>
            <button className="text-primary">
              <Target className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── User Card ── */}
      {userRank && (
        <div className="pt-3 pb-2">
          <MyRankCard
            currentRank={userRank}
            currentPoints={userPoints}
            nextRankName={nextRankInfo.name}
            nextRankPoints={nextRankInfo.points}
            userRank={userRankLabel}
            rankChange={userRankChange}
          />
        </div>
      )}

      {/* ── Double Filter Bar ── */}
      <div className="px-3 py-2">
        <FilterBar
          activeScope={activeScope}
          onScopeChange={(s) => { setActiveScope(s); setCurrentPage(1); setSearchQuery(''); }}
          activeFilter={activeFilter}
          onFilterChange={(f) => { setActiveFilter(f); setCurrentPage(1); setSearchQuery(''); }}
          selectedClubs={selectedClubs}
          onClubsChange={setSelectedClubs}
          userClubs={userClubs}
        />
      </div>

      {/* ── Season Reward ── */}
      <div className="py-1.5">
        <SeasonRewardBanner />
      </div>

      {/* ── Season info ── */}
      <div className="px-4 py-1.5">
        <p className="text-[12px] text-muted-foreground">
          {totalUsers.toLocaleString()} participants · Saison {getCurrentSeasonDates().number}
        </p>
      </div>

      {/* ── Search ── */}
      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un participant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-[14px] rounded-lg bg-secondary"
          />
        </div>
      </div>

      {/* ── Leaderboard List ── */}
      <div className="bg-card rounded-t-xl">
        {filteredLeaderboard.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <span className="text-4xl mb-3">🏅</span>
            <p className="text-[17px] font-semibold text-foreground mb-1">Aucun résultat</p>
            <p className="text-[14px] text-muted-foreground text-center">
              {searchQuery ? "Aucun participant ne correspond" : "Aucun participant pour ce filtre"}
            </p>
          </div>
        ) : (
          (() => {
            // If user not in top, show top + context with gap
            if (!searchQuery && currentPage === 1 && !userInTop && userRank !== null) {
              const topUsers = filteredLeaderboard.filter(u => u.rank <= USERS_PER_PAGE);
              const contextUsers = filteredLeaderboard.filter(u => u.rank > USERS_PER_PAGE);
              return (
                <>
                  {topUsers.map((u, i) => {
                    const isMe = u.user_id === user?.id;
                    return (
                      <div key={u.user_id} ref={isMe ? myRankRef : null}>
                        <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={i} />
                        {i < topUsers.length - 1 && <div className="h-px bg-border/30 ml-12" />}
                      </div>
                    );
                  })}
                  {contextUsers.length > 0 && <RankGap />}
                  {contextUsers.map((u, i) => {
                    const isMe = u.user_id === user?.id;
                    return (
                      <div key={u.user_id} ref={isMe ? myRankRef : null}>
                        <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={topUsers.length + i} />
                        {i < contextUsers.length - 1 && <div className="h-px bg-border/30 ml-12" />}
                      </div>
                    );
                  })}
                </>
              );
            }
            return filteredLeaderboard.map((u, i) => {
              const isMe = u.user_id === user?.id;
              return (
                <div key={u.user_id} ref={isMe ? myRankRef : null}>
                  <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} index={i} />
                  {i < filteredLeaderboard.length - 1 && <div className="h-px bg-border/30 ml-12" />}
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

      {/* ── Pinned rank button ── */}
      {userRank && (
        <ScrollToMyRankButton onClick={scrollToMyRank} visible={showMyRankPill} rank={userRank} />
      )}

      {/* ── Rules Sheet ── */}
      <RulesSheet open={showRules} onOpenChange={setShowRules} />

      {/* ── Profile Preview ── */}
      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog userId={selectedUserId} onClose={closeProfilePreview} />
      )}
    </div>
  );
};

export default Leaderboard;
