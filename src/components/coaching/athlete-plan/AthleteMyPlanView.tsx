import { useEffect, useMemo, useState } from "react";
import { format, getISOWeek, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Group } from "@/components/apple/Group";
import { CoachingAthleteWeekGrid } from "@/components/coaching/handoff/CoachingAthleteWeekGrid";
import type { AthleteWeekGridDay } from "@/components/coaching/handoff/CoachingAthleteWeekGrid";
import { AthleteMaquettePlanDayRow } from "@/components/coaching/athlete-plan/AthleteMaquettePlanDayRow";
import type { AthleteMaquetteDayStatus } from "@/components/coaching/athlete-plan/AthleteMaquettePlanDayRow";
import { buildWorkoutHeadline, resolveWorkoutMetrics } from "@/lib/workoutPresentation";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, formatCalendarDistance, isExplicitRestDay, kmForSession, toCalendarSummarySport } from "./planUtils";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";
import { parseSport } from "./sportTokens";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

type Props = {
  loading: boolean;
  weekDays: Date[];
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  sessions: AthletePlanSessionModel[];
  prevWeekPlannedKm: number | null;
  coaches: AthleteCoachBrief[];
  onConfirmSession: (session: AthletePlanSessionModel) => Promise<void> | void;
  onCompleteSession: (session: AthletePlanSessionModel) => Promise<void> | void;
  onMessageCoach: (coachId: string) => void;
  onPersistSessionFeedback: (
    session: AthletePlanSessionModel,
    payload: { note: string; rpe: number | null; felt: "easy" | "ok" | "hard" | null }
  ) => Promise<void> | void;
  onOpenCoaches?: () => void;
  onOpenMessages?: () => void;
  onOpenPastSessions?: () => void;
  onOpenCalendar?: () => void;
  onOpenExportApps?: () => void;
  navigateProfile: (userId: string) => void;
};

type ExportDestination = {
  id: string;
  name: string;
  description: string;
  url?: string;
};

const EXPORT_DESTINATIONS: ExportDestination[] = [
  {
    id: "garmin",
    name: "Garmin Connect",
    description: "Connecter Garmin puis exporter automatiquement tes séances.",
  },
  {
    id: "trainingpeaks",
    name: "TrainingPeaks",
    description: "Retrouver et planifier tes entraînements.",
    url: "https://app.trainingpeaks.com/",
  },
  {
    id: "coros",
    name: "COROS Training Hub",
    description: "Synchroniser tes séances avec COROS.",
    url: "https://traininghub.coros.com/",
  },
  {
    id: "suunto",
    name: "Suunto App",
    description: "Gerer ton planning et tes exports Suunto.",
    url: "https://www.suunto.com/fr-fr/suunto-app/",
  },
  {
    id: "polar",
    name: "Polar Flow",
    description: "Importer et suivre tes entraînements Polar.",
    url: "https://flow.polar.com/",
  },
];

