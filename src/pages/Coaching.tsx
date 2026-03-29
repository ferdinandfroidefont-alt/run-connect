import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChartColumnBig, ClipboardCheck, Dumbbell, FolderKanban, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { IosPageIntro } from "@/components/layout/IosPageIntro";

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

export default function Coaching() {
  const { user } = useAuth();
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

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) || null,
    [clubs, selectedClubId]
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
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id);

      const clubIds = (memberships || []).map((m) => m.conversation_id);
      if (clubIds.length === 0) {
        setClubs([]);
        setSelectedClubId(null);
        return;
      }

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, group_name, is_group")
        .in("id", clubIds)
        .eq("is_group", true);

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
      setSelectedClubId((prev) => (prev && clubOptions.some((c) => c.id === prev) ? prev : clubOptions[0]?.id || null));
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

  const refreshCurrentClub = async () => {
    await loadClubData();
  };

  const thisWeekSessions = sessions.filter((s) => {
    const d = new Date(s.scheduled_at);
    return d >= weekStart && d <= weekEnd;
  });
  const upcomingSessions = sessions.filter((s) => new Date(s.scheduled_at) >= new Date()).slice(0, 6);

  return (
    <div className="fixed-fill-with-bottom-nav flex min-h-0 flex-col overflow-hidden bg-secondary">
      <IosFixedPageHeaderShell
        className="min-h-0 flex-1"
        headerWrapperClassName="z-20 ios-header-blur"
        header={
          <div className="ios-page-shell pt-[var(--safe-area-top)]">
            <IosPageHeaderBar className="px-0 py-2" title="Coaching" />
          </div>
        }
      >
      {loading ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-4 pb-[calc(1.5rem+var(--safe-area-bottom))] pt-6"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Chargement du coaching</span>
        </div>
      ) : clubs.length === 0 ? (
        <>
          <div className="ios-page-shell flex flex-1 flex-col justify-center pb-[calc(1.5rem+var(--safe-area-bottom))] pt-4">
            <div className="ios-empty-state-panel">
              <div className={emptyStateSx.shell}>
                <div className={emptyStateSx.iconCircle}>
                  <Dumbbell className="h-12 w-12 text-muted-foreground" aria-hidden />
                </div>
                <div className={emptyStateSx.textBlock}>
                  <h3 className="text-ios-title3 font-semibold text-foreground">Aucun espace coaching trouvé</h3>
                  <p className="mx-auto max-w-xs text-ios-subheadline leading-relaxed text-muted-foreground">
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
          <Suspense fallback={null}>
            <CreateClubDialogPremium
              isOpen={showCreateClub}
              onClose={() => setShowCreateClub(false)}
              onGroupCreated={() => {
                void loadClubs();
                setShowCreateClub(false);
              }}
            />
          </Suspense>
        </>
      ) : (
        <>
          <div className="ios-page-shell ios-page-stack">
            <IosPageIntro
              eyebrow="Coaching premium"
              title="Pilote ton club"
              subtitle="Retrouve la semaine active, les outils coach et les prochaines séances dans une interface plus claire et plus premium."
              badge={
                selectedClub ? (
                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      isCoach ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCoach ? "Mode coach" : "Mode athlete"}
                  </div>
                ) : null
              }
              className="mt-0"
            >
              <div className="flex items-center gap-3" data-tutorial="tutorial-coaching">
                <div className="ios-soft-icon">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ios-headline text-foreground">{selectedClub?.name ?? "Coaching"}</p>
                  <p className="text-ios-footnote text-muted-foreground">{weekLabel}</p>
                </div>
              </div>
            </IosPageIntro>

            <section className="ios-toolbar-card p-2">
              <div className="scrollbar-hide flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
                {clubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => setSelectedClubId(club.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                      selectedClubId === club.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    {club.name}
                  </button>
                ))}
              </div>
            </section>

            {selectedClub && (
          <>
            <section className="ios-section-shell px-ios-4 py-ios-4">
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
                <div className="ios-premium-subtle px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Membres</p>
                  <p className="text-[16px] font-semibold text-foreground">{memberCount}</p>
                </div>
                <div className="ios-premium-subtle px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">A venir</p>
                  <p className="text-[16px] font-semibold text-foreground">{upcomingSessions.length}</p>
                </div>
                <div className="ios-premium-subtle px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Profil</p>
                  <p className="text-[16px] font-semibold text-foreground">{isCoach ? "Coach" : "Athlete"}</p>
                </div>
              </div>
            </section>

            {isCoach ? (
              <section className="ios-section-shell px-ios-4 py-ios-4">
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
            ) : (
              <section className="ios-section-shell px-ios-2 py-ios-2">
                <div className="px-2 pb-2 pt-1">
                  <h2 className="text-[16px] font-semibold text-foreground">Mon plan de la semaine</h2>
                  <p className="text-sm text-muted-foreground">Vue claire, validation des seances, notes et progression.</p>
                </div>
                <AthleteWeeklyView clubId={selectedClub.id} sessions={thisWeekSessions} onSessionClick={(session) => setSelectedSession(session)} />
              </section>
            )}

            {isCoach && (
              <section className="ios-section-shell px-ios-4 py-ios-4">
                <h2 className="text-[16px] font-semibold text-foreground">Prochaines seances</h2>
                <div className="mt-3 space-y-2">
                  {upcomingSessions.length === 0 ? (
                    <div className="ios-premium-subtle px-3 py-4 text-sm text-muted-foreground">
                      Aucune seance a venir. Commence par creer le plan de la semaine.
                    </div>
                  ) : (
                    upcomingSessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSession(session)}
                        className="ios-premium-subtle flex w-full items-center justify-between px-3 py-3 text-left"
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
        </>
      )}
      </IosFixedPageHeaderShell>
    </div>
  );
}
