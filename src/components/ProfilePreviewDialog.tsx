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
import { User, UserPlus, UserMinus, Crown, Calendar, Loader2, Flag, MoreVertical, ArrowLeft, ChevronRight, Users, MapPin, Activity, Shield, MessageCircle } from "lucide-react";
import { OrganizerRatingBadge } from "@/components/OrganizerRatingBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { PersonalRecords } from "@/components/PersonalRecords";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { ProfileStatsGroup } from "@/components/profile/ProfileStatsGroup";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ReliabilityDetailsDialog } from "./ReliabilityDetailsDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

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
        .insert({ blocker_id: user.id, blocked_id: userId });
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
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
            status: 'pending'
          });

        if (error) {
          if (error.code === '23505') {
            toast({ title: "Demande déjà envoyée", description: "Vous avez déjà envoyé une demande de suivi" });
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  if (!userId) return null;

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })
    : "";

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="w-full h-full max-w-full max-h-full rounded-none border-0 p-0 bg-background sm:max-w-md sm:max-h-[85vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden">

        {/* Floating Header — translucent glass */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-[max(env(safe-area-inset-top),12px)] pb-2">
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-background/60 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-[18px] w-[18px] text-foreground" />
          </button>

          {!isOwnProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-background/60 backdrop-blur-xl flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                  <MoreVertical className="h-[18px] w-[18px] text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background border-border shadow-lg z-50 rounded-xl">
                {isBlocked ? (
                  <DropdownMenuItem onClick={handleUnblockUser} className="text-emerald-600 cursor-pointer">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Débloquer
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleBlockUser} className="text-destructive cursor-pointer">
                    <UserMinus className="h-4 w-4 mr-2" />
                    Bloquer
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive cursor-pointer">
                  <Flag className="h-4 w-4 mr-2" />
                  Signaler
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <ScrollArea className="flex-1">
            <div className="pb-8">
              {/* ===== Hero: Cover + Avatar + Identity ===== */}
              <div className="relative">
                {/* Cover — taller, with cinematic gradient overlay */}
                <div className="h-56 w-full overflow-hidden">
                  {profile.cover_image_url ? (
                    <img
                      src={profile.cover_image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary via-primary/70 to-accent" />
                  )}
                  {/* Cinematic bottom fade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                </div>

                {/* Avatar overlapping cover — larger, with ring */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-14">
                  <div className="relative">
                    <Avatar className="h-28 w-28 ring-[5px] ring-background shadow-2xl">
                      <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                      <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {(profile.display_name || profile.username)?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Premium checkmark */}
                    {profile.is_premium && (
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary border-[3px] border-background flex items-center justify-center shadow-md">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {/* Online indicator */}
                    {!isOwnProfile && areFriends && (
                      <OnlineStatus userId={profile.user_id} />
                    )}
                  </div>
                </div>
              </div>

              {/* Spacer for overlapping avatar */}
              <div className="h-16" />

              {/* Identity */}
              <div className="flex flex-col items-center px-6 pt-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[22px] font-bold text-foreground tracking-tight">
                    {profile.display_name || profile.username}
                  </h1>
                  {profile.is_premium && (
                    <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[14px] text-muted-foreground mt-0.5">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-[14px] text-foreground/80 text-center max-w-[300px] mt-3 leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                {/* Inline badges */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  <OrganizerRatingBadge userId={profile.user_id} />
                  <StreakBadge userId={profile.user_id} variant="compact" />
                </div>
              </div>

              {/* ===== Stats Row — Instagram style ===== */}
              <div className="flex items-stretch justify-center mt-5 mx-5 bg-card rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex-1 py-3.5 text-center active:bg-secondary/60 transition-colors">
                  <p className="text-[20px] font-bold text-foreground leading-none">{followerCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Abonnés</p>
                </div>
                <div className="w-px bg-border/50 my-2.5" />
                <div className="flex-1 py-3.5 text-center active:bg-secondary/60 transition-colors">
                  <p className="text-[20px] font-bold text-foreground leading-none">{followingCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Abonnements</p>
                </div>
                <div className="w-px bg-border/50 my-2.5" />
                <button
                  onClick={() => setShowReliabilityDetails(true)}
                  className="flex-1 py-3.5 text-center active:bg-secondary/60 transition-colors"
                >
                  <p className="text-[20px] font-bold text-foreground leading-none">{Math.round(reliabilityRate)}%</p>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">Fiabilité</p>
                </button>
              </div>

              {/* ===== Action Buttons ===== */}
              {!isOwnProfile && (
                <div className="flex gap-2.5 mx-5 mt-4">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={actionLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className={`flex-1 h-11 rounded-xl text-[15px] font-semibold transition-all ${
                      isFollowing
                        ? "border-border"
                        : followRequestSent
                          ? "bg-muted text-muted-foreground hover:bg-muted"
                          : ""
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
                      "Abonné ✓"
                    ) : followRequestSent ? (
                      "En attente"
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1.5" />
                        Suivre
                      </>
                    )}
                  </Button>
                  {isFollowing && (
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl px-4 border-border"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* ===== Following / Own Profile Content ===== */}
              {(isFollowing || isOwnProfile) ? (
                <div className="mt-5 space-y-3">
                  {/* Streak */}
                  <StreakBadge userId={profile.user_id} variant="full" />

                  {/* Stats Group + Records */}
                  <ProfileStatsGroup userId={profile.user_id}>
                    <div className="h-px bg-border ml-[54px]" />
                    <PersonalRecords records={{
                      running_records: profile.running_records,
                      cycling_records: profile.cycling_records,
                      swimming_records: profile.swimming_records,
                      triathlon_records: profile.triathlon_records,
                      walking_records: profile.walking_records,
                    }} />
                  </ProfileStatsGroup>

                  {/* Common Clubs */}
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

                  {/* Activity Timeline */}
                  <ActivityTimeline userId={profile.user_id} />

                  {/* Member Since */}
                  <div className="bg-card overflow-hidden">
                    <div className="flex items-center p-4 gap-3">
                      <div className="h-[30px] w-[30px] rounded-[7px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-foreground">Membre depuis</p>
                        <p className="text-[12px] text-muted-foreground">{memberSince}</p>
                      </div>
                    </div>
                  </div>

                  {/* Danger Actions */}
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
                </div>
              ) : !isOwnProfile ? (
                /* === Not following: minimal info + CTA === */
                <div className="mt-5 px-5 space-y-4">
                  <p className="text-center text-[13px] text-muted-foreground">
                    Membre depuis {memberSince}
                  </p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Profil non trouvé</p>
          </div>
        )}
      </DialogContent>

      {isOwnProfile && (
        <SettingsDialog 
          open={showSettingsDialog} 
          onOpenChange={(open) => setShowSettingsDialog(open)} 
        />
      )}

      {!isOwnProfile && profile && (
        <ReportUserDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          reportedUserId={profile.user_id}
          reportedUsername={profile.username}
        />
      )}

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
