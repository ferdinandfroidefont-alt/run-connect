import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronRight as ChevronRightIcon,
  ClipboardList,
  Bell,
  Loader2,
  CalendarDays,
  MessageCircle,
  Send,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { coachingRowToWeekSession } from "@/lib/coachingWeekSessionImport";
import type { WeekSession } from "@/components/coaching/WeeklyPlanSessionEditor";
import { parseAthleteBlockRpeFelt } from "@/lib/sessionBlockRpe";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "@/lib/coachingMessaging";
import { AthleteHeader } from "@/components/coaching/tracking/AthleteHeader";
import { AthleteSessionCard } from "@/components/coaching/tracking/AthleteSessionCard";

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string | null) => void;
  onOpenPlanForAthlete?: (
    athleteId: string,
    athleteName: string,
    groupId?: string,
    weekDate?: Date,
    seedSessions?: WeekSession[],
  ) => void;
}

interface SessionInfo {
  id: string;
  title: string;
  scheduled_at: string;
  distance_km: number | null;
  rcc_code: string | null;
  activity_type: string;
  objective: string | null;
  pace_target: string | null;
  rpe: number | null;
  rpe_phases: unknown;
}

interface DayData {
  status: string;
  note: string | null;
  sessionTitle: string;
  sessionId: string;
  session: SessionInfo;
  athleteRpeFelt: unknown;
}

interface AthleteData {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  age: number | null;
  groupId: string | null;
  groupName: string | null;
  groupColor: string | null;
  days: Record<string, DayData>;
  completedCount: number;
  totalCount: number;
  weeklyVolumeKm: number;
}

const normalizeSearchValue = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/^@/, "").trim();

const getObjectiveColor = (objective: string | null): string => {
  if (!objective) return "bg-muted text-muted-foreground";
  const o = objective.toLowerCase();
  if (o.includes("vma") || o.includes("interval")) return "bg-red-500/15 text-red-600";
  if (o.includes("seuil") || o.includes("tempo")) return "bg-orange-500/15 text-orange-600";
  if (o.includes("recup") || o.includes("récup")) return "bg-emerald-500/15 text-emerald-600";
  if (o.includes("endurance") || o.includes("footing") || o.includes("ef") || o.includes("sortie longue")) return "bg-green-500/15 text-green-600";
  if (o.includes("spe") || o.includes("spé")) return "bg-violet-500/15 text-violet-600";
  return "bg-primary/10 text-primary";
};

const ProgressRing = ({ percent, size = 64, strokeWidth = 5 }: { percent: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 80 ? "stroke-green-500" : percent >= 50 ? "stroke-orange-500" : "stroke-red-500";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-secondary" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className={color}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[15px] font-bold"
        style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
        {percent}%
      </text>
    </svg>
  );
};

type UiDayStatus = "done" | "missed" | "pending" | "none";

const STATUS_CHIP_BY_DAY: Record<UiDayStatus, { short: string; className: string }> = {
  done: { short: "Fait", className: "bg-emerald-500 text-white" },
  missed: { short: "Non fait", className: "bg-red-500 text-white" },
  pending: { short: "En attente", className: "bg-orange-400 text-white" },
  none: { short: "Aucune", className: "bg-zinc-300 text-white dark:bg-zinc-600" },
};

const toUiStatus = (status?: string): UiDayStatus => {
  if (status === "completed") return "done";
  if (status === "missed") return "missed";
  if (status === "pending") return "pending";
  return "none";
};

