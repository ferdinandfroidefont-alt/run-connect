import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Footprints,
  HelpCircle,
  Lock,
  MoreVertical,
  Pencil,
  Settings,
  Share2,
  Shield,
  Timer,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import { QRShareDialog } from "@/components/QRShareDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { cn } from "@/lib/utils";
import type { SettingsDialogPage } from "@/components/SettingsDialog";

const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);

type RecordPreview = {
  id: string;
  label: string;
  value: string;
  dateLabel: string | null;
  tone: "navy" | "purple";
};

function normalizeRecordDistanceLabel(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (lower === "5k") return "5 km";
  if (lower === "10k") return "10 km";
  if (lower === "21k" || lower === "semi") return "Semi-marathon";
  if (lower === "42k" || lower === "marathon") return "Marathon";
  return t;
}

async function countMutualFriends(userId: string): Promise<number> {
  const { data: following, error: folErr } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "accepted");
  if (folErr) return 0;
  const ids = (following ?? []).map((r) => r.following_id).filter(Boolean) as string[];
  if (ids.length === 0) return 0;
  const { data: back, error: backErr } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "accepted")
    .in("follower_id", ids);
  if (backErr) return 0;
  return back?.length ?? 0;
}

async function countGroupClubs(userId: string): Promise<number> {
  const { data: gm, error: gmErr } = await supabase.from("group_members").select("conversation_id").eq("user_id", userId);
  if (gmErr || !gm?.length) return 0;
  const convIds = [...new Set(gm.map((r) => r.conversation_id).filter(Boolean))] as string[];
  if (!convIds.length) return 0;
  const { data: convs, error: cErr } = await supabase
    .from("conversations")
    .select("id")
    .in("id", convIds)
    .eq("is_group", true);
  if (cErr) return 0;
  return convs?.length ?? 0;
}

function legacyRunningEntries(obj: unknown): Array<{ label: string; value: string }> {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([distance, time]) => ({
      label: normalizeRecordDistanceLabel(String(distance)),
      value: String(time).trim(),
    }));
}

