import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { WeekSelectorPremium } from "@/components/coaching/planning/WeekSelectorPremium";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, kmForSession } from "./planUtils";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";

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
        const isRest =
          daySessions.length > 0 &&
          daySessions.every((session) => {
            const name = session.title.toLowerCase();
            const onlyRecoveryBlocks = session.blocks.every(
              (block) => block.type === "recovery" || block.type === "warmup" || block.type === "cooldown"
            );
            return session.sport === "other" || name.includes("repos") || onlyRecoveryBlocks;
          });
        return {
          day,
          sessions: daySessions,
          primarySession,
          isRest,
        };
      }),
    [sessions, weekDays]
  );

  return (
    <div className="bg-[#F7F8FA] pb-28 pt-2">
      <WeekSelectorPremium
        weekStart={props.weekStart}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPreviousWeek={props.onPreviousWeek}
        onNextWeek={props.onNextWeek}
      />

      <div className="flex flex-col border-t border-border">
        {loading ? (
          <div className="h-24 animate-pulse border-b border-border bg-card" />
        ) : (
          dayRows.map((row) => {
            const selected = isSameDay(row.day, selectedDate);
            const durationSec = row.primarySession
              ? row.primarySession.blocks.reduce(
                  (acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1),
                  0
                )
              : 0;
            const distanceKm = row.primarySession ? kmForSession(row.primarySession) : 0;
            const summary = row.primarySession
              ? {
                  title: row.isRest ? "Repos" : row.primarySession.title,
                  duration: durationToLabel(durationSec) || undefined,
                  distance: distanceKm > 0 ? `${Number(distanceKm.toFixed(1)).toString().replace(".", ",")} km` : undefined,
                  intensityLabel: row.isRest ? "Récupération" : effortLabelForSession(row.primarySession),
                }
              : undefined;
            const accentColor =
              !row.primarySession ? "#9CA3AF" :
              row.isRest ? "#22C55E" :
              row.primarySession.blocks[0]?.type === "interval" ? "#F97316" :
              row.primarySession.blocks[0]?.type === "steady" ? "#8B5CF6" :
              "#60A5FA";

            return (
              <DayPlanningRow
                key={row.day.toISOString()}
                dayLabel={format(row.day, "EEEE", { locale: fr })}
                dateLabel={format(row.day, "d MMM", { locale: fr })}
                isSelected={selected}
                session={summary}
                isSent={false}
                accentColor={accentColor}
                onAdd={() => {
                  onSelectDate(row.day);
                  onOpenCalendar?.();
                }}
                onOpen={
                  row.primarySession
                    ? () => {
                        onSelectDate(row.day);
                        setDetail(row.primarySession!);
                      }
                    : undefined
                }
                onEdit={undefined}
                onSend={undefined}
                onDuplicate={undefined}
                onDelete={undefined}
                onUnsend={undefined}
                allowSessionActions={false}
              />
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

function sessionSummaryLine(session: AthletePlanSessionModel): string {
  const totalDurationSec = session.blocks.reduce(
    (acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1),
    0
  );
  const durationLabel = durationToLabel(totalDurationSec);
  const distance = kmForSession(session);
  const distanceLabel = distance > 0 ? `${Number(distance.toFixed(1)).toString().replace(".", ",")} km` : null;
  const effortLabel = effortLabelForSession(session);
  return [durationLabel, distanceLabel, effortLabel].filter(Boolean).join(" • ");
}

function durationToLabel(totalDurationSec: number): string | null {
  if (!totalDurationSec) return null;
  const minutes = Math.round(totalDurationSec / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest.toString().padStart(2, "0")}`;
}

function effortLabelForSession(session: AthletePlanSessionModel): string {
  const intervalBlocks = session.blocks.filter((block) => block.type === "interval").length;
  if (intervalBlocks > 0) return `${intervalBlocks} x fractionné`;
  if (session.blocks.some((block) => block.zone === "Z4" || block.zone === "Z5" || block.zone === "Z6")) return "Tempo / seuil";
  if (session.blocks.every((block) => block.type === "recovery" || block.type === "cooldown")) return "Récup";
  return "Endurance";
}
