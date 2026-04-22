import { useMemo, useState } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="space-y-3 bg-[#F7F8FA] px-4 pb-28 pt-2">
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {weekDays.map((day) => {
          const active = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "shrink-0 snap-start rounded-full px-3 py-2 text-xs font-semibold transition active:scale-[0.98]",
                active ? "bg-[#2563EB] text-white" : "bg-[#EEF1F5] text-[#334155]"
              )}
            >
              {format(day, "EEEEE", { locale: fr }).toUpperCase()} {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          dayRows.map((row) => {
            const selected = isSameDay(row.day, selectedDate);
            const dayLabel = format(row.day, "EEE", { locale: fr }).slice(0, 3).toUpperCase();
            const hasSession = row.sessions.length > 0;
            const summary = row.primarySession ? sessionSummaryLine(row.primarySession) : null;
            return (
              <div
                key={row.day.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectDate(row.day);
                  if (row.primarySession) setDetail(row.primarySession);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDate(row.day);
                    if (row.primarySession) setDetail(row.primarySession);
                  }
                }}
                className={cn(
                  "flex min-h-[92px] w-full cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition active:scale-[0.98]",
                  selected ? "bg-blue-50/80" : "bg-[#F8FAFC]"
                )}
              >
                <div className="w-[68px] shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{dayLabel}.</p>
                  <p className="text-xs text-slate-400">{format(row.day, "d MMM", { locale: fr })}</p>
                </div>

                <div className="min-w-0 flex-1">
                  {!hasSession ? (
                    <p className="text-sm font-medium text-slate-500">Ajouter une séance</p>
                  ) : row.isRest ? (
                    <div className="space-y-2 opacity-60">
                      <p className="text-sm font-semibold text-slate-600">Repos</p>
                      <div className="h-1.5 w-full rounded-full bg-slate-200" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <MiniSessionProfile session={row.primarySession!} />
                      <p className="truncate text-[12px] text-slate-500">{summary}</p>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {!hasSession ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectDate(row.day);
                        onOpenCalendar?.();
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white active:scale-[0.98]"
                      aria-label="Ajouter une séance"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  ) : row.isRest ? (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  ) : (
                    <MoreHorizontal className="h-5 w-5 text-slate-500" />
                  )}
                </div>
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
    <div className="flex h-10 items-end gap-1 rounded-[10px] bg-slate-100/80 px-2 py-1">
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
    return { color: "bg-[#22C55E]", height: 10 };
  }
  if (type === "interval") {
    return { color: "bg-[#F97316]", height: 30 };
  }
  if (type === "steady" && (zone === "Z4" || zone === "Z5" || zone === "Z6")) {
    return { color: "bg-[#8B5CF6]", height: 28 };
  }
  if (type === "warmup") {
    return { color: "bg-slate-300", height: 8 };
  }
  return { color: "bg-[#2563EB]", height: 20 };
}
