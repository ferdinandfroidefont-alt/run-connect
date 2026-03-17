import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { ReportUserDialog } from "./ReportUserDialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, Crown, Loader2, Flag, MoreVertical, ChevronLeft, MessageCircle, Trophy, CalendarDays, MapPin, Route } from "lucide-react";
import { PersonalRecords } from "@/components/PersonalRecords";
import { RecentActivities } from "@/components/profile/RecentActivities";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { FollowDialog } from "./FollowDialog";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

const SPORT_LABELS: Record<string, string> = {
  running: '🏃 Course à pied',
  cycling: '🚴 Vélo',
  swimming: '🏊 Natation',
  triathlon: '🏅 Triathlon',
  walking: '🚶 Marche',
  trail: '⛰️ Trail',
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷 France', BE: '🇧🇪 Belgique', CH: '🇨🇭 Suisse', CA: '🇨🇦 Canada',
  LU: '🇱🇺 Luxembourg', MA: '🇲🇦 Maroc', TN: '🇹🇳 Tunisie', SN: '🇸🇳 Sénégal',
  CI: "🇨🇮 Côte d'Ivoire", ES: '🇪🇸 Espagne', PT: '🇵🇹 Portugal', DE: '🇩🇪 Allemagne',
  IT: '🇮🇹 Italie', GB: '🇬🇧 Royaume-Uni', US: '🇺🇸 États-Unis',
};

