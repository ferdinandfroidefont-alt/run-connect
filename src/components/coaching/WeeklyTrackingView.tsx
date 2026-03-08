import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Search, ChevronRight as ChevronRightIcon, CheckCircle2, MessageSquare, Calendar, ClipboardList, Bell, TrendingUp, TrendingDown, Flame, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { ActivityIcon } from "@/lib/activityIcons";
import { toast } from "sonner";

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
  selectedAthleteId: string | null;
  onSelectAthlete: (id: string | null) => void;
  onOpenPlanForAthlete?: (athleteId: string, athleteName: string, groupId?: string, weekDate?: Date) => void;
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
}

interface DayData {
  status: string;
  note: string | null;
  sessionTitle: string;
  sessionId: string;
  session: SessionInfo;
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

export const WeeklyTrackingView = ({ clubId, onClose, selectedAthleteId, onSelectAthlete, onOpenPlanForAthlete }: WeeklyTrackingViewProps) => {
  const { user } = useAuth();
  const { sendPushNotification } = useSendNotification();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [fourWeekVolume, setFourWeekVolume] = useState<{ current: number; previous: number } | null>(null);
  const [completionStreak, setCompletionStreak] = useState(0);

  const [activeTab, setActiveTab] = useState("sessions");

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
        supabase.from("coaching_sessions")
          .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target")
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
          .select("coaching_session_id, user_id, status, athlete_note, completed_at")
          .in("coaching_session_id", sessionIds);

        (participations || []).forEach(p => {
          if (!athleteMap[p.user_id]) return;
          const session = sessionMap[p.coaching_session_id];
          if (!session) return;
          const dayKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
          athleteMap[p.user_id].days[dayKey] = { status: p.status, note: p.athlete_note, sessionTitle: session.title, sessionId: session.id, session };
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

  // Volume by objective type
  const getVolumeByType = useCallback((athlete: AthleteData) => {
    const volumes: Record<string, number> = {};
    Object.values(athlete.days).forEach(d => {
      const key = d.session.objective || d.session.title || "Autre";
      volumes[key] = (volumes[key] || 0) + (Number(d.session.distance_km) || 0);
    });
    return Object.entries(volumes)
      .filter(([, km]) => km > 0)
      .sort((a, b) => b[1] - a[1]);
  }, []);

  // ==================== MODE LISTE ====================
  if (!selectedAthlete) {
    return (
      <div className="space-y-4">
        {/* Reminder button */}
        <div className="px-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl h-10 gap-2 text-[13px] font-semibold"
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Relancer les athlètes en retard
          </Button>
        </div>
        {/* Search */}
        <div className="relative px-4">
          <Search className="absolute left-7.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un athlète..."
            className="pl-10 bg-card border-border/30 rounded-2xl h-11 text-[15px]"
          />
        </div>

        {loading ? (
          <div className="space-y-1">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-card animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card p-8 text-center">
            <p className="text-[16px] font-semibold text-foreground mb-1">
              {search ? "Aucun athlète trouvé" : "Aucun athlète"}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {search ? "Essayez un autre nom" : "Aucun membre dans ce club"}
            </p>
          </div>
        ) : (
          <div className="bg-card overflow-hidden">
            {filtered.map((athlete, idx) => {
              const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : -1;
              return (
                <div key={athlete.userId}>
                  {idx > 0 && <div className="h-px bg-border/30 ml-[60px]" />}
                  <button
                    onClick={() => onSelectAthlete(athlete.userId)}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 transition-colors text-left"
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
  const volumeByType = getVolumeByType(selectedAthlete);

  return (
    <div className="space-y-4">
      {/* Profile hero */}
      <div className="bg-card p-4 flex flex-col items-center text-center">
        <div className="h-[72px] w-[72px] rounded-full bg-secondary flex items-center justify-center overflow-hidden mb-3">
          {selectedAthlete.avatarUrl ? (
            <img src={selectedAthlete.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[24px] font-bold text-muted-foreground">
              {selectedAthlete.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <p className="text-[18px] font-bold text-foreground">{selectedAthlete.displayName}</p>
        {selectedAthlete.username && (
          <p className="text-[14px] text-muted-foreground mt-0.5">@{selectedAthlete.username}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {selectedAthlete.groupName && (
            <Badge
              className="text-[11px] px-2 py-0.5 rounded-lg border-0"
              style={{ backgroundColor: `${selectedAthlete.groupColor}20`, color: selectedAthlete.groupColor || undefined }}
            >
              {selectedAthlete.groupName}
            </Badge>
          )}
          {selectedAthlete.age && (
            <Badge variant="outline" className="text-[11px] px-2 py-0.5 rounded-lg">
              {selectedAthlete.age} ans
            </Badge>
          )}
        </div>
      </div>

      {/* Week navigation */}
      <div className="bg-card p-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="h-4 w-4 text-primary" />
          </button>
          <p className="text-[15px] font-semibold text-foreground">{weekLabel}</p>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        </div>

        {/* Mini calendar */}
        <div className="grid grid-cols-7 gap-1 mt-3">
          {weekDays.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayData = selectedAthlete.days[dayKey];
            const status = dayData?.status;
            const today = isToday(day);

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-medium ${today ? "text-primary" : "text-muted-foreground/60"}`}>
                  {DAY_SHORT[i]}
                </span>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                  status === "completed"
                    ? "bg-green-500 text-white"
                    : status === "scheduled" || status === "sent"
                      ? "bg-primary/15 text-primary"
                      : today
                        ? "bg-secondary text-foreground ring-1 ring-primary/30"
                        : "bg-transparent text-muted-foreground/40"
                }`}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats card */}
      <div className="bg-card p-4">
        <div className="flex items-center gap-4">
          <ProgressRing percent={pct} />
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              {selectedAthlete.completedCount}/{selectedAthlete.totalCount} séances faites
            </p>
            {selectedAthlete.weeklyVolumeKm > 0 && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                📏 {Math.round(selectedAthlete.weeklyVolumeKm * 10) / 10} km cette semaine
              </p>
            )}
          </div>
        </div>

        {/* 4-week trends & streak */}
        {(fourWeekVolume || completionStreak > 0) && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/20">
            {fourWeekVolume && (
              <div className="flex items-center gap-1.5">
                {fourWeekVolume.current >= fourWeekVolume.previous ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-[12px] text-muted-foreground">
                  {Math.round(fourWeekVolume.current * 10) / 10} km / 4 sem
                </span>
              </div>
            )}
            {completionStreak > 0 && (
              <Badge className="bg-orange-500/15 text-orange-600 border-0 rounded-lg text-[11px] px-2 py-0.5 gap-1">
                <Flame className="h-3 w-3" />
                {completionStreak} séances d'affilée
              </Badge>
            )}
          </div>
        )}
            ))}
          </div>
        )}
      </div>

      {/* Tabs: Séances | Commentaires */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full bg-secondary/50 rounded-xl p-1 mx-4 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="sessions" className="flex-1 rounded-lg text-[14px] gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" />
            Séances
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 rounded-lg text-[14px] gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            Commentaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-3">
          {selectedAthlete.totalCount === 0 ? (
            <div className="bg-card p-6 text-center">
              <p className="text-[14px] text-muted-foreground">Aucune séance cette semaine</p>
            </div>
          ) : (
            <div className="bg-card overflow-hidden">
              {weekDays.map((day, idx) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const dayData = selectedAthlete.days[dayKey];
                if (!dayData) return null;

                const isDone = dayData.status === "completed";

                return (
                  <div key={dayKey}>
                    {idx > 0 && <div className="h-px bg-border/30 ml-4" />}
                    <div className="flex items-start gap-3 px-4 py-3">
                      {/* Activity icon */}
                      <ActivityIcon activityType={dayData.session.activity_type} size="sm" className="mt-0.5" />

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-foreground truncate">{dayData.sessionTitle}</p>
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-border/50 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge className={`text-[10px] px-1.5 py-0 rounded-md border-0 ${getObjectiveColor(dayData.session.objective)}`}>
                            {DAY_FULL[eachDayOfInterval({ start: weekStart, end: day }).length - 1]}
                          </Badge>
                          {dayData.session.objective && (
                            <span className="text-[12px] text-muted-foreground">{dayData.session.objective}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {dayData.session.distance_km && (
                            <span className="text-[12px] font-medium text-primary">
                              📏 {Math.round(Number(dayData.session.distance_km) * 10) / 10} km
                            </span>
                          )}
                          {dayData.session.pace_target && (
                            <span className="text-[12px] text-muted-foreground">
                              ⏱ {dayData.session.pace_target}
                            </span>
                          )}
                        </div>
                        {dayData.session.rcc_code && (
                          <p className="text-[12px] font-mono text-muted-foreground mt-1">
                            {dayData.session.rcc_code}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-3">
          {(() => {
            const notes = Object.entries(selectedAthlete.days)
              .filter(([, d]) => d.note)
              .sort(([a], [b]) => a.localeCompare(b));

            if (notes.length === 0) {
              return (
                <div className="bg-card p-6 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-[14px] text-muted-foreground">Aucun commentaire cette semaine</p>
                </div>
              );
            }

            return (
              <div className="bg-card overflow-hidden">
                {notes.map(([dayKey, dayData], idx) => (
                  <div key={dayKey}>
                    {idx > 0 && <div className="h-px bg-border/30 ml-4" />}
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] px-1.5 py-0.5 rounded-md border-0 ${getObjectiveColor(dayData.session.objective)}`}>
                          {format(new Date(dayKey), "EEE d", { locale: fr })}
                        </Badge>
                        <span className="text-[13px] font-medium text-foreground">{dayData.sessionTitle}</span>
                      </div>
                      <p className="text-[14px] text-muted-foreground leading-relaxed">{dayData.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Continuer le plan button */}
      {onOpenPlanForAthlete && (
        <div className="px-4">
        <Button
          onClick={() => {
            onOpenPlanForAthlete(selectedAthlete.userId, selectedAthlete.displayName, selectedAthlete.groupId || undefined, currentWeek);
          }}
          className="w-full rounded-2xl h-12 text-[15px] font-semibold gap-2"
        >
          <ClipboardList className="h-4.5 w-4.5" />
          Continuer le plan pour {selectedAthlete.displayName.split(" ")[0]}
        </Button>
        </div>
      )}
    </div>
  );
};
