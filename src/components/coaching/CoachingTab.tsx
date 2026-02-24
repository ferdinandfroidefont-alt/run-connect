import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon } from "@/lib/activityIcons";
import { CreateCoachingSessionDialog } from "./CreateCoachingSessionDialog";
import { CoachingSessionDetail } from "./CoachingSessionDetail";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { GraduationCap, Plus, Users, BookOpen, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";

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
  participation_count?: number;
  objective?: string | null;
  rcc_code?: string | null;
}

interface CoachingTabProps {
  clubId: string;
  isCoach: boolean;
}

export const CoachingTab = ({ clubId, isCoach }: CoachingTabProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);

  // Calendar state
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("club_id", clubId)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const sessionIds = data.map(s => s.id);
        const { data: counts } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id")
          .in("coaching_session_id", sessionIds);

        const countMap: Record<string, number> = {};
        counts?.forEach(c => {
          countMap[c.coaching_session_id] = (countMap[c.coaching_session_id] || 0) + 1;
        });

        setSessions(data.map(s => ({ ...s, participation_count: countMap[s.id] || 0 })) as CoachingSession[]);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Error loading coaching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [clubId]);

  // Sessions for the selected day
  const daySessions = useMemo(() =>
    sessions.filter(s => isSameDay(new Date(s.scheduled_at), selectedDate)),
    [sessions, selectedDate]
  );

  // Days with sessions (for dots on calendar)
  const daysWithSessions = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => set.add(format(new Date(s.scheduled_at), "yyyy-MM-dd")));
    return set;
  }, [sessions]);

  const handleDayCreate = (date: Date) => {
    setSelectedDate(date);
    setShowCreate(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Entraînements
        </h4>
        <div className="flex gap-1.5">
          {isCoach && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowWeeklyPlan(true)} className="h-7 px-2">
                <CalendarDays className="h-3.5 w-3.5 mr-1" />
                Plan
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)} className="h-7 px-2">
                <BookOpen className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setSelectedDate(new Date()); setShowCreate(true); }} className="h-7 px-2">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Créer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Week Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium capitalize">
            {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM yyyy", { locale: fr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const dayKey = format(day, "yyyy-MM-dd");
            const isSelected = isSameDay(day, selectedDate);
            const hasSession = daysWithSessions.has(dayKey);
            const isCurrentDay = isToday(day);

            return (
              <button
                key={dayKey}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors relative ${
                  isSelected ? "bg-primary text-primary-foreground" : isCurrentDay ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                <span className="text-[10px] uppercase">{format(day, "EEE", { locale: fr }).slice(0, 3)}</span>
                <span className="font-medium">{format(day, "d")}</span>
                {hasSession && (
                  <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                )}
                {isCoach && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDayCreate(day); }}
                    className={`absolute -top-1 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity ${
                      isSelected ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                    }`}
                    style={{ opacity: undefined }}
                  >
                    +
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day sessions */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : daySessions.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-xs">Aucune séance le {format(selectedDate, "d MMMM", { locale: fr })}</p>
          {isCoach && (
            <Button variant="link" size="sm" className="text-xs mt-1" onClick={() => handleDayCreate(selectedDate)}>
              + Créer une séance
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {daySessions.map(s => (
            <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />
          ))}
        </div>
      )}

      {/* All sessions (below calendar) */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase">Toutes les séances</p>
          {sessions.slice(0, 10).map(s => (
            <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} showDate />
          ))}
        </div>
      )}

      <CreateCoachingSessionDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        clubId={clubId}
        onCreated={loadSessions}
        preselectedDate={selectedDate}
      />

      <CoachingSessionDetail
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCoach={isCoach}
      />

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code) => {
          setShowTemplates(false);
          setShowCreate(true);
        }}
      />

      <WeeklyPlanDialog
        isOpen={showWeeklyPlan}
        onClose={() => setShowWeeklyPlan(false)}
        clubId={clubId}
        onSent={loadSessions}
      />
    </div>
  );
};

const SessionCard = ({
  session,
  onClick,
  showDate,
}: {
  session: any;
  onClick: () => void;
  showDate?: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50"
  >
    <div className="flex items-start gap-3">
      <ActivityIcon activityType={session.activity_type} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{session.title}</p>
          {session.objective && (
            <Badge variant="outline" className="text-[10px] shrink-0">{session.objective}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {showDate && (
            <span>{format(new Date(session.scheduled_at), "d MMM", { locale: fr })}</span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {session.participation_count || 0}
          </span>
          {session.distance_km && <span>{session.distance_km} km</span>}
        </div>
      </div>
    </div>
  </button>
);
