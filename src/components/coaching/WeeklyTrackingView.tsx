import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Search, Bell, Loader2, AlertTriangle, ChevronDown, ChevronUp, TrendingUp, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { useSendNotification } from "@/hooks/useSendNotification";
import { useToast } from "@/hooks/use-toast";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { WeeklyPlanCard } from "./WeeklyPlanCard";

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
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

interface ParticipationInfo {
  coaching_session_id: string;
  user_id: string;
  status: string;
  athlete_note: string | null;
  completed_at: string | null;
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
  days: Record<string, DayData>;
  completedCount: number;
  totalCount: number;
  lateCount: number;
  weeklyVolumeKm: number;
}

const normalizeSearchValue = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/^@/, "").trim();

export const WeeklyTrackingView = ({ clubId, onClose }: WeeklyTrackingViewProps) => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { sendPushNotification } = useSendNotification();
  const { toast } = useToast();

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

      const allUserIds = (clubMembers || []).map(m => m.user_id).filter(id => id !== user?.id);
      if (allUserIds.length === 0) { setAthletes([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", allUserIds);

      const athleteMap: Record<string, AthleteData> = {};
      (profiles || []).forEach(p => {
        if (!p.user_id) return;
        athleteMap[p.user_id] = {
          userId: p.user_id, displayName: p.display_name || "Athlète",
          username: p.username || null, avatarUrl: p.avatar_url || null,
          days: {}, completedCount: 0, totalCount: 0, lateCount: 0, weeklyVolumeKm: 0,
        };
      });

      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString());

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
          else if (new Date(session.scheduled_at) < new Date()) athleteMap[p.user_id].lateCount++;
        });
      }

      setAthletes(Object.values(athleteMap).sort((a, b) => {
        if (a.totalCount > 0 && b.totalCount === 0) return -1;
        if (a.totalCount === 0 && b.totalCount > 0) return 1;
        if (a.totalCount > 0 && b.totalCount > 0) return b.completedCount - a.completedCount;
        return a.displayName.localeCompare(b.displayName);
      }));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalizeSearchValue(search);
    if (!q) return athletes;
    return athletes.filter(a => {
      const searchable = normalizeSearchValue(a.displayName) + normalizeSearchValue(a.username || "");
      return searchable.includes(q);
    });
  }, [athletes, search]);

  const getLateSessionTitles = (athlete: AthleteData): string[] => {
    const now = new Date();
    return Object.entries(athlete.days)
      .filter(([dayKey, d]) => new Date(dayKey) < now && d.status !== "completed")
      .map(([, d]) => d.sessionTitle);
  };

  const handleSendReminder = async (e: React.MouseEvent, athlete: AthleteData) => {
    e.stopPropagation();
    const lateTitles = getLateSessionTitles(athlete);
    if (lateTitles.length === 0) return;
    setSendingReminder(athlete.userId);
    try {
      await sendPushNotification(athlete.userId, "📋 Rappel coaching", `N'oublie pas : ${lateTitles.join(", ")}`, "coaching_reminder");
      toast({ title: "Rappel envoyé", description: `Notification envoyée à ${athlete.displayName}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer le rappel", variant: "destructive" });
    } finally {
      setSendingReminder(null);
    }
  };

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  // Global stats
  const globalStats = useMemo(() => {
    const withSessions = athletes.filter(a => a.totalCount > 0);
    const totalCompleted = withSessions.reduce((s, a) => s + a.completedCount, 0);
    const totalSessions = withSessions.reduce((s, a) => s + a.totalCount, 0);
    const totalLate = withSessions.reduce((s, a) => s + a.lateCount, 0);
    const avgPct = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;
    return { activeCount: withSessions.length, totalCompleted, totalSessions, totalLate, avgPct };
  }, [athletes]);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="bg-card rounded-2xl p-4 border border-border/30">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="text-center">
            <p className="text-[17px] font-bold text-foreground">{weekLabel}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Suivi des athlètes</p>
          </div>
          <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-[18px] font-bold text-foreground">{globalStats.activeCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Athlètes</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-[18px] font-bold text-foreground">{globalStats.avgPct}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Complétion</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-orange-500 mb-1" />
            <p className="text-[18px] font-bold text-foreground">{globalStats.totalLate}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">En retard</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un athlète..."
          className="pl-10 bg-card border-border/30 rounded-2xl h-11 text-[15px]"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border/30">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-[16px] font-semibold text-foreground mb-1">
            {search ? "Aucun athlète trouvé" : "Aucune donnée"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {search ? "Essayez un autre nom" : "Aucun athlète avec des séances cette semaine"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(athlete => {
            const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : 0;
            const isExpanded = expandedAthlete === athlete.userId;
            const lateTitles = getLateSessionTitles(athlete);
            const hasLate = lateTitles.length > 0;
            const isSending = sendingReminder === athlete.userId;
            const hasNotes = Object.values(athlete.days).some(d => d.note);

            return (
              <div key={athlete.userId} className="bg-card rounded-2xl overflow-hidden border border-border/30">
                {/* Header */}
                <div
                  className="p-4 cursor-pointer active:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedAthlete(isExpanded ? null : athlete.userId)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {athlete.avatarUrl ? (
                        <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[15px] font-bold text-muted-foreground">
                          {athlete.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[16px] font-semibold text-foreground truncate">{athlete.displayName}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {hasLate && (
                            <button
                              onClick={(e) => handleSendReminder(e, athlete)}
                              disabled={isSending}
                              className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 active:scale-95 transition-transform"
                              title={`Relancer (${lateTitles.length} en retard)`}
                            >
                              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                            </button>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : athlete.totalCount > 0 ? "destructive" : "secondary"}
                          className="text-[11px] px-2 py-0.5 rounded-lg"
                        >
                          {athlete.totalCount === 0 ? "Pas de plan" : pct >= 80 ? `✅ ${pct}%` : pct >= 50 ? `⚡ ${pct}%` : `🔴 ${pct}%`}
                        </Badge>
                        <span className="text-[12px] text-muted-foreground">
                          {athlete.completedCount}/{athlete.totalCount} séances
                        </span>
                        {athlete.weeklyVolumeKm > 0 && (
                          <span className="text-[12px] font-medium text-primary">
                            {Math.round(athlete.weeklyVolumeKm * 10) / 10} km
                          </span>
                        )}
                        {hasNotes && (
                          <span className="text-[12px] text-muted-foreground">💬</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {athlete.totalCount > 0 && (
                    <div className="mt-3">
                      <Progress value={pct} className="h-1.5 rounded-full" />
                    </div>
                  )}

                  {/* Weekly dots */}
                  {athlete.totalCount > 0 && (
                    <div className="grid grid-cols-7 gap-1 mt-3">
                      {weekDays.map((day, i) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayData = athlete.days[dayKey];
                        const status = dayData?.status;
                        const today = isToday(day);

                        return (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className={`text-[10px] font-medium ${today ? "text-primary" : "text-muted-foreground/60"}`}>
                              {DAY_SHORT[i]}
                            </span>
                            <div className={`h-6 w-6 rounded-lg flex items-center justify-center text-[11px] font-semibold ${
                              status === "completed"
                                ? "bg-green-500/15 text-green-600"
                                : status === "scheduled" || status === "sent"
                                  ? "bg-orange-400/15 text-orange-500"
                                  : "bg-secondary/50 text-muted-foreground/30"
                            }`}>
                              {format(day, "d")}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && athlete.totalCount > 0 && (
                  <div className="border-t border-border/30">
                    {/* Volume & late summary */}
                    <div className="px-4 py-3 flex items-center gap-4 text-[13px] bg-secondary/30">
                      <span className="text-muted-foreground">
                        📏 Volume : <strong className="text-foreground">{Math.round(athlete.weeklyVolumeKm * 10) / 10} km</strong>
                      </span>
                      {athlete.lateCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive font-medium">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {athlete.lateCount} en retard
                        </span>
                      )}
                    </div>

                    {/* Bar chart */}
                    <div className="px-4 py-3">
                      <WeeklyBarChart
                        sessions={Object.values(athlete.days).map(d => d.session)}
                        weekDays={weekDays}
                      />
                    </div>

                    {/* Session cards */}
                    <div className="px-3 pb-4 space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                        Détail des séances
                      </p>
                      {weekDays.map((day) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayData = athlete.days[dayKey];
                        if (!dayData) return null;

                        return (
                          <div key={dayKey}>
                            <WeeklyPlanCard
                              session={dayData.session}
                              isDone={dayData.status === "completed"}
                              noteValue={dayData.note || undefined}
                              showCheckbox={false}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
