import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, kmForSession, mapParticipationToUiStatus } from "./planUtils";
import { AthletePlanSessionDetailSheet } from "./AthletePlanSessionDetailSheet";
import type { SportType } from "./sportTokens";

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
    weekStart,
    selectedDate,
    onSelectDate,
    onPreviousWeek,
    onNextWeek,
    sessions: rawSessions,
    onConfirmSession,
    onCompleteSession,
    onMessageCoach,
    onPersistSessionFeedback,
  } = props;
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [detail, setDetail] = useState<AthletePlanSessionModel | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const sessions = useMemo(() => applyConflictFlags(rawSessions), [rawSessions]);
  const sessionsForSelectedDay = useMemo(
    () =>
      sessions.filter((s) => isSameDay(parseISO(s.assignedDate), selectedDate)).sort(
        (a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()
      ),
    [sessions, selectedDate]
  );
  const sessionsThisWeek = useMemo(
    () =>
      sessions.filter((s) =>
        weekDays.some((day) => isSameDay(parseISO(s.assignedDate), day))
      ).sort(
      (a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()
      ),
    [sessions, weekDays]
  );
  const todaySession = useMemo(
    () =>
      sessions
        .filter((s) => isSameDay(parseISO(s.assignedDate), new Date()))
        .sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime())[0] ?? null,
    [sessions]
  );
  const completedThisWeek = sessionsThisWeek.filter((s) => s.participationStatus === "completed").length;
  const progressLabel = `${completedThisWeek}/${sessionsThisWeek.length || 0} séances faites`;
  const progressPct =
    sessionsThisWeek.length > 0 ? Math.round((completedThisWeek / sessionsThisWeek.length) * 100) : 0;

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const visibleDays = calendarMode === "week" ? weekDays : monthDays;
  const weekChartData = weekDays.map((day) => {
    const daySessions = sessions.filter((s) => isSameDay(parseISO(s.assignedDate), day));
    const km = Math.round(daySessions.reduce((acc, s) => acc + kmForSession(s), 0) * 10) / 10;
    return { day, km };
  });
  const maxKm = Math.max(...weekChartData.map((d) => d.km), 1);

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onPreviousWeek} className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium">
            ←
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {calendarMode === "week"
                ? `Semaine du ${format(weekStart, "d MMM", { locale: fr })}`
                : format(selectedDate, "MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">Vue athlète</p>
          </div>
          <button type="button" onClick={onNextWeek} className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium">
            →
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              calendarMode === "week" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}
            onClick={() => setCalendarMode("week")}
          >
            Semaine
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              calendarMode === "month" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}
            onClick={() => setCalendarMode("month")}
          >
            Mois
          </button>
        </div>

        <div className={cn("grid gap-2", calendarMode === "week" ? "grid-cols-7" : "grid-cols-7")}>
          {visibleDays.map((day) => {
            const daySessions = sessions.filter((s) => isSameDay(parseISO(s.assignedDate), day));
            const km = Math.round(daySessions.reduce((acc, s) => acc + kmForSession(s), 0) * 10) / 10;
            const mainSport = dominantSport(daySessions);
            const sportColor = sportCircleClass(mainSport);
            const isCurrent = isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "min-h-24 rounded-2xl border p-2 text-left transition-colors",
                  isCurrent ? "border-primary bg-primary/10" : "border-border/70 bg-secondary/20",
                  !isSameMonth(day, selectedDate) && calendarMode === "month" && "opacity-40"
                )}
              >
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {format(day, "EEE", { locale: fr })}
                </p>
                <p className="text-sm font-bold text-foreground">{format(day, "d")}</p>
                <div className="mt-3 flex items-center justify-center">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-white", sportColor)}>
                    {km > 0 ? `${km}` : "0"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Aujourd'hui</p>
        {todaySession ? (
          <button
            type="button"
            onClick={() => setDetail(todaySession)}
            className="w-full rounded-2xl border border-border/80 bg-secondary/30 p-3 text-left transition hover:bg-secondary/50"
          >
            <p className="text-sm font-semibold text-foreground">{todaySession.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {todaySession.coachName} · {Math.round(kmForSession(todaySession) * 10) / 10} km
            </p>
            <p className="mt-2 inline-flex rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-foreground">
              {todaySession.participationStatus === "completed" ? "Faite" : "Pas encore faite"}
            </p>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Pas de séance prévue aujourd'hui.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Cette semaine</p>
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ) : sessionsThisWeek.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Aucune séance cette semaine.
          </div>
        ) : (
          <div className="space-y-2">
            {sessionsThisWeek.map((session) => {
              const status = mapParticipationToUiStatus(session.participationStatus, session.hasConflict);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setDetail(session)}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(session.assignedDate), "EEE d MMM", { locale: fr })} · {Math.round(kmForSession(session) * 10) / 10} km
                    </p>
                  </div>
                  <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
                    {status === "done" ? "Faite" : "À faire"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Progression</p>
          <p className="text-sm font-semibold text-foreground">{progressLabel}</p>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase text-muted-foreground">Volume hebdo (style Strava)</p>
        </div>
        <div className="h-40 w-full">
          <svg viewBox="0 0 320 140" className="h-full w-full">
            {weekChartData.map((entry, index) => {
              const x = 20 + index * 45;
              const barHeight = (entry.km / maxKm) * 80;
              const y = 105 - barHeight;
              return (
                <g key={entry.day.toISOString()}>
                  <rect x={x} y={y} width={20} height={barHeight} rx={4} className="fill-emerald-500/70" />
                  <text x={x + 10} y={122} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                    {format(entry.day, "EEEEE", { locale: fr })}
                  </text>
                </g>
              );
            })}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              points={weekChartData
                .map((entry, index) => {
                  const x = 30 + index * 45;
                  const y = 105 - (entry.km / maxKm) * 80;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
          {format(selectedDate, "EEEE d MMMM", { locale: fr })}
        </p>
        {sessionsForSelectedDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune séance prévue sur ce jour.</p>
        ) : (
          <div className="space-y-2">
            {sessionsForSelectedDay.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setDetail(session)}
                className="w-full rounded-xl border border-border/70 px-3 py-2 text-left"
              >
                <p className="text-sm font-semibold text-foreground">{session.title}</p>
                <p className="text-xs text-muted-foreground">
                  {session.coachName} · {Math.round(kmForSession(session) * 10) / 10} km
                </p>
              </button>
            ))}
          </div>
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

function dominantSport(daySessions: AthletePlanSessionModel[]): SportType {
  if (!daySessions.length) return "other";
  const counts = new Map<SportType, number>();
  daySessions.forEach((s) => counts.set(s.sport, (counts.get(s.sport) || 0) + 1));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
}

function sportCircleClass(sport: SportType): string {
  switch (sport) {
    case "running":
      return "bg-sky-500";
    case "cycling":
      return "bg-amber-500";
    case "swimming":
      return "bg-cyan-500";
    case "strength":
      return "bg-violet-500";
    default:
      return "bg-slate-500";
  }
}
