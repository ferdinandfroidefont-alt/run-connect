import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { IOSListGroup } from "@/components/ui/ios-list-item";
import { CheckCircle2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
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

  // On first mount, find the latest week with sessions if current week is empty
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
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-[10px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <button onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))} className="p-1.5 rounded-md hover:bg-card transition-colors">
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
        <span className="text-[15px] font-medium text-foreground min-w-[140px] text-center">{weekLabel}</span>
        <button onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="p-1.5 rounded-md hover:bg-card transition-colors">
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Bar chart + progress */}
      <IOSListGroup>
        <div className="px-4 py-3">
          <WeeklyBarChart sessions={sessions} weekDays={weekDays} />

          <div className="flex items-center justify-between mb-1.5 mt-3">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-[13px] text-foreground font-medium">
                {completedCount}/{totalCount}
              </span>
            </div>
            <span className="text-[13px] font-semibold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </IOSListGroup>

      {/* Session cards */}
      {sessions.length === 0 ? (
        <IOSListGroup>
          <div className="px-4 py-8 text-center">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune séance cette semaine</p>
          </div>
        </IOSListGroup>
      ) : (
        <div className="space-y-2 mt-3">
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
                  <div className="bg-card rounded-b-xl px-4 pb-3 -mt-1">
                    <Textarea
                      value={noteValue}
                      onChange={(e) => setNoteValues(prev => ({ ...prev, [session.id]: e.target.value }))}
                      onBlur={() => saveNote(session.id)}
                      placeholder="Comment s'est passée la séance ?"
                      className="min-h-[60px] text-[14px] bg-secondary border-0 resize-none"
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
