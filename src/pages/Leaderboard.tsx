import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe, Star, Award, Gem, Coins, Diamond, Calendar, Lock, ChevronLeft, ChevronRight } from "lucide-react";
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

  const USERS_PER_PAGE = 50;

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
    }
  }, [user, globalPage, seasonalPage, friendsPage]);

  const fetchLeaderboards = async () => {
    try {
      // Get total count first
      const { count: totalCount } = await supabase
        .from('user_scores')
        .select('*', { count: 'exact', head: true });

      setTotalGlobalUsers(totalCount || 0);
      setTotalSeasonalUsers(totalCount || 0);

      // Fetch global leaderboard with pagination
      const globalOffset = (globalPage - 1) * USERS_PER_PAGE;
      const { data: globalData, error: globalError } = await supabase
        .from('user_scores')
        .select(`
          user_id,
          total_points,
          weekly_points,
          seasonal_points
        `)
        .order('total_points', { ascending: false })
        .range(globalOffset, globalOffset + USERS_PER_PAGE - 1);

      if (globalError) throw globalError;

      // Get profiles for users in leaderboard - include all users, not just public ones
      const userIds = globalData?.map(item => item.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      // Get current user's profile separately
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
        let profile = profilesData?.find(p => p.user_id === item.user_id);
        
        // If this is the current user and no profile was found, use their own profile
        if (!profile && item.user_id === user?.id && currentUserProfile) {
          profile = currentUserProfile;
        }
        
        return {
          ...item,
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

      // Create seasonal leaderboard with pagination
      const seasonalOffset = (seasonalPage - 1) * USERS_PER_PAGE;
      const { data: seasonalData } = await supabase
        .from('user_scores')
        .select(`
          user_id,
          total_points,
          weekly_points,
          seasonal_points
        `)
        .order('seasonal_points', { ascending: false })
        .range(seasonalOffset, seasonalOffset + USERS_PER_PAGE - 1);

      const seasonalUserIds = seasonalData?.map(item => item.user_id) || [];
      const { data: seasonalProfilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', seasonalUserIds);

      const seasonalLeaderboard = seasonalData?.map((item, index) => {
        let profile = seasonalProfilesData?.find(p => p.user_id === item.user_id);
        
        if (!profile && item.user_id === user?.id && currentUserProfile) {
          profile = currentUserProfile;
        }
        
        return {
          ...item,
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

      // Find user's rank in global leaderboard (need to query all users up to user's position)
      if (user) {
        const { data: userRankData } = await supabase
          .from('user_scores')
          .select('user_id')
          .order('total_points', { ascending: false });
        
        const currentUserRank = userRankData?.findIndex(u => u.user_id === user.id);
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
          const { data: friendsScores } = await supabase
            .from('user_scores')
            .select('user_id, total_points, weekly_points, seasonal_points')
            .in('user_id', friendIds)
            .order('total_points', { ascending: false })
            .range(friendsOffset, friendsOffset + USERS_PER_PAGE - 1);

          const { data: friendsProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', friendIds);

          const friendsLeaderboard = friendsScores?.map((item, index) => {
            const profile = friendsProfiles?.find(p => p.user_id === item.user_id);
            return {
              ...item,
              profile: profile || {
                username: 'Unknown',
                display_name: 'Unknown User',
                avatar_url: ''
              },
              rank: friendsOffset + index + 1,
              user_rank: getUserRank(item.total_points)
            };
          }) || [];

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

  const LeaderboardList = ({ data, showSeasonal = false }: { data: LeaderboardUser[], showSeasonal?: boolean }) => (
    <div className="space-y-2">
      {data.map((item, index) => (
        <Card 
          key={item.user_id} 
          className={`
            ${item.user_id === user?.id ? 'border-primary bg-primary/5' : ''}
            hover-lift hover-glow btn-interactive animate-fade-in
          `}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                {getRankIcon(item.rank)}
              </div>
              <Avatar 
                className={`h-14 w-14 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 ${getRankBorderColor(item.user_rank)}`}
                onClick={() => navigateToProfile(item.user_id)}
              >
                <AvatarImage src={item.profile?.avatar_url} />
                <AvatarFallback className="text-lg font-bold">
                  {item.profile?.username?.[0] || item.profile?.display_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {item.profile?.username || item.profile?.display_name}
                  </p>
                  {getRankBadge(item.user_rank)}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{item.profile?.username}
                </p>
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
      <div className="min-h-screen bg-background p-4 overflow-hidden">
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
      <div className="min-h-screen bg-background p-4 pb-20">
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
                    <p>💬 Messages illimités (3/jour sinon)</p>
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
    <div className="min-h-screen bg-background p-4 pb-20 overflow-hidden">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold text-foreground">Classement</h1>
          {userRank && (
            <Badge variant="secondary" className="mt-2">
              Votre rang: #{userRank}
            </Badge>
          )}
        </div>

        {/* Rank System Info */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-center">Système de rangs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm">Novice</span>
                </div>
                <span className="text-xs">0-499 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Coins className="h-4 w-4 text-amber-600 mr-2" />
                  <span className="text-sm">Bronze</span>
                </div>
                <span className="text-xs">500+ pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Medal className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm">Argent</span>
                </div>
                <span className="text-xs">1000+ pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Award className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="text-sm">Or</span>
                </div>
                <span className="text-xs">2000+ pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gem className="h-4 w-4 text-purple-500 mr-2" />
                  <span className="text-sm">Platine</span>
                </div>
                <span className="text-xs">3000+ pts</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Diamond className="h-4 w-4 text-cyan-400 mr-2" />
                  <span className="text-sm">Diamant</span>
                </div>
                <span className="text-xs">5000+ pts</span>
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
    </div>
  );
};

export default Leaderboard;