const getFavoriteSport = (profile: Profile): string | null => {
  if (profile.favorite_sport && SPORT_LABELS[profile.favorite_sport]) {
    return SPORT_LABELS[profile.favorite_sport];
  }
  const sports = [
    { key: 'running_records', label: '🏃 Course' },
    { key: 'cycling_records', label: '🚴 Vélo' },
    { key: 'swimming_records', label: '🏊 Natation' },
    { key: 'triathlon_records', label: '🏅 Triathlon' },
    { key: 'walking_records', label: '🚶 Marche' },
  ];
  for (const sport of sports) {
    const records = (profile as any)[sport.key];
    if (records && typeof records === 'object' && Object.keys(records).length > 0) {
      return sport.label;
    }
  }
  return null;
};

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
  const [period, setPeriod] = useState<PeriodFilter>('total');
  const [stats, setStats] = useState({ sessionsCreated: 0, routesCreated: 0, sessionsJoined: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followDialogTab, setFollowDialogTab] = useState<'followers' | 'following'>('followers');
  const [showRecordsSheet, setShowRecordsSheet] = useState(false);
  const [showActivitiesSheet, setShowActivitiesSheet] = useState(false);

  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchFollowCounts();
      if (!isOwnProfile) {
        checkFollowStatus();
        checkFriendStatus();
        checkBlockedStatus();
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

  const handleMessage = async () => {
    if (!user || !userId) return;
    try {
      // Check for existing conversation
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

  const favoriteSport = profile ? getFavoriteSport(profile) : null;
  const canViewContent = isFollowing || isOwnProfile;

  const periodTabs: { key: PeriodFilter; label: string }[] = [
    { key: 'total', label: 'Totaux' },
    { key: '30d', label: '30 jours' },
    { key: '7d', label: '7 jours' },
  ];

  return (
    <>
      <Dialog open={!!userId} onOpenChange={() => onClose()}>
        <DialogContent className="w-full h-full max-w-full max-h-full rounded-none border-0 p-0 bg-secondary sm:max-w-md sm:max-h-[85vh] sm:rounded-2xl sm:border flex flex-col overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-2 pt-[max(env(safe-area-inset-top),12px)] pb-2 bg-card border-b border-border/50">
            <button onClick={onClose} className="flex items-center gap-0.5 active:opacity-60 transition-opacity px-1 py-1">
              <ChevronLeft className="h-5 w-5 text-primary" />
              <span className="text-[17px] text-primary">Retour</span>
            </button>
            <h1 className="text-[17px] font-semibold text-foreground truncate max-w-[200px]">
              {profile?.display_name || profile?.username || 'Profil'}
            </h1>
            {!isOwnProfile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 flex items-center justify-center active:scale-95 transition-transform">
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border-border shadow-lg z-50 rounded-xl">
                  {isBlocked ? (
                    <DropdownMenuItem onClick={handleUnblockUser} className="text-emerald-600 cursor-pointer">
                      <UserPlus className="h-4 w-4 mr-2" /> Débloquer
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleBlockUser} className="text-destructive cursor-pointer">
                      <UserMinus className="h-4 w-4 mr-2" /> Bloquer
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)} className="text-destructive cursor-pointer">
                    <Flag className="h-4 w-4 mr-2" /> Signaler
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : <div className="w-8" />}
          </div>

          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : profile ? (
            <ScrollArea className="flex-1">
              <div className="pb-8">

                {/* ── Identity Card ── */}
                <div className="mx-4 mt-4">
                  <div className="bg-card rounded-[10px] p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                            {(profile.display_name || profile.username)?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        {!isOwnProfile && areFriends && (
                          <OnlineStatus userId={profile.user_id} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[18px] font-bold text-foreground truncate">
                            {profile.display_name || profile.username}
                          </p>
                          {profile.is_premium && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[14px] text-muted-foreground">@{profile.username}</p>
                        {profile.age && (
                          <p className="text-[14px] text-muted-foreground mt-0.5">{profile.age} ans</p>
                        )}
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {favoriteSport || 'Sport non renseigné'}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {(profile.country && COUNTRY_FLAGS[profile.country]) || 'Pays non renseigné'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!isOwnProfile && (
                      <div className="flex gap-2.5 mt-4">
                        <Button
                          onClick={handleFollowToggle}
                          disabled={actionLoading}
                          variant={isFollowing ? "outline" : "default"}
                          className={`flex-1 h-10 rounded-xl text-[14px] font-semibold ${
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
                          <Button variant="outline" onClick={handleMessage} className="h-10 rounded-xl px-4 border-border">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Follow Stats ── */}
                <div className="mx-4 mt-3">
                  <div className="bg-card rounded-[10px] flex">
                    <button
                      onClick={() => { setFollowDialogTab('following'); setShowFollowDialog(true); }}
                      className="flex-1 py-3 text-center active:bg-secondary/80 transition-colors rounded-l-[10px]"
                    >
                      <p className="text-[18px] font-bold text-foreground">{followingCount}</p>
                      <p className="text-[12px] text-muted-foreground">Suivis</p>
                    </button>
                    <div className="w-px bg-border my-2" />
                    <button
                      onClick={() => { setFollowDialogTab('followers'); setShowFollowDialog(true); }}
                      className="flex-1 py-3 text-center active:bg-secondary/80 transition-colors rounded-r-[10px]"
                    >
                      <p className="text-[18px] font-bold text-foreground">{followerCount}</p>
                      <p className="text-[12px] text-muted-foreground">Abonnés</p>
                    </button>
                  </div>
                </div>

                {/* ── Bio ── */}
                {profile.bio && (
                  <div className="mx-4 mt-3">
                    <div className="bg-card rounded-[10px] p-4">
                      <p className="text-[14px] text-foreground/80 leading-relaxed">{profile.bio}</p>
                    </div>
                  </div>
                )}

                {/* ── Content (visible if following or own) ── */}
                {canViewContent ? (
                  <>
                    {/* Period Filter */}
                    <div className="mx-4 mt-4">
                      <div className="bg-muted rounded-[8px] p-0.5 flex">
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

                    {/* Stats */}
                    <div className="mx-4 mt-3">
                      <IOSListGroup>
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
                    <div className="mx-4 mt-3">
                      <IOSListGroup>
                        <IOSListItem
                          icon={Trophy}
                          iconBgColor="bg-yellow-500"
                          title="Records sport"
                          onClick={() => setShowRecordsSheet(true)}
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
                  <div className="mx-4 mt-5">
                    <div className="bg-card rounded-[10px] p-6 text-center">
                      <div className="text-4xl mb-3">🔒</div>
                      <p className="text-[15px] font-semibold text-foreground">Profil privé</p>
                      <p className="text-[13px] text-muted-foreground mt-1">
                        Suivez cette personne pour voir ses activités
                      </p>
                    </div>
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

      {/* Records Sheet */}
      <Sheet open={showRecordsSheet} onOpenChange={setShowRecordsSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
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
              }} />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Recent Activities Sheet */}
      <Sheet open={showActivitiesSheet} onOpenChange={setShowActivitiesSheet}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
            <SheetTitle className="text-[17px]">Séances récentes</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full pb-8">
            <div className="p-4">
              {userId && <RecentActivities userId={userId} limit={20} />}
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
    </>
  );
};
