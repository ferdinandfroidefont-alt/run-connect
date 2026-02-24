import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon } from "@/lib/activityIcons";
import { CreateCoachingSessionDialog } from "./CreateCoachingSessionDialog";
import { CoachingSessionDetail } from "./CoachingSessionDetail";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { CalendarDays, BookOpen, BarChart3, Users, Clock, AlertTriangle, Layers } from "lucide-react";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";
import { WeeklyTrackingDialog } from "./WeeklyTrackingDialog";
import { ClubGroupsManagerDialog } from "./ClubGroupsManagerDialog";
import { AthleteWeeklyView } from "./AthleteWeeklyView";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { format, startOfWeek, endOfWeek, isSameDay } from "date-fns";
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

interface DashboardStats {
  totalSessions: number;
  pending: number;
  activeGroups: number;
  lateAthletes: number;
}

export const CoachingTab = ({ clubId, isCoach }: CoachingTabProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ totalSessions: 0, pending: 0, activeGroups: 0, lateAthletes: 0 });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Sessions this week
      const { data: weekSessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, activity_type, distance_km, objective, status, coach_id, club_id, description, pace_target, rcc_code")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      const sessionList = (weekSessions || []) as CoachingSession[];

      // Get participation counts + stats
      let pending = 0;
      let lateAthletes = 0;

      if (sessionList.length > 0) {
        const sessionIds = sessionList.map(s => s.id);
        const { data: participations } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id, status")
          .in("coaching_session_id", sessionIds);

        const countMap: Record<string, number> = {};
        (participations || []).forEach(p => {
          countMap[p.coaching_session_id] = (countMap[p.coaching_session_id] || 0) + 1;
          if (p.status === "sent") pending++;
        });

        // Late = sent status on past sessions
        sessionList.forEach(s => {
          if (new Date(s.scheduled_at) < now) {
            const pastSent = (participations || []).filter(
              p => p.coaching_session_id === s.id && p.status === "sent"
            ).length;
            lateAthletes += pastSent;
          }
        });

        sessionList.forEach(s => { s.participation_count = countMap[s.id] || 0; });
      }

      // Groups count
      const { count: groupCount } = await supabase
        .from("club_groups")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId);

      setStats({
        totalSessions: sessionList.length,
        pending,
        activeGroups: groupCount || 0,
        lateAthletes,
      });

      setSessions(sessionList);
    } catch (e) {
      console.error("Error loading dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, [clubId]);

  // Next upcoming sessions (future only, max 5)
  const upcomingSessions = useMemo(() =>
    sessions.filter(s => new Date(s.scheduled_at) >= now).slice(0, 5),
    [sessions]
  );

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  if (loading) {
    return (
      <div className="bg-secondary min-h-[300px] p-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-[10px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="bg-secondary -mx-4 -mb-4 px-4 pt-2 pb-8 min-h-[400px]">
      {/* Week label */}
      <p className="text-[13px] text-muted-foreground text-center mb-4">
        Semaine du {weekLabel}
      </p>

      {/* KPI Section */}
      {isCoach && (
        <IOSListGroup header="CETTE SEMAINE">
          <IOSListItem
            icon={CalendarDays}
            iconBgColor="bg-blue-500"
            title={`${stats.totalSessions} séance${stats.totalSessions > 1 ? "s" : ""} programmée${stats.totalSessions > 1 ? "s" : ""}`}
            showChevron={false}
            showSeparator
          />
          <IOSListItem
            icon={Clock}
            iconBgColor="bg-orange-500"
            title={`${stats.pending} en attente`}
            showChevron={false}
            showSeparator
          />
          <IOSListItem
            icon={Layers}
            iconBgColor="bg-green-500"
            title={`${stats.activeGroups} groupe${stats.activeGroups > 1 ? "s" : ""} actif${stats.activeGroups > 1 ? "s" : ""}`}
            showChevron={false}
            showSeparator
          />
          <IOSListItem
            icon={AlertTriangle}
            iconBgColor="bg-red-500"
            title={`${stats.lateAthletes} athlète${stats.lateAthletes > 1 ? "s" : ""} en retard`}
            showChevron={false}
            showSeparator={false}
          />
        </IOSListGroup>
      )}

      {/* Quick Tools */}
      {isCoach && (
        <IOSListGroup header="OUTILS">
          <IOSListItem
            icon={CalendarDays}
            iconBgColor="bg-blue-500"
            title="Créer plan semaine"
            onClick={() => setShowWeeklyPlan(true)}
            showSeparator
          />
          <IOSListItem
            icon={BookOpen}
            iconBgColor="bg-purple-500"
            title="Modèles de séances"
            onClick={() => setShowTemplates(true)}
            showSeparator
          />
          <IOSListItem
            icon={BarChart3}
            iconBgColor="bg-green-500"
            title="Suivi athlètes"
            onClick={() => setShowTracking(true)}
            showSeparator
          />
          <IOSListItem
            icon={Users}
            iconBgColor="bg-orange-500"
            title="Gérer les groupes"
            onClick={() => setShowGroups(true)}
            showSeparator={false}
          />
        </IOSListGroup>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <IOSListGroup header="PROCHAINES SÉANCES">
          {upcomingSessions.map((s, i) => (
            <IOSListItem
              key={s.id}
              title={s.title}
              subtitle={`${format(new Date(s.scheduled_at), "EEE d MMM", { locale: fr })}${s.objective ? ` · ${s.objective}` : ""}`}
              value={`${s.participation_count || 0}`}
              rightElement={
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
              }
              onClick={() => setSelectedSession(s)}
              showSeparator={i < upcomingSessions.length - 1}
            />
          ))}
        </IOSListGroup>
      )}

      {/* Athlete weekly view */}
      {!isCoach && (
        <AthleteWeeklyView
          clubId={clubId}
          sessions={sessions}
          onSessionClick={(s) => setSelectedSession(s)}
        />
      )}

      {/* Dialogs */}
      <CreateCoachingSessionDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        clubId={clubId}
        onCreated={loadDashboard}
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
        onSent={loadDashboard}
      />

      <WeeklyTrackingDialog
        isOpen={showTracking}
        onClose={() => setShowTracking(false)}
        clubId={clubId}
      />

      <ClubGroupsManagerDialog
        isOpen={showGroups}
        onClose={() => setShowGroups(false)}
        clubId={clubId}
      />
    </div>
  );
};
