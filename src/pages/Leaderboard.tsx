import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe, Star, Award, Gem, Coins, Diamond, Calendar, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";

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
  const navigate = useNavigate();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
    }
  }, [user]);

  const fetchLeaderboards = async () => {
    try {
      // Fetch global leaderboard with profile data
      const { data: globalData, error: globalError } = await supabase
        .from('user_scores')
        .select(`
          user_id,
          total_points,
          weekly_points,
          seasonal_points
        `)
        .order('total_points', { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      // Get profiles for users in leaderboard using secure function
      const userIds = globalData?.map(item => item.user_id) || [];
      const { data: profilesData } = await supabase.rpc('get_safe_public_profiles', {
        profile_user_ids: userIds
      });

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
          rank: index + 1,
          user_rank: getUserRank(item.total_points)
        };
      }) || [];

      setLeaderboard(globalLeaderboard);

      // Create seasonal leaderboard
      const seasonalLeaderboard = [...globalLeaderboard]
        .sort((a, b) => b.seasonal_points - a.seasonal_points)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      setSeasonalLeaderboard(seasonalLeaderboard);

      // Find user's rank
      const currentUserRank = globalLeaderboard.find(u => u.user_id === user?.id)?.rank;
      setUserRank(currentUserRank || null);

      // Fetch friends leaderboard
      if (user) {
        const { data: friendsFollowData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friendsFollowData?.map(f => f.following_id) || [];
        
        if (friendIds.length > 0) {
          const { data: friendsScores } = await supabase
            .from('user_scores')
            .select('user_id, total_points, weekly_points, seasonal_points')
            .in('user_id', friendIds);

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
              rank: index + 1,
              user_rank: getUserRank(item.total_points)
            };
          }).sort((a, b) => b.total_points - a.total_points)
          .map((item, index) => ({ ...item, rank: index + 1 })) || [];

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
      {data.map((item) => (
        <Card 
          key={item.user_id} 
          className={`${item.user_id === user?.id ? 'border-primary bg-primary/5' : ''}`}
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
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">
                {showSeasonal ? item.seasonal_points : item.total_points} pts
              </p>
              {!showSeasonal && (
                <p className="text-xs text-muted-foreground">
                  +{item.seasonal_points} cette saison
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto flex items-center justify-center h-96">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-primary mx-auto mb-4 animate-bounce" />
            <p>Chargement du classement...</p>
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
    <div className="min-h-screen bg-background p-4 pb-20">
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
                    🎁 Code promo à gagner pour les 3 premiers
                  </Badge>
                </div>
              </div>
              <LeaderboardList data={seasonalLeaderboard} showSeasonal />
            </div>
          </TabsContent>

          <TabsContent value="global" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Classement global
              </h2>
              <LeaderboardList data={leaderboard} />
            </div>
          </TabsContent>


          <TabsContent value="friends" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vos amis
              </h2>
              {friendsLeaderboard.length > 0 ? (
                <LeaderboardList data={friendsLeaderboard} />
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