export function AthleteMyPlanView(props: Props) {
  const {
    loading,
    weekDays,
    selectedDate,
    onSelectDate,
    sessions: rawSessions,
    onConfirmSession,
    onCompleteSession,
    onMessageCoach,
    onPersistSessionFeedback,
    coaches,
    onOpenCalendar,
  } = props;
  const [detail, setDetail] = useState<AthletePlanSessionModel | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [garminConnecting, setGarminConnecting] = useState(false);
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const handleGarminConnect = async () => {
    if (!user) {
      toast.error("Connecte-toi pour lier Garmin.");
      return;
    }

    setGarminConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("garmin-connect", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error("Garmin URL manquante");

      if (isNative) {
        await Browser.open({ url: data.authUrl, presentationStyle: "popover" });
      } else {
        window.open(data.authUrl, "garmin_auth", "width=600,height=760");
      }
    } catch (error) {
      console.error("Error connecting to Garmin:", error);
      toast.error("Impossible de lancer la connexion Garmin.");
    } finally {
      setGarminConnecting(false);
    }
  };

  const sessions = useMemo(() => applyConflictFlags(rawSessions), [rawSessions]);
  const dayRows = useMemo(
    () =>
      weekDays.map((day) => {
        const daySessions = sessions
          .filter((s) => isSameDay(parseISO(s.assignedDate), day))
          .sort((a, b) => computeSessionLoad(b) - computeSessionLoad(a));
        const primarySession = daySessions[0] ?? null;
        const isRest = daySessions.length === 0;
        return {
          day,
          sessions: daySessions,
          primarySession,
          isRest,
        };
      }),
    [sessions, weekDays]
  );

  const sessionSummaryByDate = useMemo<Record<string, DaySessionSummary>>(() => {
    const summaries: Record<string, DaySessionSummary> = {};
    dayRows.forEach((row) => {
      const key = format(row.day, "yyyy-MM-dd");
      if (isExplicitRestDay(row.sessions)) {
        summaries[key] = { sport: "rest", value: "Repos" };
        return;
      }
      const primarySegments = buildWorkoutSegments(row.primarySession.blocks, {
        sport: row.primarySession.sport,
        athleteIntensity: row.primarySession.athleteIntensity ?? undefined,
      });
      const metrics = resolveWorkoutMetrics({
        segments: primarySegments,
        explicitDistanceKm: row.primarySession.distanceKm,
      });
      const totalDistanceKm = row.sessions.reduce((acc, session) => acc + kmForSession(session), 0);
      const aggregatedDistance = formatCalendarDistance(totalDistanceKm) ?? undefined;
      const value = row.sessions.length > 1 ? aggregatedDistance || metrics.distanceLabel || metrics.durationLabel : metrics.distanceLabel || metrics.durationLabel;
      if (!value) return;
      summaries[key] = {
        sport: toCalendarSummarySport(row.primarySession.sport),
        value,
      };
    });
    return summaries;
  }, [dayRows]);

  const handoffDays = useMemo((): AthleteWeekGridDay[] => {
    const today = new Date();
    return dayRows.map((row) => {
      let status: AthleteWeekGridDay["status"];
      if (row.isRest) status = "rest";
      else if (row.primarySession?.participationStatus === "completed") status = "done";
      else if (isSameDay(row.day, today)) status = "today";
      else status = "planned";
      const key = format(row.day, "yyyy-MM-dd");
      return {
        date: row.day,
        status,
        summary: sessionSummaryByDate[key],
      };
    });
  }, [dayRows, sessionSummaryByDate]);

  const weekStripTitle = `SEMAINE ${getISOWeek(props.weekStart)} — ${format(props.weekStart, "d MMM", { locale: fr })}`.toUpperCase();
  const coachDisplay = (coaches[0]?.name ?? sessions[0]?.coachName ?? "Coach").trim();
  const coachFirst = (coachDisplay.split(/\s+/)[0] || coachDisplay).toUpperCase();
  const coachLabel = coachFirst;  const completedSessions = sessions.filter((s) => s.participationStatus === "completed").length;
  const totalSessions = sessions.length;
  const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  useEffect(() => {
    const onGarminAuthSuccess = () => {
      toast.success("Garmin connecté. Tu peux exporter tes entraînements.");
      setExportDialogOpen(false);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "garmin_auth_success") {
        onGarminAuthSuccess();
      }
    };
    window.addEventListener("garminAuthSuccess", onGarminAuthSuccess as EventListener);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("garminAuthSuccess", onGarminAuthSuccess as EventListener);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <div className='bg-[#F2F2F7] pb-28 pt-0 [font-family:-apple-system,BlinkMacSystemFont,"SF_Pro_Display",system-ui,sans-serif] [-webkit-font-smoothing:antialiased]'>
      <section className="px-4 pb-3 pt-2">
        <div className="rounded-[18px] border-[0.5px] border-[rgba(60,60,67,0.12)] bg-card p-[18px] text-card-foreground shadow-none dark:border-[rgba(84,84,88,0.45)]">
          <p className="text-[12px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
            {`SEMAINE ${getISOWeek(props.weekStart)} · COACH ${coachLabel}`}
          </p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] text-foreground">
            {totalSessions > 0 ? `${completedSessions} sur ${totalSessions} séances` : "Aucune séance prévue"}
          </p>
          {totalSessions > 0 ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-[rgba(60,60,67,0.12)] dark:bg-muted">
              <div
                className="h-full rounded-[3px] bg-[#2997ff] dark:bg-[#5e5ce6]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <CoachingAthleteWeekGrid
        days={handoffDays}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPreviousWeek={props.onPreviousWeek}
        onNextWeek={props.onNextWeek}
        weekTitle={weekStripTitle}
      />

      <Group
        title="Plan de la semaine"
        className="mb-0"
        footer={
          <button
            type="button"
            className="handoff-ios-link text-[13px] font-normal leading-snug text-left hover:underline"
            onClick={() => {
              props.onOpenExportApps?.();
              setExportDialogOpen(true);
            }}
          >
            Exporter mes séances vers Garmin ou une autre app…
          </button>
        }
      >
        {loading ? (
          <div className="m-4 h-24 animate-pulse rounded-xl bg-muted" />
        ) : (
          dayRows.map((row, index) => {
            const gridDay = handoffDays[index];
            const status: AthleteMaquetteDayStatus = gridDay?.status ?? "planned";
            const dayAbbrev = format(row.day, "EEEE", { locale: fr })
              .slice(0, 3)
              .toUpperCase();
            const dateNum = Number(format(row.day, "d"));
            const hasSession = row.sessions.length > 0;
            const segments = row.primarySession
              ? buildWorkoutSegments(row.primarySession.blocks, {
                  sport: row.primarySession.sport,
                  athleteIntensity: row.primarySession.athleteIntensity ?? undefined,
                })
              : [];
            const metrics = row.primarySession
              ? resolveWorkoutMetrics({
                  segments,
                  explicitDistanceKm: row.primarySession.distanceKm,
                })
              : null;
            const miniProfile =
              row.primarySession && segments.length
                ? renderWorkoutMiniProfile(segments, { sessionSchema: true })
                : undefined;
            const openRow = () => {
              onSelectDate(row.day);
              if (row.primarySession) setDetail(row.primarySession);
              else onOpenCalendar?.();
            };
            return (
              <AthleteMaquettePlanDayRow
                key={row.day.toISOString()}
                dayAbbrev={dayAbbrev}
                dateNum={dateNum}
                status={status}
                sportKey={row.primarySession ? parseSport(row.primarySession.sport) : null}
                title={
                  hasSession
                    ? buildWorkoutHeadline({
                        title: row.primarySession?.title,
                        segments,
                        sport: row.primarySession?.sport,
                        isRestDay: row.isRest,
                      })
                    : "Repos"
                }
                distanceLabel={row.isRest ? null : metrics?.distanceLabel}
                durationLabel={row.isRest ? null : metrics?.durationLabel}
                multiSessionHint={row.sessions.length > 1 ? `${row.sessions.length} séances` : null}
                miniProfile={miniProfile}
                onOpen={openRow}
                onStart={hasSession ? openRow : undefined}
              />
            );
          })
        )}
      </Group>

      <AthletePlanSessionDetailSheet
        session={detail}
        open={detail != null}
        onOpenChange={(o) => !o && setDetail(null)}
        onConfirm={() => {
          if (detail) {
            Promise.resolve(onConfirmSession(detail)).then(() => setDetail(null));
          }
        }}
        onComplete={() => {
          if (detail) {
            Promise.resolve(onCompleteSession(detail)).then(() => setDetail(null));
          }
        }}
        onMessageCoach={() => detail && onMessageCoach(detail.coachId)}
        saving={savingFeedback}
        onSaveFeedback={async (payload) => {
          if (!detail) return;
          setSavingFeedback(true);
          try {
            let note = payload.note.trim();
            if (payload.felt === "easy") note = `[Ressenti: facile] ${note}`.trim();
            if (payload.felt === "ok") note = `[Ressenti: ok] ${note}`.trim();
            if (payload.felt === "hard") note = `[Ressenti: dur] ${note}`.trim();
            if (payload.rpe != null) note = `${note ? `${note}\n` : ""}RPE ${payload.rpe}/10`.trim();
            await onPersistSessionFeedback(detail, { note, rpe: payload.rpe, felt: payload.felt });
          } finally {
            setSavingFeedback(false);
          }
        }}
      />

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exporter mes entraînements</DialogTitle>
            <DialogDescription>Choisis ton app pour ouvrir l'espace d'import/synchronisation.</DialogDescription>
          </DialogHeader>
          <div className="ios-list-stack space-y-2">
            {EXPORT_DESTINATIONS.map((destination) => (
              <button
                key={destination.id}
                type="button"
                className="ios-list-row flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left active:bg-secondary/60"
                onClick={() => {
                  if (destination.id === "garmin") {
                    void handleGarminConnect();
                    return;
                  }
                  if (destination.url) {
                    window.open(destination.url, "_blank", "noopener,noreferrer");
                  }
                }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-foreground">{destination.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{destination.description}</p>
                </div>
                {destination.id === "garmin" && garminConnecting ? (
                  <span className="text-[12px] text-muted-foreground">Connexion...</span>
                ) : (
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function computeSessionLoad(session: AthletePlanSessionModel): number {
  const km = kmForSession(session);
  if (km > 0) return km;
  const seconds = session.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0);
  return seconds > 0 ? seconds / 3600 : 0.2;
}

