import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { buildWorkoutHeadline, resolveWorkoutMetrics, workoutAccentColor } from "@/lib/workoutPresentation";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, kmForSession } from "./planUtils";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";
import { WeekSelectorPremium, type DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { sportDotClass } from "./sportTokens";

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
  navigateProfile: (userId: string) => void;
};

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
    onOpenCalendar,
  } = props;
  const [detail, setDetail] = useState<AthletePlanSessionModel | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

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
      if (!row.primarySession) return;
      const key = format(row.day, "yyyy-MM-dd");
      if (row.isRest) {
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
      const aggregatedDistance = totalDistanceKm > 0 ? `${Math.round(totalDistanceKm * 10) / 10} km` : undefined;
      const value = row.sessions.length > 1 ? aggregatedDistance || metrics.distanceLabel || metrics.durationLabel : metrics.distanceLabel || metrics.durationLabel;
      if (!value) return;
      summaries[key] = {
        sport: row.isRest ? "rest" : row.primarySession.sport === "other" ? "strength" : row.primarySession.sport,
        value,
      };
    });
    return summaries;
  }, [dayRows]);

  return (
    <div className="bg-secondary pb-28 pt-2">
      <WeekSelectorPremium
        weekStart={props.weekStart}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPreviousWeek={props.onPreviousWeek}
        onNextWeek={props.onNextWeek}
        sessionSummaryByDate={sessionSummaryByDate}
        showLegend
      />

      <div className="flex flex-col border-t border-border bg-card">
        {loading ? (
          <div className="m-4 h-24 animate-pulse rounded-xl bg-muted" />
        ) : (
          dayRows.map((row) => {
            const selected = isSameDay(row.day, selectedDate);
            const dayLabel = format(row.day, "EEEE", { locale: fr });
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
            return (
              <div key={row.day.toISOString()} className={row.primarySession ? sportDotClass(row.primarySession.sport) : "bg-muted-foreground/50"}>
                <DayPlanningRow
                  dayLabel={dayLabel}
                  dateLabel={format(row.day, "d MMM", { locale: fr })}
                  isSelected={selected}
                  session={
                    hasSession
                      ? {
                          title: buildWorkoutHeadline({
                            title: row.primarySession?.title,
                            segments,
                            sport: row.primarySession?.sport,
                            isRestDay: row.isRest,
                          }),
                          subtitle: row.primarySession?.title,
                          duration: row.isRest ? undefined : metrics?.durationLabel,
                          distance: row.isRest ? undefined : metrics?.distanceLabel,
                          intensityLabel: row.sessions.length > 1 ? `${row.sessions.length} séances` : metrics?.intensityLabel,
                          miniProfile: renderWorkoutMiniProfile(segments),
                          sportHint: row.primarySession?.sport,
                          isRestDay: row.isRest,
                        }
                      : undefined
                  }
                  accentColor={workoutAccentColor(segments, row.primarySession?.sport, row.isRest)}
                  emptyLabel="Aucune séance"
                  onAdd={() => {
                    onSelectDate(row.day);
                    onOpenCalendar?.();
                  }}
                  onOpen={
                    row.primarySession
                      ? () => {
                          onSelectDate(row.day);
                          setDetail(row.primarySession);
                        }
                      : undefined
                  }
                  onEdit={row.primarySession ? () => setDetail(row.primarySession) : undefined}
                  onSend={undefined}
                  onDuplicate={undefined}
                  onDelete={undefined}
                  onUnsend={undefined}
                  allowSessionActions={false}
                  hideActionSlot={!hasSession}
                />
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
}

function computeSessionLoad(session: AthletePlanSessionModel): number {
  const km = kmForSession(session);
  if (km > 0) return km;
  const seconds = session.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0);
  return seconds > 0 ? seconds / 3600 : 0.2;
}

