import { useState, useEffect, useMemo, memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { WardrobeDialog } from "@/components/WardrobeDialog";
import { useWardrobe } from "@/hooks/useWardrobe";

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
}

const Leaderboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("seasonal");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [seasonalLeaderboard, setSeasonalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userSeasonalRank, setUserSeasonalRank] = useState<number | null>(null);
  const [showWardrobe, setShowWardrobe] = useState(false);
  
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const { userPoints } = useWardrobe();

  const USERS_PER_PAGE = 10;

  useEffect(() => {
    if (user) {
      fetchLeaderboards();
    }
  }, [user]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      
      // Fetch global leaderboard TOP 10
      const { data: globalData, error: globalError } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      if (globalError) throw globalError;

      // Get all users to find current user's position
      const { data: allUsersData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'total_points'
      });

      const currentUserIndex = allUsersData?.findIndex(u => u.user_id === user?.id);
      
      let globalLeaderboard = globalData?.map((item, index) => ({
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username || 'Unknown',
          display_name: item.display_name || 'Unknown User',
          avatar_url: item.avatar_url || ''
        },
        rank: index + 1
      })) || [];

      setLeaderboard(globalLeaderboard);

      // Create seasonal leaderboard TOP 10
      const { data: seasonalData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: USERS_PER_PAGE,
        offset_count: 0,
        order_by_column: 'seasonal_points'
      });

      const { data: allSeasonalData } = await supabase.rpc('get_complete_leaderboard', {
        limit_count: 10000,
        offset_count: 0,
        order_by_column: 'seasonal_points'
      });

      const seasonalUserIndex = allSeasonalData?.findIndex(u => u.user_id === user?.id);
      
      let seasonalLeaderboard = seasonalData?.map((item, index) => ({
        user_id: item.user_id,
        total_points: item.total_points,
        weekly_points: item.weekly_points,
        seasonal_points: item.seasonal_points,
        profile: {
          username: item.username || 'Unknown',
          display_name: item.display_name || 'Unknown User',
          avatar_url: item.avatar_url || ''
        },
        rank: index + 1
      })) || [];

      setSeasonalLeaderboard(seasonalLeaderboard);

      // Set user's ranks
      if (currentUserIndex !== undefined && currentUserIndex >= 0) {
        setUserRank(currentUserIndex + 1);
      }
      if (seasonalUserIndex !== undefined && seasonalUserIndex >= 0) {
        setUserSeasonalRank(seasonalUserIndex + 1);
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
          const { data: friendsProfiles } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .in('user_id', friendIds);

          const { data: friendsScores } = await supabase
            .from('user_scores')
            .select('user_id, total_points, weekly_points, seasonal_points')
            .in('user_id', friendIds);

          const friendsData = friendsProfiles?.map(profile => {
            const scores = friendsScores?.find(s => s.user_id === profile.user_id);
            return {
              user_id: profile.user_id,
              total_points: scores?.total_points || 0,
              weekly_points: scores?.weekly_points || 0,
              seasonal_points: scores?.seasonal_points || 0,
              profile: profile
            };
          }) || [];

          const sortedFriendsData = friendsData.sort((a, b) => b.total_points - a.total_points);
          const top10Friends = sortedFriendsData.slice(0, USERS_PER_PAGE);

          let friendsLeaderboard = top10Friends.map((item, index) => ({
            ...item,
            rank: index + 1
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

  const seasonDates = getCurrentSeasonDates();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Nouveau composant Podium ultra premium
  const NewPodiumDisplay = memo(({ top3, showSeasonal = false }: { top3: LeaderboardUser[], showSeasonal?: boolean }) => {
    if (top3.length === 0) return null;
    
    const [first, second, third] = top3;
    
    return (
      <div className="flex items-end justify-center gap-4 mb-8 px-4">
        {/* 2ème place - Gauche */}
        {second && (
          <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Avatar 
              className="h-16 w-16 mb-2 ring-4 ring-[hsl(var(--silver))] cursor-pointer hover:scale-105 transition-transform"
              onClick={() => navigateToProfile(second.user_id)}
            >
              <AvatarImage src={second.profile?.avatar_url} loading="lazy" />
              <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-gray-200 to-gray-400">
                {second.profile?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-xs mb-1 truncate max-w-[70px]">
              {second.profile?.username}
            </p>
            <p className="font-bold text-base mb-2" style={{ color: 'hsl(var(--royal-blue))' }}>
              {showSeasonal ? second.seasonal_points : second.total_points}
            </p>
            <div 
              className="w-20 rounded-t-2xl flex flex-col items-center justify-start pt-2 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ 
                height: '90px',
                background: 'linear-gradient(to bottom, hsl(var(--silver)), hsl(0 0% 65%))'
              }}
              onClick={() => navigateToProfile(second.user_id)}
            >
              <Trophy className="h-6 w-6 text-white mb-1" />
              <span className="text-2xl font-bold text-white">2</span>
            </div>
          </div>
        )}
        
        {/* 1ère place - Centre (plus haut) */}
        {first && (
          <div className="flex flex-col items-center animate-fade-in -mt-6" style={{ animationDelay: '0.1s' }}>
            <Crown 
              className="h-7 w-7 mb-2" 
              style={{ 
                color: 'hsl(var(--gold))',
                animation: 'bounce-subtle 2s ease-in-out infinite'
              }} 
            />
            <Avatar 
              className="h-20 w-20 mb-2 cursor-pointer hover:scale-105 transition-transform"
              style={{ 
                border: '4px solid hsl(51 100% 50%)',
                boxShadow: '0 0 30px hsl(51 100% 50% / 0.5)'
              }}
              onClick={() => navigateToProfile(first.user_id)}
            >
              <AvatarImage src={first.profile?.avatar_url} loading="lazy" />
              <AvatarFallback className="text-base font-bold bg-gradient-to-br from-yellow-300 to-yellow-600">
                {first.profile?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-bold text-sm mb-1 truncate max-w-[80px]">
              {first.profile?.username}
            </p>
            <p className="font-bold text-xl mb-2" style={{ color: 'hsl(var(--royal-blue))' }}>
              {showSeasonal ? first.seasonal_points : first.total_points}
            </p>
            <div 
              className="w-24 rounded-t-2xl flex flex-col items-center justify-start pt-3 shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
              style={{ 
                height: '110px',
                background: 'linear-gradient(to bottom, hsl(var(--gold)), hsl(51 100% 40%))',
                animation: 'glow-pulse 3s ease-in-out infinite'
              }}
              onClick={() => navigateToProfile(first.user_id)}
            >
              <Crown className="h-7 w-7 text-white mb-1" />
              <span className="text-3xl font-bold text-white">1</span>
            </div>
          </div>
        )}
        
        {/* 3ème place - Droite */}
        {third && (
          <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Avatar 
              className="h-16 w-16 mb-2 cursor-pointer hover:scale-105 transition-transform"
              style={{ border: '4px solid hsl(30 67% 45%)' }}
              onClick={() => navigateToProfile(third.user_id)}
            >
              <AvatarImage src={third.profile?.avatar_url} loading="lazy" />
              <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-amber-600 to-amber-800">
                {third.profile?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold text-xs mb-1 truncate max-w-[70px]">
              {third.profile?.username}
            </p>
            <p className="font-bold text-base mb-2" style={{ color: 'hsl(var(--royal-blue))' }}>
              {showSeasonal ? third.seasonal_points : third.total_points}
            </p>
            <div 
              className="w-20 rounded-t-2xl flex flex-col items-center justify-start pt-2 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ 
                height: '80px',
                background: 'linear-gradient(to bottom, hsl(var(--bronze)), hsl(30 67% 35%))'
              }}
              onClick={() => navigateToProfile(third.user_id)}
            >
              <Trophy className="h-6 w-6 text-white mb-1" />
              <span className="text-2xl font-bold text-white">3</span>
            </div>
          </div>
        )}
      </div>
    );
  });

  NewPodiumDisplay.displayName = 'NewPodiumDisplay';

  // Liste simplifiée des rangs 4-10
  const SimpleLeaderboardRow = memo(({ item, showSeasonal = false }: { item: LeaderboardUser, showSeasonal?: boolean }) => {
    return (
      <div className="flex items-center justify-between py-3 px-4 border-b border-border/30 hover:bg-muted/10 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg w-8" style={{ color: 'hsl(var(--royal-blue))' }}>
            #{item.rank}
          </span>
          <Avatar 
            className="h-10 w-10 cursor-pointer hover:scale-105 transition-transform" 
            onClick={() => navigateToProfile(item.user_id)}
          >
            <AvatarImage src={item.profile?.avatar_url} loading="lazy" />
            <AvatarFallback className="text-sm font-semibold">
              {item.profile?.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <p className="font-medium truncate max-w-[150px]">{item.profile?.username}</p>
        </div>
        
        <p className="font-semibold text-muted-foreground">
          {showSeasonal ? item.seasonal_points : item.total_points} pts
        </p>
      </div>
    );
  });

  SimpleLeaderboardRow.displayName = 'SimpleLeaderboardRow';

  // Liste complète avec podium + rangs 4-10
  const LeaderboardList = ({ items, showSeasonal = false }: { items: LeaderboardUser[], showSeasonal?: boolean }) => {
    const top3 = items.slice(0, 3);
    const rest = items.slice(3, 10);

    return (
      <div className="space-y-4">
        <NewPodiumDisplay top3={top3} showSeasonal={showSeasonal} />
        
        {rest.length > 0 && (
          <div className="space-y-1">
            {rest.map((item) => (
              <SimpleLeaderboardRow key={item.user_id} item={item} showSeasonal={showSeasonal} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 pb-24 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 animate-pulse" style={{ color: 'hsl(var(--royal-blue))' }} />
          <p className="text-muted-foreground">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="max-w-2xl mx-auto p-6">
        {/* Header avec badges */}
        <div className="flex items-center justify-between mb-6">
          <Badge 
            className="rounded-lg px-4 py-2 font-semibold text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--royal-blue)), hsl(var(--cyan-bright)))'
            }}
          >
            Rang n°{activeTab === 'seasonal' ? userSeasonalRank || '?' : userRank || '?'}
          </Badge>
          <Badge 
            className="rounded-lg px-4 py-2 font-semibold text-white shadow-lg"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--orange-bright)), hsl(51 100% 50%))'
            }}
          >
            🎁 Code promo à gagner
          </Badge>
        </div>

        {/* Mon total points */}
        <div className="absolute top-6 right-6">
          <div 
            className="rounded-full px-4 py-2 shadow-lg text-white"
            style={{ 
              background: 'linear-gradient(135deg, hsl(var(--royal-blue)), hsl(var(--cyan-bright)))'
            }}
          >
            <p className="text-xs font-medium">Mon total</p>
            <p className="text-xl font-bold">{userPoints} pts</p>
          </div>
        </div>

        {/* Titre et dates */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8" style={{ color: 'hsl(var(--gold))' }} />
            Classement Saison {seasonDates.number}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDate(seasonDates.start)} – {formatDate(seasonDates.end)}
          </p>
        </div>

        {/* Onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/20 rounded-xl p-1 mb-6">
            <TabsTrigger 
              value="seasonal"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold transition-all"
              style={{ 
                '--tw-ring-color': 'hsl(var(--royal-blue))'
              } as React.CSSProperties}
            >
              Saison
            </TabsTrigger>
            <TabsTrigger 
              value="global"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold transition-all"
            >
              Global
            </TabsTrigger>
            <TabsTrigger 
              value="friends"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-semibold transition-all"
            >
              Amis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seasonal" className="mt-0">
            {seasonalLeaderboard.length > 0 ? (
              <LeaderboardList items={seasonalLeaderboard} showSeasonal={true} />
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun classement disponible</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="global" className="mt-0">
            {leaderboard.length > 0 ? (
              <LeaderboardList items={leaderboard} showSeasonal={false} />
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun classement disponible</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-0">
            {friendsLeaderboard.length > 0 ? (
              <LeaderboardList items={friendsLeaderboard} showSeasonal={false} />
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Ajoutez des amis pour voir leur classement</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {showProfilePreview && selectedUserId && (
        <ProfilePreviewDialog
          userId={selectedUserId}
          onClose={closeProfilePreview}
        />
      )}
      
      <WardrobeDialog 
        open={showWardrobe}
        onOpenChange={setShowWardrobe}
      />
    </div>
  );
};

export default Leaderboard;