export const WeeklyTrackingView = ({ clubId, selectedAthleteId, onSelectAthlete, onOpenPlanForAthlete }: WeeklyTrackingViewProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendPushNotification } = useSendNotification();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [fourWeekVolume, setFourWeekVolume] = useState<{ current: number; previous: number } | null>(null);
  const [completionStreak, setCompletionStreak] = useState(0);

  const openConversationWithAthlete = useCallback(
    async (athleteId: string) => {
      if (!user) return;
      try {
        const conversationId = await getOrCreateDirectConversation(user.id, athleteId);
        navigate(`/messages?conversation=${conversationId}`);
      } catch (error) {
        console.error("Error opening athlete conversation:", error);
        toast.error("Impossible d'ouvrir la messagerie");
      }
    },
    [navigate, user]
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleRescheduleSession = useCallback(
    async (sessionId: string) => {
      if (!onOpenPlanForAthlete || !selectedAthleteId) return;
      const athlete = athletes.find((a) => a.userId === selectedAthleteId);
      if (!athlete) return;
      const { data, error } = await supabase.from("coaching_sessions").select("*").eq("id", sessionId).single();
      if (error || !data) {
        toast.error("Impossible de charger la séance");
        return;
      }
      const ws = coachingRowToWeekSession(data);
      onOpenPlanForAthlete(athlete.userId, athlete.displayName, athlete.groupId || undefined, currentWeek, [ws]);
    },
    [onOpenPlanForAthlete, selectedAthleteId, athletes, currentWeek],
  );

  const [initialNavDone, setInitialNavDone] = useState(false);
  useEffect(() => {
    if (initialNavDone) return;
    const findLatestWeek = async () => {
      const { data: latestSession } = await supabase
        .from("coaching_sessions")
        .select("scheduled_at")
        .eq("club_id", clubId)
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .single();
      if (latestSession) {
        const latestDate = new Date(latestSession.scheduled_at);
        const latestWeekStart = startOfWeek(latestDate, { weekStartsOn: 1 });
        if (latestWeekStart.getTime() !== weekStart.getTime()) {
          setCurrentWeek(latestDate);
        }
      }
      setInitialNavDone(true);
    };
    findLatestWeek();
  }, [clubId]);

  useEffect(() => { loadTracking(); }, [clubId, currentWeek]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const { data: clubMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId);

      const allUserIds = (clubMembers || []).map(m => m.user_id);
      if (allUserIds.length === 0) { setAthletes([]); setLoading(false); return; }

      // Load profiles, groups, and sessions in parallel
      const [profilesRes, groupsRes, groupMembersRes, sessionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url, age").in("user_id", allUserIds),
        supabase.from("club_groups").select("id, name, color").eq("club_id", clubId),
        supabase.from("club_group_members").select("user_id, group_id").in("user_id", allUserIds),
        supabase
          .from("coaching_sessions")
          .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target, rpe, rpe_phases")
          .eq("club_id", clubId)
          .gte("scheduled_at", weekStart.toISOString())
          .lte("scheduled_at", weekEnd.toISOString()),
      ]);

      // Build group lookup: userId -> { name, color }
      const groupMap: Record<string, { name: string; color: string }> = {};
      (groupsRes.data || []).forEach(g => { groupMap[g.id] = { name: g.name, color: g.color }; });
      const userGroupMap: Record<string, { id: string; name: string; color: string }> = {};
      (groupMembersRes.data || []).forEach(gm => {
        if (groupMap[gm.group_id]) userGroupMap[gm.user_id] = { id: gm.group_id, ...groupMap[gm.group_id] };
      });

      const athleteMap: Record<string, AthleteData> = {};
      (profilesRes.data || []).forEach(p => {
        if (!p.user_id) return;
        const grp = userGroupMap[p.user_id];
        athleteMap[p.user_id] = {
          userId: p.user_id, displayName: p.display_name || "Athlète",
          username: p.username || null, avatarUrl: p.avatar_url || null,
          age: p.age || null,
          groupId: grp?.id || null, groupName: grp?.name || null, groupColor: grp?.color || null,
          days: {}, completedCount: 0, totalCount: 0, weeklyVolumeKm: 0,
        };
      });

      const sessions = sessionsRes.data;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const sessionMap: Record<string, SessionInfo> = {};
        sessions.forEach(s => { sessionMap[s.id] = s; });

        const { data: participations } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id, user_id, status, athlete_note, completed_at, athlete_rpe_felt")
          .in("coaching_session_id", sessionIds);

        (participations || []).forEach(p => {
          if (!athleteMap[p.user_id]) return;
          const session = sessionMap[p.coaching_session_id];
          if (!session) return;
          const dayKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
          athleteMap[p.user_id].days[dayKey] = {
            status: p.status,
            note: p.athlete_note,
            sessionTitle: session.title,
            sessionId: session.id,
            session,
            athleteRpeFelt: (p as { athlete_rpe_felt?: unknown }).athlete_rpe_felt ?? null,
          };
          athleteMap[p.user_id].totalCount++;
          athleteMap[p.user_id].weeklyVolumeKm += Number(session.distance_km) || 0;
          if (p.status === "completed") athleteMap[p.user_id].completedCount++;
        });
      }

      setAthletes(Object.values(athleteMap).sort((a, b) => {
        if (a.totalCount > 0 && b.totalCount === 0) return -1;
        if (a.totalCount === 0 && b.totalCount > 0) return 1;
        return a.displayName.localeCompare(b.displayName);
      }));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`weekly-tracking-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coaching_participations" },
        () => {
          void loadTracking();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void loadTracking();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clubId, user, currentWeek]);

  // Load 4-week volume stats for selected athlete
  useEffect(() => {
    if (!selectedAthleteId) return;
    const load4WeekStats = async () => {
      const w0 = startOfWeek(currentWeek, { weekStartsOn: 1 });
      const w4ago = subWeeks(w0, 4);
      const { data: sessions4w } = await supabase
        .from("coaching_sessions")
        .select("id, distance_km, scheduled_at")
        .eq("club_id", clubId)
        .gte("scheduled_at", w4ago.toISOString())
        .lte("scheduled_at", endOfWeek(currentWeek, { weekStartsOn: 1 }).toISOString());
      if (!sessions4w || sessions4w.length === 0) { setFourWeekVolume(null); return; }
      const sessionIds = sessions4w.map(s => s.id);
      const { data: parts } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id, status")
        .eq("user_id", selectedAthleteId)
        .in("coaching_session_id", sessionIds);
      if (!parts) { setFourWeekVolume(null); return; }

      const completedIds = new Set(parts.filter(p => p.status === "completed").map(p => p.coaching_session_id));
      let currentVol = 0, prevVol = 0;
      const w2ago = subWeeks(w0, 2);
      sessions4w.forEach(s => {
        if (!completedIds.has(s.id)) return;
        const km = Number(s.distance_km) || 0;
        if (new Date(s.scheduled_at) >= w2ago) currentVol += km;
        else prevVol += km;
      });
      setFourWeekVolume({ current: currentVol, previous: prevVol });

      // Compute streak
      let streak = 0;
      const allParts = parts.filter(p => p.status === "completed").map(p => p.coaching_session_id);
      const weekSessions = sessions4w
        .filter(s => new Date(s.scheduled_at) <= new Date())
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      for (const s of weekSessions) {
        if (allParts.includes(s.id)) streak++;
        else break;
      }
      setCompletionStreak(streak);
    };
    load4WeekStats();
  }, [selectedAthleteId, clubId, currentWeek]);

  // Send reminder to athletes who haven't completed past sessions
  const handleSendReminder = async () => {
    const now = new Date();
    const lateAthletes = athletes.filter(a => {
      return Object.entries(a.days).some(([dayKey, d]) => {
        return new Date(dayKey) < now && d.status !== "completed";
      });
    });
    if (lateAthletes.length === 0) {
      toast.info("Tous les athlètes sont à jour !");
      return;
    }
    setSendingReminder(true);
    try {
      await Promise.all(
        lateAthletes.map(a =>
          sendPushNotification(a.userId, "⏰ Rappel de votre coach", "N'oubliez pas de valider vos séances !", "coaching_reminder")
        )
      );
      toast.success(`Rappel envoyé à ${lateAthletes.length} athlète${lateAthletes.length > 1 ? "s" : ""}`);
    } catch (e) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReminder(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalizeSearchValue(search);
    if (!q) return athletes;
    return athletes.filter(a => {
      const searchable = normalizeSearchValue(a.displayName) + normalizeSearchValue(a.username || "") + normalizeSearchValue(a.groupName || "");
      return searchable.includes(q);
    });
  }, [athletes, search]);

  const selectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null;
    return athletes.find(a => a.userId === selectedAthleteId) || null;
  }, [athletes, selectedAthleteId]);


  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  // ==================== MODE LISTE ====================
  if (!selectedAthlete) {
    return (
      <div className="space-y-0">
        {/* Reminder button */}
        <div className="border-b border-border bg-card px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-full gap-2 rounded-lg text-[13px] font-semibold"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Relancer les athlètes en retard
          </Button>
        </div>
        {/* Search */}
        <div className="border-b border-border bg-card px-4 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un athlète..."
              className="h-10 rounded-lg border-border/60 bg-background pl-9 text-[15px]"
            />
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border border-b border-border bg-card">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse bg-secondary/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-b border-border bg-secondary/30 px-4 py-10 text-center">
            <p className="mb-1 text-[16px] font-semibold text-foreground">
              {search ? "Aucun athlète trouvé" : "Aucun athlète"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {search ? "Essayez un autre nom" : "Aucun membre dans ce club"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border border-b border-border bg-card">
            {filtered.map((athlete, idx) => {
              const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : -1;
              return (
                <div key={athlete.userId}>
                  <button
                    onClick={() => onSelectAthlete(athlete.userId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-secondary/60"
                  >
                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {athlete.avatarUrl ? (
                        <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[15px] font-bold text-muted-foreground">
                          {athlete.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-semibold text-foreground truncate">{athlete.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {athlete.username && (
                          <span className="text-[13px] text-muted-foreground truncate">@{athlete.username}</span>
                        )}
                        {athlete.groupName && (
                          <Badge
                            className="text-[10px] px-1.5 py-0 rounded-md border-0"
                            style={{ backgroundColor: `${athlete.groupColor}20`, color: athlete.groupColor || undefined }}
                          >
                            {athlete.groupName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pct >= 0 && (
                        <Badge
                          variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "destructive"}
                          className="text-[11px] px-2 py-0.5 rounded-lg"
                        >
                          {pct}%
                        </Badge>
                      )}
                      <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==================== MODE DETAIL ====================
  const pct = selectedAthlete.totalCount > 0 ? Math.round((selectedAthlete.completedCount / selectedAthlete.totalCount) * 100) : 0;
  const sessionsForWeek = weekDays
    .map((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayData = selectedAthlete.days[dayKey];
      if (!dayData) return null;
      const status = toUiStatus(dayData.status);
      const felt = parseAthleteBlockRpeFelt(dayData.athleteRpeFelt, 12);
      const avgRpe = felt.length > 0 ? Math.round(felt.reduce((a, b) => a + b, 0) / felt.length) : null;
      const details = [
        dayData.session.distance_km ? `${Math.round(Number(dayData.session.distance_km) * 10) / 10} km` : "",
        dayData.session.pace_target ? `Allure ${dayData.session.pace_target}` : "",
      ]
        .filter(Boolean)
        .join(" • ");
      return {
        day,
        dayData,
        status,
        avgRpe,
        details: details || "Séance planifiée",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const trendPct = fourWeekVolume
    ? Math.round((((fourWeekVolume.current || 0) - (fourWeekVolume.previous || 0)) / Math.max(1, fourWeekVolume.previous || 0)) * 100)
    : 0;

  const handleResendSession = async () => {
    if (!selectedAthleteId) return;
    try {
      await sendPushNotification(
        selectedAthleteId,
        "📩 Rappel séance",
        "Ton coach vient de renvoyer la séance. Pense à la valider dès qu'elle est faite.",
        "coaching_session_resend"
      );
      toast.success("Séance renvoyée à l'athlète");
    } catch {
      toast.error("Impossible de renvoyer la séance");
    }
  };

  return (
    <div className="space-y-0 pb-[calc(1.25rem+var(--safe-area-bottom))]">
      <AthleteHeader
        displayName={selectedAthlete.displayName}
        avatarUrl={selectedAthlete.avatarUrl}
        username={selectedAthlete.username}
        groupName={selectedAthlete.groupName}
        status={pct >= 70 ? "active" : "late"}
        onMessage={() => void openConversationWithAthlete(selectedAthlete.userId)}
        onViewProfile={() => navigate(`/profile/${selectedAthlete.userId}`)}
      />

      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <ProgressRing percent={pct} />
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-semibold text-foreground">Cette semaine</p>
            <p className="text-[34px] font-black leading-none text-emerald-500">
              {selectedAthlete.completedCount} / {selectedAthlete.totalCount}
              <span className="ml-1 text-[21px] font-semibold text-foreground/70">séances</span>
            </p>
            <p className="text-[13px] text-muted-foreground">{pct}% complété</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-2 text-right">
            <p className={`text-[16px] font-semibold ${trendPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {trendPct >= 0 ? "+" : ""}
              {trendPct}%
            </p>
            <p className="text-[11px] text-muted-foreground">vs semaine dernière</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4 text-primary" />
          </button>
          <p className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            {weekLabel}
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </p>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayData = selectedAthlete.days[dayKey];
            const status = toUiStatus(dayData?.status);
            const conf = STATUS_CHIP_BY_DAY[status];
            return (
              <div key={dayKey} className="text-center">
                <p className="text-[11px] font-semibold text-foreground">{format(day, "EEE", { locale: fr }).slice(0, 3)}</p>
                <p className="text-[10px] text-muted-foreground">{format(day, "d", { locale: fr })}</p>
                <div className="mt-1 flex justify-center">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold shadow-sm ${conf.className}`}>
                    {status === "done" ? "✓" : status === "missed" ? "✕" : status === "pending" ? "⏳" : "–"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{conf.short}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 pb-3 pt-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[17px] font-semibold leading-tight text-foreground">Séances de la semaine</p>
          <button type="button" className="text-[13px] font-semibold text-primary">
            Tout voir
          </button>
        </div>
        <div className="flex flex-col divide-y divide-border border-t border-border">
          {sessionsForWeek.length === 0 ? (
            <div className="bg-secondary/20 px-3 py-6 text-center">
              <p className="text-[13px] text-muted-foreground">Aucune séance planifiée cette semaine.</p>
            </div>
          ) : (
            sessionsForWeek.map(({ day, dayData, status, avgRpe, details }) => (
              <AthleteSessionCard
                key={`${dayData.sessionId}-${format(day, "yyyy-MM-dd")}`}
                dayLabel={format(day, "EEE", { locale: fr }).toUpperCase()}
                dayNumber={format(day, "d", { locale: fr })}
                title={dayData.sessionTitle}
                details={details}
                status={status === "none" ? "pending" : status}
                note={dayData.note}
                rpeLabel={avgRpe != null ? `RPE ${avgRpe}/10` : undefined}
                objective={dayData.session.objective}
                onReply={() => void openConversationWithAthlete(selectedAthlete.userId)}
                onOpen={() => void handleRescheduleSession(dayData.sessionId)}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-border bg-border pt-0">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-none border-0 text-[11px] font-semibold bg-card"
          onClick={() => void openConversationWithAthlete(selectedAthlete.userId)}
        >
          <MessageCircle className="mr-1.5 h-4 w-4" />
          Envoyer message
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-none border-0 text-[11px] font-semibold bg-card"
          onClick={() =>
            onOpenPlanForAthlete?.(
              selectedAthlete.userId,
              selectedAthlete.displayName,
              selectedAthlete.groupId || undefined,
              currentWeek
            )
          }
        >
          <ClipboardList className="mr-1.5 h-4 w-4" />
          Modifier semaine
        </Button>
        <Button type="button" variant="outline" className="h-12 rounded-none border-0 text-[11px] font-semibold bg-card" onClick={() => void handleResendSession()}>
          <Send className="mr-1.5 h-4 w-4" />
          Renvoyer séance
        </Button>
      </div>
      {completionStreak > 0 ? (
        <p className="border-b border-border bg-secondary/20 px-4 py-2 text-center text-[11px] font-medium text-muted-foreground">
          Série en cours: {completionStreak} séance{completionStreak > 1 ? "s" : ""} validée{completionStreak > 1 ? "s" : ""}
        </p>
      ) : null}
    </div>
  );
};
