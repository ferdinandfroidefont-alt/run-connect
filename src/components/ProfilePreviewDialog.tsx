import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { SettingsDialog } from "./SettingsDialog";
import { ReportUserDialog } from "./ReportUserDialog";
import { useToast } from "@/hooks/use-toast";
import { User, UserPlus, UserMinus, Crown, Heart, MapPin, Calendar, Loader2, Flag, MoreVertical } from "lucide-react";
import { ProfileRankCard } from "@/components/profile/ProfileRankCard";
import { EarnedBadgesSection } from "@/components/profile/EarnedBadgesSection";
import { UserActivityChart } from "@/components/UserActivityChart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReliabilityBadge } from "./ReliabilityBadge";
import { ReliabilityDetailsDialog } from "./ReliabilityDetailsDialog";

interface Profile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  created_at: string;
  last_seen?: string;
  is_online?: boolean;
  walking_records: any;
  running_records: any;
  cycling_records: any;
  swimming_records: any;
  triathlon_records: any;
  strava_connected?: boolean;
  strava_verified_at?: string;
  strava_user_id?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
}

interface ProfilePreviewDialogProps {
  userId: string | null;
  onClose: () => void;
}

export const ProfilePreviewDialog = ({ userId, onClose }: ProfilePreviewDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [areFriends, setAreFriends] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [reliabilityRate, setReliabilityRate] = useState(0);
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [showReliabilityDetails, setShowReliabilityDetails] = useState(false);

  // If user is viewing their own profile, show a simplified version or redirect
  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFollowCounts();
      fetchReliabilityRate();
      if (!isOwnProfile) {
        checkFollowStatus();
        checkFriendStatus();
        checkBlockedStatus();
      }
      // Fetch connection history only for creator after profile is loaded
      if (user?.email === 'ferdinand.froidefont@gmail.com' && !isOwnProfile) {
        setTimeout(() => fetchConnectionHistory(), 100);
      }
    }
  }, [userId, user, isOwnProfile]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      if (isOwnProfile) {
        // For own profile, can access all fields
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } else {
        // For other users, get public profile with all fields except private ones
        const { data, error } = await supabase
          .from('profiles')
          .select('*, last_seen, is_online')
          .eq('user_id', userId)
          .eq('is_private', false)
          .single();

        if (error) throw error;
        setProfile(data);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !userId) return;

    try {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (followData) {
        setIsFollowing(followData.status === 'accepted');
        setFollowRequestSent(followData.status === 'pending');
      } else {
        setIsFollowing(false);
        setFollowRequestSent(false);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const checkFriendStatus = async () => {
    if (!user || !userId || isOwnProfile) return;

    try {
      const { data: friendsData } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: userId
      });
      
      setAreFriends(friendsData || false);
    } catch (error) {
      console.error('Error checking friend status:', error);
      setAreFriends(false);
    }
  };

  const checkBlockedStatus = async () => {
    if (!user || !userId || isOwnProfile) return;

    try {
      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();
      
      setIsBlocked(!!blockedData);
    } catch (error) {
      console.error('Error checking blocked status:', error);
      setIsBlocked(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!user || !userId) return;

    try {
      setActionLoading(true);
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      setIsBlocked(false);
      toast({
        title: "Utilisateur débloqué",
        description: "Cette personne peut maintenant vous contacter à nouveau",
      });

    } catch (error: any) {
      console.error('Unblock user error:', error);
      toast({
        title: "Erreur", 
        description: "Impossible de débloquer cet utilisateur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchFollowCounts = async () => {
    if (!userId) return;

    try {
      // Count followers
      const { data: followerData } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId)
        .eq('status', 'accepted');

      // Count following
      const { data: followingData } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      setFollowerCount(followerData?.length || 0);
      setFollowingCount(followingData?.length || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const fetchReliabilityRate = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('reliability_rate, total_sessions_completed, total_sessions_joined')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setReliabilityRate(data.reliability_rate || 100);
        setTotalSessionsJoined(data.total_sessions_joined || 0);
        setTotalSessionsCompleted(data.total_sessions_completed || 0);
      }

      // Compter les sessions créées
      const { count: createdCount } = await supabase
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', userId);
      
      setTotalSessionsCreated(createdCount || 0);
    } catch (error) {
      console.error('Error fetching reliability rate:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !userId) return;

    try {
      setActionLoading(true);
      
      // Insert directly into blocked_users table
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId
        });

      if (blockError) throw blockError;

      // Remove follow relationships
      await supabase
        .from('user_follows')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${user.id})`);

      toast({
        title: "Utilisateur bloqué",
        description: "Cette personne ne peut plus vous contacter ni voir vos séances",
      });

      // Reset all states and close dialog
      setIsFollowing(false);
      setFollowRequestSent(false);
      setAreFriends(false);
      onClose();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de bloquer cet utilisateur",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !userId) return;

    setActionLoading(true);
    try {
      if (isFollowing || followRequestSent) {
        // Unfollow ou annuler la demande
        if (isFollowing) {
          // Marquer comme "unfollowed" au lieu de supprimer
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'unfollowed' })
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(false);
          setFollowRequestSent(false);
          // Seulement décrémenter si c'était une relation 'accepted'
          setFollowerCount(prev => Math.max(0, prev - 1));
          setAreFriends(false);
          toast({ title: "Vous ne suivez plus cette personne" });
        } else {
          // Annuler une demande pending
          const { error } = await supabase
            .from('user_follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(false);
          setFollowRequestSent(false);
          toast({ title: "Demande de suivi annulée" });
        }
      } else {
        // Vérifier s'il y a une relation précédente "unfollowed"
        const { data: existingFollow } = await supabase
          .from('user_follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();

        if (existingFollow && existingFollow.status === 'unfollowed') {
          // Réactiver une relation précédemment acceptée
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'accepted' })
            .eq('follower_id', user.id)
            .eq('following_id', userId);

          if (error) throw error;

          setIsFollowing(true);
          setFollowRequestSent(false);
          toast({ title: "Réabonnement réussi" });
        } else {
          // Nouvelle demande de suivi
          const { error } = await supabase
            .from('user_follows')
            .insert([{
              follower_id: user.id,
              following_id: userId,
              status: 'pending'
            }]);

          if (error) throw error;

          // Envoyer notification push
          const { data: followerProfile } = await supabase
            .from('profiles')
            .select('display_name, username, avatar_url')
            .eq('user_id', user.id)
            .single();

          if (followerProfile) {
            await sendPushNotification(
              userId,
              'Nouvelle demande de suivi',
              `${followerProfile.display_name || followerProfile.username} souhaite vous suivre`,
              'follow_request',
              {
                follower_id: user.id,
                follower_name: followerProfile.display_name || followerProfile.username,
                follower_avatar: followerProfile.avatar_url
              }
            );
          }

          setFollowRequestSent(true);
          toast({ title: "Demande de suivi envoyée" });
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchConnectionHistory = async () => {
    if (!userId || !user || user.email !== 'ferdinand.froidefont@gmail.com') return;

    try {
      // Pour l'instant, utiliser last_seen et is_online du profil
      // Les vrais logs de connexion nécessiteraient une implémentation supplémentaire
      const connectionData = [];
      if (profile?.last_seen) {
        connectionData.push({
          action: profile.is_online ? 'EN LIGNE' : 'DERNIÈRE CONNEXION',
          timestamp: profile.last_seen
        });
      }
      setConnectionHistory(connectionData);
    } catch (error) {
      console.error('Error fetching connection history:', error);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil utilisateur
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Header Full-Width avec fond bleu dégradé */}
            <div className="relative -mx-6 mb-6">
              <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 px-6 pt-12 pb-6">
                {/* Menu à trois points */}
                {!isOwnProfile && (
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors">
                          <MoreVertical className="h-4 w-4 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                        {isBlocked ? (
                          <DropdownMenuItem 
                            onClick={handleUnblockUser}
                            className="text-green-600 hover:bg-green-50 cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Débloquer cet utilisateur
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={handleBlockUser}
                            className="text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Bloquer cet utilisateur
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => setShowReportDialog(true)}
                          className="text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Signaler cet utilisateur
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {/* Avatar centré avec glow */}
                <div className="relative mb-4 flex justify-center">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl scale-110" />
                  <Avatar className="h-36 w-36 relative border-4 border-white/20 shadow-2xl">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="text-4xl bg-white/10 text-white">
                      {(profile.username || profile.display_name)?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isOwnProfile && areFriends && (
                    <div className="absolute -bottom-2">
                      <OnlineStatus userId={profile.user_id} />
                    </div>
                  )}
                </div>

                {/* Pseudo + Couronne */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-white">@{profile.username || profile.display_name}</h2>
                  {profile.is_premium && (
                    <span className="text-2xl">👑</span>
                  )}
                </div>

                {/* Badges services */}
                <div className="flex gap-2 mb-3 justify-center flex-wrap">
                  {profile.is_admin && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                  {profile.strava_connected && profile.strava_verified_at && (
                    <button
                      onClick={() => window.open(`https://www.strava.com/athletes/${profile.strava_user_id}`, '_blank')}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs rounded-full flex items-center gap-1"
                    >
                      🏃 Strava
                    </button>
                  )}
                  {profile.instagram_connected && profile.instagram_verified_at && (
                    <button
                      onClick={() => window.open(`https://www.instagram.com/${profile.instagram_username}`, '_blank')}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs rounded-full flex items-center gap-1"
                    >
                      📷 Instagram
                    </button>
                  )}
                  {isOwnProfile && !profile.strava_connected && !profile.instagram_connected && (
                    <button
                      onClick={() => setShowSettingsDialog(true)}
                      className="px-3 py-1 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white text-xs rounded-full flex items-center gap-1"
                    >
                      ⚠️ Non vérifié
                    </button>
                  )}
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-center text-white/90 text-sm max-w-md mx-auto mb-4 line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* Badge fiabilité */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={() => setShowReliabilityDetails(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full transition-colors text-white text-sm font-medium"
                  >
                    <span className="text-lg">✓</span>
                    <span>{Math.round(reliabilityRate)}% • Fiable</span>
                  </button>
                </div>

                {/* Boutons d'action */}
                {!isOwnProfile && user && (
                  <div className="w-full max-w-md mx-auto">
                    <Button
                      onClick={handleFollowToggle}
                      disabled={actionLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Se désabonner
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          S'abonner
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mini Stats - 3 blocs */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="text-2xl mb-1">👥</div>
                <div className="text-xl font-bold">{followerCount}</div>
                <div className="text-xs text-muted-foreground">Abonnés</div>
              </div>
              <div className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl">
                <div className="text-2xl mb-1">➕</div>
                <div className="text-xl font-bold">{followingCount}</div>
                <div className="text-xs text-muted-foreground">Abonnements</div>
              </div>
              <button
                onClick={() => setShowReliabilityDetails(true)}
                className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className="text-2xl mb-1">✓</div>
                <div className="text-xl font-bold">{Math.round(reliabilityRate)}%</div>
                <div className="text-xs text-muted-foreground">Fiable</div>
              </button>
            </div>

            {/* Classement */}
            <ProfileRankCard userId={userId} />

            {/* Badges gagnés */}
            <EarnedBadgesSection userId={userId} />

            {/* Activité récente */}
            <UserActivityChart userId={userId} username={profile.username} />

            {/* Age - Only show for own profile */}
            {profile.age && isOwnProfile && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium">Âge</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.age} ans</p>
                </CardContent>
              </Card>
            )}

            {/* Sports Records - Show to everyone (public records) */}
            {(
              <>
                {/* Walking Records */}
                {profile.walking_records && Object.keys(profile.walking_records).length > 0 && Object.values(profile.walking_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🚶‍♂️ Records Marche</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.walking_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Running Records */}
                {profile.running_records && Object.keys(profile.running_records).length > 0 && Object.values(profile.running_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🏃‍♂️ Records Course à pied</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.running_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cycling Records */}
                {profile.cycling_records && Object.keys(profile.cycling_records).length > 0 && Object.values(profile.cycling_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🚴‍♂️ Records Cyclisme</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.cycling_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Swimming Records */}
                {profile.swimming_records && Object.keys(profile.swimming_records).length > 0 && Object.values(profile.swimming_records).some(v => v) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">🏊‍♂️ Records Natation</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(profile.swimming_records).map(([distance, time]) => 
                          time && (
                            <div key={distance} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{distance}</span>
                              <span className="font-mono">{String(time)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Last Connection - Only for creator */}
            {user?.email === 'ferdinand.froidefont@gmail.com' && !isOwnProfile && profile.last_seen && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">Dernière connexion</span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground">
                    {format(new Date(profile.last_seen), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Connection History - Only for creator */}
            {user?.email === 'ferdinand.froidefont@gmail.com' && !isOwnProfile && connectionHistory.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">Historique des connexions</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {connectionHistory.map((log, index) => (
                      <div key={index} className="flex justify-between text-xs border-b pb-1">
                        <span className="text-muted-foreground">{log.action}</span>
                        <span className="font-mono">
                          {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Member since */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">Membre depuis</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8">
            <p className="text-muted-foreground">Profil non trouvé</p>
          </div>
        )}
      </DialogContent>

      {/* Settings Dialog */}
      {isOwnProfile && (
        <SettingsDialog 
          open={showSettingsDialog} 
          onOpenChange={(open) => setShowSettingsDialog(open)} 
        />
      )}

      {/* Report User Dialog */}
      {!isOwnProfile && profile && (
        <ReportUserDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          reportedUserId={profile.user_id}
          reportedUsername={profile.username}
        />
      )}

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog
        open={showReliabilityDetails}
        onOpenChange={setShowReliabilityDetails}
        userName={profile?.username || profile?.display_name || ''}
        reliabilityRate={reliabilityRate}
        totalSessionsCreated={totalSessionsCreated}
        totalSessionsJoined={totalSessionsJoined}
        totalSessionsCompleted={totalSessionsCompleted}
      />
    </Dialog>
  );
};