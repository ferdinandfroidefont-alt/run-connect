import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChartColumnBig, ClipboardCheck, Dumbbell, FolderKanban, Loader2, Users, Building2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateClubDialogPremium } from "@/components/CreateClubDialogPremium";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getIosEmptyStateSpacing } from "@/lib/iosEmptyStateLayout";
import { cn } from "@/lib/utils";
import { CoachingSessionDetail } from "@/components/coaching/CoachingSessionDetail";
import { WeeklyPlanDialog } from "@/components/coaching/WeeklyPlanDialog";
import { WeeklyTrackingDialog } from "@/components/coaching/WeeklyTrackingDialog";
import { ClubGroupsManagerDialog } from "@/components/coaching/ClubGroupsManagerDialog";
import { CoachingDraftsList } from "@/components/coaching/CoachingDraftsList";
import { AthleteWeeklyView } from "@/components/coaching/AthleteWeeklyView";
import { ClubManagementDialog } from "@/components/coaching/ClubManagementDialog";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";

type ClubOption = {
  id: string;
  name: string;
  isCoach: boolean;
};

type CoachingSession = {
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
  session_blocks?: unknown;
  coach_notes?: string | null;
};

type AthleteClubRow = {
  clubId: string;
  clubName: string;
  completed: number;
  total: number;
};

type ClubInfoRow = {
  id: string;
  group_name: string | null;
  group_description: string | null;
  group_avatar_url: string | null;
  club_code: string | null;
  created_by: string | null;
};

