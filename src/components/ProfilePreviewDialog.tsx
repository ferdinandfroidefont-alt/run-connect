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
import { User, UserPlus, UserMinus, Crown, Calendar, Loader2, Flag, MoreVertical, ArrowLeft, ChevronRight, Users } from "lucide-react";
import { ProfileRankCard } from "@/components/profile/ProfileRankCard";
import { EarnedBadgesSection } from "@/components/profile/EarnedBadgesSection";
import { OrganizerRatingBadge } from "@/components/OrganizerRatingBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { UserActivityChart } from "@/components/UserActivityChart";
import { PersonalRecords } from "@/components/PersonalRecords";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
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
  cover_image_url?: string | null;
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
  const [commonClubs, setCommonClubs] = useState<any[]>([]);

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
        fetchCommonClubs();
      }
    }
  }, [userId, user, isOwnProfile]);

  const fetchCommonClubs = async () => {
    if (!user || !userId || isOwnProfile) return;
    try {
      const { data, error } = await supabase.rpc('get_common_clubs', {
        user_1_id: user.id,
        user_2_id: userId
      });
      if (error) throw error;
      setCommonClubs(data || []);
    } catch (error) {
      console.error('Error fetching common clubs:', error);
    }
  };

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
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-secondary transition-colors flex items-center justify-center">
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
                  <DropdownMenuItem onClick={handleUnblockUser} className="text-emerald-600 hover:bg-emerald-50 cursor-pointer">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Débloquer cet utilisateur
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleBlockUser} className="text-destructive hover:bg-destructive/10 cursor-pointer">
                    <UserMinus className="h-4 w-4 mr-2" />
                    Bloquer cet utilisateur
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive hover:bg-destructive/10 cursor-pointer">
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
            <div className="space-y-4">
              {/* Cover Image + Avatar */}
              <div className="relative">
                <div className="h-36 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
                  {profile.cover_image_url ? (
                    <img src={profile.cover_image_url} alt="Couverture" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
                <div className="relative flex justify-center" style={{ marginTop: '-40px' }}>
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-card shadow-xl">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/40">
                        {(profile.username || profile.display_name)?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {profile.is_premium && (
                      <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                    {!isOwnProfile && areFriends && (
                      <OnlineStatus userId={profile.user_id} />
                    )}
                  </div>
                </div>
              </div>

              {/* Name, username, bio */}
              <div className="flex flex-col items-center pb-2 px-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <h2 className="text-[22px] font-bold text-foreground">
                    {profile.display_name || profile.username}
                  </h2>
                  {profile.is_premium && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-[14px] text-muted-foreground mb-2">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-[14px] text-muted-foreground text-center max-w-[280px] mb-3 leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Stats Row */}
                <div className="flex items-center justify-center gap-6 py-3 w-full">
                  <div className="text-center min-w-[60px]">
                    <p className="text-[20px] font-bold text-foreground">{followerCount}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnés</p>
                  </div>
                  <div className="w-px h-8 bg-border/60" />
                  <div className="text-center min-w-[60px]">
                    <p className="text-[20px] font-bold text-foreground">{followingCount}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnements</p>
                  </div>
                  <div className="w-px h-8 bg-border/60" />
                  <button onClick={() => setShowReliabilityDetails(true)} className="text-center min-w-[60px] active:opacity-70 transition-opacity">
                    <p className="text-[20px] font-bold text-foreground">{Math.round(reliabilityRate)}%</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Réputé</p>
                  </button>
                </div>

                {/* Badges inline */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  <OrganizerRatingBadge userId={profile.user_id} />
                  <StreakBadge userId={profile.user_id} variant="compact" />
                </div>
              </div>

              {/* === NOT FOLLOWING: Show follow CTA === */}
              {!isOwnProfile && !isFollowing && (
                <div className="px-4 space-y-3">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={actionLoading}
                    className="w-full h-12 rounded-[10px] text-[17px] font-semibold"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : followRequestSent ? (
                      "Demande envoyée ✓"
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5 mr-2" />
                        Suivre cette personne
                      </>
                    )}
                  </Button>

                  {/* Member since - compact */}
                  <div className="text-center pt-2">
                    <p className="text-[13px] text-muted-foreground">
                      Membre depuis {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
              )}

              {/* === FOLLOWING: Show full profile like "Mon Profil" === */}
              {(isFollowing || isOwnProfile) && (
                <>
                  {/* Streak Badge */}
                  <StreakBadge userId={profile.user_id} variant="full" />

                  {/* Classement & Badges */}
                  <ProfileRankCard userId={userId} />
                  <EarnedBadgesSection userId={userId} />

                  {/* Records personnels */}
                  <PersonalRecords records={{
                    running_records: profile.running_records,
                    cycling_records: profile.cycling_records,
                    swimming_records: profile.swimming_records,
                    triathlon_records: profile.triathlon_records,
                    walking_records: profile.walking_records,
                  }} />

                  {/* Clubs en commun */}
                  {!isOwnProfile && commonClubs.length > 0 && (
                    <div>
                      <p className="ios-section-header">Clubs en commun</p>
                      <div className="bg-card overflow-hidden">
                        {commonClubs.map((club: any, index: number) => (
                          <div key={club.id}>
                            <div className="flex items-center px-4 py-[11px]">
                              <div className="h-[30px] w-[30px] rounded-[7px] bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-[15px] font-medium text-foreground">{club.group_name}</span>
                            </div>
                            {index < commonClubs.length - 1 && <div className="h-px bg-border ml-[54px]" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activité récente */}
                  <ActivityTimeline userId={userId!} />

                  {/* Statistiques d'activité */}
                  <UserActivityChart userId={userId} username={profile.username} />

                  {/* Member since */}
                  <div className="bg-card overflow-hidden">
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

                  {/* Actions: Unfollow + Report */}
                  {!isOwnProfile && (
                    <div className="bg-card overflow-hidden">
                      <button
                        onClick={handleFollowToggle}
                        disabled={actionLoading}
                        className="w-full flex items-center px-4 py-[11px] active:bg-muted/50 transition-colors"
                      >
                        <div className="h-[30px] w-[30px] rounded-[7px] bg-destructive/10 flex items-center justify-center mr-3">
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </div>
                        <span className="text-[15px] text-destructive font-medium">
                          {actionLoading ? 'Chargement...' : 'Ne plus suivre'}
                        </span>
                      </button>
                      <div className="h-px bg-border ml-[54px]" />
                      <button
                        onClick={() => setShowReportDialog(true)}
                        className="w-full flex items-center px-4 py-[11px] active:bg-muted/50 transition-colors"
                      >
                        <div className="h-[30px] w-[30px] rounded-[7px] bg-destructive/10 flex items-center justify-center mr-3">
                          <Flag className="h-4 w-4 text-destructive" />
                        </div>
                        <span className="text-[15px] text-destructive font-medium">Signaler</span>
                      </button>
                    </div>
                  )}
                </>
              )}
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
