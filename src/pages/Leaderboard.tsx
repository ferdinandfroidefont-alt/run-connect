import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { LeaderboardSkeleton } from "@/components/ui/skeleton-loader";
import { FilterBar, FilterType, ActivityType } from "@/components/leaderboard/FilterBar";
import { MyRankCard } from "@/components/leaderboard/MyRankCard";
import { SeasonStatsCard } from "@/components/leaderboard/SeasonStatsCard";
import { LeaderboardCard } from "@/components/leaderboard/LeaderboardCard";
import { ScrollToMyRankButton } from "@/components/leaderboard/ScrollToMyRankButton";
import { WeeklyChallengesCard } from "@/components/leaderboard/WeeklyChallengesCard";
import { BadgesToUnlockCard } from "@/components/leaderboard/BadgesToUnlockCard";

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

const Leaderboard = () => {
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
      
      // Get user scores
      const { data: scoresData } = await supabase
        .from('user_scores')
        .select('seasonal_points')
        .eq('user_id', user.id)
        .single();

      // Fetch sessions joined
      const { count: sessionsJoinedCount } = await supabase
        .from('session_participants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('joined_at', seasonDates.start.toISOString())
        .lte('joined_at', seasonDates.end.toISOString());

      // Fetch sessions created
      const { count: sessionsCreatedCount } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .gte('created_at', seasonDates.start.toISOString())
        .lte('created_at', seasonDates.end.toISOString());

      // Get badges count
      const { count: badgesCount } = await supabase
        .from('user_badges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('unlocked_at', seasonDates.start.toISOString())
        .lte('unlocked_at', seasonDates.end.toISOString());

      // Fetch friends referred
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
      // Déterminer le rank de l'utilisateur d'abord
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

      // Logique de chargement différente selon si user dans TOP 10 ou non
      const userInTop10 = currentUserRank !== null && currentUserRank <= 10;
      
      let finalData: any[] = [];
      
      if (currentPage === 1 && !userInTop10 && currentUserRank !== null) {
        // User PAS dans TOP 10: charger TOP 10 + contexte user (rank-1, rank, rank+1)
        const { data: top10Data } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10,
          offset_count: 0,
          order_by_column: 'seasonal_points'
        });

        // Charger les 3 utilisateurs autour du user (rank-1, rank, rank+1)
        const contextOffset = Math.max(0, currentUserRank - 2);
        const { data: contextData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 3,
          offset_count: contextOffset,
          order_by_column: 'seasonal_points'
        });

        // Combiner et dédupliquer
        const combinedIds = new Set();
        finalData = [...(top10Data || []), ...(contextData || [])].filter((item: any) => {
          if (combinedIds.has(item.user_id)) return false;
          combinedIds.add(item.user_id);
          return true;
        });
        
        setHasMoreUsers(false); // Pas de "Load more" quand user pas dans TOP 10
      } else {
        // User dans TOP 10 OU pagination normale
        const offset = (currentPage - 1) * USERS_PER_PAGE;
        
        // Filtrage par activité spécifique
        const activityTypes: ActivityType[] = ['running', 'cycling', 'walking', 'swimming', 'basketball', 'football', 'petanque', 'tennis'];
        if (activityTypes.includes(activeFilter as ActivityType)) {
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
        // Filtrage par amis
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
        // Filtrage par clubs
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
        // Classement général
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

      const formattedData = finalData?.map((item: any, index: number) => ({
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

  const getUserLevel = (points: number): 'novice' | 'confirmed' | 'elite' => {
    if (points >= 3000) return 'elite';
    if (points >= 1000) return 'confirmed';
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
          {/* 2ème place */}
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
          
          {/* 1ère place */}
          {first && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Crown className="h-4 w-4 text-yellow-500 mb-0.5" />
              <Avatar 
                className={`h-16 w-16 mb-1 cursor-pointer hover:opacity-80 transition-all ${getRankBorder(first.user_rank)}`}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <AvatarImage src={first.profile?.avatar_url} />
                <AvatarFallback className="text-base font-bold">
                  {first.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-1">
                <p className="font-bold text-sm truncate max-w-[80px]">
                  {first.profile?.username}
                </p>
                <p className="font-bold text-primary text-sm">
                  {first.seasonal_points}
                </p>
              </div>
              <div 
                className="w-18 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg shadow-lg shadow-yellow-500/50 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '60px' }}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <Trophy className="h-5 w-5 text-yellow-100 mb-0.5" />
                <span className="text-2xl font-bold text-white">1</span>
              </div>
            </div>
          )}
          
          {/* 3ème place */}
          {third && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Avatar 
                className={`h-14 w-14 mb-1 cursor-pointer hover:opacity-80 transition-all ${getRankBorder(third.user_rank)}`}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <AvatarImage src={third.profile?.avatar_url} />
                <AvatarFallback className="text-sm font-bold">
                  {third.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-1">
                <p className="font-semibold text-xs truncate max-w-[70px]">
                  {third.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {third.seasonal_points}
                </p>
              </div>
              <div 
                className="w-16 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '30px' }}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <span className="text-xl font-bold text-white">3</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          Classement
        </h1>
        <LeaderboardSkeleton />
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);
  const nextRank = getNextRankInfo(userPoints);

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
        <Trophy className="h-8 w-8 text-primary" />
        Classement
      </h1>

      <div className="space-y-3">
        {/* Filtres */}
        <FilterBar 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          selectedClubs={selectedClubs}
          onClubsChange={setSelectedClubs}
          userClubs={userClubs}
        />

        {/* Mon rang actuel */}
        {userRank && (
          <MyRankCard
            currentRank={userRank}
            totalUsers={totalUsers}
            currentPoints={userPoints}
            nextRankName={nextRank.name}
            nextRankPoints={nextRank.points}
            userRank={getUserRank(userPoints)}
          />
        )}

        {/* Statistiques de la saison */}
        {seasonStats && (
          <SeasonStatsCard
            sessionsJoined={seasonStats.sessionsJoined}
            sessionsCreated={seasonStats.sessionsCreated}
            totalPoints={seasonStats.totalPoints}
            badgesWon={seasonStats.badgesWon}
            friendsReferred={seasonStats.friendsReferred}
          />
        )}

        {/* Top 3 */}
        <Card>
          <CardContent className="p-3">
            <PodiumDisplay top3={top3} />
          </CardContent>
        </Card>

        {/* Liste du classement */}
        <div className="space-y-2">
          {(() => {
            const userInTop10 = userRank !== null && userRank <= 10;
            
            if (currentPage === 1 && !userInTop10 && userRank !== null) {
              // User PAS dans TOP 10: afficher TOP 10 + séparateur + contexte user
              const top10Users = restOfLeaderboard.filter(u => u.rank <= 10);
              const userContextUsers = restOfLeaderboard.filter(u => u.rank > 10);
              
              // Éviter les séparateurs si user est #11 ou #12
              const needTopSeparator = userRank > 12;
              
              return (
                <>
                  {/* TOP 10 */}
                  {top10Users.map((userItem) => {
                    const isCurrentUser = userItem.user_id === user?.id;
                    return (
                      <div key={userItem.user_id} ref={isCurrentUser ? myRankRef : null}>
                        <LeaderboardCard
                          rank={userItem.rank}
                          username={userItem.profile.username}
                          displayName={userItem.profile.display_name}
                          avatarUrl={userItem.profile.avatar_url}
                          points={userItem.seasonal_points}
                          level={getUserLevel(userItem.seasonal_points)}
                          isPremium={userItem.profile.is_premium}
                          userRank={userItem.user_rank}
                          onClick={() => navigateToProfile(userItem.user_id)}
                          highlight={isCurrentUser}
                        />
                      </div>
                    );
                  })}
                  
                  {/* Séparateur si user pas #11 ou #12 */}
                  {needTopSeparator && (
                    <div className="flex items-center justify-center py-1">
                      <div className="w-full h-px bg-border opacity-30"></div>
                      <span className="px-3 text-muted-foreground text-xs opacity-30">...</span>
                      <div className="w-full h-px bg-border opacity-30"></div>
                    </div>
                  )}
                  
                  {/* Contexte user (rank-1, rank, rank+1) */}
                  {userContextUsers.map((userItem) => {
                    const isCurrentUser = userItem.user_id === user?.id;
                    return (
                      <div key={userItem.user_id} ref={isCurrentUser ? myRankRef : null}>
                        <LeaderboardCard
                          rank={userItem.rank}
                          username={userItem.profile.username}
                          displayName={userItem.profile.display_name}
                          avatarUrl={userItem.profile.avatar_url}
                          points={userItem.seasonal_points}
                          level={getUserLevel(userItem.seasonal_points)}
                          isPremium={userItem.profile.is_premium}
                          userRank={userItem.user_rank}
                          onClick={() => navigateToProfile(userItem.user_id)}
                          highlight={isCurrentUser}
                        />
                      </div>
                    );
                  })}
                  
                  {/* Séparateur final */}
                  <div className="flex items-center justify-center py-1">
                    <div className="w-full h-px bg-border opacity-30"></div>
                    <span className="px-3 text-muted-foreground text-xs opacity-30">...</span>
                    <div className="w-full h-px bg-border opacity-30"></div>
                  </div>
                </>
              );
            } else {
              // User dans TOP 10 OU pagination normale
              return restOfLeaderboard.map((userItem) => {
                const isCurrentUser = userItem.user_id === user?.id;
                return (
                  <div key={userItem.user_id} ref={isCurrentUser ? myRankRef : null}>
                    <LeaderboardCard
                      rank={userItem.rank}
                      username={userItem.profile.username}
                      displayName={userItem.profile.display_name}
                      avatarUrl={userItem.profile.avatar_url}
                      points={userItem.seasonal_points}
                      level={getUserLevel(userItem.seasonal_points)}
                      isPremium={userItem.profile.is_premium}
                      userRank={userItem.user_rank}
                      onClick={() => navigateToProfile(userItem.user_id)}
                      highlight={isCurrentUser}
                    />
                  </div>
                );
              });
            }
          })()}
        </div>

        {/* Bouton Charger plus */}
        {hasMoreUsers && !loading && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={loadMoreUsers}
              variant="outline"
              size="lg"
            >
              Charger plus
            </Button>
          </div>
        )}

        {/* Défis de la semaine */}
        <WeeklyChallengesCard />

        {/* Badges à débloquer */}
        <BadgesToUnlockCard />
      </div>

      {/* Bouton scroll vers mon rang */}
      <ScrollToMyRankButton
        visible={!isMyRankVisible()}
        onClick={scrollToMyRank}
      />

      {/* Dialog de prévisualisation */}
      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={closeProfilePreview}
        />
      )}
    </div>
  );
};

export default Leaderboard;
