import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
import { IosAppStoreScrollLayout } from "@/components/layout/IosAppStoreScrollLayout";
import { CoachingSessionDetail } from "@/components/coaching/CoachingSessionDetail";
import { WeeklyPlanDialog } from "@/components/coaching/WeeklyPlanDialog";
import { WeeklyTrackingDialog } from "@/components/coaching/WeeklyTrackingDialog";
import { ClubGroupsManagerDialog } from "@/components/coaching/ClubGroupsManagerDialog";
import { CoachingDraftsList } from "@/components/coaching/CoachingDraftsList";
import { AthleteWeeklyView } from "@/components/coaching/AthleteWeeklyView";

const ClubInfoDialog = lazy(() =>
  import("@/components/ClubInfoDialog").then((m) => ({ default: m.ClubInfoDialog }))
);
const EditClubDialog = lazy(() =>
  import("@/components/EditClubDialog").then((m) => ({ default: m.EditClubDialog }))
);

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
  const [clubInfoData, setClubInfoData] = useState<ClubInfoRow | null>(null);
  const [showClubInfo, setShowClubInfo] = useState(false);
  const [showEditClub, setShowEditClub] = useState(false);

  /** Clubs où l’utilisateur est membre, ou repli sur les clubs liés au plan athlète (participations) */
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
  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} - ${format(weekEnd, "d MMM", { locale: fr })}`;

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
        .select("id, title, description, scheduled_at, activity_type, distance_km, pace_target, status, coach_id, club_id, objective, session_blocks, coach_notes")
        .eq("club_id", selectedClubId)
        .order("scheduled_at", { ascending: true }),
    ]);

    setMemberCount(memberRows?.length || 0);
    setSessions((sessionRows || []) as CoachingSession[]);
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

  const openClubManagement = async () => {
    if (!selectedClubId) return;
    const { data, error } = await supabase.from("conversations").select("*").eq("id", selectedClubId).single();
    if (error || !data) return;
    setClubInfoData(data as ClubInfoRow);
    setShowClubInfo(true);
  };

  const refreshCurrentClub = async () => {
    await loadClubData();
    await loadAthleteClubs();
  };

  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.scheduled_at);
    return d >= weekStart && d <= weekEnd;
  });
  const upcomingSessions = sessions.filter((s) => new Date(s.scheduled_at) >= new Date()).slice(0, 6);

  /** Sans membres de club, on attend le chargement des participations pour savoir si un plan athlète existe */
  const waitAthleteWhenNoClub = clubs.length === 0 && athleteClubsLoading;
  const showPageLoader = authLoading || loading || waitAthleteWhenNoClub;

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col overflow-hidden bg-secondary">
      {showPageLoader ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-4 pb-6 pt-[max(0.9rem,var(--safe-area-top))]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Chargement du coaching</span>
        </div>
      ) : displayClubs.length === 0 ? (
        <>
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 pb-6 pt-[max(0.9rem,var(--safe-area-top))]">
            <div className="ios-card overflow-hidden border border-border/60">
              <div className={emptyStateSx.shell}>
                <div className={emptyStateSx.iconCircle}>
                  <Dumbbell className="h-12 w-12 text-muted-foreground" aria-hidden />
                </div>
                <div className={emptyStateSx.textBlock}>
                  <h3 className="text-ios-title3 font-semibold text-foreground">Aucun espace coaching trouvé</h3>
                  <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed mx-auto">
                    Rejoins un club ou demande un accès coach pour voir tes plans et outils.
                  </p>
                </div>
                <div className="flex w-full max-w-xs flex-col gap-ios-2">
                  <Button className="w-full" type="button" onClick={() => navigate("/search?tab=clubs")}>
                    Rejoindre un club
                  </Button>
                  <Button className="w-full" type="button" variant="outline" onClick={() => setShowCreateClub(true)}>
                    Créer un club
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {showCreateClub ? (
            <CreateClubDialogPremium
              isOpen={showCreateClub}
              onClose={() => setShowCreateClub(false)}
              onGroupCreated={() => {
                void loadClubs();
                setShowCreateClub(false);
              }}
            />
          ) : null}
        </>
      ) : (
        <>
          <IosAppStoreScrollLayout
            className="min-h-0 flex-1"
            titleLarge={
              <>
                <h1 className="text-ios-largetitle font-bold tracking-tight text-foreground">Coaching</h1>
                <p className="mt-1 text-ios-subheadline text-muted-foreground">Expérience claire, actions rapides</p>
              </>
            }
            titleCompact="Coaching"
            belowLargeTitle={
              <>
                <div className="border-b border-border/25 bg-secondary px-4 pb-3">
                  <div className="ios-card border border-border/60 px-ios-4 py-ios-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-primary/12 text-primary">
                          <Dumbbell className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 text-sm text-muted-foreground">
                          Espace club, plan et outils
                        </div>
                      </div>
                      {selectedClub && (
                        <div
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold",
                            isCoach ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCoach ? "Mode coach" : "Mode athlete"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <section className="border-b border-border/25 bg-secondary px-4 pb-4">
                  <div className="ios-card border border-border/60 p-2">
                    <div className="scrollbar-hide flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                      {displayClubs.map((club) => (
                        <button
                          key={club.id}
                          type="button"
                          onClick={() => setSelectedClubId(club.id)}
                          className={cn(
                            "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                            selectedClubId === club.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          )}
                        >
                          {club.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            }
          >
            <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-6 pt-2" data-tutorial="tutorial-coaching">
            {clubs.length > 0 && athleteClubs.length > 0 && (
              <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
                <h2 className="text-[16px] font-semibold text-foreground">Mon plan coaching</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tes clubs avec une planification active — touche une ligne pour afficher le club.
                </p>
                <div className="mt-3 space-y-2">
                  {athleteClubs.map((club) => {
                    const pct = club.total > 0 ? Math.round((club.completed / club.total) * 100) : 0;
                    return (
                      <button
                        key={club.clubId}
                        type="button"
                        onClick={() => setSelectedClubId(club.clubId)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-3 text-left transition-colors active:opacity-90",
                          selectedClubId === club.clubId && "ring-2 ring-primary/35"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-foreground">{club.clubName}</p>
                          <p className="text-xs text-muted-foreground">
                            {club.completed}/{club.total} séances validées cette semaine
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {club.total > 0 ? (
                            <Badge
                              className={cn(
                                "border-0 text-[11px] px-2 py-0.5",
                                pct >= 80 && "bg-green-500/15 text-green-600 dark:text-green-400",
                                pct >= 50 && pct < 80 && "bg-orange-500/15 text-orange-600 dark:text-orange-400",
                                pct < 50 && "bg-red-500/15 text-red-600 dark:text-red-400"
                              )}
                            >
                              {pct}%
                            </Badge>
                          ) : null}
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {selectedClub && (
          <>
            <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
              <p className="text-[12px] uppercase tracking-wide text-muted-foreground">Semaine active</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[20px] font-semibold text-foreground">{weekLabel}</p>
                  <p className="text-sm text-muted-foreground">{selectedClub.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold text-foreground">{thisWeekSessions.length}</p>
                  <p className="text-xs text-muted-foreground">seances</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-secondary px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Membres</p>
                  <p className="text-[16px] font-semibold text-foreground">{memberCount}</p>
                </div>
                <div className="rounded-xl bg-secondary px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">A venir</p>
                  <p className="text-[16px] font-semibold text-foreground">{upcomingSessions.length}</p>
                </div>
                <div className="rounded-xl bg-secondary px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Profil</p>
                  <p className="text-[16px] font-semibold text-foreground">{isCoach ? "Coach" : "Athlete"}</p>
                </div>
              </div>
            </section>

            {isCoach ? (
              <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
                <h2 className="text-[16px] font-semibold text-foreground">Outils coaching</h2>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Button className="justify-start gap-2" variant="secondary" onClick={() => setShowWeeklyPlan(true)}>
                    <CalendarDays className="h-4 w-4" />
                    Planifier
                  </Button>
                  <Button className="justify-start gap-2" variant="secondary" onClick={() => setShowTracking(true)}>
                    <ChartColumnBig className="h-4 w-4" />
                    Suivi
                  </Button>
                  <Button className="justify-start gap-2" variant="secondary" onClick={() => setShowGroups(true)}>
                    <Users className="h-4 w-4" />
                    Groupes
                  </Button>
                  <Button className="justify-start gap-2" variant="secondary" onClick={() => setShowDrafts(true)}>
                    <FolderKanban className="h-4 w-4" />
                    Brouillons
                  </Button>
                </div>
              </section>
            ) : null}

            {isCoach && (
              <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Building2 className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold text-foreground">Informations du club</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Membres, invitations, rôles coach, groupes d’entraînement et paramètres du club.
                    </p>
                    <Button className="mt-3" type="button" variant="secondary" onClick={() => void openClubManagement()}>
                      Gérer le club
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {!isCoach ? (
              <section className="ios-card border border-border/60 px-ios-2 py-ios-2">
                <div className="px-2 pb-2 pt-1">
                  <h2 className="text-[16px] font-semibold text-foreground">Mon plan de la semaine</h2>
                  <p className="text-sm text-muted-foreground">Vue claire, validation des seances, notes et progression.</p>
                </div>
                <AthleteWeeklyView clubId={selectedClub.id} sessions={thisWeekSessions} onSessionClick={(session) => setSelectedSession(session)} />
              </section>
            ) : null}

            {isCoach && (
              <section className="ios-card border border-border/60 px-ios-4 py-ios-4">
                <h2 className="text-[16px] font-semibold text-foreground">Prochaines seances</h2>
                <div className="mt-3 space-y-2">
                  {upcomingSessions.length === 0 ? (
                    <div className="rounded-xl bg-secondary px-3 py-4 text-sm text-muted-foreground">
                      Aucune seance a venir. Commence par creer le plan de la semaine.
                    </div>
                  ) : (
                    upcomingSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSession(session)}
                        className="flex w-full items-center justify-between rounded-xl bg-secondary px-3 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-foreground">{session.title}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(session.scheduled_at), "EEE d MMM - HH:mm", { locale: fr })}</p>
                        </div>
                        <ClipboardCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        )}
            </div>
          </IosAppStoreScrollLayout>

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
