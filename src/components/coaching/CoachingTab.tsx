import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CoachingSessionDetail } from "./CoachingSessionDetail";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { CalendarDays, BookOpen, BarChart3, Users, FileText } from "lucide-react";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";
import { WeeklyTrackingDialog } from "./WeeklyTrackingDialog";
import { ClubGroupsManagerDialog } from "./ClubGroupsManagerDialog";
import { CoachingDraftsList } from "./CoachingDraftsList";
import { AthleteWeeklyView } from "./AthleteWeeklyView";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { format, startOfWeek, endOfWeek } from "date-fns";
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
  activeAthletes: number;
  validationPct: number;
}

// Map activity type / objective to a dot color
const getSessionDotColor = (s: CoachingSession): string => {
  const obj = (s.objective || "").toLowerCase();
  const title = (s.title || "").toLowerCase();
  if (obj.includes("vma") || obj.includes("interval") || title.includes("vma") || title.includes("fractionné"))
    return "bg-red-500";
  if (obj.includes("récup") || obj.includes("recup") || title.includes("récup"))
    return "bg-blue-500";
  if (obj.includes("seuil") || title.includes("seuil"))
    return "bg-orange-500";
  return "bg-green-500"; // EF / default
};

export const CoachingTab = ({ clubId, isCoach }: CoachingTabProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftInitialWeek, setDraftInitialWeek] = useState<Date | undefined>();
  const [draftInitialGroup, setDraftInitialGroup] = useState<string | undefined>();
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0, pending: 0, activeGroups: 0, lateAthletes: 0,
    activeAthletes: 0, validationPct: 0,
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const loadDashboard = async () => {
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

      let pending = 0;
      let lateAthletes = 0;
      let activeAthletes = 0;
      let totalParticipations = 0;
      let completedParticipations = 0;

      if (sessionList.length > 0) {
        const sessionIds = sessionList.map(s => s.id);
        const { data: participations } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id, status, user_id")
          .in("coaching_session_id", sessionIds);

        const countMap: Record<string, number> = {};
        const athleteSet = new Set<string>();

        (participations || []).forEach(p => {
          countMap[p.coaching_session_id] = (countMap[p.coaching_session_id] || 0) + 1;
          athleteSet.add(p.user_id);
          totalParticipations++;
          if (p.status === "sent") pending++;
          if (p.status === "completed") completedParticipations++;
        });

        activeAthletes = athleteSet.size;

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

      const { count: groupCount } = await supabase
        .from("club_groups")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId);

      const validationPct = totalParticipations > 0
        ? Math.round((completedParticipations / totalParticipations) * 100)
        : 0;

      setStats({
        totalSessions: sessionList.length,
        pending,
        activeGroups: groupCount || 0,
        lateAthletes,
        activeAthletes,
        validationPct,
      });

      setSessions(sessionList);
    } catch (e) {
      console.error("Error loading dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, [clubId]);

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

  const tools = [
    { icon: FileText, label: "Brouillons", color: "bg-primary", onClick: () => setShowDrafts(true) },
    { icon: CalendarDays, label: "Plan hebdo", color: "bg-blue-500", onClick: () => { setDraftInitialWeek(undefined); setDraftInitialGroup(undefined); setShowWeeklyPlan(true); } },
    { icon: Users, label: "Groupes", color: "bg-orange-500", onClick: () => setShowGroups(true) },
    { icon: BarChart3, label: "Suivi", color: "bg-green-500", onClick: () => setShowTracking(true) },
  ];

  return (
    <div className="bg-secondary -mx-4 -mb-4 px-4 pt-2 pb-8 min-h-[400px] overflow-x-hidden">
      {/* Week label */}
      <p className="text-[13px] text-muted-foreground text-center mb-4">
        Semaine du {weekLabel}
      </p>

      {/* === COACH VIEW === */}
      {isCoach && (
        <>
          {/* Hero Card */}
          <Card className="mb-5 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
              {/* Big number */}
              <div className="text-center mb-3">
                <span className="text-[42px] font-bold leading-none text-foreground">
                  {stats.totalSessions}
                </span>
                <p className="text-[13px] text-muted-foreground mt-1">
                  séance{stats.totalSessions > 1 ? "s" : ""} programmée{stats.totalSessions > 1 ? "s" : ""}
                </p>
              </div>

              {/* Sub-stats row */}
              <div className="flex justify-center gap-6 mb-4">
                <div className="text-center">
                  <span className="text-[20px] font-semibold text-foreground">{stats.activeAthletes}</span>
                  <p className="text-[11px] text-muted-foreground">athlètes</p>
                </div>
                <div className="text-center">
                  <span className="text-[20px] font-semibold text-foreground">{stats.validationPct}%</span>
                  <p className="text-[11px] text-muted-foreground">validées</p>
                </div>
                <div className="text-center">
                  <span className="text-[20px] font-semibold text-foreground">{stats.pending}</span>
                  <p className="text-[11px] text-muted-foreground">en attente</p>
                </div>
              </div>

              {/* Segmented progress bar */}
              <div className="space-y-1.5">
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/50">
                  <div className="bg-green-500 rounded-full transition-all" style={{ width: "60%" }} />
                  <div className="bg-orange-500 rounded-full transition-all" style={{ width: "30%" }} />
                  <div className="bg-blue-500 rounded-full transition-all" style={{ width: "10%" }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  <span>🟢 Volume</span>
                  <span>🟡 Intensité</span>
                  <span>🔵 Récup</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Tools Grid 2x2 */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={tool.onClick}
                className="flex flex-col items-center justify-center gap-2 bg-card rounded-[12px] p-4 active:scale-[0.97] transition-transform"
                style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.06)' }}
              >
                <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center ${tool.color}`}>
                  <tool.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[13px] font-medium text-foreground">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Templates shortcut */}
          <IOSListGroup>
            <IOSListItem
              icon={BookOpen}
              iconBgColor="bg-purple-500"
              title="Modèles de séances"
              onClick={() => setShowTemplates(true)}
              showSeparator={false}
            />
          </IOSListGroup>
        </>
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
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${getSessionDotColor(s)}`} />
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
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
      <CoachingDraftsList
        isOpen={showDrafts}
        onClose={() => setShowDrafts(false)}
        clubId={clubId}
        onOpenDraft={(weekStart, groupId) => {
          setDraftInitialWeek(weekStart);
          setDraftInitialGroup(groupId);
          setShowWeeklyPlan(true);
        }}
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
          setShowWeeklyPlan(true);
        }}
      />

      <WeeklyPlanDialog
        isOpen={showWeeklyPlan}
        onClose={() => { setShowWeeklyPlan(false); setDraftInitialWeek(undefined); setDraftInitialGroup(undefined); }}
        clubId={clubId}
        onSent={loadDashboard}
        initialWeek={draftInitialWeek}
        initialGroupId={draftInitialGroup}
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
