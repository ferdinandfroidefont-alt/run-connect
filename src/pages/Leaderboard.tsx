import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Medal, TrendingUp, Users, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardUser {
  user_id: string;
  total_points: number;
  weekly_points: number;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
  rank: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardUser[]>([]);
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
          weekly_points
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
          rank: index + 1
        };
      }) || [];

      setLeaderboard(globalLeaderboard);

      // Create weekly leaderboard
      const weeklyLeaderboard = [...globalLeaderboard]
        .sort((a, b) => b.weekly_points - a.weekly_points)
        .map((item, index) => ({ ...item, rank: index + 1 }));

      setWeeklyLeaderboard(weeklyLeaderboard);

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
            .select('user_id, total_points, weekly_points')
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
              rank: index + 1
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

  const LeaderboardList = ({ data, showWeekly = false }: { data: LeaderboardUser[], showWeekly?: boolean }) => (
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
              <div>
                <p className="font-medium">
                  {item.profile?.display_name || item.profile?.username}
                </p>
                <p className="text-sm text-muted-foreground">
                  @{item.profile?.username}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">
                {showWeekly ? item.weekly_points : item.total_points} pts
              </p>
              {!showWeekly && (
                <p className="text-xs text-muted-foreground">
                  +{item.weekly_points} cette semaine
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

        {/* Points Info */}
        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="text-center">Système de points</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                <span className="text-sm">Créer une séance</span>
              </div>
              <span className="text-sm font-bold">+10 pts</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Medal className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm">Rejoindre une séance</span>
              </div>
              <span className="text-sm font-bold">+30 pts</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm">Quelqu'un rejoint votre séance</span>
              </div>
              <span className="text-sm font-bold">+50 pts</span>
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
            <TabsTrigger value="weekly" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Semaine</span>
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

          <TabsContent value="weekly" className="mt-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cette semaine
              </h2>
              <LeaderboardList data={weeklyLeaderboard} showWeekly />
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