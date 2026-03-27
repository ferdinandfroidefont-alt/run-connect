import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, CalendarDays, ChevronLeft, ChevronRight, Trophy, Flame } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { WeeklyPlanCard } from "./WeeklyPlanCard";

interface CoachingSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  activity_type: string;
  distance_km: number | null;
  pace_target: string | null;
  status: string;
  coach_id: string;
  club_id: string;
  objective?: string | null;
  rcc_code?: string | null;
  rpe?: number | null;
  session_blocks?: unknown;
}

interface Participation {
  id: string;
  coaching_session_id: string;
  status: string;
  athlete_note: string | null;
  completed_at: string | null;
}

interface AthleteWeeklyViewProps {
  clubId: string;
  sessions: CoachingSession[];
  onSessionClick: (session: CoachingSession) => void;
}

export const AthleteWeeklyView = ({ clubId, sessions: parentSessions, onSessionClick }: AthleteWeeklyViewProps) => {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [participations, setParticipations] = useState<Record<string, Participation>>({});
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  const loadWeek = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // First fetch participations for this user in this club's sessions for the week
      const { data: allClubSessions } = await supabase.
      from("coaching_sessions").
      select("id, title, scheduled_at, activity_type, distance_km, objective, status, coach_id, club_id, description, pace_target, rcc_code, rpe, session_blocks").
      eq("club_id", clubId).
      gte("scheduled_at", weekStart.toISOString()).
      lte("scheduled_at", weekEnd.toISOString()).
      order("scheduled_at", { ascending: true });

      if (!allClubSessions || allClubSessions.length === 0) {
        setSessions([]);
        setParticipations({});
        setNoteValues({});
        setLoading(false);
        return;
      }

      const allSessionIds = allClubSessions.map((s) => s.id);
      const { data } = await supabase.
      from("coaching_participations").
      select("id, coaching_session_id, status, athlete_note, completed_at").
      eq("user_id", user.id).
      in("coaching_session_id", allSessionIds);

      // Only show sessions where the user has a participation record
      const mySessionIds = new Set((data || []).map((p) => p.coaching_session_id));
      const sessionList = allClubSessions.filter((s) => mySessionIds.has(s.id)) as CoachingSession[];
      setSessions(sessionList);

      const map: Record<string, Participation> = {};
      const notes: Record<string, string> = {};
      (data || []).forEach((p) => {
        map[p.coaching_session_id] = p;
        notes[p.coaching_session_id] = p.athlete_note || "";
      });
      setParticipations(map);
      setNoteValues(notes);
    } catch (e) {
      console.error("Error loading week:", e);
    } finally {
      setLoading(false);
    }
  }, [user, clubId, weekStart.toISOString()]);

  const [initialNavDone, setInitialNavDone] = useState(false);
  useEffect(() => {
    if (!user || initialNavDone) return;
    const findLatestWeek = async () => {
      const { data } = await supabase.
      from("coaching_participations").
      select("coaching_session_id").
      eq("user_id", user.id).
      limit(1);
      if (!data || data.length === 0) {setInitialNavDone(true);return;}

      const { data: latestSession } = await supabase.
      from("coaching_sessions").
      select("scheduled_at").
      eq("club_id", clubId).
      order("scheduled_at", { ascending: false }).
      limit(1).
      single();

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
  }, [user, clubId]);

  useEffect(() => {loadWeek();}, [loadWeek]);

  const completedCount = Object.values(participations).filter((p) => p.status === "completed").length;
  const totalCount = sessions.length;
  const progressPercent = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;

  const toggleCompletion = async (session: CoachingSession) => {
    if (!user) return;
    const participation = participations[session.id];
    if (!participation) return;

    const isCompleting = participation.status !== "completed";
    const newStatus = isCompleting ? "completed" : "sent";

    const { error } = await supabase.
    from("coaching_participations").
    update({ status: newStatus, completed_at: isCompleting ? new Date().toISOString() : null }).
    eq("id", participation.id);

    if (error) {toast.error("Erreur lors de la mise à jour");return;}

    setParticipations((prev) => ({
      ...prev,
      [session.id]: { ...prev[session.id], status: newStatus, completed_at: isCompleting ? new Date().toISOString() : null }
    }));

    if (isCompleting) toast.success("Séance marquée comme faite ✅");
  };

  const saveNote = async (sessionId: string) => {
    const participation = participations[sessionId];
    if (!participation) return;
    const note = noteValues[sessionId] || "";
    if (note === (participation.athlete_note || "")) return;

    const { error } = await supabase.
    from("coaching_participations").
    update({ athlete_note: note || null }).
    eq("id", participation.id);

    if (error) {toast.error("Erreur lors de la sauvegarde");return;}

    setParticipations((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], athlete_note: note || null }
    }));
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card rounded-none animate-pulse" />)}
      </div>);

  }

  return (
    <div className="space-y-4">
      {/* Week navigation — hero style */}
      <div className="ios-card mx-4 overflow-hidden border border-border/60 px-4 py-5 shadow-[var(--shadow-card)]">
        {/* Week switcher */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-foreground capitalize">{weekLabel}</p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Inline 7-day calendar */}
        <div className="flex items-center justify-between mb-5">
          {weekDays.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const hasSession = sessions.some(s => format(new Date(s.scheduled_at), "yyyy-MM-dd") === dayKey);
            const isDayCompleted = sessions.some(s => {
              if (format(new Date(s.scheduled_at), "yyyy-MM-dd") !== dayKey) return false;
              const p = participations[s.id];
              return p?.status === "completed";
            });
            const today = isToday(day);

            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${today ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE", { locale: fr }).charAt(0).toUpperCase()}
                </span>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-[14px] font-semibold transition-all ${
                  today
                    ? "bg-primary text-primary-foreground"
                    : isDayCompleted
                      ? "bg-green-500/15 text-green-600"
                      : hasSession
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground/50"
                }`}>
                  {format(day, "d")}
                </div>
                {hasSession && (
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    isDayCompleted ? "bg-green-500" : "bg-muted-foreground/30"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress ring */}
        <div className="flex items-center justify-center gap-4">
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={progressPercent === 100 ? "hsl(var(--chart-2))" : "hsl(var(--primary))"}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {progressPercent === 100 ? (
                <Trophy className="h-5 w-5 text-green-500" />
              ) : (
                <span className="text-[13px] font-bold text-foreground">{completedCount}/{totalCount}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">
              {progressPercent === 100 ? "Semaine complète" : `${progressPercent}% réalisé`}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {completedCount} séance{completedCount > 1 ? "s" : ""} sur {totalCount}
            </p>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {sessions.length > 0 && (
        <div className="ios-card mx-4 border border-border/60 px-4 py-4 shadow-[var(--shadow-card)]">
          <WeeklyBarChart
            sessions={sessions.map(s => ({ scheduled_at: s.scheduled_at, rcc_code: s.rcc_code, distance_km: s.distance_km, title: s.title, objective: s.objective }))}
            weekDays={weekDays}
          />
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="ios-card mx-4 border border-border/60 p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <p className="text-[16px] font-semibold text-foreground mb-1">Semaine libre</p>
          <p className="text-[13px] text-muted-foreground">Aucune séance programmée cette semaine. Profitez-en pour récupérer !</p>
        </div>
      ) : (
        <div className="space-y-0">
          {sessions.map((session) => {
            const participation = participations[session.id];
            const isDone = participation?.status === "completed";
            const isExpanded = expandedNote === session.id;

            return (
              <div key={session.id}>
                <WeeklyPlanCard
                  session={session}
                  isDone={isDone}
                  onCheck={() => toggleCompletion(session)}
                  onClick={() => onSessionClick(session)}
                  onNoteClick={() => setExpandedNote(isExpanded ? null : session.id)}
                  noteValue={participation?.athlete_note || ""}
                  showCheckbox={true}
                />
                {isExpanded && (
                  <div className="bg-card px-6 pb-4">
                    <Textarea
                      value={noteValues[session.id] || ""}
                      onChange={(e) => setNoteValues(prev => ({ ...prev, [session.id]: e.target.value }))}
                      onBlur={() => saveNote(session.id)}
                      placeholder="Comment s'est passée la séance ?"
                      className="text-[13px] min-h-[60px] bg-secondary/50 border-0 rounded-xl"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>);

};