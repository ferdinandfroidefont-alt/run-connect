import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReportUserDialog } from "./ReportUserDialog";
import { ReliabilityDetailsDialog } from "./ReliabilityDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { UserMinus, Loader2, Flag, ChevronLeft, Share2, ShieldBan, Info } from "lucide-react";
import { PersonalRecords } from "@/components/PersonalRecords";
import { ScrollArea } from "@/components/ui/scroll-area";

import { FollowDialog } from "./FollowDialog";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useShareProfile } from "@/hooks/useShareProfile";
import { QRShareDialog } from "./QRShareDialog";
import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import { AvatarViewer } from "@/components/AvatarViewer";
import { ProfileOtherMaquetteLayout } from "@/components/profile/ProfileOtherMaquetteLayout";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";

const ACTION_BLUE = "#007AFF";

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
  favorite_sport: string | null;
  country: string | null;
  is_private?: boolean;
}

interface ProfilePreviewDialogProps {
  userId: string | null;
  onClose: () => void;
}

type PeriodFilter = 'total' | '30d' | '7d';

export const ProfilePreviewDialog = ({ userId, onClose }: ProfilePreviewDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [areFriends, setAreFriends] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('total');
  const [stats, setStats] = useState({ sessionsCreated: 0, routesCreated: 0, sessionsJoined: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followDialogTab, setFollowDialogTab] = useState<'followers' | 'following'>('followers');
  const [showRecordsSheet, setShowRecordsSheet] = useState(false);
  const [reliabilityRate, setReliabilityRate] = useState<number | null>(null);
  const [reliabilityStats, setReliabilityStats] = useState({ created: 0, joined: 0, completed: 0, absent: 0 });
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  const { shareProfile, showProfileShare, setShowProfileShare, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const [storyHighlights, setStoryHighlights] = useState<Array<{ id: string; story_id: string; title: string }>>([]);
  const [highlightPreviewByStoryId, setHighlightPreviewByStoryId] = useState<Record<string, string>>({});
  const [showAvatarFullscreen, setShowAvatarFullscreen] = useState(false);
  const [selectedHighlightStoryId, setSelectedHighlightStoryId] = useState<string | null>(null);

  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFollowCounts();
      fetchReliability();
      fetchStoryHighlights();
      if (!isOwnProfile) {
        checkFollowStatus();
        checkFriendStatus();
        checkBlockedStatus();
        checkRestrictedStatus();
      }
    }
  }, [userId, user, isOwnProfile]);

  const fetchStoryHighlights = async () => {
    if (!userId) return;
    const { data } = await (supabase as any)
      .from("profile_story_highlights")
      .select("id, story_id, title, position")
      .eq("owner_id", userId)
      .order("position", { ascending: true });
    const rows = (data ?? []) as Array<{ id: string; story_id: string; title: string }>;
    setStoryHighlights(rows);
    const storyIds = rows.map((row) => row.story_id);
    if (storyIds.length === 0) {
      setHighlightPreviewByStoryId({});
      return;
    }
    const { data: mediaRows } = await (supabase as any)
      .from("story_media")
      .select("story_id, media_url, created_at")
      .in("story_id", storyIds)
      .order("created_at", { ascending: true });
    const nextPreviewByStoryId: Record<string, string> = {};
    for (const row of (mediaRows ?? []) as Array<{ story_id: string; media_url: string | null }>) {
      if (!row.media_url || nextPreviewByStoryId[row.story_id]) continue;
      nextPreviewByStoryId[row.story_id] = row.media_url;
    }
    setHighlightPreviewByStoryId(nextPreviewByStoryId);
  };

  useEffect(() => {
    if (userId && (isFollowing || isOwnProfile)) {
      fetchStats();
    }
  }, [userId, period, isFollowing, isOwnProfile]);

  const fetchProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger le profil", variant: "destructive" });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const fetchReliability = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('user_stats')
        .select('reliability_rate, total_sessions_completed, total_sessions_joined, total_sessions_absent')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setReliabilityRate(data.reliability_rate);
        setReliabilityStats({
          created: 0,
          joined: data.total_sessions_joined || 0,
          completed: data.total_sessions_completed || 0,
          absent: Number(data.total_sessions_absent) || 0,
        });
      }
    } catch {
      console.error('Error fetching reliability');
    }
  };

  const fetchStats = async () => {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const dateFilter = period === '30d'
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        : period === '7d'
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      let sessionsQuery = supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organizer_id', userId);
      let routesQuery = supabase.from('routes').select('id', { count: 'exact', head: true }).eq('created_by', userId);
      let joinedQuery = supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId);

      if (dateFilter) {
        sessionsQuery = sessionsQuery.gte('created_at', dateFilter);
        routesQuery = routesQuery.gte('created_at', dateFilter);
        joinedQuery = joinedQuery.gte('joined_at', dateFilter);
      }

      const [sessionsRes, routesRes, joinedRes] = await Promise.all([sessionsQuery, routesQuery, joinedQuery]);
      setStats({
        sessionsCreated: sessionsRes.count || 0,
        routesCreated: routesRes.count || 0,
        sessionsJoined: joinedRes.count || 0,
      });
    } catch {
      console.error('Error fetching stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from('user_follows')
      .select('status')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle();
    if (data) {
      setIsFollowing(data.status === 'accepted');
      setFollowRequestSent(data.status === 'pending');
    } else {
      setIsFollowing(false);
      setFollowRequestSent(false);
    }
  };

  const checkFriendStatus = async () => {
    if (!user || !userId || isOwnProfile) return;
    const { data } = await supabase.rpc('are_users_friends', { user1_id: user.id, user2_id: userId });
    setAreFriends(data || false);
  };

  const checkBlockedStatus = async () => {
    if (!user || !userId || isOwnProfile) return;
    const { data } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .maybeSingle();
    setIsBlocked(!!data);
  };

  const fetchFollowCounts = async () => {
    if (!userId) return;
    const [followerRes, followingRes] = await Promise.all([
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
    ]);
    setFollowerCount(followerRes.count || 0);
    setFollowingCount(followingRes.count || 0);
  };

  const handleFollowToggle = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    try {
      if (isFollowing || followRequestSent) {
        await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', userId);
        if (isFollowing) {
          setFollowerCount(prev => Math.max(0, prev - 1));
          setAreFriends(false);
          toast({ title: "Vous ne suivez plus cette personne" });
        } else {
          toast({ title: "Demande annulée" });
        }
        setIsFollowing(false);
        setFollowRequestSent(false);
      } else {
        const targetStatus = profile?.is_private ? 'pending' : 'accepted';
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: userId, status: targetStatus });
        if (error) {
          if (error.code === '23505') { toast({ title: "Demande déjà envoyée" }); return; }
          throw error;
        }
        if (targetStatus === 'pending') {
          setFollowRequestSent(true);
          setIsFollowing(false);
          toast({ title: "Demande de suivi envoyée" });
        } else {
          setIsFollowing(true);
          setFollowRequestSent(false);
          setFollowerCount(prev => prev + 1);
          toast({ title: "Vous suivez maintenant cette personne" });
        }
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    try {
      await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: userId });
      await supabase.from('user_follows').delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${userId}),and(follower_id.eq.${userId},following_id.eq.${user.id})`);
      setIsBlocked(true);
      toast({ title: "Utilisateur bloqué" });
      setIsFollowing(false);
      setFollowRequestSent(false);
      setAreFriends(false);
      onClose();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    try {
      await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', userId);
      setIsBlocked(false);
      toast({ title: "Utilisateur débloqué" });
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const checkRestrictedStatus = async () => {
    if (!user || !userId || isOwnProfile) return;
    const { data } = await supabase
      .from('restricted_users')
      .select('id')
      .eq('restricter_id', user.id)
      .eq('restricted_id', userId)
      .maybeSingle();
    setIsRestricted(!!data);
  };

  const handleRestrictToggle = async () => {
    if (!user || !userId) return;
    setActionLoading(true);
    try {
      if (isRestricted) {
        await supabase.from('restricted_users').delete().eq('restricter_id', user.id).eq('restricted_id', userId);
        setIsRestricted(false);
        toast({ title: "Restriction levée" });
      } else {
        await supabase.from('restricted_users').insert({ restricter_id: user.id, restricted_id: userId });
        setIsRestricted(true);
        toast({ title: "Utilisateur restreint", description: "Vos séances seront automatiquement masquées pour cette personne" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setShowActionSheet(false);
    }
  };

  const handleShareProfile = () => {
    if (!profile) return;
    setShowActionSheet(false);
    shareProfile({
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    });
  };

  const handleMessage = async () => {
    if (!user || !userId) return;
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${user.id})`)
        .eq('is_group', false)
        .maybeSingle();

      if (existing) {
        onClose();
        navigate(`/messages?conversation=${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({ participant_1: user.id, participant_2: userId })
          .select('id')
          .single();
        if (error) throw error;
        onClose();
        navigate(`/messages?conversation=${newConv.id}`);
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ouvrir la conversation", variant: "destructive" });
    }
  };

  if (!userId) return null;

  const canViewContent = isFollowing || isOwnProfile;
  const headerTitleText = profile?.display_name?.trim() || profile?.username?.trim() || "Profil";

  const getInitials = (fullName: string | null | undefined, username: string | null | undefined) => {
    const source = (fullName || username || "U").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  const seancesDisplay = String(stats.sessionsCreated + stats.sessionsJoined);

  return (
    <>
      <Dialog open={!!userId} onOpenChange={() => onClose()}>
        <DialogContent hideCloseButton className="flex h-full max-h-full w-full min-w-0 max-w-full flex-col overflow-hidden rounded-none border-0 bg-[#F2F2F7] p-0 sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:border sm:border-black/[0.06]">

          {/* Header — même barre que maquette Profil utilisateur */}
          <div className="min-w-0 shrink-0 border-b border-[#E5E5EA] bg-white pt-[max(env(safe-area-inset-top),12px)]">
            <div className="flex items-center gap-2 px-4 pb-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex flex-shrink-0 items-center gap-0 active:opacity-60"
              >
                <ChevronLeft className="h-6 w-6 shrink-0" color={ACTION_BLUE} strokeWidth={2.6} />
                <span className="text-[17px] font-semibold" style={{ color: ACTION_BLUE }}>
                  Retour
                </span>
              </button>
              <p
                className="min-w-0 flex-1 truncate px-1 text-center text-[17px] font-bold text-[#0A0F1F]"
                title={headerTitleText}
              >
                {headerTitleText}
              </p>
              {!isOwnProfile ? (
                <button
                  type="button"
                  onClick={() => setShowActionSheet(true)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center active:opacity-60"
                  aria-label="Plus d'actions"
                >
                  <span className="text-[22px] leading-none text-[#0A0F1F]">⋮</span>
                </button>
              ) : (
                <span className="inline-block h-9 w-9 shrink-0" aria-hidden />
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#007AFF]" />
            </div>
          ) : profile ? (
            <ProfileOtherMaquetteLayout
              profile={{
                user_id: profile.user_id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
                age: profile.age,
                bio: profile.bio,
                is_premium: profile.is_premium,
                is_admin: profile.is_admin,
                favorite_sport: profile.favorite_sport,
                country: profile.country,
              }}
              getInitials={getInitials}
              showOnlineOnAvatar={!isOwnProfile && areFriends}
              followerCount={followerCount}
              followingCount={followingCount}
              seancesDisplay={seancesDisplay}
              onOpenSeances={() => {
                if (!userId || !canViewContent) return;
                navigate(`/profile/${userId}/sessions`);
                onClose();
              }}
              openFollowDialog={(type) => {
                setFollowDialogTab(type);
                setShowFollowDialog(true);
              }}
              isOwnProfile={isOwnProfile}
              isFollowing={isFollowing}
              followRequestSent={followRequestSent}
              actionLoading={actionLoading}
              onFollowToggle={handleFollowToggle}
              onMessage={handleMessage}
              onAvatarClick={() => setShowAvatarFullscreen(true)}
              storyHighlights={storyHighlights}
              highlightPreviewByStoryId={highlightPreviewByStoryId}
              onOpenHighlight={(sid) => setSelectedHighlightStoryId(sid)}
              canViewContent={canViewContent}
              period={period}
              onPeriodChange={setPeriod}
              statsLoading={statsLoading}
              stats={stats}
              onOpenRecords={() => {
                if (isOwnProfile) {
                  navigate("/profile/records");
                  onClose();
                  return;
                }
                setShowRecordsSheet(true);
              }}
              onOpenRecentSessions={() => {
                if (!userId) return;
                if (isOwnProfile) {
                  navigate("/profile/sessions");
                } else {
                  navigate(`/profile/${userId}/sessions`);
                }
                onClose();
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[#F2F2F7]">
              <p className="text-[15px] font-medium text-[#8E8E93]">Profil non trouvé</p>
            </div>
          )}

          {/* Action sheet : doit être *dans* DialogContent (Radix modal bloque les clics hors layer si portail body) */}
          {showActionSheet && !isOwnProfile && (
            <div
              className="pointer-events-auto fixed inset-0 z-[250] flex items-end justify-center"
              role="presentation"
              onClick={() => setShowActionSheet(false)}
            >
              <div className="absolute inset-0 bg-black/40" aria-hidden />
              <div
                className="relative z-10 w-full max-w-md px-2 pb-[max(env(safe-area-inset-bottom),8px)]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Actions sur le profil"
              >
                <div className="mb-2 overflow-hidden rounded-2xl bg-card shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionSheet(false);
                      isBlocked ? handleUnblockUser() : handleBlockUser();
                    }}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left text-[16px] font-normal text-destructive transition-colors active:bg-secondary/60"
                  >
                    <UserMinus className="h-5 w-5 shrink-0" />
                    {isBlocked ? "Débloquer" : "Bloquer"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRestrictToggle}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left text-[16px] font-normal text-foreground transition-colors active:bg-secondary/60"
                  >
                    <ShieldBan className="h-5 w-5 shrink-0 text-muted-foreground" />
                    {isRestricted ? "Lever la restriction" : "Restreindre"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionSheet(false);
                      setShowReportDialog(true);
                    }}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left text-[16px] font-normal text-destructive transition-colors active:bg-secondary/60"
                  >
                    <Flag className="h-5 w-5 shrink-0" />
                    Signaler
                  </button>
                  <button
                    type="button"
                    onClick={handleShareProfile}
                    className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3.5 text-left text-[16px] font-normal text-foreground transition-colors active:bg-secondary/60"
                  >
                    <Share2 className="h-5 w-5 shrink-0 text-muted-foreground" />
                    Partager
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionSheet(false);
                      setShowAboutSheet(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[16px] font-normal text-foreground transition-colors active:bg-secondary/60"
                  >
                    <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
                    À propos de ce compte
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActionSheet(false)}
                  className="w-full rounded-2xl bg-card py-3.5 text-center text-[17px] font-semibold text-primary shadow-lg transition-colors active:bg-secondary/60"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow Dialog */}
      {showFollowDialog && userId && (
        <FollowDialog
          open={showFollowDialog}
          onOpenChange={setShowFollowDialog}
          type={followDialogTab}
          followerCount={followerCount}
          followingCount={followingCount}
          targetUserId={userId}
        />
      )}

      {/* Reliability Dialog */}
      <ReliabilityDetailsDialog
        open={showReliabilityDialog}
        onOpenChange={setShowReliabilityDialog}
        reliabilityRate={reliabilityRate ?? 0}
        totalSessionsCreated={reliabilityStats.created}
        totalSessionsJoined={reliabilityStats.joined}
        totalSessionsCompleted={reliabilityStats.completed}
        totalSessionsAbsent={reliabilityStats.absent}
        reliabilitySubjectUserId={userId ?? null}
      />

      {/* Records Sheet */}
      <Sheet open={showRecordsSheet} onOpenChange={setShowRecordsSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0 z-[200]" overlayClassName="z-[200]">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-[17px]">Records sport</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pb-8">
            {profile && (
              <PersonalRecords records={{
                running_records: profile.running_records,
                cycling_records: profile.cycling_records,
                swimming_records: profile.swimming_records,
                triathlon_records: profile.triathlon_records,
                walking_records: profile.walking_records,
              }}
              canEdit={isOwnProfile}
              onRecordsChange={(nextRecords) => {
                setProfile((prev) => (prev ? { ...prev, ...nextRecords } : prev));
              }}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Report Dialog */}
      {!isOwnProfile && profile && (
        <ReportUserDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          reportedUserId={profile.user_id}
          reportedUsername={profile.username}
        />
      )}

      {/* About Sheet */}
      <Sheet open={showAboutSheet} onOpenChange={setShowAboutSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 z-[200]" overlayClassName="z-[200]">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-[17px]">À propos de ce compte</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-muted-foreground">Date de création</span>
              <span className="text-[14px] font-medium text-foreground">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '–'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-muted-foreground">Nom d'utilisateur</span>
              <span className="text-[14px] font-medium text-foreground">@{profile?.username || '–'}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ProfileShareScreen
        open={showProfileShare}
        onClose={() => setShowProfileShare(false)}
        onOpenQr={() => {
          setShowProfileShare(false);
          setShowQRDialog(true);
        }}
      />

      {/* QR Share Dialog */}
      {qrData && (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
          avatarUrl={qrData.avatarUrl}
          referralCode={qrData.referralCode}
        />
      )}

      {profile && (
        <AvatarViewer
          open={showAvatarFullscreen}
          onClose={() => setShowAvatarFullscreen(false)}
          avatarUrl={profile.avatar_url}
          username={profile.username}
          stackNested
        />
      )}

      <SessionStoryDialog
        open={!!selectedHighlightStoryId}
        onOpenChange={(open) => {
          if (!open) setSelectedHighlightStoryId(null);
        }}
        authorId={profile?.user_id ?? null}
        viewerUserId={user?.id ?? null}
        storyId={selectedHighlightStoryId}
        stackNested
        onOpenFeed={() => {
          setSelectedHighlightStoryId(null);
          navigate("/feed");
        }}
      />
    </>
  );
};
