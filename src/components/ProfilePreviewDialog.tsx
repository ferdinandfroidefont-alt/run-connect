import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { ReportUserDialog } from "./ReportUserDialog";
import { ReliabilityDetailsDialog } from "./ReliabilityDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Crown, Loader2, Flag, MoreVertical, ChevronLeft, MessageCircle, Trophy, CalendarDays, MapPin, Route, Lock, Share2, ShieldBan, Info, X } from "lucide-react";
import { ProfileRecordsDisplay } from "@/components/profile/ProfileRecordsDisplay";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { getCountryLabel } from "@/lib/countryLabels";

import { ScrollArea } from "@/components/ui/scroll-area";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { FollowDialog } from "./FollowDialog";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useShareProfile } from "@/hooks/useShareProfile";
import { QRShareDialog } from "./QRShareDialog";
import { buildPreferredProfileShareLink } from "@/lib/appLinks";

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
  const [showActivitiesSheet, setShowActivitiesSheet] = useState(false);
  const [reliabilityRate, setReliabilityRate] = useState<number | null>(null);
  const [reliabilityStats, setReliabilityStats] = useState({ created: 0, joined: 0, completed: 0 });
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showAboutSheet, setShowAboutSheet] = useState(false);
  const { shareProfile, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const [storyHighlights, setStoryHighlights] = useState<Array<{ id: string; story_id: string; title: string }>>([]);

  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFollowCounts();
      fetchReliability();
      if (!isOwnProfile) {
        checkFollowStatus();
        checkFriendStatus();
        checkBlockedStatus();
        checkRestrictedStatus();
      }
    }
  }, [userId, user, isOwnProfile]);

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
        .select('reliability_rate, total_sessions_completed, total_sessions_joined')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setReliabilityRate(data.reliability_rate);
        setReliabilityStats({
          created: 0,
          joined: data.total_sessions_joined || 0,
          completed: data.total_sessions_completed || 0,
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
        const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: userId, status: 'pending' });
        if (error) {
          if (error.code === '23505') { toast({ title: "Demande déjà envoyée" }); return; }
          throw error;
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

  const periodTabs: { key: PeriodFilter; label: string }[] = [
    { key: 'total', label: 'Totaux' },
    { key: '30d', label: '30 jours' },
    { key: '7d', label: '7 jours' },
  ];

  // Build meta line: country + age
  const countryLabel = profile ? getCountryLabel(profile.country) : null;
  const ageLine = profile?.age ? `${profile.age} ans` : null;
  const metaParts = [countryLabel, ageLine].filter(Boolean);

  return (
    <>
      <Dialog open={!!userId} onOpenChange={() => onClose()}>
        <DialogContent hideCloseButton className="flex h-full max-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden rounded-none border-0 bg-secondary p-0 sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:border">

          {/* ── Header ── */}
          <div className="min-w-0 shrink-0 border-b border-border/50 bg-card pt-[max(env(safe-area-inset-top),12px)]">
            <div className="grid min-w-0 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 pb-2.5 ios-shell:px-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex shrink-0 items-center gap-0.5 px-1 py-1 text-primary transition-opacity active:opacity-60"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="text-[17px] font-medium">Retour</span>
              </button>
              <h1
                className="min-w-0 truncate text-center text-[17px] font-semibold leading-snug text-foreground"
                title={headerTitleText}
              >
                {headerTitleText}
              </h1>
              <div className="flex w-10 shrink-0 justify-end">
                {!isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setShowActionSheet(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-full active:scale-95 active:bg-secondary/80"
                    aria-label="Plus d'actions"
                  >
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                ) : (
                  <span className="inline-block w-9" aria-hidden />
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : profile ? (
            <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden [&>div>div[style]]:!overflow-y-auto [&_.scrollbar]:hidden [&>div>div+div]:hidden">
               <div className="min-w-0 max-w-full overflow-x-hidden pb-8 pt-0">
                <div className="box-border min-w-0 w-full max-w-full space-y-0 pb-[max(2rem,env(safe-area-inset-bottom))]">

                {/* ── Identity - Instagram layout: avatar + stats side by side ── */}
                <div className="bg-card border-b border-border px-4 pt-5 pb-4">
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <Avatar className="h-20 w-20 ring-[3px] ring-primary/20">
                        <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-secondary">
                          {(profile.display_name || profile.username)?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {!isOwnProfile && areFriends && (
                        <OnlineStatus userId={profile.user_id} />
                      )}
                    </div>

                    {/* Stats à droite de l'avatar */}
                    <div className="flex flex-1 min-w-0 items-center justify-around">
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-foreground leading-none">{stats.sessionsCreated + stats.sessionsJoined}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Séances</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFollowDialogTab('followers'); setShowFollowDialog(true); }}
                        className="text-center touch-manipulation transition-colors active:opacity-70"
                      >
                        <p className="text-[18px] font-bold text-foreground leading-none">{followerCount}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Abonnés</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFollowDialogTab('following'); setShowFollowDialog(true); }}
                        className="text-center touch-manipulation transition-colors active:opacity-70"
                      >
                        <p className="text-[18px] font-bold text-foreground leading-none">{followingCount}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Abonnements</p>
                      </button>
                    </div>
                  </div>

                  {/* Nom + meta line */}
                  <div className="mt-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[16px] font-bold text-foreground leading-tight">
                        {profile.display_name || profile.username}
                      </h2>
                      {profile.is_premium && <Crown className="h-4 w-4 shrink-0 text-yellow-500" />}
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">
                      @{profile.username}
                    </p>
                    {metaParts.length > 0 && (
                      <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                        {metaParts.join(" · ")}
                      </p>
                    )}
                    {profile.bio && (
                      <p className="mt-2 text-[14px] leading-relaxed text-foreground/80 line-clamp-3 break-words">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  {/* Boutons Abonné / Message */}
                  {!isOwnProfile && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={handleFollowToggle}
                        disabled={actionLoading}
                        variant={isFollowing ? "secondary" : "default"}
                        size="sm"
                        className={`flex-1 rounded-lg text-[13px] font-semibold ${
                          followRequestSent ? "bg-muted text-muted-foreground hover:bg-muted" : ""
                        }`}
                      >
                        {actionLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFollowing ? "Abonné ✓" : followRequestSent ? "En attente" : (
                          <><UserPlus className="h-4 w-4 mr-1.5" />Suivre</>
                        )}
                      </Button>
                      {isFollowing && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 gap-1.5 rounded-lg text-[13px] font-semibold"
                          onClick={handleMessage}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Message
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Stories à la une ── */}
                <div className="bg-card border-b border-border px-4 py-3">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {storyHighlights.length > 0 ? (
                      storyHighlights.map((item) => (
                        <button key={item.id} type="button" className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary">
                            {item.title.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="w-full truncate text-center text-[11px] text-muted-foreground">{item.title}</p>
                        </button>
                      ))
                    ) : (
                      <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground/50">∅</span>
                        </div>
                        <p className="w-full truncate text-center text-[10px] text-muted-foreground/60">Aucune</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Content (visible if following or own) ── */}
                {canViewContent ? (
                  <>
                    {/* Period Filter */}
                    <div className="border-b border-border/60 bg-card px-4 py-3">
                      <div className="flex min-w-0 rounded-[8px] bg-muted p-0.5">
                        {periodTabs.map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setPeriod(tab.key)}
                            className={`flex-1 py-1.5 text-[13px] font-medium rounded-[7px] transition-all ${
                              period === tab.key
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="min-w-0 border-b border-border/60 bg-card">
                      <IOSListGroup flush className="!mb-0">
                        <IOSListItem
                          icon={CalendarDays}
                          iconBgColor="bg-primary"
                          title="Séances créées"
                          value={statsLoading ? '…' : String(stats.sessionsCreated)}
                          showChevron={false}
                        />
                        <IOSListItem
                          icon={Route}
                          iconBgColor="bg-emerald-500"
                          title="Itinéraires créés"
                          value={statsLoading ? '…' : String(stats.routesCreated)}
                          showChevron={false}
                        />
                        <IOSListItem
                          icon={MapPin}
                          iconBgColor="bg-orange-500"
                          title="Séances rejointes"
                          value={statsLoading ? '…' : String(stats.sessionsJoined)}
                          showChevron={false}
                          showSeparator={false}
                        />
                      </IOSListGroup>
                    </div>

                    {/* Records & Recent */}
                    <div className="min-w-0 border-b border-border/60 bg-card">
                      <IOSListGroup flush className="!mb-0">
                        <IOSListItem
                          icon={Trophy}
                          iconBgColor="bg-yellow-500"
                          title="Records sport"
                          onClick={() => {
                            if (isOwnProfile) {
                              navigate("/profile/records");
                              onClose();
                            } else {
                              setShowRecordsSheet(true);
                            }
                          }}
                        />
                        <IOSListItem
                          icon={CalendarDays}
                          iconBgColor="bg-blue-500"
                          title="Séances récentes"
                          onClick={() => setShowActivitiesSheet(true)}
                          showSeparator={false}
                        />
                      </IOSListGroup>
                    </div>
                  </>
                ) : !isOwnProfile ? (
                  <div className="border-b border-border/60 bg-card">
                    <div className="flex flex-col items-center px-6 py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="mt-3 text-[15px] font-semibold text-foreground">Profil privé</p>
                      <p className="mt-1 text-[13px] text-muted-foreground text-center">
                        Suivez cette personne pour voir ses activités
                      </p>
                    </div>
                  </div>
                ) : null}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Profil non trouvé</p>
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
      />

      {/* Records Sheet */}
      <Sheet open={showRecordsSheet} onOpenChange={setShowRecordsSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0 z-[200]" overlayClassName="z-[200]">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-[17px]">Records sport</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pb-8">
            {profile && userId && (
              <ProfileRecordsDisplay
                userId={userId}
                legacy={{
                  running_records: profile.running_records,
                  cycling_records: profile.cycling_records,
                  swimming_records: profile.swimming_records,
                  triathlon_records: profile.triathlon_records,
                  walking_records: profile.walking_records,
                }}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Recent Activities Sheet */}
      <Sheet open={showActivitiesSheet} onOpenChange={setShowActivitiesSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0 z-[200]" overlayClassName="z-[200]">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-[17px]">Séances récentes</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pb-8">
            <div className="p-4">
              {userId && (
                <RecentActivities userId={userId} viewerUserId={user?.id ?? null} limit={20} />
              )}
            </div>
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
    </>
  );
};
