import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeed } from '@/hooks/useFeed';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { StoriesCarousel } from '@/components/feed/StoriesCarousel';
import { FeedEmptyState } from '@/components/feed/FeedEmptyState';
import { Loader2, RefreshCw, Trophy, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

// Leaderboard imports
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProfilePreviewDialog } from '@/components/ProfilePreviewDialog';
import { useProfileNavigation } from '@/hooks/useProfileNavigation';
import { LeaderboardSkeleton } from '@/components/ui/skeleton-loader';
import { FilterBar, FilterType } from '@/components/leaderboard/FilterBar';
import { MyRankCard } from '@/components/leaderboard/MyRankCard';
import { SeasonStatsCard } from '@/components/leaderboard/SeasonStatsCard';
import { LeaderboardCard } from '@/components/leaderboard/LeaderboardCard';
import { ScrollToMyRankButton } from '@/components/leaderboard/ScrollToMyRankButton';
import { WeeklyChallengesCard } from '@/components/leaderboard/WeeklyChallengesCard';
import { BadgesToUnlockCard } from '@/components/leaderboard/BadgesToUnlockCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TabType = 'feed' | 'leaderboard';

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

export default function Social() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as TabType || 'feed';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Persist tab choice
  useEffect(() => {
    localStorage.setItem('social-tab', activeTab);
  }, [activeTab]);

  // Load saved tab on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('social-tab') as TabType;
    if (savedTab && !searchParams.get('tab')) {
      setActiveTab(savedTab);
    }
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Premium Header */}
      <FeedHeader onSearch={() => navigate('/search')} />

      {/* Segmented Tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl max-w-xs mx-auto">
          <button
            onClick={() => handleTabChange('feed')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === 'feed'
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Newspaper className="h-4 w-4" />
            Feed
          </button>
          <button
            onClick={() => handleTabChange('leaderboard')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200",
              activeTab === 'leaderboard'
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <Trophy className="h-4 w-4" />
            Classement
          </button>
        </div>
      </div>

      {/* Tab Content with Animation */}
      <AnimatePresence mode="wait">
        {activeTab === 'feed' ? (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FeedContent />
          </motion.div>
        ) : (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <LeaderboardContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Feed Content Component
function FeedContent() {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    feedItems,
    loading,
    hasMore,
    loadMore,
    refresh,
    likeSession,
    unlikeSession,
    addComment
  } = useFeed();

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadMore]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  const handleJoinSession = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId } });
  };

  const handleViewComments = (sessionId: string) => {
    navigate('/', { state: { openSessionId: sessionId, focusComments: true } });
  };

  return (
    <>
      {/* Stories Carousel */}
      <StoriesCarousel />

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mx-4" />

      {/* Pull to Refresh Button */}
      <div className="flex justify-center py-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw className="h-4 w-4" />
          </motion.div>
          {isRefreshing ? 'Actualisation...' : 'Actualiser'}
        </motion.button>
      </div>

      {/* Feed Content */}
      <div className="px-4 max-w-2xl mx-auto">
        {loading && feedItems.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card/30 rounded-2xl border border-white/10 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                      <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-40 bg-white/10 rounded-xl animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <FeedEmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            {feedItems.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <FeedCard
                  session={session}
                  onLike={likeSession}
                  onUnlike={unlikeSession}
                  onAddComment={addComment}
                  onJoinSession={handleJoinSession}
                  onViewComments={handleViewComments}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {hasMore && feedItems.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-6">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </motion.div>
          </div>
        )}

        {!hasMore && feedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Vous êtes à jour ! 🎉
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}

// Leaderboard Content Component
function LeaderboardContent() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('general');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const [seasonStats, setSeasonStats] = useState<any>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const myRankRef = useRef<HTMLDivElement>(null);
  
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  const USERS_PER_PAGE = 10;

  useEffect(() => {
    if (user) {
      setCurrentPage(1);
      fetchLeaderboard();
      fetchSeasonStats();
      fetchUserClubs();
    }
  }, [user, activeFilter, selectedClubs]);

  useEffect(() => {
    if (user && currentPage > 1) {
      fetchLeaderboard();
    }
  }, [currentPage]);

  const fetchUserClubs = async () => {
    if (!user) return;
    
    const { data: membershipData } = await supabase
      .from('group_members')
      .select('conversation_id')
      .eq('user_id', user.id);
    
    if (!membershipData || membershipData.length === 0) {
      setUserClubs([]);
      return;
    }
    
    const clubIds = membershipData.map(m => m.conversation_id);
    const { data: clubsData } = await supabase
      .from('conversations')
      .select('id, group_name')
      .in('id', clubIds)
      .eq('is_group', true);
    
    if (clubsData) {
      setUserClubs(clubsData.map(c => ({ id: c.id, name: c.group_name || 'Club sans nom' })));
    }
  };

  const fetchSeasonStats = async () => {
    if (!user) return;
    
    try {
      const seasonDates = getCurrentSeasonDates();
      
      const { data: scoresData } = await supabase
        .from('user_scores')
        .select('seasonal_points')
        .eq('user_id', user.id)
        .single();

      const { count: sessionsJoinedCount } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('joined_at', seasonDates.start.toISOString())
        .lte('joined_at', seasonDates.end.toISOString());

      const { count: sessionsCreatedCount } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .gte('created_at', seasonDates.start.toISOString())
        .lte('created_at', seasonDates.end.toISOString());

      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('unlocked_at', seasonDates.start.toISOString())
        .lte('unlocked_at', seasonDates.end.toISOString());

      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .gte('created_at', seasonDates.start.toISOString())
        .lte('created_at', seasonDates.end.toISOString());

      setSeasonStats({
        sessionsJoined: sessionsJoinedCount || 0,
        sessionsCreated: sessionsCreatedCount || 0,
        totalPoints: scoresData?.seasonal_points || 0,
        badgesWon: badgesCount || 0,
        friendsReferred: referralsCount || 0,
      });

      setUserPoints(scoresData?.seasonal_points || 0);
    } catch (error) {
      console.error('Error fetching season stats:', error);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let currentUserRank: number | null = null;
      if (user && currentPage === 1) {
        const { data: allData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000,
          offset_count: 0,
          order_by_column: 'seasonal_points'
        });
        
        const rankIndex = allData?.findIndex((u: any) => u.user_id === user.id);
        currentUserRank = rankIndex !== undefined && rankIndex >= 0 ? rankIndex + 1 : null;
        setUserRank(currentUserRank);
      }

      const userInTop10 = currentUserRank !== null && currentUserRank <= 10;
      
      let finalData: any[] = [];
      
      if (currentPage === 1 && !userInTop10 && currentUserRank !== null) {
        const { data: top10Data } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10,
          offset_count: 0,
          order_by_column: 'seasonal_points'
        });

        const contextOffset = Math.max(0, currentUserRank - 2);
        const { data: contextData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 3,
          offset_count: contextOffset,
          order_by_column: 'seasonal_points'
        });

        const combinedIds = new Set();
        finalData = [...(top10Data || []), ...(contextData || [])].filter((item: any) => {
          if (combinedIds.has(item.user_id)) return false;
          combinedIds.add(item.user_id);
          return true;
        });
        
        setHasMoreUsers(false);
      } else {
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        
        const activityTypes = ['running', 'cycling', 'walking', 'swimming', 'basketball', 'football', 'petanque', 'tennis'];
        if (activityTypes.includes(activeFilter)) {
          const { data: activityData, error: activityError } = await supabase
            .from('session_participants')
            .select(`
              user_id,
              points_awarded,
              sessions!inner(activity_type)
            `)
            .eq('sessions.activity_type', activeFilter)
            .gte('joined_at', getCurrentSeasonDates().start.toISOString())
            .lte('joined_at', getCurrentSeasonDates().end.toISOString());

          if (activityError) throw activityError;

          const userPointsMap = new Map<string, number>();
          activityData?.forEach(item => {
            const currentPoints = userPointsMap.get(item.user_id) || 0;
            userPointsMap.set(item.user_id, currentPoints + (item.points_awarded || 0));
          });

          const userIds = Array.from(userPointsMap.keys());
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('user_id, username, display_name, avatar_url, is_premium')
              .in('user_id', userIds);

            const combinedData = profilesData?.map(profile => ({
              user_id: profile.user_id,
              seasonal_points: userPointsMap.get(profile.user_id) || 0,
              total_points: userPointsMap.get(profile.user_id) || 0,
              weekly_points: 0,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              is_premium: profile.is_premium
            })) || [];

            combinedData.sort((a, b) => b.seasonal_points - a.seasonal_points);
            
            finalData = combinedData.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(combinedData.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < combinedData.length);
          }
        }
        else if (activeFilter === 'friends') {
          const { data: friendsData } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', user!.id)
            .eq('status', 'accepted');

          const friendIds = friendsData?.map(f => f.following_id) || [];
          
          if (friendIds.length > 0) {
            const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
              limit_count: 10000,
              offset_count: 0,
              order_by_column: 'seasonal_points'
            });

            const filteredData = leaderboardData?.filter((u: any) => friendIds.includes(u.user_id)) || [];
            finalData = filteredData.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(filteredData.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < filteredData.length);
          }
        }
        else if (activeFilter === 'clubs' && selectedClubs.length > 0) {
          const { data: membersData } = await supabase
            .from('group_members')
            .select('user_id')
            .in('conversation_id', selectedClubs);

          const memberIds = [...new Set(membersData?.map(m => m.user_id) || [])];
          
          if (memberIds.length > 0) {
            const { data: leaderboardData } = await supabase.rpc('get_complete_leaderboard', {
              limit_count: 10000,
              offset_count: 0,
              order_by_column: 'seasonal_points'
            });

            const filteredData = leaderboardData?.filter((u: any) => memberIds.includes(u.user_id)) || [];
            finalData = filteredData.slice(offset, offset + USERS_PER_PAGE);
            setTotalUsers(filteredData.length);
            setHasMoreUsers(offset + USERS_PER_PAGE < filteredData.length);
          }
        }
        else {
          const { data: totalCountData } = await supabase.rpc('get_leaderboard_total_count');
          setTotalUsers(totalCountData || 0);

          const { data, error } = await supabase.rpc('get_complete_leaderboard', {
            limit_count: USERS_PER_PAGE,
            offset_count: offset,
            order_by_column: 'seasonal_points'
          });

          if (error) throw error;
          finalData = data || [];
          setHasMoreUsers(finalData.length === USERS_PER_PAGE);
        }
      }

      const formattedData = finalData?.map((item: any) => ({
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url,
          is_premium: item.is_premium
        },
        rank: finalData.findIndex((u: any) => u.user_id === item.user_id) + 1,
        user_rank: getUserRank(activeFilter === 'general' ? item.seasonal_points : item.total_points)
      })) || [];

      if (currentPage === 1) {
        setLeaderboard(formattedData);
      } else {
        setLeaderboard(prev => [...prev, ...formattedData]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
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
    
    return {
      start: currentSeasonStart,
      end: currentSeasonEnd,
      number: seasonsElapsed + 1
    };
  };

  const getUserRank = (points: number): string => {
    if (points >= 5000) return 'diamant';
    if (points >= 3000) return 'platine';
    if (points >= 2000) return 'or';
    if (points >= 1000) return 'argent';
    if (points >= 500) return 'bronze';
    return 'novice';
  };

  const getNextRankInfo = (currentPoints: number) => {
    const ranks = [
      { name: 'Bronze', points: 500 },
      { name: 'Argent', points: 1000 },
      { name: 'Or', points: 2000 },
      { name: 'Platine', points: 3000 },
      { name: 'Diamant', points: 5000 },
    ];
    const nextRank = ranks.find(r => r.points > currentPoints);
    return nextRank || { name: 'Maximum', points: currentPoints };
  };

  const scrollToMyRank = () => {
    if (myRankRef.current) {
      myRankRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isMyRankVisible = () => {
    if (!userRank) return true;
    const startRank = (currentPage - 1) * USERS_PER_PAGE + 1;
    const endRank = currentPage * USERS_PER_PAGE;
    return userRank >= startRank && userRank <= endRank;
  };

  const loadMoreUsers = () => {
    setCurrentPage(prev => prev + 1);
  };

  const getRankBorder = (userRank: string) => {
    switch (userRank) {
      case 'diamant': return 'border-4 border-cyan-400 shadow-lg shadow-cyan-400/50';
      case 'platine': return 'border-4 border-purple-500 shadow-lg shadow-purple-500/50';
      case 'or': return 'border-4 border-yellow-500 shadow-lg shadow-yellow-500/50';
      case 'argent': return 'border-4 border-gray-400 shadow-lg shadow-gray-400/50';
      case 'bronze': return 'border-4 border-amber-600 shadow-lg shadow-amber-600/50';
      default: return 'border-2 border-gray-300';
    }
  };

  const PodiumDisplay = ({ top3 }: { top3: LeaderboardUser[] }) => {
    if (top3.length === 0) return null;
    
    const [first, second, third] = top3;
    
    return (
      <div className="mb-3">
        <div className="flex items-end justify-center gap-1.5">
          {second && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Avatar 
                className={`h-14 w-14 mb-1 cursor-pointer hover:opacity-80 transition-all ${getRankBorder(second.user_rank)}`}
                onClick={() => navigateToProfile(second.user_id)}
              >
                <AvatarImage src={second.profile?.avatar_url} />
                <AvatarFallback className="text-sm font-bold">
                  {second.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-1">
                <p className="font-semibold text-xs truncate max-w-[70px]">
                  {second.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {second.seasonal_points}
                </p>
              </div>
              <div 
                className="w-16 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '40px' }}
                onClick={() => navigateToProfile(second.user_id)}
              >
                <span className="text-xl font-bold text-white">2</span>
              </div>
            </div>
          )}
          
          {first && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Crown className="h-4 w-4 text-yellow-500 mb-0.5" />
              <Avatar 
                className={`h-16 w-16 mb-1 cursor-pointer hover:opacity-80 transition-all ${getRankBorder(first.user_rank)}`}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <AvatarImage src={first.profile?.avatar_url} />
                <AvatarFallback className="text-sm font-bold">
                  {first.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-1">
                <p className="font-semibold text-xs truncate max-w-[80px]">
                  {first.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {first.seasonal_points}
                </p>
              </div>
              <div 
                className="w-20 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '55px' }}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <span className="text-2xl font-bold text-white">1</span>
              </div>
            </div>
          )}
          
          {third && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Avatar 
                className={`h-12 w-12 mb-1 cursor-pointer hover:opacity-80 transition-all ${getRankBorder(third.user_rank)}`}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <AvatarImage src={third.profile?.avatar_url} />
                <AvatarFallback className="text-sm font-bold">
                  {third.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-1">
                <p className="font-semibold text-xs truncate max-w-[60px]">
                  {third.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {third.seasonal_points}
                </p>
              </div>
              <div 
                className="w-14 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '30px' }}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <span className="text-lg font-bold text-white">3</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const top3 = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="px-4 max-w-2xl mx-auto space-y-4">
      {/* Filter Bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        userClubs={userClubs}
        selectedClubs={selectedClubs}
        onClubsChange={setSelectedClubs}
      />

      {/* Weekly Challenges */}
      <WeeklyChallengesCard />

      {/* My Rank Card */}
      {userRank && (
        <MyRankCard
          currentRank={userRank}
          totalUsers={totalUsers}
          currentPoints={userPoints}
          nextRankName={getNextRankInfo(userPoints).name}
          nextRankPoints={getNextRankInfo(userPoints).points}
          userRank={getUserRank(userPoints)}
        />
      )}

      {/* Season Stats */}
      {seasonStats && (
        <SeasonStatsCard 
          sessionsJoined={seasonStats.sessionsJoined}
          sessionsCreated={seasonStats.sessionsCreated}
          totalPoints={seasonStats.totalPoints}
          badgesWon={seasonStats.badgesWon}
          friendsReferred={seasonStats.friendsReferred}
        />
      )}

      {/* Badges to Unlock */}
      <BadgesToUnlockCard />

      {loading && currentPage === 1 ? (
        <LeaderboardSkeleton />
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && activeFilter === 'general' && (
            <PodiumDisplay top3={top3} />
          )}

          {/* Rest of leaderboard */}
          <div className="space-y-2">
            {(activeFilter === 'general' ? restOfLeaderboard : leaderboard).map((entry, index) => {
              const isCurrentUser = entry.user_id === user?.id;
              const actualRank = activeFilter === 'general' ? index + 4 : index + 1;
              
              return (
                <div
                  key={entry.user_id}
                  ref={isCurrentUser ? myRankRef : null}
                >
                  <LeaderboardCard
                    rank={actualRank}
                    username={entry.profile?.username || ''}
                    displayName={entry.profile?.display_name || ''}
                    avatarUrl={entry.profile?.avatar_url || ''}
                    points={entry.seasonal_points}
                    level={entry.seasonal_points >= 3000 ? 'elite' : entry.seasonal_points >= 1000 ? 'confirmed' : 'novice'}
                    isPremium={entry.profile?.is_premium}
                    userRank={entry.user_rank}
                    onClick={() => navigateToProfile(entry.user_id)}
                    highlight={isCurrentUser}
                  />
                </div>
              );
            })}
          </div>

          {/* Load More */}
          {hasMoreUsers && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={loadMoreUsers}
                disabled={loading}
                className="bg-white/5 border-white/10 hover:bg-white/10"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Charger plus
              </Button>
            </div>
          )}
        </>
      )}

      {/* Scroll to my rank button */}
      <ScrollToMyRankButton onClick={scrollToMyRank} visible={!isMyRankVisible() && userRank !== null} />

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={selectedUserId}
        onClose={closeProfilePreview}
      />
    </div>
  );
}
