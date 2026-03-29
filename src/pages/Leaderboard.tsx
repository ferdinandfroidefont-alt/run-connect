import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ChevronRight, Search, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { FilterBar, FilterType, ActivityType, ScopeType } from "@/components/leaderboard/FilterBar";
import { RulesSheet } from "@/components/leaderboard/RulesSheet";
import { cn } from "@/lib/utils";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { IosPageIntro } from "@/components/layout/IosPageIntro";

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

const getMedal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const RankMovement = ({ change }: { change?: number }) => {
  if (!change || change === 0) return null;
  if (change > 0) return (
    <span className="text-[11px] font-bold text-green-600">+{change}</span>
  );
  return (
    <span className="text-[11px] font-bold text-destructive">{change}</span>
  );
};

const podiumRowClass = (rank: number) => {
  if (rank === 1) {
    return "bg-amber-500/10 border border-amber-500/30";
  }
  if (rank === 2) {
    return "bg-slate-500/10 border border-slate-500/30";
  }
  if (rank === 3) {
    return "bg-orange-500/10 border border-orange-500/30";
  }
  return "";
};

const RankBadge = ({ rank, isMe }: { rank: number; isMe: boolean }) => {
  const medal = getMedal(rank);
  if (medal) {
    return (
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] shadow-sm border",
          rank === 1 && "bg-amber-500/15 border-amber-500/40",
          rank === 2 && "bg-slate-500/15 border-slate-500/40",
          rank === 3 && "bg-orange-500/15 border-orange-500/40"
        )}
      >
        <span>{medal}</span>
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/80 dark:bg-secondary/50">
      <span className={cn("text-[13px] font-bold tabular-nums", isMe ? "text-primary" : "text-muted-foreground")}>
        #{rank}
      </span>
    </div>
  );
};

const LeaderboardRow = ({ u, isMe, onClick }: { u: LeaderboardUser; isMe: boolean; onClick: () => void }) => {
  const podium = u.rank <= 3;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ios-list-item w-full gap-3 text-left transition-colors active:bg-secondary/70",
        podium && podiumRowClass(u.rank),
        isMe && !podium && "bg-primary/[0.06]"
      )}
    >
      <RankBadge rank={u.rank} isMe={isMe} />

      <div className="relative shrink-0">
        <Avatar
          className={cn(
            'h-11 w-11 shadow-md',
            podium && u.rank === 1 && 'ring-2 ring-amber-400/50',
            podium && u.rank === 2 && 'ring-2 ring-slate-300/60 dark:ring-slate-500/50',
            podium && u.rank === 3 && 'ring-2 ring-amber-700/45',
            !podium && getRankRing(u.user_rank)
          )}
        >
          <AvatarImage src={u.profile?.avatar_url} className="object-cover" />
          <AvatarFallback className="text-sm font-bold bg-secondary">
            {u.profile?.username?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        {u.user_rank !== 'novice' && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-gradient-to-br border-2 border-card shadow-sm",
              getRankColor(u.user_rank)
            )}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] leading-snug", isMe ? "font-bold text-foreground" : "font-semibold text-foreground")}>
          {u.profile?.display_name || u.profile?.username}
        </p>
        {u.profile?.username && (
          <p className="truncate text-[12px] leading-snug text-muted-foreground">@{u.profile.username}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5 pr-0.5">
        <div className="flex items-baseline gap-1">
          <span className={cn("text-[15px] font-bold tabular-nums tracking-tight", isMe ? "text-primary" : "text-foreground")}>
            {u.seasonal_points.toLocaleString()}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">pts</span>
        </div>
        <RankMovement change={u.rank_change} />
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/35" />
    </button>
  );
};

