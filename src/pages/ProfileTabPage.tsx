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

  const settingsRows: Array<{
    id: string;
    label: string;
    Icon: typeof User;
    onClick: () => void;
  }> = [
    { id: "info", label: "Informations personnelles", Icon: User, onClick: () => navigate("/profile/edit") },
    { id: "notif", label: "Notifications", Icon: Bell, onClick: () => openSettings("notifications") },
    { id: "privacy", label: "Confidentialité", Icon: Lock, onClick: () => openSettings("privacy") },
    { id: "prefs", label: "Préférences", Icon: Settings, onClick: () => openSettings("general") },
    { id: "support", label: "Aide et support", Icon: HelpCircle, onClick: () => openSettings("support") },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-secondary">
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="relative">
          <div className="relative h-[170px] overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-br from-[#1f7bff] via-[#4f5be4] to-[#7a44e0]"
              aria-hidden
            />
            <svg
              className="pointer-events-none absolute -bottom-px left-0 right-0 h-10 w-full text-secondary"
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M0,10 C90,32 170,34 200,26 C250,14 320,10 400,20 L400,40 L0,40 Z"
              />
            </svg>
            <div className="relative flex justify-end px-3 pt-[max(env(safe-area-inset-top),10px)]">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full bg-white/12 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                    aria-label="Plus d’actions"
                  >
                    <MoreVertical className="h-5 w-5" strokeWidth={2.25} />
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

          <div className="relative z-10 -mt-[52px] flex flex-col items-center px-4">
            <div className="relative">
              <Avatar className="h-[100px] w-[100px] border-[4px] border-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
                <AvatarImage src={displayAvatar} alt="" className="object-cover" />
                <AvatarFallback className="bg-primary/15 text-xl font-semibold text-primary">
                  {fallbackInitial}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-[#1d7bff] text-white shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-transform active:scale-95"
                aria-label="Modifier la photo de profil"
                onClick={() => navigate("/profile/edit")}
              >
                <Pencil className="h-[13px] w-[13px]" strokeWidth={2.4} />
              </button>
            </div>

            <h1 className="mt-2.5 min-w-0 max-w-full truncate text-center text-[22px] font-bold tracking-tight text-foreground">
              {username}
            </h1>
            {bio ? (
              <p className="mt-0.5 max-w-[300px] truncate text-center text-[14px] font-medium text-[#4a52d9]">
                {bio}
              </p>
            ) : (
              <p className="mt-0.5 text-center text-[13px] text-muted-foreground">
                Ajoute une bio
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 w-full max-w-[420px] space-y-4 px-4">
          <div className="rounded-[16px] border border-border/60 bg-card px-1 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex min-w-0 items-stretch">
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-r border-border/55 px-1">
                <Footprints className="h-[22px] w-[22px] text-[#1d7bff]" strokeWidth={2.25} aria-hidden />
                <span className="text-[22px] font-bold leading-none text-foreground">{metricsDisplay.sessions}</span>
                <span className="text-[11px] font-medium leading-none text-muted-foreground">Séances</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 border-r border-border/55 px-1">
                <Users className="h-[22px] w-[22px] text-[#1d7bff]" strokeWidth={2.25} aria-hidden />
                <span className="text-[22px] font-bold leading-none text-foreground">{metricsDisplay.friends}</span>
                <span className="text-[11px] font-medium leading-none text-muted-foreground">Amis</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1">
                <Shield className="h-[22px] w-[22px] text-[#1d7bff]" strokeWidth={2.25} aria-hidden />
                <span className="text-[22px] font-bold leading-none text-foreground">{metricsDisplay.clubs}</span>
                <span className="text-[11px] font-medium leading-none text-muted-foreground">Clubs</span>
              </div>
            </div>
          </div>

          {showRecordsSection ? (
            <section className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
                <h2 className="text-[16px] font-bold text-foreground">Records</h2>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-[#1d7bff] active:opacity-70"
                  onClick={() => navigate("/profile/records")}
                >
                  Voir tout
                  <ChevronRight className="h-3 w-3" strokeWidth={2.75} aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {recordPreviews.map((r, idx) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex min-w-0 flex-col rounded-[14px] px-2.5 py-2 text-white",
                      r.tone === "navy" ? "bg-[#1a2547]" : "bg-[#321f4f]"
                    )}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-1.5">
                      {idx === 0 ? (
                        <Footprints className="h-[14px] w-[14px] shrink-0" strokeWidth={2.25} aria-hidden />
                      ) : (
                        <Timer className="h-[14px] w-[14px] shrink-0" strokeWidth={2.25} aria-hidden />
                      )}
                      <span className="truncate text-[11px] font-semibold text-white/85">{r.label}</span>
                    </div>
                    <span className="mt-1 text-[18px] font-bold leading-tight tracking-tight">{r.value}</span>
                    {r.dateLabel ? (
                      <p className="mt-0.5 text-[10px] font-medium text-white/65">{r.dateLabel}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="min-w-0 space-y-2">
            <h2 className="px-0.5 text-[16px] font-bold text-foreground">Paramètres</h2>
            <div className="overflow-hidden rounded-[16px] border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {settingsRows.map((row, i) => (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-muted/60",
                    i < settingsRows.length - 1 && "border-b border-border/55"
                  )}
                  onClick={row.onClick}
                >
                  <row.Icon className="h-[19px] w-[19px] shrink-0 text-[#1d7bff]" strokeWidth={2.25} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-foreground">{row.label}</span>
                  <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/55" strokeWidth={2.25} aria-hidden />
                </button>
              ))}
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
