import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe, Star, Award, Gem, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardUser {
  user_id: string;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  rank: number;
  user_rank: string;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [monthlyLeaderboard, setMonthlyLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

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
          monthly_points
        `)
        .order('total_points', { ascending: false })
        .limit(50);

      if (globalError) throw globalError;

      // Get profiles for users in leaderboard
      const userIds = globalData?.map(item => item.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const globalLeaderboard = globalData?.map((item, index) => {
        const profile = profilesData?.find(p => p.user_id === item.user_id);
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

      // Create monthly leaderboard
      const monthlyLeaderboard = [...globalLeaderboard]
        .sort((a, b) => b.monthly_points - a.monthly_points)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      setMonthlyLeaderboard(monthlyLeaderboard);

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
            .select('user_id, total_points, weekly_points, monthly_points')
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

  const getUserRank = (points: number): string => {
    if (points >= 3000) return 'platine';
    if (points >= 2000) return 'or';
    if (points >= 1000) return 'argent';
    if (points >= 500) return 'bronze';
    return 'novice';
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

  const LeaderboardList = ({ data, showMonthly = false }: { data: LeaderboardUser[], showMonthly?: boolean }) => (
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
              <Avatar className="h-10 w-10">
                <AvatarImage src={item.profile?.avatar_url} />
                <AvatarFallback>
                  {item.profile?.display_name?.[0] || item.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {item.profile?.display_name || item.profile?.username}
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
                {showMonthly ? item.monthly_points : item.total_points} pts
              </p>
              {!showMonthly && (
                <p className="text-xs text-muted-foreground">
                  +{item.monthly_points} ce mois
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
              <div className="flex items-center justify-between col-span-2">
                <div className="flex items-center">
                  <Gem className="h-4 w-4 text-purple-500 mr-2" />
                  <span className="text-sm">Platine</span>
                </div>
                <span className="text-xs">3000+ pts</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="global" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Global</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Mois</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Amis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Classement global
              </h2>
              <LeaderboardList data={leaderboard} />
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ce mois
              </h2>
              <LeaderboardList data={monthlyLeaderboard} showMonthly />
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
    </div>
  );
};

export default Leaderboard;