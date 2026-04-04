import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoachingSessionDetail } from "./CoachingSessionDetail";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { CalendarDays, BookOpen, BarChart3, Users, FileText, Sparkles } from "lucide-react";
import { WeeklyPlanDialog } from "./WeeklyPlanDialog";
import { WeeklyTrackingDialog } from "./WeeklyTrackingDialog";
import { ClubGroupsManagerDialog } from "./ClubGroupsManagerDialog";
import { CoachingDraftsList } from "./CoachingDraftsList";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
function countSegmentFromRpe(r: number | undefined, volume: { v: number }, intensity: { v: number }, recovery: { v: number }) {
  if (r == null || r < 1) return;
  if (r <= 3) recovery.v++;
  else if (r <= 6) volume.v++;
  else intensity.v++;
}

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
  rpe?: number | null;
  session_blocks?: unknown;
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
    return "bg-primary";
  if (obj.includes("récup") || obj.includes("recup") || title.includes("récup"))
    return "bg-muted-foreground/45";
  if (obj.includes("seuil") || title.includes("seuil"))
    return "bg-primary/70";
  return "bg-foreground/30";
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
    if (!clubId) return;
    setLoading(true);
    try {
      const { data: weekSessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, activity_type, distance_km, objective, status, coach_id, club_id, description, pace_target, rcc_code, rpe, session_blocks")
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

  // Calculate real segment proportions from session objectives
  const segmentProportions = useMemo(() => {
    if (sessions.length === 0) return { volume: 34, intensity: 33, recovery: 33 };
    let volume = 0, intensity = 0, recovery = 0;
    const V = { v: volume }, I = { v: intensity }, R = { v: recovery };
    sessions.forEach((s) => {
      const blocks = s.session_blocks;
      if (Array.isArray(blocks) && blocks.length > 0) {
        let anyBlockRpe = false;
        blocks.forEach((bl: any) => {
          if (typeof bl?.rpe === "number") {
            anyBlockRpe = true;
            countSegmentFromRpe(bl.rpe, V, I, R);
          }
          if (bl?.type === "interval" && typeof bl?.recoveryRpe === "number") {
            anyBlockRpe = true;
            countSegmentFromRpe(bl.recoveryRpe, V, I, R);
          }
        });
        if (!anyBlockRpe && s.rpe) {
          countSegmentFromRpe(s.rpe, V, I, R);
        }
        if (!anyBlockRpe && !s.rpe) {
          const obj = (s.objective || "").toLowerCase();
          const title = (s.title || "").toLowerCase();
          if (obj.includes("récup") || obj.includes("recup") || title.includes("récup")) R.v++;
          else if (obj.includes("vma") || obj.includes("interval") || obj.includes("seuil") || title.includes("vma") || title.includes("fractionné") || title.includes("seuil")) I.v++;
          else V.v++;
        }
      } else if (s.rpe) {
        countSegmentFromRpe(s.rpe, V, I, R);
      } else {
        const obj = (s.objective || "").toLowerCase();
        const title = (s.title || "").toLowerCase();
        if (obj.includes("récup") || obj.includes("recup") || title.includes("récup")) R.v++;
        else if (obj.includes("vma") || obj.includes("interval") || obj.includes("seuil") || title.includes("vma") || title.includes("fractionné") || title.includes("seuil")) I.v++;
        else V.v++;
      }
    });
    volume = V.v;
    intensity = I.v;
    recovery = R.v;
    const total = volume + intensity + recovery;
    if (total === 0) return { volume: 34, intensity: 33, recovery: 33 };
    return {
      volume: Math.round((volume / total) * 100),
      intensity: Math.round((intensity / total) * 100),
      recovery: Math.round((recovery / total) * 100),
    };
  }, [sessions]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  if (loading) {
    return (
      <div className="bg-secondary min-h-[300px] px-ios-4 py-ios-4 space-y-ios-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 ios-card rounded-ios-lg border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const tools = [
    { icon: FileText, label: "Brouillons", iconWrap: "bg-primary/12 text-primary", onClick: () => setShowDrafts(true) },
    { icon: CalendarDays, label: "Plan hebdo", iconWrap: "bg-primary/12 text-primary", onClick: () => { setDraftInitialWeek(undefined); setDraftInitialGroup(undefined); setShowWeeklyPlan(true); } },
    { icon: Users, label: "Groupes", iconWrap: "bg-muted/60 text-foreground", onClick: () => setShowGroups(true) },
    { icon: BarChart3, label: "Suivi", iconWrap: "bg-muted/60 text-foreground", onClick: () => setShowTracking(true) },
  ];

  return (
    <div className="bg-secondary -mx-4 -mb-4 pt-ios-2 pb-ios-8 min-h-[400px] overflow-x-hidden px-ios-4">
      {/* Week label */}
      <p className="text-ios-footnote text-muted-foreground text-center mb-ios-3">
        Semaine du {weekLabel}
      </p>

      {/* === COACH VIEW === */}
      {isCoach && (
        <>
          {/* Hero Card */}
          <Card className="ios-card mb-5 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-5">
              {stats.totalSessions === 0 ? (
                /* Engaging empty state */
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/15 mb-3">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <p className="text-[17px] font-bold text-foreground mb-1">Planifiez votre semaine</p>
                  <p className="text-[13px] text-muted-foreground mb-4 max-w-[240px] mx-auto">
                    Créez des séances pour vos athlètes et suivez leur progression
                  </p>
                  <Button
                    onClick={() => { setDraftInitialWeek(undefined); setDraftInitialGroup(undefined); setShowWeeklyPlan(true); }}
                    className="rounded-2xl h-10 px-5 text-[13px] font-semibold gap-2"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Créer un plan hebdo
                  </Button>
                </div>
              ) : (
                <>
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
                  {segmentProportions.volume > 0 && <div className="rounded-full bg-foreground/25 transition-all" style={{ width: `${segmentProportions.volume}%` }} />}
                  {segmentProportions.intensity > 0 && <div className="rounded-full bg-primary transition-all" style={{ width: `${segmentProportions.intensity}%` }} />}
                  {segmentProportions.recovery > 0 && <div className="rounded-full bg-muted-foreground/40 transition-all" style={{ width: `${segmentProportions.recovery}%` }} />}
                </div>
                <div className="flex justify-between px-0.5 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/25" />
                    Volume
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    Intensité
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    Récup
                  </span>
                </div>
              </div>
                </>
              )}
            </div>
          </Card>

          {/* Tools Grid 2x2 */}
          <div className="mb-5 grid grid-cols-2 gap-3 px-4">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={tool.onClick}
                className="ios-card flex flex-col items-center justify-center gap-2 rounded-[14px] border border-border/60 p-4 shadow-[var(--shadow-card)] transition-transform active:scale-[0.97]"
              >
                <div className={`h-10 w-10 rounded-[10px] flex items-center justify-center ${tool.iconWrap}`}>
                  <tool.icon className="h-5 w-5" />
                </div>
                <span className="text-[13px] font-medium text-foreground">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Templates shortcut */}
          <IOSListGroup className="ios-card mb-0 border border-border/60 shadow-[var(--shadow-card)]">
            <IOSListItem
              icon={BookOpen}
              title="Modèles de séances"
              onClick={() => setShowTemplates(true)}
              showSeparator={false}
            />
          </IOSListGroup>
        </>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <IOSListGroup header="Prochaines séances" className="mb-ios-4">
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