/* ═══════ Main Page ═══════ */
const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeScope, setActiveScope] = useState<ScopeType>('global');
  const [activeFilter, setActiveFilter] = useState<FilterType>('general');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const leaderboardScrollRef = useRef<HTMLDivElement>(null);

  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  const getEffectiveFilter = useCallback((): FilterType => {
    if (activeScope === 'friends') return 'friends';
    if (activeScope === 'clubs') return 'clubs';
    return activeFilter;
  }, [activeScope, activeFilter]);

  // Fetch on filter change — reset page and fetch immediately (no full-page reload)
  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      setLeaderboard([]);
      fetchLeaderboard(1);
      fetchUserClubs();
    }
  }, [user, activeFilter, activeScope, selectedClubs]);

  // Load more pages
  useEffect(() => {
    if (user && currentPage > 1) fetchLeaderboard(currentPage);
  }, [currentPage]);

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

  const fetchLeaderboard = async (page: number) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const effectiveFilter = getEffectiveFilter();

      if (user && page === 1) {
        const { data: allData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000, offset_count: 0, order_by_column: 'seasonal_points'
        });
        setTotalUsers(allData?.length || 0);
      }

      const activityTypes: ActivityType[] = ['running', 'cycling', 'walking', 'swimming', 'basketball', 'football', 'petanque', 'tennis'];
      let finalData: any[] = [];

      if (activityTypes.includes(effectiveFilter as ActivityType) || (activeFilter !== 'general' && activeFilter !== 'friends' && activeFilter !== 'clubs')) {
        const filterValue = activeFilter;
        const offset = (page - 1) * USERS_PER_PAGE;
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
        const offset = (page - 1) * USERS_PER_PAGE;
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
        const offset = (page - 1) * USERS_PER_PAGE;
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
        const offset = (page - 1) * USERS_PER_PAGE;
        const { data, error } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: USERS_PER_PAGE, offset_count: offset, order_by_column: 'seasonal_points'
        });
        if (error) throw error;
        finalData = data || [];
        setHasMoreUsers(finalData.length === USERS_PER_PAGE);
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
        rank: finalData.findIndex((u: any) => u.user_id === item.user_id) + 1 + ((page - 1) * USERS_PER_PAGE),
        user_rank: getUserRank(effectiveFilter === 'general' ? item.seasonal_points : item.total_points),
        rank_change: 0
      })) || [];

      if (page === 1) setLeaderboard(formatted);
      else setLeaderboard(prev => [...prev, ...formatted]);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filteredLeaderboard =
    fullscreenOpen && searchQuery.trim()
      ? leaderboard.filter(
          (u) =>
            u.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : leaderboard;

  // Infinite scroll dans le bloc leaderboard (scroll interne)
  useEffect(() => {
    const el = sentinelRef.current;
    const root = leaderboardScrollRef.current;
    if (!el || !root || !hasMoreUsers || loading || loadingMore || searchQuery.trim()) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreUsers && !loading && !loadingMore) setCurrentPage((p) => p + 1);
      },
      { root, threshold: 0.1, rootMargin: '120px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreUsers, loading, loadingMore, searchQuery, filteredLeaderboard.length, fullscreenOpen]);

  const closeFullscreen = () => {
    setFullscreenOpen(false);
    setSearchQuery('');
  };

  const leaderboardListBody =
    loading && leaderboard.length === 0 ? (
      <div className="p-4">
        <LeaderboardSkeleton />
      </div>
    ) : filteredLeaderboard.length === 0 ? (
      <div className="flex flex-col items-center justify-center px-6 py-16">
        <p className="mb-1 text-[17px] font-semibold text-foreground">Aucun résultat</p>
        <p className="text-center text-[14px] text-muted-foreground">
          {fullscreenOpen && searchQuery ? 'Aucun participant ne correspond' : 'Aucun participant pour ce filtre'}
        </p>
      </div>
    ) : (
      <div className="bg-card">
        {filteredLeaderboard.map((u, index) => {
          const isMe = u.user_id === user?.id;
          return (
            <div key={u.user_id}>
              <LeaderboardRow u={u} isMe={isMe} onClick={() => navigateToProfile(u.user_id)} />
              {index < filteredLeaderboard.length - 1 && <div className="ios-list-separator" />}
            </div>
          );
        })}

        {hasMoreUsers && !(fullscreenOpen && searchQuery.trim()) && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loadingMore && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col bg-background">
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="z-20 ios-header-blur"
        header={
          <div className="ios-page-shell pt-[var(--safe-area-top)]">
            <IosPageHeaderBar
              className="px-0 py-2"
              left={
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center gap-1 text-[16px] font-medium text-primary"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-[15px] font-normal">Retour</span>
                </button>
              }
              title="Classement"
              right={
                <button
                  type="button"
                  onClick={() => setShowRules(true)}
                  className="ios-action-pill h-9 w-9 rounded-full px-0"
                  aria-label="Règles du classement"
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                </button>
              }
            />
          </div>
        }
      >
      <main className="ios-page-shell ios-page-stack min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="flex w-full flex-col gap-4">
          <IosPageIntro
            eyebrow="Saison active"
            title="Monte dans le classement"
            subtitle={`${totalUsers.toLocaleString()} participants · Saison ${getCurrentSeasonDates().number}`}
          >
            <div className="ios-stat-grid">
              <div className="ios-stat-tile">
                <p className="ios-stat-label">Portée</p>
                <p className="ios-stat-value text-[16px] capitalize">{activeScope}</p>
              </div>
              <div className="ios-stat-tile">
                <p className="ios-stat-label">Filtre</p>
                <p className="ios-stat-value text-[16px] capitalize">{getEffectiveFilter()}</p>
              </div>
              <div className="ios-stat-tile">
                <p className="ios-stat-label">Clubs</p>
                <p className="ios-stat-value">{selectedClubs.length}</p>
              </div>
              <div className="ios-stat-tile">
                <p className="ios-stat-label">Page</p>
                <p className="ios-stat-value">{currentPage}</p>
              </div>
            </div>
          </IosPageIntro>
          <section
            aria-label="Filtres classement"
            className="ios-section-shell p-3"
            data-tutorial="tutorial-leaderboard"
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Filtres</p>
            <FilterBar
              activeScope={activeScope}
              onScopeChange={(s) => {
                setActiveScope(s);
                setSearchQuery('');
              }}
              activeFilter={activeFilter}
              onFilterChange={(f) => {
                setActiveFilter(f);
                setSearchQuery('');
              }}
              selectedClubs={selectedClubs}
              onClubsChange={setSelectedClubs}
              userClubs={userClubs}
            />
          </section>

          {!fullscreenOpen && (
            <section aria-label="Leaderboard" className="ios-section-shell overflow-hidden">
              <div className="flex items-start gap-2 border-b border-border bg-card px-4 py-3">
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(true)}
                  className="ios-action-pill mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full px-0 text-[18px] leading-none"
                  aria-label="Agrandir le classement"
                >
                  ⛶
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Leaderboard</p>
                  <p className="text-[15px] font-semibold text-foreground">Top saison</p>
                </div>
              </div>

              <div
                ref={leaderboardScrollRef}
                className="h-[34rem] overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
              >
                {leaderboardListBody}
              </div>
            </section>
          )}
        </div>
      </main>
      </IosFixedPageHeaderShell>

      {fullscreenOpen && (
        <div
          className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          role="dialog"
          aria-modal="true"
          aria-label="Classement agrandi"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
            <button
              type="button"
              onClick={closeFullscreen}
              className="flex items-center gap-1 text-primary text-[16px] font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px] font-normal">Réduire</span>
            </button>
            <h2 className="text-[17px] font-semibold text-foreground">Classement</h2>
            <div className="w-[72px]" aria-hidden />
          </div>

          <div className="ios-header-blur shrink-0 px-4 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {totalUsers.toLocaleString()} participants · Saison {getCurrentSeasonDates().number}
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un membre"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ios-search-surface h-10 border-0 bg-transparent pl-9 text-[14px]"
              />
            </div>
          </div>

          <div
            ref={leaderboardScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          >
            {leaderboardListBody}
          </div>
        </div>
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
