import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe, Star, Award, Gem, Coins, Diamond, Calendar, Lock, ChevronLeft, ChevronRight, ShoppingBag, MapPin, CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PhotorealisticAvatar3D } from "@/components/PhotorealisticAvatar3D";
import { WardrobeDialog } from "@/components/WardrobeDialog";
import { useWardrobe } from "@/hooks/useWardrobe";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { Skeleton, LeaderboardSkeleton } from "@/components/ui/skeleton-loader";

interface LeaderboardUser {
  user_id: string;
  total_points: number;
  weekly_points: number;
  seasonal_points: number;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  rank: number;
  user_rank: string;
  user_stats?: {
    reliability_rate: number;
    streak_weeks: number;
  };
}

const Leaderboard = () => {
  const { user, subscriptionInfo } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [seasonalLeaderboard, setSeasonalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  
  const navigate = useNavigate();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [avatarModelId, setAvatarModelId] = useState<string>('male-athlete-01');
  const { getEquippedItems, userPoints } = useWardrobe();
  const equippedItems = getEquippedItems();

  const USERS_PER_PAGE = 10; // Charger uniquement le TOP 10

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
      loadAvatarModel();
    }
  }, [user]);

  const loadAvatarModel = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_model_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data?.avatar_model_id) {
      setAvatarModelId(data.avatar_model_id);
    }
  };

  const fetchLeaderboards = async () => {
    try {
      // Fetch global leaderboard TOP 10 + user position
      const { data: globalData, error: globalError } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      if (globalError) throw globalError;

      // Get current user's profile separately if needed
      let currentUserProfile = null;
      if (user) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        currentUserProfile = currentProfile;
      }

      // Get all users to find current user's position
      const { data: allUsersData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      const currentUserIndex = allUsersData?.findIndex(u => u.user_id === user?.id);
      let globalLeaderboard = globalData?.map((item, index) => {
        let profile = {
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url
        };
        
        if (!profile.username && item.user_id === user?.id && currentUserProfile) {
          profile = currentUserProfile;
        }
        
        return {
          user_id: item.user_id,
          total_points: item.total_points,
          weekly_points: item.weekly_points,
          seasonal_points: item.seasonal_points,
          profile: profile || {
            username: 'Unknown',
            display_name: 'Unknown User',
            avatar_url: ''
          },
          rank: index + 1,
          user_rank: getUserRank(item.total_points)
        };
      }) || [];

      // Add current user if not in TOP 10
      if (user && currentUserIndex !== undefined && currentUserIndex >= 10 && allUsersData) {
        const userItem = allUsersData[currentUserIndex];
        globalLeaderboard.push({
          user_id: userItem.user_id,
          total_points: userItem.total_points,
          weekly_points: userItem.weekly_points,
          seasonal_points: userItem.seasonal_points,
          profile: {
            username: userItem.username,
            display_name: userItem.display_name,
            avatar_url: userItem.avatar_url
          },
          rank: currentUserIndex + 1,
          user_rank: getUserRank(userItem.total_points)
        });
      }

      setLeaderboard(globalLeaderboard);

      // Create seasonal leaderboard TOP 10 + user position
      const { data: seasonalData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: 0,
        order_by_column: 'seasonal_points'
      });

      // Get all seasonal users to find current user's position
      const { data: allSeasonalData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'seasonal_points'
      });

      const seasonalUserIndex = allSeasonalData?.findIndex(u => u.user_id === user?.id);
      let seasonalLeaderboard = seasonalData?.map((item, index) => {
        let profile = {
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url
        };
        
        if (!profile.username && item.user_id === user?.id && currentUserProfile) {
          profile = currentUserProfile;
        }
        
        return {
          user_id: item.user_id,
          total_points: item.total_points,
          weekly_points: item.weekly_points,
          seasonal_points: item.seasonal_points,
          profile: profile || {
            username: 'Unknown',
            display_name: 'Unknown User',
            avatar_url: ''
          },
          rank: index + 1,
          user_rank: getUserRank(item.total_points)
        };
      }) || [];

      // Add current user if not in TOP 10
      if (user && seasonalUserIndex !== undefined && seasonalUserIndex >= 10 && allSeasonalData) {
        const userItem = allSeasonalData[seasonalUserIndex];
        seasonalLeaderboard.push({
          user_id: userItem.user_id,
          total_points: userItem.total_points,
          weekly_points: userItem.weekly_points,
          seasonal_points: userItem.seasonal_points,
          profile: {
            username: userItem.username,
            display_name: userItem.display_name,
            avatar_url: userItem.avatar_url
          },
          rank: seasonalUserIndex + 1,
          user_rank: getUserRank(userItem.total_points)
        });
      }

      setSeasonalLeaderboard(seasonalLeaderboard);

      // Set user's rank
      if (user && currentUserIndex !== undefined && currentUserIndex >= 0) {
        setUserRank(currentUserIndex + 1);
      }

      // Fetch friends leaderboard
      if (user) {
        const { data: friendsFollowData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friendsFollowData?.map(f => f.following_id) || [];
        
        if (friendIds.length > 0) {
          // Get all friends profiles
          const { data: friendsProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', friendIds);

          // Get scores for friends
          const { data: friendsScores } = await supabase
            .from('user_scores')
            .select('user_id, total_points, weekly_points, seasonal_points')
            .in('user_id', friendIds);

          // Combine profiles and scores
          const friendsData = friendsProfiles?.map(profile => {
            const scores = friendsScores?.find(s => s.user_id === profile.user_id);
            return {
              user_id: profile.user_id,
              total_points: scores?.total_points || 0,
              weekly_points: scores?.weekly_points || 0,
              seasonal_points: scores?.seasonal_points || 0,
              profile: profile,
              user_rank: getUserRank(scores?.total_points || 0)
            };
          }) || [];

          // Sort by total points and take TOP 10
          const sortedFriendsData = friendsData.sort((a, b) => b.total_points - a.total_points);
          const top10Friends = sortedFriendsData.slice(0, USERS_PER_PAGE);

          // Find current user in friends list
          const userIndexInFriends = sortedFriendsData.findIndex(f => f.user_id === user?.id);
          
          let friendsLeaderboard = top10Friends.map((item, index) => ({
            ...item,
            rank: index + 1
          }));

          // Add current user if not in TOP 10
          if (userIndexInFriends >= 10) {
            const userItem = sortedFriendsData[userIndexInFriends];
            friendsLeaderboard.push({
              ...userItem,
              rank: userIndexInFriends + 1
            });
          }

          setFriendsLeaderboard(friendsLeaderboard);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour calculer les dates de la saison actuelle
  const getCurrentSeasonDates = () => {
    // Date de début de référence (première saison)
    const startRef = new Date('2024-08-15'); // 15 août 2024
    const now = new Date();
    
    // Durée d'une saison en millisecondes (45 jours)
    const seasonDuration = 45 * 24 * 60 * 60 * 1000;
    
    // Calculer combien de saisons se sont écoulées depuis la référence
    const timeSinceStart = now.getTime() - startRef.getTime();
    const seasonsElapsed = Math.floor(timeSinceStart / seasonDuration);
    
    // Calculer le début et la fin de la saison actuelle
    const currentSeasonStart = new Date(startRef.getTime() + (seasonsElapsed * seasonDuration));
    const currentSeasonEnd = new Date(currentSeasonStart.getTime() + seasonDuration - 1);
    
    return {
      start: currentSeasonStart,
      end: currentSeasonEnd,
      number: seasonsElapsed + 1
    };
  };

  const seasonDates = getCurrentSeasonDates();

  const getUserRank = (points: number): string => {
    if (points >= 5000) return 'diamant';
    if (points >= 3000) return 'platine';
    if (points >= 2000) return 'or';
    if (points >= 1000) return 'argent';
    if (points >= 500) return 'bronze';
    return 'novice';
  };

  const getUserTitle = (points: number) => {
    if (points >= 200) return { title: "Champion", color: "text-yellow-500", icon: "👑" };
    if (points >= 100) return { title: "Expert", color: "text-purple-500", icon: "🎖️" };
    if (points >= 50) return { title: "Confirmé", color: "text-blue-500", icon: "🏃" };
    return { title: "Novice", color: "text-gray-500", icon: "⭐" };
  };

  const getRankBorderColor = (userRank: string): string => {
    switch (userRank) {
      case 'diamant':
        return 'border-4 border-cyan-400 shadow-lg shadow-cyan-400/50 ring-2 ring-cyan-300/30';
      case 'platine':
        return 'border-4 border-purple-500 shadow-lg shadow-purple-500/50 ring-2 ring-purple-300/30';
      case 'or':
        return 'border-4 border-yellow-500 shadow-lg shadow-yellow-500/50 ring-2 ring-yellow-300/30';
      case 'argent':
        return 'border-4 border-gray-400 shadow-lg shadow-gray-400/50 ring-2 ring-gray-300/30';
      case 'bronze':
        return 'border-4 border-amber-600 shadow-lg shadow-amber-600/50 ring-2 ring-amber-300/30';
      default:
        return 'border-2 border-gray-300';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBadge = (userRank: string) => {
    switch (userRank) {
      case 'diamant':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-0">
            <Diamond className="h-3 w-3 mr-1" />
            Diamant
          </Badge>
        );
      case 'platine':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <Gem className="h-3 w-3 mr-1" />
            Platine
          </Badge>
        );
      case 'or':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
            <Award className="h-3 w-3 mr-1" />
            Or
          </Badge>
        );
      case 'argent':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-gray-400 to-gray-600 text-white border-0">
            <Medal className="h-3 w-3 mr-1" />
            Argent
          </Badge>
        );
      case 'bronze':
        return (
          <Badge variant="secondary" className="bg-gradient-to-r from-amber-600 to-amber-800 text-white border-0">
            <Coins className="h-3 w-3 mr-1" />
            Bronze
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Star className="h-3 w-3 mr-1" />
            Novice
          </Badge>
        );
    }
  };

  const PodiumDisplay = ({ top3, showSeasonal = false }: { top3: LeaderboardUser[], showSeasonal?: boolean }) => {
    if (top3.length === 0) return null;
    
    const first = top3[0];
    const second = top3[1];
    const third = top3[2];
    
    return (
      <div className="mb-2 pb-2">
        <div className="flex items-end justify-center gap-2 mb-2">
          {/* 2ème place - Gauche */}
          {second && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(156,163,175,0.5) 0%, transparent 70%)' }}
                />
                <Avatar 
                  className={`h-9 w-9 mb-1 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 ${getRankBorderColor(second.user_rank)} relative z-10`}
                  onClick={() => navigateToProfile(second.user_id)}
                >
                  <AvatarImage src={second.profile?.avatar_url} />
                  <AvatarFallback className="text-xs font-bold">
                    {second.profile?.username?.[0] || second.profile?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center mb-1">
                <p className="font-semibold text-[10px] truncate max-w-[60px]">
                  {second.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {showSeasonal ? second.seasonal_points : second.total_points}
                </p>
              </div>
              <div 
                className="w-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-lg border border-gray-500 flex flex-col items-center justify-start pt-0.5 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '35px' }}
                onClick={() => navigateToProfile(second.user_id)}
              >
                <Medal className="h-4 w-4 text-gray-100" />
                <span className="text-sm font-bold text-white">2</span>
              </div>
            </div>
          )}
          
          {/* 1ère place - Centre */}
          {first && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Crown className="h-5 w-5 text-yellow-500 mb-0.5 animate-pulse" />
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.5) 0%, transparent 70%)' }}
                />
                <Avatar 
                  className={`h-11 w-11 mb-1 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 ${getRankBorderColor(first.user_rank)} relative z-10`}
                  onClick={() => navigateToProfile(first.user_id)}
                >
                  <AvatarImage src={first.profile?.avatar_url} />
                  <AvatarFallback className="text-sm font-bold">
                    {first.profile?.username?.[0] || first.profile?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center mb-1">
                <p className="font-bold text-[11px] truncate max-w-[70px]">
                  {first.profile?.username}
                </p>
                <p className="font-bold text-primary text-sm">
                  {showSeasonal ? first.seasonal_points : first.total_points}
                </p>
              </div>
              <div 
                className="w-14 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg border border-yellow-700 shadow-lg shadow-yellow-500/50 flex flex-col items-center justify-start pt-0.5 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '48px' }}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <Trophy className="h-5 w-5 text-yellow-100" />
                <span className="text-base font-bold text-white">1</span>
              </div>
            </div>
          )}
          
          {/* 3ème place - Droite */}
          {third && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="relative">
                <div 
                  className="absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.5) 0%, transparent 70%)' }}
                />
                <Avatar 
                  className={`h-9 w-9 mb-1 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 ${getRankBorderColor(third.user_rank)} relative z-10`}
                  onClick={() => navigateToProfile(third.user_id)}
                >
                  <AvatarImage src={third.profile?.avatar_url} />
                  <AvatarFallback className="text-xs font-bold">
                    {third.profile?.username?.[0] || third.profile?.display_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="text-center mb-1">
                <p className="font-semibold text-[10px] truncate max-w-[60px]">
                  {third.profile?.username}
                </p>
                <p className="font-bold text-primary text-xs">
                  {showSeasonal ? third.seasonal_points : third.total_points}
                </p>
              </div>
              <div 
                className="w-12 bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-lg border border-amber-800 flex flex-col items-center justify-start pt-0.5 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '28px' }}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <Medal className="h-4 w-4 text-amber-100" />
                <span className="text-sm font-bold text-white">3</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const UserCard = ({ 
    item, 
    showSeasonal, 
    compact = false,
    highlight = false 
  }: { 
    item: LeaderboardUser; 
    showSeasonal?: boolean; 
    compact?: boolean;
    highlight?: boolean;
  }) => {
    return (
      <div 
        className={`
          rounded-lg transition-all duration-300 hover:shadow-xl
          ${highlight ? 'ring-1 ring-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]' : ''}
          ${item.user_id === user?.id && !highlight ? 'ring-1 ring-primary/50' : ''}
        `}
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <div className="w-5 flex justify-center">
              {getRankIcon(item.rank)}
            </div>
            <Avatar 
              className="h-8 w-8 cursor-pointer hover:opacity-80 transition-all"
              onClick={() => navigateToProfile(item.user_id)}
            >
              <AvatarImage src={item.profile?.avatar_url} />
              <AvatarFallback className="text-xs font-bold">
                {item.profile?.username?.[0] || item.profile?.display_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-xs">
                {item.profile?.username || item.profile?.display_name}
              </p>
              <p className="font-bold text-primary text-xs">
                {showSeasonal ? item.seasonal_points : item.total_points} pts
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const LeaderboardList = ({ data, showSeasonal = false }: { data: LeaderboardUser[], showSeasonal?: boolean }) => {
    const top3 = data.slice(0, 3);
    const top10 = data.slice(3, 10); // Positions 4 à 10
    const currentUserIndex = data.findIndex(item => item.user_id === user?.id);
    const currentUserItem = currentUserIndex >= 10 ? data[currentUserIndex] : null;
    
    return (
      <div className="space-y-1.5">
        <PodiumDisplay top3={top3} showSeasonal={showSeasonal} />
        
        {/* TOP 10 (positions 4 à 10) */}
        <div className="space-y-1.5">
          {top10.map((item) => (
            <UserCard key={item.user_id} item={item} showSeasonal={showSeasonal} compact={true} />
          ))}
        </div>
        
        {/* Séparateur si l'utilisateur n'est pas dans le TOP 10 */}
        {currentUserItem && (
          <>
            <div className="flex items-center justify-center gap-2 py-1 text-muted-foreground text-xs">
              <div className="h-px bg-border/20 flex-1" />
              <span>…</span>
              <div className="h-px bg-border/20 flex-1" />
            </div>
            
            {/* Position de l'utilisateur */}
            <UserCard 
              item={currentUserItem} 
              showSeasonal={showSeasonal} 
              compact={true}
              highlight={true}
            />
            
            <div className="flex items-center justify-center gap-2 py-1 text-muted-foreground text-xs">
              <div className="h-px bg-border/20 flex-1" />
              <span>…</span>
              <div className="h-px bg-border/20 flex-1" />
            </div>
          </>
        )}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E13] p-4 overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-md mx-auto">
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-foreground">Classement</h1>
          </div>
          
          {/* Animated skeleton placeholders */}
          <div className="space-y-4 animate-fade-in">
            {/* Rank System Card Skeleton */}
            <div 
              className="animate-pulse rounded-xl p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="mb-6">
                <Skeleton className="h-6 w-[140px] mx-auto" />
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                      <Skeleton className="h-3 w-[40px]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div 
              className="flex h-10 items-center justify-center rounded-md p-1"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 h-8 mx-1">
                  <Skeleton className="h-full w-full rounded-sm" />
                </div>
              ))}
            </div>

            {/* Leaderboard Items Skeleton */}
            <LeaderboardSkeleton />
          </div>
        </div>
      </div>
    );
  }


  return (
    <div 
      className="min-h-screen bg-[#0B0E13] p-4 pb-20 overflow-y-auto"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      <div className="max-w-md mx-auto space-y-2">


        {/* Leaderboard Tabs */}
        <Tabs defaultValue="seasonal" className="w-full">
          {userRank && (
            <div 
              className="text-center mb-2 rounded-full px-3 py-0.5 inline-block mx-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <Badge variant="secondary" className="text-[10px]">
                Votre rang: #{userRank}
              </Badge>
            </div>
          )}

          <TabsContent value="seasonal" className="mt-2">
            <div className="flex flex-col gap-2">
              <div className="text-center space-y-0.5">
                <h2 className="text-base font-semibold flex items-center justify-center gap-1 text-primary">
                  <TrendingUp className="h-4 w-4" />
                  Classement Saison {seasonDates.number}
                </h2>
                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {seasonDates.start.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short' 
                    })} - {seasonDates.end.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="text-center">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-[9px] px-1.5 py-0">
                    🎁 Codes promo pour le top 3
                  </Badge>
                </div>
              </div>
              
              <TabsList
                className="grid w-full grid-cols-3 h-8"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <TabsTrigger 
                  value="seasonal" 
                  className="flex items-center gap-1 text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span className="hidden sm:inline">Saison</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="global" 
                  className="flex items-center gap-1 text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  <Globe className="h-3 w-3" />
                  <span className="hidden sm:inline">Global</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="friends" 
                  className="flex items-center gap-1 text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                >
                  <Users className="h-3 w-3" />
                  <span className="hidden sm:inline">Amis</span>
                </TabsTrigger>
              </TabsList>
              
              {seasonalLeaderboard.length > 0 && (
                <LeaderboardList data={seasonalLeaderboard} showSeasonal />
              )}
            </div>
          </TabsContent>

          <TabsContent value="global" className="mt-2">
            {leaderboard.length > 0 && (
              <LeaderboardList data={leaderboard} showSeasonal={false} />
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-2">
            {friendsLeaderboard.length > 0 ? (
              <LeaderboardList data={friendsLeaderboard} showSeasonal={false} />
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun ami dans votre liste</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={closeProfilePreview}
      />
      
      {/* Wardrobe Dialog */}
      <WardrobeDialog
        open={showWardrobe}
        onOpenChange={setShowWardrobe}
      />
    </div>
  );
};

export default Leaderboard;