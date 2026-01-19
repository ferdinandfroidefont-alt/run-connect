import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { SettingsDialog } from "./SettingsDialog";
import { ReportUserDialog } from "./ReportUserDialog";
import { useToast } from "@/hooks/use-toast";
import { User, UserPlus, UserMinus, Crown, Calendar, Loader2, Flag, MoreVertical, ArrowLeft, ChevronRight } from "lucide-react";
import { ProfileRankCard } from "@/components/profile/ProfileRankCard";
import { EarnedBadgesSection } from "@/components/profile/EarnedBadgesSection";
import { UserActivityChart } from "@/components/UserActivityChart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReliabilityDetailsDialog } from "./ReliabilityDetailsDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [reliabilityRate, setReliabilityRate] = useState(0);
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [showReliabilityDetails, setShowReliabilityDetails] = useState(false);

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
    }
  }, [userId, user, isOwnProfile]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      if (isOwnProfile) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } else {
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
      const { data: followerData } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact' })
        .eq('following_id', userId)
        .eq('status', 'accepted');

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
      
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: userId
        });

      if (blockError) throw blockError;

      await supabase
        .from('user_follows')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${user.id})`);

      toast({
        title: "Utilisateur bloqué",
        description: "Cette personne ne peut plus vous contacter ni voir vos séances",
      });

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
        // Unfollow or cancel pending request - use DELETE instead of UPDATE
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;

        if (isFollowing) {
          setFollowerCount(prev => Math.max(0, prev - 1));
          setAreFriends(false);
          toast({ title: "Vous ne suivez plus cette personne" });
        } else {
          toast({ title: "Demande de suivi annulée" });
        }
        
        setIsFollowing(false);
        setFollowRequestSent(false);
      } else {
        // Send new follow request
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
            status: 'pending'
          });

        if (error) {
          // Check if it's a unique constraint violation (already exists)
          if (error.code === '23505') {
            toast({
              title: "Demande déjà envoyée",
              description: "Vous avez déjà envoyé une demande de suivi",
            });
            return;
          }
          throw error;
        }

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

  if (!userId) {
    return null;
  }

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="w-full h-full max-w-full max-h-full rounded-none border-0 p-0 bg-secondary sm:max-w-md sm:max-h-[85vh] sm:rounded-lg sm:border flex flex-col">
        {/* iOS Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-background border-b border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Profil</h2>
          {!isOwnProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center">
                  <MoreVertical className="h-5 w-5 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border shadow-lg z-50">
                {isBlocked ? (
                  <DropdownMenuItem 
                    onClick={handleUnblockUser}
                    className="text-emerald-600 hover:bg-emerald-50 cursor-pointer"
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
          ) : (
            <div className="w-8" />
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Avatar Section */}
              <div className="bg-card rounded-[10px] border border-border p-6">
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <Avatar className="h-24 w-24 ring-2 ring-border">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-2xl bg-secondary text-foreground">
                        {(profile.username || profile.display_name)?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!isOwnProfile && areFriends && (
                      <OnlineStatus userId={profile.user_id} />
                    )}
                  </div>

                  {/* Username + Crown */}
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-foreground">@{profile.username || profile.display_name}</h2>
                    {profile.is_premium && (
                      <Crown className="h-5 w-5 text-amber-500" />
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 mb-3 flex-wrap justify-center">
                    {profile.is_admin && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-full font-medium">
                        Admin
                      </span>
                    )}
                    {profile.strava_connected && profile.strava_verified_at && (
                      <button
                        onClick={() => window.open(`https://www.strava.com/athletes/${profile.strava_user_id}`, '_blank')}
                        className="px-3 py-1 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs rounded-full font-medium"
                      >
                        Strava
                      </button>
                    )}
                    {profile.instagram_connected && profile.instagram_verified_at && (
                      <button
                        onClick={() => window.open(`https://www.instagram.com/${profile.instagram_username}`, '_blank')}
                        className="px-3 py-1 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 text-xs rounded-full font-medium"
                      >
                        Instagram
                      </button>
                    )}
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-center text-muted-foreground text-sm max-w-xs mb-4 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Follow Button */}
                  {!isOwnProfile && user && (
                    <Button
                      onClick={handleFollowToggle}
                      disabled={actionLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className="w-full max-w-xs h-11 rounded-[10px]"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Se désabonner
                        </>
                      ) : followRequestSent ? (
                        "Demande envoyée"
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          S'abonner
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="bg-card rounded-[10px] border border-border p-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{followerCount}</div>
                    <div className="text-xs text-muted-foreground">Abonnés</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="text-center">
                    <div className="text-xl font-bold text-foreground">{followingCount}</div>
                    <div className="text-xs text-muted-foreground">Abonnements</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <button
                    onClick={() => setShowReliabilityDetails(true)}
                    className="text-center"
                  >
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(reliabilityRate)}%</div>
                    <div className="text-xs text-muted-foreground">Fiable</div>
                  </button>
                </div>
              </div>

              {/* Classement */}
              <ProfileRankCard userId={userId} />

              {/* Badges gagnés */}
              <EarnedBadgesSection userId={userId} />

              {/* Activité récente */}
              <UserActivityChart userId={userId} username={profile.username} />

              {/* Age - Only show for own profile */}
              {profile.age && isOwnProfile && (
                <div className="bg-card rounded-[10px] border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[6px] bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Âge</p>
                        <p className="text-xs text-muted-foreground">{profile.age} ans</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sports Records */}
              {profile.walking_records && Object.keys(profile.walking_records).length > 0 && Object.values(profile.walking_records).some(v => v) && (
                <div className="bg-card rounded-[10px] border border-border p-4">
                  <p className="font-medium text-foreground mb-3">🚶‍♂️ Records Marche</p>
                  <div className="space-y-2">
                    {Object.entries(profile.walking_records).map(([distance, time]) => 
                      time && (
                        <div key={distance} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{distance}</span>
                          <span className="font-mono text-foreground">{String(time)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {profile.running_records && Object.keys(profile.running_records).length > 0 && Object.values(profile.running_records).some(v => v) && (
                <div className="bg-card rounded-[10px] border border-border p-4">
                  <p className="font-medium text-foreground mb-3">🏃‍♂️ Records Course à pied</p>
                  <div className="space-y-2">
                    {Object.entries(profile.running_records).map(([distance, time]) => 
                      time && (
                        <div key={distance} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{distance}</span>
                          <span className="font-mono text-foreground">{String(time)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {profile.cycling_records && Object.keys(profile.cycling_records).length > 0 && Object.values(profile.cycling_records).some(v => v) && (
                <div className="bg-card rounded-[10px] border border-border p-4">
                  <p className="font-medium text-foreground mb-3">🚴‍♂️ Records Cyclisme</p>
                  <div className="space-y-2">
                    {Object.entries(profile.cycling_records).map(([distance, time]) => 
                      time && (
                        <div key={distance} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{distance}</span>
                          <span className="font-mono text-foreground">{String(time)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {profile.swimming_records && Object.keys(profile.swimming_records).length > 0 && Object.values(profile.swimming_records).some(v => v) && (
                <div className="bg-card rounded-[10px] border border-border p-4">
                  <p className="font-medium text-foreground mb-3">🏊‍♂️ Records Natation</p>
                  <div className="space-y-2">
                    {Object.entries(profile.swimming_records).map(([distance, time]) => 
                      time && (
                        <div key={distance} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{distance}</span>
                          <span className="font-mono text-foreground">{String(time)}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Member since */}
              <div className="bg-card rounded-[10px] border border-border overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Membre depuis</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center p-8 flex-1 flex items-center justify-center">
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
