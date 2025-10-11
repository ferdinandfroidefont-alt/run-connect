import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe, Star, Award, Gem, Coins, Diamond, Calendar, Lock, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
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
}

const Leaderboard = () => {
  const { user, subscriptionInfo } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [seasonalLeaderboard, setSeasonalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  // Pagination states
  const [globalPage, setGlobalPage] = useState(1);
  const [seasonalPage, setSeasonalPage] = useState(1);
  const [friendsPage, setFriendsPage] = useState(1);
  const [totalGlobalUsers, setTotalGlobalUsers] = useState(0);
  const [totalSeasonalUsers, setTotalSeasonalUsers] = useState(0);
  const [totalFriendsUsers, setTotalFriendsUsers] = useState(0);
  
  const navigate = useNavigate();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [avatarModelId, setAvatarModelId] = useState<string>('male-athlete-01');
  const { getEquippedItems, userPoints } = useWardrobe();
  const equippedItems = getEquippedItems();

  const USERS_PER_PAGE = 50;

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
      loadAvatarModel();
    }
  }, [user, globalPage, seasonalPage, friendsPage]);

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
      // Get total count of all users first
      const { data: totalCountData } = await supabase.rpc('get_leaderboard_total_count');
      const totalCount = totalCountData || 0;

      setTotalGlobalUsers(totalCount);
      setTotalSeasonalUsers(totalCount);

      // Fetch global leaderboard with pagination using new function
      const globalOffset = (globalPage - 1) * USERS_PER_PAGE;
      const { data: globalData, error: globalError } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: globalOffset,
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

      const globalLeaderboard = globalData?.map((item, index) => {
        // Use the data directly from the function since it includes profile info
        let profile = {
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url
        };
        
        // If this is the current user and no profile was found, use their own profile
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
          rank: globalOffset + index + 1, // Adjust rank for pagination
          user_rank: getUserRank(item.total_points)
        };
      }) || [];

      setLeaderboard(globalLeaderboard);

      // Create seasonal leaderboard with pagination using new function
      const seasonalOffset = (seasonalPage - 1) * USERS_PER_PAGE;
      const { data: seasonalData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: seasonalOffset,
        order_by_column: 'seasonal_points'
      });

      const seasonalLeaderboard = seasonalData?.map((item, index) => {
        // Use the data directly from the function since it includes profile info
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
          rank: seasonalOffset + index + 1, // Adjust rank for pagination
          user_rank: getUserRank(item.total_points)
        };
      }) || [];

      setSeasonalLeaderboard(seasonalLeaderboard);

      // Find user's rank in global leaderboard using complete leaderboard
      if (user) {
        const { data: allUsersData } = await supabase.rpc('get_complete_leaderboard', {
          limit_count: 10000, // Get a large number to find user's position
          offset_count: 0,
          order_by_column: 'total_points'
        });
        
        const currentUserRank = allUsersData?.findIndex(u => u.user_id === user.id);
        setUserRank(currentUserRank !== undefined && currentUserRank >= 0 ? currentUserRank + 1 : null);
      }

      // Fetch friends leaderboard
      if (user) {
        const { data: friendsFollowData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friendsFollowData?.map(f => f.following_id) || [];
        setTotalFriendsUsers(friendIds.length);
        
        if (friendIds.length > 0) {
          const friendsOffset = (friendsPage - 1) * USERS_PER_PAGE;
          
          // Get all friends profiles first
          const { data: friendsProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', friendIds);

          // Get scores for friends (LEFT JOIN will include friends with no scores)
          const { data: friendsScores } = await supabase
            .from('user_scores')
            .select('user_id, total_points, weekly_points, seasonal_points')
            .in('user_id', friendIds);

          // Combine profiles and scores, including friends with no scores (0 points)
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

          // Sort by total points and apply pagination
          const sortedFriendsData = friendsData.sort((a, b) => b.total_points - a.total_points);
          const paginatedFriendsData = sortedFriendsData.slice(friendsOffset, friendsOffset + USERS_PER_PAGE);

          const friendsLeaderboard = paginatedFriendsData.map((item, index) => ({
            ...item,
            rank: friendsOffset + index + 1
          }));

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
      <div className="mb-8 pb-8 border-b">
        <div className="flex items-end justify-center gap-4 mb-6">
          {/* 2ème place - Gauche */}
          {second && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-center mb-2">
                <p className="font-semibold text-sm truncate max-w-[80px]">
                  {second.profile?.username}
                </p>
                <div className="flex justify-center my-1">
                  {getRankBadge(second.user_rank)}
                </div>
                <p className="font-bold text-primary">
                  {showSeasonal ? second.seasonal_points : second.total_points} pts
                </p>
              </div>
              <div 
                className="w-20 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-lg border-2 border-gray-500 flex flex-col items-center justify-start pt-2 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '100px' }}
                onClick={() => navigateToProfile(second.user_id)}
              >
                <Medal className="h-8 w-8 text-gray-100 mb-1" />
                <span className="text-2xl font-bold text-white">2</span>
              </div>
            </div>
          )}
          
          {/* 1ère place - Centre */}
          {first && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <Crown className="h-10 w-10 text-yellow-500 mb-1 animate-pulse" />
              <div className="text-center mb-2">
                <p className="font-bold text-base truncate max-w-[90px]">
                  {first.profile?.username}
                </p>
                <div className="flex justify-center my-1">
                  {getRankBadge(first.user_rank)}
                </div>
                <p className="font-bold text-primary text-lg">
                  {showSeasonal ? first.seasonal_points : first.total_points} pts
                </p>
              </div>
              <div 
                className="w-24 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg border-2 border-yellow-700 shadow-lg shadow-yellow-500/50 flex flex-col items-center justify-start pt-2 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '140px' }}
                onClick={() => navigateToProfile(first.user_id)}
              >
                <Trophy className="h-10 w-10 text-yellow-100 mb-1" />
                <span className="text-3xl font-bold text-white">1</span>
              </div>
            </div>
          )}
          
          {/* 3ème place - Droite */}
          {third && (
            <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-center mb-2">
                <p className="font-semibold text-sm truncate max-w-[80px]">
                  {third.profile?.username}
                </p>
                <div className="flex justify-center my-1">
                  {getRankBadge(third.user_rank)}
                </div>
                <p className="font-bold text-primary">
                  {showSeasonal ? third.seasonal_points : third.total_points} pts
                </p>
              </div>
              <div 
                className="w-20 bg-gradient-to-b from-amber-500 to-amber-700 rounded-t-lg border-2 border-amber-800 flex flex-col items-center justify-start pt-2 cursor-pointer hover:opacity-80 transition-all"
                style={{ height: '80px' }}
                onClick={() => navigateToProfile(third.user_id)}
              >
                <Medal className="h-8 w-8 text-amber-100 mb-1" />
                <span className="text-2xl font-bold text-white">3</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const LeaderboardList = ({ data, showSeasonal = false }: { data: LeaderboardUser[], showSeasonal?: boolean }) => {
    const top3 = data.slice(0, 3);
    const rest = data.slice(3);
    
    return (
      <div className="space-y-2">
        <PodiumDisplay top3={top3} showSeasonal={showSeasonal} />
        
        {rest.map((item, index) => (
          <Card 
            key={item.user_id} 
            className={`
              ${item.user_id === user?.id ? 'border-primary bg-primary/5' : ''}
              hover-lift hover-glow btn-interactive animate-fade-in
            `}
            style={{ animationDelay: `${(index + 3) * 0.1}s` }}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  {getRankIcon(item.rank)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {item.profile?.username || item.profile?.display_name}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    @{item.profile?.username}
                  </p>
                  <div className="my-1">
                    {getRankBadge(item.user_rank)}
                  </div>
                  <div className="mt-1">
                    <p className="font-bold text-primary">
                      {showSeasonal ? item.seasonal_points : item.total_points} pts
                    </p>
                    {!showSeasonal && (
                      <p className="text-xs text-muted-foreground">
                        +{item.seasonal_points} cette saison
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const PaginationControls = ({ 
    currentPage, 
    totalItems, 
    onPageChange 
  }: { 
    currentPage: number; 
    totalItems: number; 
    onPageChange: (page: number) => void;
  }) => {
    const totalPages = Math.ceil(totalItems / USERS_PER_PAGE);
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-interactive"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0 btn-interactive"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-interactive"
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-md mx-auto">
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-foreground">Classement</h1>
          </div>
          
          {/* Animated skeleton placeholders */}
          <div className="space-y-4 animate-fade-in">
            {/* Rank System Card Skeleton */}
            <Card className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-[140px] mx-auto" />
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>

            {/* Tabs Skeleton */}
            <div className="flex h-10 items-center justify-center rounded-md bg-muted p-1">
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

  // Check if user is premium
  if (!subscriptionInfo?.subscribed) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-md mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-foreground mb-6">Classement</h1>
            
            <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
              <CardContent className="p-8 text-center space-y-6">
                <div className="relative">
                  <Lock className="h-16 w-16 text-yellow-500 mx-auto" />
                  <Crown className="h-8 w-8 text-yellow-600 absolute -top-1 -right-1" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">
                    Fonctionnalité Premium
                  </h2>
                  <p className="text-muted-foreground">
                    Le classement est réservé aux membres Premium. 
                    Découvrez votre rang et comparez-vous avec vos amis !
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>✨ Classement global et saisonnier</p>
                    <p>🏆 Système de rangs avancé</p>
                    <p>👥 Classement entre amis</p>
                    <p>🚀 Badge premium</p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/subscription')}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Crown className="h-4 w-4" />
                  Devenir Premium
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20 overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-foreground">Classement</h1>
          {userRank && (
            <Badge variant="secondary" className="mt-2">
              Votre rang: #{userRank}
            </Badge>
          )}
        </div>

        {/* Avatar 3D avec Garde-robe */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5" />
              Mon Avatar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="relative w-full">
                <PhotorealisticAvatar3D 
                  avatarModelId={avatarModelId}
                  topItemId={equippedItems.top}
                  bottomItemId={equippedItems.bottom}
                  shoesItemId={equippedItems.shoes}
                  className="w-full h-80 rounded-lg bg-background/50"
                />
              </div>
              
              <div className="mt-4 text-center space-y-2">
                <Badge variant="outline" className="text-base">
                  {userPoints} points
                </Badge>
                <Button 
                  onClick={() => setShowWardrobe(true)}
                  className="w-full"
                  variant="outline"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Ma Garde-robe
                </Button>
                <p className="text-xs text-muted-foreground">
                  💡 Débloquez de nouveaux vêtements en gagnant des points !
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="seasonal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="seasonal" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Saison</span>
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Amis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seasonal" className="mt-4">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-primary">
                  <TrendingUp className="h-6 w-6" />
                  Classement Saison {seasonDates.number}
                </h2>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {seasonDates.start.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long' 
                    })} - {seasonDates.end.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="text-center mt-2">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-3 py-1">
                    🎁 Codes promo à gagner sur sites sportifs pour les 3 premiers
                  </Badge>
                </div>
              </div>
              <LeaderboardList data={seasonalLeaderboard} showSeasonal />
              <PaginationControls
                currentPage={seasonalPage}
                totalItems={totalSeasonalUsers}
                onPageChange={setSeasonalPage}
              />
            </div>
          </TabsContent>

          <TabsContent value="global" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Classement global
              </h2>
              <LeaderboardList data={leaderboard} />
              <PaginationControls
                currentPage={globalPage}
                totalItems={totalGlobalUsers}
                onPageChange={setGlobalPage}
              />
            </div>
          </TabsContent>


          <TabsContent value="friends" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vos amis
              </h2>
              {friendsLeaderboard.length > 0 ? (
                <>
                  <LeaderboardList data={friendsLeaderboard} />
                  <PaginationControls
                    currentPage={friendsPage}
                    totalItems={totalFriendsUsers}
                    onPageChange={setFriendsPage}
                  />
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Suivez des amis pour voir leur classement !
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
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