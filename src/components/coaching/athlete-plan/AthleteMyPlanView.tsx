import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { MoreHorizontal } from "lucide-react";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { cn } from "@/lib/utils";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, kmForSession } from "./planUtils";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";
import { WeekSelectorPremium } from "@/components/coaching/planning/WeekSelectorPremium";
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
    <div className="bg-secondary pb-28 pt-2">
      <WeekSelectorPremium
        weekStart={props.weekStart}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPreviousWeek={props.onPreviousWeek}
        onNextWeek={props.onNextWeek}
      />

      <div className="flex flex-col border-t border-border bg-card">
        {loading ? (
          <div className="m-4 h-24 animate-pulse rounded-xl bg-muted" />
        ) : (
          dayRows.map((row) => {
            const selected = isSameDay(row.day, selectedDate);
            const dayLabel = format(row.day, "EEEE", { locale: fr });
            const hasSession = row.sessions.length > 0;
            const summary = row.primarySession ? sessionSummaryLine(row.primarySession) : null;
            const accentColorClass = row.primarySession ? sportDotClass(row.primarySession.sport) : "bg-muted-foreground/50";
            return (
              <div
                key={row.day.toISOString()}
                className={accentColorClass}
              >
                <DayPlanningRow
                  dayLabel={dayLabel}
                  dateLabel={format(row.day, "d MMM", { locale: fr })}
                  isSelected={selected}
                  session={
                    hasSession
                      ? {
                          title: row.isRest ? "Repos" : row.primarySession?.title ?? "Séance",
                          duration: row.isRest ? undefined : summary ?? undefined,
                          distance: undefined,
                          intensityLabel: row.sessions.length > 1 ? `${row.sessions.length} séances` : undefined,
                        }
                      : undefined
                  }
                  accentColor="hsl(var(--primary))"
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
                {hasSession && !row.isRest ? (
                  <div className="pointer-events-none -mt-12 ml-[5.5rem] mr-14 mb-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <MiniSessionProfile session={row.primarySession!} />
                      <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </div>
                ) : null}
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

function MiniSessionProfile({ session }: { session: AthletePlanSessionModel }) {
  const total = Math.max(
    session.blocks.reduce((acc, block) => acc + estimateSegmentWeight(block.durationSec || 0), 0),
    1
  );
  const segments = session.blocks.flatMap((block) => {
    const repeated = Math.max(1, block.repetitions || 1);
    const profile = blockVisualProfile(block.type, block.zone);
    return Array.from({ length: repeated }, (_, index) => ({
      key: `${block.id}-${index}`,
      width: Math.max(8, Math.round((estimateSegmentWeight(block.durationSec || 0) / repeated / total) * 100)),
      ...profile,
    }));
  });

  return (
    <div className="flex h-10 items-end gap-1 rounded-[10px] bg-muted/80 px-2 py-1">
      {segments.slice(0, 14).map((segment) => (
        <span
          key={segment.key}
          className={cn("rounded-[7px]", segment.color)}
          style={{
            width: `${segment.width}%`,
            minWidth: "8px",
            maxWidth: "38%",
            height: `${segment.height}px`,
          }}
        />
      ))}
    </div>
  );
}

function estimateSegmentWeight(durationSec: number): number {
  if (!durationSec) return 240;
  return Math.max(120, durationSec);
}

function blockVisualProfile(type: string, zone?: string) {
  if (type === "recovery" || type === "cooldown") {
    return { color: "bg-emerald-500", height: 10 };
  }
  if (type === "interval") {
    return { color: "bg-orange-500", height: 30 };
  }
  if (type === "steady" && (zone === "Z4" || zone === "Z5" || zone === "Z6")) {
    return { color: "bg-violet-500", height: 28 };
  }
  if (type === "warmup") {
    return { color: "bg-slate-300", height: 8 };
  }
  return { color: "bg-primary", height: 20 };
}
