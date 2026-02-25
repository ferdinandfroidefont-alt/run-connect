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
      const { data: weekSessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, activity_type, distance_km, objective, status, coach_id, club_id, description, pace_target, rcc_code")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      const sessionList = (weekSessions || []) as CoachingSession[];
      setSessions(sessionList);

      if (sessionList.length === 0) {
        setParticipations({});
        setNoteValues({});
        setLoading(false);
        return;
      }

      const sessionIds = sessionList.map(s => s.id);
      const { data } = await supabase
        .from("coaching_participations")
        .select("id, coaching_session_id, status, athlete_note, completed_at")
        .eq("user_id", user.id)
        .in("coaching_session_id", sessionIds);

      const map: Record<string, Participation> = {};
      const notes: Record<string, string> = {};
      (data || []).forEach(p => {
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
      const { data } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id")
        .eq("user_id", user.id)
        .limit(1);
      if (!data || data.length === 0) { setInitialNavDone(true); return; }

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
  }, [user, clubId]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  const completedCount = Object.values(participations).filter(p => p.status === "completed").length;
  const totalCount = sessions.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleCompletion = async (session: CoachingSession) => {
    if (!user) return;
    const participation = participations[session.id];
    if (!participation) return;

    const isCompleting = participation.status !== "completed";
    const newStatus = isCompleting ? "completed" : "sent";

    const { error } = await supabase
      .from("coaching_participations")
      .update({ status: newStatus, completed_at: isCompleting ? new Date().toISOString() : null })
      .eq("id", participation.id);

    if (error) { toast.error("Erreur lors de la mise à jour"); return; }

    setParticipations(prev => ({
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

    const { error } = await supabase
      .from("coaching_participations")
      .update({ athlete_note: note || null })
      .eq("id", participation.id);

    if (error) { toast.error("Erreur lors de la sauvegarde"); return; }

    setParticipations(prev => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], athlete_note: note || null }
    }));
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation — hero style */}
      <div className="bg-card rounded-2xl p-4 border border-border/30">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>
          <div className="text-center">
            <p className="text-[17px] font-bold text-foreground">{weekLabel}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Mon plan de la semaine</p>
          </div>
          <button
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronRight className="h-5 w-5 text-primary" />
          </button>
        </div>

        {/* Mini calendar row */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {weekDays.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const hasSession = sessions.some(s => format(new Date(s.scheduled_at), "yyyy-MM-dd") === dayKey);
            const participation = sessions.find(s => format(new Date(s.scheduled_at), "yyyy-MM-dd") === dayKey);
            const isDone = participation ? participations[participation.id]?.status === "completed" : false;
            const today = isToday(day);

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={`text-[11px] font-medium ${today ? "text-primary" : "text-muted-foreground"}`}>
                  {format(day, "EEE", { locale: fr }).charAt(0).toUpperCase()}
                </span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-[14px] font-semibold transition-all ${
                  today
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-green-500/15 text-green-600"
                      : hasSession
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground/50"
                }`}>
                  {format(day, "d")}
                </div>
                {hasSession && (
                  <div className={`h-1.5 w-1.5 rounded-full ${isDone ? "bg-green-500" : "bg-primary"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress summary */}
        <div className="bg-secondary/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {progressPercent >= 100 ? (
                <Trophy className="h-5 w-5 text-yellow-500" />
              ) : (
                <Flame className="h-5 w-5 text-primary" />
              )}
              <span className="text-[15px] font-semibold text-foreground">
                {completedCount}/{totalCount} séances
              </span>
            </div>
            <span className={`text-[17px] font-bold ${
              progressPercent >= 100 ? "text-green-500" : "text-primary"
            }`}>
              {progressPercent}%
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 rounded-full" />
        </div>
      </div>

      {/* Bar chart */}
      {sessions.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Charge de la semaine
          </p>
          <WeeklyBarChart sessions={sessions} weekDays={weekDays} />
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center border border-border/30">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-[16px] font-semibold text-foreground mb-1">Pas de séance</p>
          <p className="text-[13px] text-muted-foreground">Aucune séance programmée cette semaine</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Mes séances
          </p>
          {sessions.map(session => {
            const participation = participations[session.id];
            const isDone = participation?.status === "completed";
            const isExpanded = expandedNote === session.id;
            const noteValue = noteValues[session.id] || "";

            return (
              <div key={session.id}>
                <WeeklyPlanCard
                  session={session}
                  isDone={isDone}
                  onCheck={() => toggleCompletion(session)}
                  onNoteClick={() => setExpandedNote(isExpanded ? null : session.id)}
                  noteValue={noteValue}
                  onClick={() => onSessionClick(session)}
                  showCheckbox={!!participation}
                  disabled={!participation}
                />

                {isExpanded && (
                  <div className="bg-card rounded-b-2xl px-4 pb-4 -mt-2 pt-4 border border-t-0 border-border/30">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Mon ressenti / notes
                    </label>
                    <Textarea
                      value={noteValue}
                      onChange={(e) => setNoteValues(prev => ({ ...prev, [session.id]: e.target.value }))}
                      onBlur={() => saveNote(session.id)}
                      placeholder="Comment s'est passée la séance ? Sensations, fatigue, douleurs..."
                      className="min-h-[70px] text-[14px] bg-secondary/50 border-0 rounded-xl resize-none"
                      autoFocus
                    />
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