export default function Coaching() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const emptyStateSx = useMemo(() => getIosEmptyStateSpacing(), []);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);
  const [showCreateClub, setShowCreateClub] = useState(false);

  const [showWeeklyPlan, setShowWeeklyPlan] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [draftInitialWeek, setDraftInitialWeek] = useState<Date | undefined>();
  const [draftInitialGroup, setDraftInitialGroup] = useState<string | undefined>();

  const [athleteClubs, setAthleteClubs] = useState<AthleteClubRow[]>([]);
  const [athleteClubsLoading, setAthleteClubsLoading] = useState(true);

  const [showClubManagement, setShowClubManagement] = useState(false);

  const displayClubs = useMemo((): ClubOption[] => {
    if (clubs.length > 0) return clubs;
    return athleteClubs.map((ac) => ({ id: ac.clubId, name: ac.clubName, isCoach: false }));
  }, [clubs, athleteClubs]);

  const selectedClub = useMemo(
    () => displayClubs.find((club) => club.id === selectedClubId) || null,
    [displayClubs, selectedClubId]
  );
  const isCoach = !!selectedClub?.isCoach;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  const loadClubs = async () => {
    if (!user) {
      setClubs([]);
      setSelectedClubId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: memberships, error: memErr } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id);
      if (memErr) throw memErr;

      const clubIds = (memberships || []).map((m) => m.conversation_id);
      if (clubIds.length === 0) {
        setClubs([]);
        return;
      }

      const { data: conversations, error: convErr } = await supabase
        .from("conversations")
        .select("id, group_name, is_group")
        .in("id", clubIds)
        .eq("is_group", true);
      if (convErr) throw convErr;

      const mapCoachByClub = new Map<string, boolean>();
      (memberships || []).forEach((m) => mapCoachByClub.set(m.conversation_id, !!m.is_coach));

      const clubOptions = (conversations || [])
        .filter((c) => !!c.group_name)
        .map((c) => ({
          id: c.id,
          name: c.group_name || "Club",
          isCoach: mapCoachByClub.get(c.id) || false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));

      setClubs(clubOptions);
    } catch (e) {
      console.error("Coaching loadClubs:", e);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClubData = async () => {
    if (!selectedClubId) {
      setSessions([]);
      setMemberCount(0);
      return;
    }

    const [{ data: memberRows }, { data: sessionRows }] = await Promise.all([
      supabase.from("group_members").select("id", { count: "exact" }).eq("conversation_id", selectedClubId),
      supabase
        .from("coaching_sessions")
        .select("id, title, description, scheduled_at, activity_type, distance_km, pace_target, status, coach_id, club_id, objective, session_blocks, coach_notes, rpe, rpe_phases, rcc_code" as any)
        .eq("club_id", selectedClubId)
        .order("scheduled_at", { ascending: true }),
    ]);

    setMemberCount(memberRows?.length || 0);
    setSessions((sessionRows || []) as unknown as CoachingSession[]);
  };

  useEffect(() => {
    void loadClubs();
  }, [user?.id]);

  useEffect(() => {
    void loadClubData();
  }, [selectedClubId]);

  const loadAthleteClubs = useCallback(async () => {
    if (!user) {
      setAthleteClubs([]);
      setAthleteClubsLoading(false);
      return;
    }
    setAthleteClubsLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: participations } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id, status")
        .eq("user_id", user.id);

      if (!participations?.length) {
        setAthleteClubs([]);
        return;
      }

      const sessionIds = participations.map((p) => p.coaching_session_id);
      const { data: sessionRows } = await supabase
        .from("coaching_sessions")
        .select("id, club_id, scheduled_at")
        .in("id", sessionIds)
        .gte("scheduled_at", thirtyDaysAgo.toISOString());

      if (!sessionRows?.length) {
        setAthleteClubs([]);
        return;
      }

      const clubMap = new Map<string, { sessionIds: string[] }>();
      sessionRows.forEach((s) => {
        if (!clubMap.has(s.club_id)) clubMap.set(s.club_id, { sessionIds: [] });
        clubMap.get(s.club_id)!.sessionIds.push(s.id);
      });

      const clubIds = [...clubMap.keys()];
      const { data: conversations } = await supabase.from("conversations").select("id, group_name").in("id", clubIds);

      const wStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const wEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const result: AthleteClubRow[] = clubIds.map((clubId) => {
        const conv = conversations?.find((c) => c.id === clubId);
        const clubSessions = sessionRows.filter((s) => s.club_id === clubId);
        const thisWeekSessionIds = clubSessions
          .filter((s) => {
            const d = new Date(s.scheduled_at);
            return d >= wStart && d <= wEnd;
          })
          .map((s) => s.id);

        const completedThisWeek = participations.filter(
          (p) => thisWeekSessionIds.includes(p.coaching_session_id) && p.status === "completed"
        ).length;

        return {
          clubId,
          clubName: conv?.group_name || "Club",
          completed: completedThisWeek,
          total: thisWeekSessionIds.length,
        };
      });

      setAthleteClubs(result);
    } catch (e) {
      console.error("Error loading athlete coaching clubs:", e);
      setAthleteClubs([]);
    } finally {
      setAthleteClubsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAthleteClubs();
  }, [loadAthleteClubs]);

  useEffect(() => {
    if (displayClubs.length === 0) {
      setSelectedClubId(null);
      return;
    }
    setSelectedClubId((prev) => (prev && displayClubs.some((c) => c.id === prev) ? prev : displayClubs[0].id));
  }, [displayClubs]);

  // removed openClubManagement — now uses ClubManagementDialog directly

  const refreshCurrentClub = async () => {
    await loadClubData();
    await loadAthleteClubs();
  };

  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.scheduled_at);
    return d >= weekStart && d <= weekEnd;
  });
  const upcomingSessions = sessions.filter((s) => new Date(s.scheduled_at) >= new Date()).slice(0, 6);

  const waitAthleteWhenNoClub = clubs.length === 0 && athleteClubsLoading;
  const showPageLoader = authLoading || loading || waitAthleteWhenNoClub;

  const coachTools = [
    { icon: CalendarDays, label: "Planifier", subtitle: "Plan hebdomadaire", color: "bg-blue-500", onClick: () => setShowWeeklyPlan(true) },
    { icon: ChartColumnBig, label: "Suivi", subtitle: "Progression athlètes", color: "bg-orange-500", onClick: () => setShowTracking(true) },
    { icon: Users, label: "Groupes", subtitle: "Gérer les groupes", color: "bg-green-500", onClick: () => setShowGroups(true) },
    { icon: FolderKanban, label: "Brouillons", subtitle: "Plans sauvegardés", color: "bg-purple-500", onClick: () => setShowDrafts(true) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-coaching">
      {/* iOS Header */}
      <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
        <div className="px-ios-4 py-ios-3 relative flex items-center justify-center">
          <h1 className="text-ios-largetitle font-bold tracking-tight text-center">Coaching</h1>
          {selectedClub && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  isCoach ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                {isCoach ? "Coach" : "Athlète"}
              </span>
            </div>
          )}
        </div>
      </div>

      {showPageLoader ? (
        <div className="flex flex-1 flex-col items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Chargement du coaching</span>
        </div>
      ) : displayClubs.length === 0 ? (
        <>
          <div className="ios-scroll-region flex-1 overflow-y-auto px-ios-4 pt-ios-4 pb-ios-6">
            <IOSListGroup>
              <div className={emptyStateSx.shell}>
                <div className={emptyStateSx.iconCircle}>
                  <Dumbbell className="h-12 w-12 text-muted-foreground" aria-hidden />
                </div>
                <div className={emptyStateSx.textBlock}>
                  <h3 className="text-ios-title3 font-semibold text-foreground">Aucun espace coaching</h3>
                  <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed mx-auto">
                    Rejoins un club ou demande un accès coach pour voir tes plans et outils.
                  </p>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-ios-2">
                  <Button className="w-full rounded-[10px]" type="button" onClick={() => navigate("/search?tab=clubs")}>
                    Rejoindre un club
                  </Button>
                  <Button className="w-full rounded-[10px]" type="button" variant="outline" onClick={() => setShowCreateClub(true)}>
                    Créer un club
                  </Button>
                </div>
              </div>
            </IOSListGroup>
          </div>
          {showCreateClub && (
            <CreateClubDialogPremium
              isOpen={showCreateClub}
              onClose={() => setShowCreateClub(false)}
              onGroupCreated={() => {
                void loadClubs();
                setShowCreateClub(false);
              }}
            />
          )}
        </>
      ) : (
        <>
          <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto pt-ios-2 pb-ios-6">
            {/* Club selector pills */}
            <div className="px-ios-4 pb-ios-3">
              <div className="scrollbar-hide flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                {displayClubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => setSelectedClubId(club.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                      selectedClubId === club.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-muted-foreground"
                    )}
                  >
                    {club.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Athlete plan cards (when user has both coach clubs and athlete participations) */}
            {clubs.length > 0 && athleteClubs.length > 0 && (
              <IOSListGroup header="MON PLAN COACHING" className="px-ios-4">
                {athleteClubs.map((club, idx) => {
                  const pct = club.total > 0 ? Math.round((club.completed / club.total) * 100) : 0;
                  return (
                    <div key={club.clubId} className="relative">
                      <div
                        onClick={() => setSelectedClubId(club.clubId)}
                        className={cn(
                          "flex items-center gap-3 bg-card px-ios-4 py-3 cursor-pointer active:bg-secondary/80 transition-colors",
                          selectedClubId === club.clubId && "bg-primary/5"
                        )}
                      >
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-blue-500">
                          <Dumbbell className="h-[18px] w-[18px] text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] leading-snug text-foreground">{club.clubName}</p>
                          <p className="text-[13px] text-muted-foreground">
                            {club.completed}/{club.total} séances validées
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {club.total > 0 && (
                            <Badge
                              className={cn(
                                "border-0 text-[11px] px-2 py-0.5",
                                pct >= 80 && "bg-green-500/15 text-green-600",
                                pct >= 50 && pct < 80 && "bg-orange-500/15 text-orange-600",
                                pct < 50 && "bg-red-500/15 text-red-600"
                              )}
                            >
                              {pct}%
                            </Badge>
                          )}
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                        </div>
                      </div>
                      {idx < athleteClubs.length - 1 && (
                        <div className="absolute bottom-0 left-[54px] right-0 h-px bg-border" />
                      )}
                    </div>
                  );
                })}
              </IOSListGroup>
            )}

            {selectedClub && (
              <>
                {/* Week overview */}
                <IOSListGroup header="SEMAINE ACTIVE" className="px-ios-4">
                  <div className="bg-card px-ios-4 py-ios-4 rounded-ios-md">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[20px] font-semibold text-foreground">{weekLabel}</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">{selectedClub.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[28px] font-bold text-foreground leading-none">{thisWeekSessions.length}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">séances</p>
                      </div>
                    </div>
                  </div>
                </IOSListGroup>

                {/* Quick stats */}
                <IOSListGroup header="STATISTIQUES" className="px-ios-4">
                  <IOSListItem
                    icon={Users}
                    iconBgColor="bg-blue-500"
                    title="Membres"
                    value={String(memberCount)}
                    showChevron={false}
                    showSeparator={true}
                  />
                  <IOSListItem
                    icon={CalendarDays}
                    iconBgColor="bg-orange-500"
                    title="À venir"
                    value={String(upcomingSessions.length)}
                    showChevron={false}
                    showSeparator={true}
                  />
                  <IOSListItem
                    icon={Dumbbell}
                    iconBgColor="bg-green-500"
                    title="Rôle"
                    value={isCoach ? "Coach" : "Athlète"}
                    showChevron={false}
                    showSeparator={false}
                  />
                </IOSListGroup>

                {/* Coach tools */}
                {isCoach && (
                  <IOSListGroup header="OUTILS COACHING" className="px-ios-4">
                    {coachTools.map((tool, idx) => (
                      <IOSListItem
                        key={tool.label}
                        icon={tool.icon}
                        iconBgColor={tool.color}
                        title={tool.label}
                        subtitle={tool.subtitle}
                        onClick={tool.onClick}
                        showChevron={true}
                        showSeparator={idx < coachTools.length - 1}
                      />
                    ))}
                  </IOSListGroup>
                )}

                {/* Club management (coach only) */}
                {isCoach && (
                  <IOSListGroup header="CLUB" className="px-ios-4">
                    <IOSListItem
                      icon={Building2}
                      iconBgColor="bg-indigo-500"
                      title="Gérer le club"
                      subtitle="Membres, invitations, paramètres"
                      onClick={() => void openClubManagement()}
                      showChevron={true}
                      showSeparator={false}
                    />
                  </IOSListGroup>
                )}

                {/* Athlete weekly view */}
                {!isCoach && (
                  <IOSListGroup header="MON PLAN DE LA SEMAINE" className="px-ios-4">
                    <div className="bg-card rounded-ios-md overflow-hidden">
                      <div className="px-ios-4 py-ios-3 border-b border-border">
                        <p className="text-[15px] text-muted-foreground">
                          Vue claire, validation des séances, notes et progression.
                        </p>
                      </div>
                      <AthleteWeeklyView
                        clubId={selectedClub.id}
                        sessions={thisWeekSessions}
                        onSessionClick={(session) => setSelectedSession(session)}
                      />
                    </div>
                  </IOSListGroup>
                )}

                {/* Upcoming sessions (coach) */}
                {isCoach && (
                  <IOSListGroup header="PROCHAINES SÉANCES" className="px-ios-4">
                    {upcomingSessions.length === 0 ? (
                      <div className="px-ios-4 py-ios-4 bg-card text-center rounded-ios-md">
                        <p className="text-[15px] text-muted-foreground">
                          Aucune séance à venir. Commence par créer le plan de la semaine.
                        </p>
                      </div>
                    ) : (
                      upcomingSessions.map((session, idx) => (
                        <div key={session.id} className="relative">
                          <div
                            onClick={() => setSelectedSession(session)}
                            className="flex items-center gap-3 bg-card px-ios-4 py-3 cursor-pointer active:bg-secondary/80 transition-colors"
                          >
                            <ActivityIcon activityType={session.activity_type} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[17px] leading-snug text-foreground font-medium">
                                {session.title}
                              </p>
                              <p className="text-[13px] text-muted-foreground">
                                {format(new Date(session.scheduled_at), "EEE d MMM – HH:mm", { locale: fr })}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                          </div>
                          {idx < upcomingSessions.length - 1 && (
                            <div className="absolute bottom-0 left-[54px] right-0 h-px bg-border" />
                          )}
                        </div>
                      ))
                    )}
                  </IOSListGroup>
                )}
              </>
            )}
          </div>

          {/* Dialogs */}
          {selectedClub && (
            <>
              <WeeklyPlanDialog
                isOpen={showWeeklyPlan}
                onClose={() => {
                  setShowWeeklyPlan(false);
                  setDraftInitialGroup(undefined);
                  setDraftInitialWeek(undefined);
                }}
                clubId={selectedClub.id}
                onSent={refreshCurrentClub}
                initialGroupId={draftInitialGroup}
                initialWeek={draftInitialWeek}
              />
              <WeeklyTrackingDialog isOpen={showTracking} onClose={() => setShowTracking(false)} clubId={selectedClub.id} />
              <ClubGroupsManagerDialog isOpen={showGroups} onClose={() => setShowGroups(false)} clubId={selectedClub.id} />
              <CoachingDraftsList
                isOpen={showDrafts}
                onClose={() => setShowDrafts(false)}
                clubId={selectedClub.id}
                onOpenDraft={(weekStartDate, groupId) => {
                  setShowDrafts(false);
                  setDraftInitialWeek(weekStartDate);
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
            </>
          )}

          <Suspense fallback={null}>
            {clubInfoData && user && (
              <>
                <ClubInfoDialog
                  isOpen={showClubInfo}
                  onClose={() => {
                    setShowClubInfo(false);
                    void refreshCurrentClub();
                  }}
                  conversationId={clubInfoData.id}
                  groupName={clubInfoData.group_name || ""}
                  groupDescription={clubInfoData.group_description}
                  groupAvatarUrl={clubInfoData.group_avatar_url}
                  isAdmin={clubInfoData.created_by === user.id}
                  clubCode={clubInfoData.club_code || ""}
                  createdBy={clubInfoData.created_by || ""}
                  onEditGroup={() => {
                    setShowClubInfo(false);
                    setTimeout(() => setShowEditClub(true), 100);
                  }}
                />
                <EditClubDialog
                  isOpen={showEditClub}
                  onClose={() => setShowEditClub(false)}
                  conversationId={clubInfoData.id}
                  groupName={clubInfoData.group_name || ""}
                  groupDescription={clubInfoData.group_description}
                  groupAvatarUrl={clubInfoData.group_avatar_url}
                  clubCode={clubInfoData.club_code || ""}
                  createdBy={clubInfoData.created_by || ""}
                  isAdmin={clubInfoData.created_by === user.id}
                  onGroupUpdated={() => {
                    void loadClubs();
                    void refreshCurrentClub();
                    setShowEditClub(false);
                  }}
                />
              </>
            )}
          </Suspense>
        </>
      )}
    </div>
  );
}
