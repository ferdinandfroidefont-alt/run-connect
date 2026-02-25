import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IOSListGroup } from "@/components/ui/ios-list-item";
import { ChevronLeft, ChevronRight, Search, MessageSquare, Bell, Loader2, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
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
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/^@/, "")
    .trim();

export const WeeklyTrackingView = ({ clubId, onClose }: WeeklyTrackingViewProps) => {
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

  useEffect(() => { loadTracking(); }, [clubId, currentWeek]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, distance_km, rcc_code, activity_type, objective, pace_target")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString());

      if (!sessions || sessions.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      const sessionMap: Record<string, SessionInfo> = {};
      sessions.forEach(s => { sessionMap[s.id] = s; });

      const { data: participations } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id, user_id, status, athlete_note, completed_at")
        .in("coaching_session_id", sessionIds);

      const userIds = [...new Set((participations || []).map(p => p.user_id))];
      if (userIds.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; username: string | null; avatar: string | null }> = {};
      (profiles || []).forEach(p => {
        profileMap[p.user_id!] = { name: p.display_name || "Athlète", username: p.username || null, avatar: p.avatar_url };
      });

      const athleteMap: Record<string, AthleteData> = {};

      (participations || []).forEach(p => {
        if (!athleteMap[p.user_id]) {
          const profile = profileMap[p.user_id];
          athleteMap[p.user_id] = {
            userId: p.user_id,
            displayName: profile?.name || "Athlète",
            username: profile?.username || null,
            avatarUrl: profile?.avatar || null,
            days: {},
            completedCount: 0,
            totalCount: 0,
            lateCount: 0,
            weeklyVolumeKm: 0,
          };
        }

        const session = sessionMap[p.coaching_session_id];
        if (!session) return;

        const dayKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
        athleteMap[p.user_id].days[dayKey] = {
          status: p.status,
          note: p.athlete_note,
          sessionTitle: session.title,
          sessionId: session.id,
          session,
        };
        athleteMap[p.user_id].totalCount++;
        athleteMap[p.user_id].weeklyVolumeKm += Number(session.distance_km) || 0;
        if (p.status === "completed") {
          athleteMap[p.user_id].completedCount++;
        } else if (new Date(session.scheduled_at) < new Date()) {
          athleteMap[p.user_id].lateCount++;
        }
      });

      setAthletes(Object.values(athleteMap).sort((a, b) => b.completedCount - a.completedCount));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = normalizeSearchValue(search);
    if (!q) return athletes;

    return athletes.filter((athlete) => {
      const displayName = normalizeSearchValue(athlete.displayName);
      const username = normalizeSearchValue(athlete.username || "");
      const searchable = `${displayName}${username}`;
      return searchable.includes(q);
    });
  }, [athletes, search]);

  const getLateSessionTitles = (athlete: AthleteData): string[] => {
    const now = new Date();
    return Object.entries(athlete.days)
      .filter(([dayKey, d]) => {
        const sessionDate = new Date(dayKey);
        return sessionDate < now && d.status !== "completed";
      })
      .map(([, d]) => d.sessionTitle);
  };

  const handleSendReminder = async (e: React.MouseEvent, athlete: AthleteData) => {
    e.stopPropagation();
    const lateTitles = getLateSessionTitles(athlete);
    if (lateTitles.length === 0) return;

    setSendingReminder(athlete.userId);
    try {
      const body = `N'oublie pas : ${lateTitles.join(", ")}`;
      await sendPushNotification(
        athlete.userId,
        "📋 Rappel coaching",
        body,
        "coaching_reminder"
      );
      toast({ title: "Rappel envoyé", description: `Notification envoyée à ${athlete.displayName}` });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible d'envoyer le rappel", variant: "destructive" });
    } finally {
      setSendingReminder(null);
    }
  };

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un athlète..."
          className="pl-9 bg-card border border-border rounded-[10px] h-9 text-[15px]"
        />
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
        <span className="text-[15px] font-medium text-foreground min-w-[140px] text-center">
          {weekLabel}
        </span>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 px-1">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center">
            <span className="text-[11px] text-muted-foreground font-medium">{DAY_SHORT[i]}</span>
            <p className="text-[13px] font-medium text-foreground">{format(day, "d")}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-[10px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">
            {search ? "Aucun athlète trouvé" : "Aucune donnée cette semaine"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(athlete => {
            const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : 0;
            const isExpanded = expandedAthlete === athlete.userId;
            const hasNotes = Object.values(athlete.days).some(d => d.note);
            const lateTitles = getLateSessionTitles(athlete);
            const hasLate = lateTitles.length > 0;
            const isSending = sendingReminder === athlete.userId;

            return (
              <IOSListGroup key={athlete.userId}>
                {/* Athlete header */}
                <div
                  className="px-4 py-3 bg-card cursor-pointer"
                  onClick={() => setExpandedAthlete(isExpanded ? null : athlete.userId)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {athlete.avatarUrl ? (
                        <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[13px] font-semibold text-muted-foreground">
                          {athlete.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-medium text-foreground truncate">{athlete.displayName}</p>
                        <div className="flex items-center gap-1.5">
                          {/* Status badge */}
                          <Badge
                            variant={pct >= 80 ? "success" : pct >= 50 ? "warning" : "destructive"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {pct >= 80 ? "OK" : pct >= 50 ? "Fatigue" : "Alerte"}
                          </Badge>
                          {hasLate && (
                            <button
                              onClick={(e) => handleSendReminder(e, athlete)}
                              disabled={isSending}
                              className="p-1 rounded-md hover:bg-secondary transition-colors text-orange-500"
                              title={`Relancer (${lateTitles.length} en retard)`}
                            >
                              {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Bell className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {hasNotes && <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                          <span className="text-[13px] font-semibold text-primary">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly calendar dots */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day, i) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayData = athlete.days[dayKey];
                      const status = dayData?.status;

                      let dotClass = "bg-muted"; // no session
                      if (status === "completed") dotClass = "bg-green-500";
                      else if (status === "scheduled" || status === "sent") dotClass = "bg-orange-400";

                      return (
                        <div key={i} className="flex justify-center">
                          <div className={`h-3 w-3 rounded-full ${dotClass}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>

                {/* Expanded: bar chart + session cards */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Volume & late summary */}
                    <div className="px-4 py-2.5 bg-card flex items-center gap-4 text-[12px]">
                      <span className="text-muted-foreground">
                        📏 Volume : <strong className="text-foreground">{Math.round(athlete.weeklyVolumeKm * 10) / 10} km</strong>
                      </span>
                      {athlete.lateCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          {athlete.lateCount} en retard
                        </span>
                      )}
                    </div>

                    {/* Bar chart */}
                    <div className="px-4 py-2 bg-card">
                      <WeeklyBarChart
                        sessions={Object.values(athlete.days).map(d => d.session)}
                        weekDays={weekDays}
                      />
                    </div>

                    {/* Session cards */}
                    <div className="px-3 pb-3 space-y-2">
                      {weekDays.map((day) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayData = athlete.days[dayKey];
                        if (!dayData) return null;

                        return (
                          <WeeklyPlanCard
                            key={dayKey}
                            session={dayData.session}
                            isDone={dayData.status === "completed"}
                            noteValue={dayData.note || undefined}
                            showCheckbox={false}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </IOSListGroup>
            );
          })}
        </div>
      )}
    </div>
  );
};