/** Onglet Profil — mise en page alignée maquette (header dégradé, stats, records, paramètres). */
export default function ProfileTabPage() {
  const { user } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile();
  const { isPreviewMode, previewIdentity } = useAppPreview();
  const navigate = useNavigate();
  const { shareProfile, showProfileShare, setShowProfileShare, showQRDialog, setShowQRDialog, qrData } =
    useShareProfile();

  const [sessionsCount, setSessionsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [clubsCount, setClubsCount] = useState(0);
  const [recordPreviews, setRecordPreviews] = useState<RecordPreview[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsDialogPage | undefined>(undefined);

  const openSettings = useCallback((page?: SettingsDialogPage) => {
    setSettingsInitialPage(page);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    if (settingsOpen) return;
    const t = window.setTimeout(() => setSettingsInitialPage(undefined), 320);
    return () => window.clearTimeout(t);
  }, [settingsOpen]);

  const username = userProfile?.username ?? "—";
  const displayAvatar = userProfile?.avatar_url ?? undefined;
  const bio = userProfile?.bio?.trim() || null;
  const fallbackInitial = (username?.[0] ?? "?").toUpperCase();

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) {
      setStatsLoading(false);
      return;
    }
    if (!userProfile) {
      if (profileLoading) {
        setStatsLoading(true);
        return;
      }
      setStatsLoading(false);
      return;
    }

    if (isPreviewMode && previewIdentity) {
      const ms = previewIdentity.mockStats;
      setSessionsCount(Math.max(ms?.total_sessions_completed ?? 0, ms?.sessions_created ?? 0));
      setFriendsCount(
        Math.min(previewIdentity.followerCount ?? 0, previewIdentity.followingCount ?? 0) ||
          previewIdentity.followingCount ||
          0
      );
      setClubsCount(3);
      setRecordPreviews([
        {
          id: "p1",
          label: "5 km",
          value: "19:42",
          dateLabel: "12 mai 2024",
          tone: "navy",
        },
        {
          id: "p2",
          label: "10 km",
          value: "41:35",
          dateLabel: "3 mars 2024",
          tone: "purple",
        },
      ]);
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      const [{ data: statsData }, { count: createdCount }, mutual, clubs] = await Promise.all([
        supabase
          .from("user_stats")
          .select("total_sessions_completed")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("sessions").select("*", { count: "exact", head: true }).eq("organizer_id", user.id),
        countMutualFriends(user.id),
        countGroupClubs(user.id),
      ]);

      const completed = statsData?.total_sessions_completed ?? 0;
      const created = createdCount ?? 0;
      setSessionsCount(Math.max(completed, created));
      setFriendsCount(mutual);
      setClubsCount(clubs);

      const { data: rows, error: rowsErr } = await supabase
        .from("profile_sport_records")
        .select("id, event_label, record_value, created_at")
        .eq("user_id", user.id)
        .eq("sport_key", "running")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (rowsErr) {
        throw rowsErr;
      }

      const fromTable: RecordPreview[] = (rows ?? []).map((r, i) => ({
        id: r.id,
        label: r.event_label?.trim() || "—",
        value: r.record_value?.trim() || "—",
        dateLabel: r.created_at
          ? new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
          : null,
        tone: i % 2 === 0 ? "navy" : "purple",
      }));

      const previews: RecordPreview[] = fromTable.slice(0, 2);
      if (previews.length < 2) {
        const legacy = legacyRunningEntries(userProfile.running_records);
        for (const row of legacy) {
          if (previews.length >= 2) break;
          if (previews.some((p) => p.label === row.label)) continue;
          previews.push({
            id: `legacy-${row.label}`,
            label: row.label,
            value: row.value,
            dateLabel: null,
            tone: previews.length % 2 === 0 ? "navy" : "purple",
          });
        }
      }
      setRecordPreviews(previews);
    } catch {
      setSessionsCount(0);
      setFriendsCount(0);
      setClubsCount(0);
      setRecordPreviews([]);
    } finally {
      setStatsLoading(false);
    }
  }, [user?.id, userProfile, profileLoading, isPreviewMode, previewIdentity]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const showRecordsSection = recordPreviews.length > 0;

  const metricsDisplay = useMemo(
    () => ({
      sessions: statsLoading ? "—" : String(sessionsCount),
      friends: statsLoading ? "—" : String(friendsCount),
      clubs: statsLoading ? "—" : String(clubsCount),
    }),
    [statsLoading, sessionsCount, friendsCount, clubsCount]
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-secondary">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="relative pt-[max(env(safe-area-inset-top),10px)]">
          <div className="relative min-h-[148px] overflow-visible">
            <div
              className="absolute inset-x-0 top-0 h-[132px] rounded-b-[28px] bg-gradient-to-br from-[#2b8cff] via-[#5856f0] to-[#7c4dff]"
              aria-hidden
            />
            <svg
              className="pointer-events-none absolute -bottom-1 left-0 right-0 h-10 w-full text-secondary"
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M0,12 C100,36 180,36 200,28 C260,10 320,10 400,22 L400,40 L0,40 Z"
              />
            </svg>

            <div className="relative flex justify-end px-3 pt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full text-white hover:bg-white/15 hover:text-white"
                    aria-label="Plus d’actions"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() =>
                      shareProfile({
                        username: userProfile?.username ?? "",
                        displayName: userProfile?.display_name,
                        bio: userProfile?.bio,
                        avatarUrl: userProfile?.avatar_url,
                        referralCode: null,
                      })
                    }
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Partager le profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSettings()}>
                    <Settings className="mr-2 h-4 w-4" />
                    Réglages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Voir le profil public
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center px-4 pb-1">
            <div className="relative -mt-11">
              <Avatar className="h-[92px] w-[92px] border-[4px] border-white shadow-md">
                <AvatarImage src={displayAvatar} alt="" className="object-cover" />
                <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">{fallbackInitial}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#2b8cff] text-white shadow-md transition-transform active:scale-95"
                aria-label="Modifier la photo de profil"
                onClick={() => navigate("/profile/edit")}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <h1 className="mt-3 min-w-0 max-w-full truncate text-center text-[20px] font-bold tracking-tight text-foreground">
              {username}
            </h1>
            {bio ? (
              <p className="mt-1 max-w-[280px] text-center text-[15px] font-medium text-[#5856f0]">{bio}</p>
            ) : (
              <p className="mt-1 text-center text-[14px] text-muted-foreground">Ajoute une bio dans les infos perso</p>
            )}
          </div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-[760px] space-y-5 px-4 ios-shell:px-2.5">
          <div className="ios-card rounded-2xl border border-border/60 bg-card px-2 py-4 shadow-[var(--shadow-card,0_2px_12px_rgba(0,0,0,0.06))]">
            <div className="flex min-w-0">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 border-r border-border/60 px-1 text-center">
                <Footprints className="h-5 w-5 text-[#007AFF]" aria-hidden />
                <span className="text-[18px] font-bold leading-none text-foreground">{metricsDisplay.sessions}</span>
                <span className="text-[12px] font-medium text-muted-foreground">Séances</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 border-r border-border/60 px-1 text-center">
                <Users className="h-5 w-5 text-[#007AFF]" aria-hidden />
                <span className="text-[18px] font-bold leading-none text-foreground">{metricsDisplay.friends}</span>
                <span className="text-[12px] font-medium text-muted-foreground">Amis</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 text-center">
                <Shield className="h-5 w-5 text-[#007AFF]" aria-hidden />
                <span className="text-[18px] font-bold leading-none text-foreground">{metricsDisplay.clubs}</span>
                <span className="text-[12px] font-medium text-muted-foreground">Clubs</span>
              </div>
            </div>
          </div>

          {showRecordsSection ? (
            <section className="min-w-0 space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h2 className="text-[17px] font-bold text-foreground">Records</h2>
                <button
                  type="button"
                  className="shrink-0 text-[15px] font-semibold text-[#007AFF] active:opacity-70"
                  onClick={() => navigate("/profile/records")}
                >
                  Voir tout &gt;
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recordPreviews.map((r, idx) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex min-w-0 flex-col rounded-2xl px-3 py-3 text-white shadow-[var(--shadow-card,0_2px_12px_rgba(0,0,0,0.08))]",
                      r.tone === "navy" ? "bg-[#1c2748]" : "bg-[#3d2b5c]"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-1.5 opacity-95">
                      {idx === 0 ? (
                        <Footprints className="h-4 w-4 shrink-0" aria-hidden />
                      ) : (
                        <Timer className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      <span className="truncate text-[12px] font-semibold uppercase tracking-wide opacity-90">{r.label}</span>
                    </div>
                    <span className="text-[22px] font-bold leading-tight tracking-tight">{r.value}</span>
                    {r.dateLabel ? <p className="mt-2 text-[11px] font-medium text-white/75">{r.dateLabel}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="min-w-0 space-y-2">
            <h2 className="px-0.5 text-[17px] font-bold text-foreground">Paramètres</h2>
            <div className="ios-card overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card,0_2px_12px_rgba(0,0,0,0.06))]">
              <div className="ios-list-stack">
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                  onClick={() => navigate("/profile/edit")}
                >
                  <span className="ios-list-row-icon bg-[#007AFF]/12 text-[#007AFF]">
                    <User className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-foreground">Informations personnelles</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/55" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                  onClick={() => openSettings("notifications")}
                >
                  <span className="ios-list-row-icon bg-[#007AFF]/12 text-[#007AFF]">
                    <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-foreground">Notifications</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/55" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                  onClick={() => openSettings("privacy")}
                >
                  <span className="ios-list-row-icon bg-[#007AFF]/12 text-[#007AFF]">
                    <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-foreground">Confidentialité</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/55" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                  onClick={() => openSettings("general")}
                >
                  <span className="ios-list-row-icon bg-[#007AFF]/12 text-[#007AFF]">
                    <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-foreground">Préférences</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/55" aria-hidden />
                </button>
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
                  onClick={() => openSettings("support")}
                >
                  <span className="ios-list-row-icon bg-[#007AFF]/12 text-[#007AFF]">
                    <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium text-foreground">Aide et support</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/55" aria-hidden />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Suspense fallback={null}>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} initialPage={settingsInitialPage} />
      </Suspense>

      <ProfileShareScreen
        open={showProfileShare}
        onClose={() => setShowProfileShare(false)}
        onOpenQr={() => {
          setShowProfileShare(false);
          setShowQRDialog(true);
        }}
      />
      {qrData ? (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
          avatarUrl={qrData.avatarUrl}
          referralCode={qrData.referralCode}
        />
      ) : null}
    </div>
  );
}
