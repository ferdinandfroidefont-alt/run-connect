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
      // First fetch participations for this user in this club's sessions for the week
      const { data: allClubSessions } = await supabase.
      from("coaching_sessions").
      select("id, title, scheduled_at, activity_type, distance_km, objective, status, coach_id, club_id, description, pace_target, rcc_code").
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
      











































































      {/* Bar chart */}
      {sessions.length > 0






      }

      {/* Session list */}
      {sessions.length === 0 &&
      <div className="bg-card rounded-none p-8 text-center">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-[16px] font-semibold text-foreground mb-1">Pas de séance</p>
          <p className="text-[13px] text-muted-foreground">Aucune séance programmée cette semaine</p>
        </div>
      }
    </div>);

};