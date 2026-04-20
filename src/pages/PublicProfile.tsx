import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  UserPlus,
  Download,
  Crown,
  Calendar,
  ArrowLeft,
  MapPin,
  Cake,
  Star,
  MessageCircle,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { ProfileRecordsDisplay } from "@/components/profile/ProfileRecordsDisplay";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { ProfileSportChips } from "@/components/profile/ProfileSportsCard";
import { parseProfileSports } from "@/lib/profileSports";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { buildProfileDeepLink, getStoreFallbackUrl } from "@/lib/appLinks";
import { getCountryLabel } from "@/lib/countryLabels";
import { useLanguage } from "@/contexts/LanguageContext";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CommonClubRow = {
  club_id: string;
  club_name: string;
  club_description: string | null;
  club_avatar_url: string | null;
  club_code: string;
  created_by: string;
};

interface PublicProfileData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  is_premium: boolean | null;
  created_at: string;
  favorite_sport?: string | null;
  age?: number | null;
  country?: string | null;
  organizer_avg_rating?: number | null;
  running_records?: unknown;
  cycling_records?: unknown;
  swimming_records?: unknown;
  triathlon_records?: unknown;
  walking_records?: unknown;
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-ios-caption2 font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-ios-body text-foreground">{value}</p>
      </div>
    </div>
  );
}

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [isNative, setIsNative] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [reliabilityRate, setReliabilityRate] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followRequestSent, setFollowRequestSent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commonFollows, setCommonFollows] = useState<number | null>(null);
  const [commonClubs, setCommonClubs] = useState<CommonClubRow[]>([]);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [profileHighlights, setProfileHighlights] = useState<Array<{ id: string; story_id: string; title: string }>>([]);
  const [selectedHighlightStoryId, setSelectedHighlightStoryId] = useState<string | null>(null);
  const [showAllHighlights, setShowAllHighlights] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("r");
    if (refCode) {
      sessionStorage.setItem("referralCode", refCode);
      toast({
        title: "🎁 Code de parrainage détecté !",
        description: `Inscrivez-vous pour bénéficier du bonus de ${username}`,
        duration: 5000,
      });
    }
  }, [username, toast]);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      if (!username) return;
      setLoading(true);
      setLoadError(false);
      try {
        if (user) {
          const { data: ownProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", user.id)
            .single();
          if (ownProfile?.username === username) {
            navigate("/profile");
            return;
          }
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select(
            "user_id, username, display_name, avatar_url, cover_image_url, bio, is_premium, created_at, favorite_sport, age, country, organizer_avg_rating, running_records, cycling_records, swimming_records, triathlon_records, walking_records"
          )
          .eq("username", username)
          .eq("is_private", false)
          .single();

        if (error || !profileData) {
          if (!user) {
            sessionStorage.setItem("targetProfileUsername", username);
            toast({
              title: "Connectez-vous pour découvrir ce profil",
              description: `Inscrivez-vous pour suivre @${username}`,
            });
            navigate("/auth");
          } else {
            toast({
              title: "Profil introuvable",
              description: "Ce profil n'existe pas ou est privé",
              variant: "destructive",
            });
            navigate("/");
          }
          return;
        }

        setProfile(profileData);

        const [followerRes, followingRes] = await Promise.all([
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profileData.user_id)
            .eq("status", "accepted"),
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", profileData.user_id)
            .eq("status", "accepted"),
        ]);

        setFollowerCount(followerRes.count ?? 0);
        setFollowingCount(followingRes.count ?? 0);

        if (user) {
          const { data: statsRow } = await supabase
            .from("user_stats")
            .select("reliability_rate")
            .eq("user_id", profileData.user_id)
            .maybeSingle();
          setReliabilityRate(
            statsRow?.reliability_rate != null && !Number.isNaN(Number(statsRow.reliability_rate))
              ? Number(statsRow.reliability_rate)
              : null
          );
        } else {
          setReliabilityRate(null);
        }
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    void fetchPublicProfile();
  }, [username, user, navigate, toast, retryToken]);

  useEffect(() => {
    if (!profile || !user) {
      setCommonFollows(null);
      setCommonClubs([]);
      setIsFollowing(false);
      setFollowRequestSent(false);
      return;
    }

    const loadSocial = async () => {
      const { data: followRow } = await supabase
        .from("user_follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", profile.user_id)
        .maybeSingle();

      if (followRow) {
        setIsFollowing(followRow.status === "accepted");
        setFollowRequestSent(followRow.status === "pending");
      } else {
        setIsFollowing(false);
        setFollowRequestSent(false);
      }

      const [{ data: cc }, { data: clubs }] = await Promise.all([
        (supabase as any).rpc("count_common_follows", { user_a: user.id, user_b: profile.user_id }),
        (supabase as any).rpc("get_common_clubs", { user_1_id: user.id, user_2_id: profile.user_id }),
      ]);

      setCommonFollows(typeof cc === "number" ? cc : 0);
      setCommonClubs((clubs || []) as CommonClubRow[]);
    };

    void loadSocial();
  }, [profile, user]);

  useEffect(() => {
    if (!profile?.user_id) return;
    void (async () => {
      const { data: highlights } = await (supabase as any)
        .from("profile_story_highlights")
        .select("id, story_id, title, position")
        .eq("owner_id", profile.user_id)
        .order("position", { ascending: true });
      setProfileHighlights((highlights ?? []) as Array<{ id: string; story_id: string; title: string }>);
    })();
  }, [profile?.user_id]);

  const handleSubscribeGuest = () => {
    if (username) sessionStorage.setItem("targetProfileUsername", username);
    navigate("/auth");
  };

  const handleFollowToggle = async () => {
    if (!user || !profile) return;
    setActionLoading(true);
    try {
      if (isFollowing || followRequestSent) {
        await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", profile.user_id);
        if (isFollowing) {
          setFollowerCount((c) => Math.max(0, c - 1));
          toast({ title: "Vous ne suivez plus cette personne" });
        } else {
          toast({ title: "Demande annulée" });
        }
        setIsFollowing(false);
        setFollowRequestSent(false);
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: profile.user_id, status: "pending" });
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Demande déjà envoyée" });
            return;
          }
          throw error;
        }
        setFollowRequestSent(true);
        toast({ title: "Demande de suivi envoyée" });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${profile.user_id}),and(participant_1.eq.${profile.user_id},participant_2.eq.${user.id})`
        )
        .eq("is_group", false)
        .maybeSingle();

      if (existing) {
        navigate(`/messages?conversation=${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({ participant_1: user.id, participant_2: profile.user_id })
          .select("id")
          .single();
        if (error) throw error;
        navigate(`/messages?conversation=${newConv.id}`);
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ouvrir la conversation", variant: "destructive" });
    }
  };

  const handleOpenInApp = () => {
    if (!username) return;
    window.location.href = buildProfileDeepLink({ username });
    setTimeout(() => {
      window.location.href = getStoreFallbackUrl();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile && loadError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-secondary px-6 text-center">
        <p className="text-ios-body text-muted-foreground">{t("profilePage.publicLoadError")}</p>
        <Button type="button" onClick={() => setRetryToken((n) => n + 1)}>
          {t("profilePage.publicRetry")}
        </Button>
      </div>
    );
  }

  if (!profile) return null;

  const profileSports = parseProfileSports(profile.favorite_sport);
  const countryLine = getCountryLabel(profile.country ?? undefined) ?? "—";
  const ageLine =
    profile.age != null && profile.age > 0 ? `${profile.age} ans` : "—";
  const ratingLine =
    profile.organizer_avg_rating != null && !Number.isNaN(Number(profile.organizer_avg_rating))
      ? `${Number(profile.organizer_avg_rating).toFixed(1)} / 5`
      : "—";

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-secondary">
      <div className="mx-auto min-h-full min-w-0 max-w-2xl pb-[calc(1.5rem+var(--safe-area-bottom))]">
        {/* Cover + retour */}
        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border/40 bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors active:bg-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="h-36 w-full overflow-hidden bg-muted sm:h-40">
            {profile.cover_image_url ? (
              <img
                src={profile.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/15 via-primary/5 to-muted" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-secondary/90 via-transparent to-transparent" />
          </div>

          <div className="box-border min-w-0 px-4 pt-0 ios-shell:px-3">
            <div className="-mt-11 flex min-w-0 items-end gap-3 sm:-mt-12">
              <button type="button" onClick={() => setShowStoryDialog(true)}>
                <Avatar className="h-20 w-20 shrink-0 border-2 border-background shadow-md sm:h-[5.5rem] sm:w-[5.5rem]">
                  <AvatarImage src={profile.avatar_url || undefined} alt="" />
                  <AvatarFallback className="bg-muted text-lg font-semibold text-muted-foreground sm:text-xl">
                    {profile.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="min-w-0 flex-1 pb-1 pt-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h1 className="min-w-0 truncate text-ios-title2 font-bold text-foreground">
                    {profile.display_name || profile.username}
                  </h1>
                  {profile.is_premium ? (
                    <Crown className="h-4 w-4 shrink-0 text-yellow-500" aria-hidden />
                  ) : null}
                </div>
                <p className="truncate text-ios-subheadline text-muted-foreground">
                  @{profile.username}
                </p>
                {(countryLine !== "—" || ageLine !== "—") && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground/90">
                    {[countryLine !== "—" ? countryLine : null, ageLine !== "—" ? ageLine : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 min-w-0 space-y-4 px-4 ios-shell:px-3">
          {user &&
            ((commonFollows !== null && commonFollows > 0) || commonClubs.length > 0) && (
            <p className="text-[13px] leading-snug text-muted-foreground">
              {[
                commonFollows != null && commonFollows > 0
                  ? `${commonFollows} abonnement${commonFollows > 1 ? "s" : ""} en commun`
                  : null,
                commonClubs.length > 0
                  ? `${commonClubs.length} club${commonClubs.length > 1 ? "s" : ""} en commun`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
            {!user ? (
              <Button
                onClick={handleSubscribeGuest}
                className="h-11 min-w-0 flex-1 rounded-[10px] text-ios-body font-semibold"
              >
                <UserPlus className="mr-2 h-5 w-5 shrink-0" />
                S&apos;abonner
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleFollowToggle}
                  disabled={actionLoading}
                  variant={isFollowing ? "outline" : "default"}
                  className={`h-11 min-w-0 flex-1 rounded-[10px] text-ios-body font-semibold ${
                    followRequestSent ? "bg-muted text-muted-foreground hover:bg-muted" : ""
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isFollowing ? (
                    "Abonné ✓"
                  ) : followRequestSent ? (
                    "En attente"
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5 shrink-0" />
                      Suivre
                    </>
                  )}
                </Button>
                {isFollowing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMessage}
                    className="h-11 min-w-0 flex-1 rounded-[10px] text-ios-body font-semibold"
                  >
                    <MessageCircle className="mr-2 h-5 w-5 shrink-0" />
                    Message
                  </Button>
                )}
              </>
            )}
            {!isNative ? (
              <Button
                variant="secondary"
                onClick={handleOpenInApp}
                className="h-11 min-w-0 flex-1 rounded-[10px] text-ios-body font-semibold"
              >
                <Download className="mr-2 h-5 w-5 shrink-0" />
                App
              </Button>
            ) : null}
          </div>

          {user && (
            <button
              type="button"
              onClick={() => setShowProfilePreview(true)}
              className="w-full rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-center text-[14px] font-medium text-primary transition-colors active:bg-muted"
            >
              Voir le profil détaillé
            </button>
          )}

          {profile.bio ? (
            <div className="ios-card min-w-0 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)]">
              <p className="whitespace-pre-wrap text-ios-body text-muted-foreground">{profile.bio}</p>
            </div>
          ) : null}

          {profileHighlights.length > 0 ? (
            <div className="ios-card min-w-0 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
                  Stories a la une
                </p>
                {profileHighlights.length > 6 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary"
                    onClick={() => setShowAllHighlights(true)}
                  >
                    Plus
                  </button>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {profileHighlights.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedHighlightStoryId(item.story_id)}
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary">
                      {item.title.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="w-full truncate text-center text-[11px] text-muted-foreground">{item.title}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {profileSports.length > 0 ? (
            <div className="ios-card min-w-0 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)]">
              <p className="mb-2 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
                Sports
              </p>
              <ProfileSportChips sportKeys={profileSports} />
            </div>
          ) : null}

          <div className="ios-card min-w-0 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <p className="border-b border-border/50 px-4 py-2.5 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
              Informations
            </p>
            <div className="divide-y divide-border/50">
              <MetaRow icon={MapPin} label="Pays" value={countryLine} />
              <MetaRow icon={Cake} label="Âge" value={ageLine} />
              <MetaRow icon={Star} label="Note organisateur" value={ratingLine} />
            </div>
          </div>

          {user && commonClubs.length > 0 ? (
            <div className="ios-card min-w-0 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
              <p className="border-b border-border/50 px-4 py-2.5 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
                Clubs en commun
              </p>
              <div className="divide-y divide-border/50">
                {commonClubs.slice(0, 6).map((club) => (
                  <div key={club.club_id} className="flex min-w-0 items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                      {club.club_avatar_url ? (
                        <img
                          src={club.club_avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-foreground">{club.club_name}</p>
                      {club.club_code ? (
                        <p className="truncate text-[12px] text-muted-foreground">#{club.club_code}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="ios-card min-w-0 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <ProfileQuickStats
              userId={profile.user_id}
              followerCount={followerCount}
              followingCount={followingCount}
              reliabilityPercent={reliabilityRate}
              showReliabilityColumn={!!user}
            />
          </div>

          <ProfileRecordsDisplay
            userId={profile.user_id}
            hideIfEmpty
            sectionTitle="Records sport"
            legacy={{
              running_records: profile.running_records,
              cycling_records: profile.cycling_records,
              swimming_records: profile.swimming_records,
              triathlon_records: profile.triathlon_records,
              walking_records: profile.walking_records,
            }}
            className="min-w-0"
          />

          <div className="min-w-0">
            <p className="mb-2 px-0.5 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
              Activités récentes
            </p>
            <div className="ios-card min-w-0 border border-border/60 p-3 shadow-[var(--shadow-card)] sm:p-4">
              <RecentActivities userId={profile.user_id} viewerUserId={user?.id ?? null} limit={3} />
            </div>
          </div>

          <div className="ios-card flex min-w-0 items-center gap-3 border border-border/60 px-4 py-3 shadow-[var(--shadow-card)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-ios-footnote font-medium text-foreground">Membre depuis</p>
              <p className="text-ios-caption1 text-muted-foreground">
                {format(new Date(profile.created_at), "MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>

          <p className="pb-2 pt-1 text-center text-ios-caption1 text-muted-foreground">
            Rejoignez {profile.username} sur RunConnect
          </p>
        </div>
      </div>

      {showProfilePreview && profile ? (
        <ProfilePreviewDialog
          userId={profile.user_id}
          onClose={() => setShowProfilePreview(false)}
        />
      ) : null}
      <SessionStoryDialog
        open={showStoryDialog}
        onOpenChange={setShowStoryDialog}
        authorId={profile.user_id}
        viewerUserId={user?.id ?? null}
        onOpenFeed={() => {
          setShowStoryDialog(false);
          navigate("/feed");
        }}
      />
      <SessionStoryDialog
        open={!!selectedHighlightStoryId}
        onOpenChange={(open) => {
          if (!open) setSelectedHighlightStoryId(null);
        }}
        authorId={profile.user_id}
        viewerUserId={user?.id ?? null}
        storyId={selectedHighlightStoryId}
        onOpenFeed={() => {
          setSelectedHighlightStoryId(null);
          navigate("/feed");
        }}
      />

      <Dialog open={showAllHighlights} onOpenChange={setShowAllHighlights}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stories a la une</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-auto">
            {profileHighlights.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-ios-md border px-3 py-2 text-left"
                onClick={() => {
                  setShowAllHighlights(false);
                  setSelectedHighlightStoryId(item.story_id);
                }}
              >
                <p className="text-sm font-semibold">{item.title}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicProfile;
