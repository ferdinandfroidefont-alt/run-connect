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
import { Activity, Bike, Dumbbell, Footprints, Moon, Sparkles, TrendingUp, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
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
    onOpenCalendar,
  } = props;
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");
  const [progressionRange, setProgressionRange] = useState<"1m" | "3m" | "6m" | "1y">("3m");
  const [detail, setDetail] = useState<AthletePlanSessionModel | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const sessions = useMemo(() => applyConflictFlags(rawSessions), [rawSessions]);
  const sessionsForSelectedDay = useMemo(
    () =>
      sessions
        .filter((s) => isSameDay(parseISO(s.assignedDate), selectedDate))
        .sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()),
    [sessions, selectedDate]
  );
  const sessionsThisWeek = useMemo(
    () =>
      sessions
        .filter((s) => weekDays.some((day) => isSameDay(parseISO(s.assignedDate), day)))
        .sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()),
    [sessions, weekDays]
  );
  const weeklyRows = useMemo(
    () =>
      weekDays.map((day) => {
        const daySessions = sessions
          .filter((s) => isSameDay(parseISO(s.assignedDate), day))
          .sort((a, b) => computeSessionLoad(b) - computeSessionLoad(a));
        const primary = daySessions[0];
        const isRest =
          !!primary &&
          (primary.title.toLowerCase().includes("repos") ||
            primary.blocks.every((b) => b.type === "recovery" || b.type === "cooldown" || b.type === "warmup"));
        return { day, primary, isRest };
      }),
    [sessions, weekDays]
  );

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const visibleDays = calendarMode === "week" ? weekDays : monthDays;
  const visibleDayCards = useMemo(() => {
    const cards = visibleDays.map((day) => {
      const daySessions = sessions.filter((s) => isSameDay(parseISO(s.assignedDate), day));
      const totalLoad = daySessions.reduce((acc, s) => acc + computeSessionLoad(s), 0);
      return {
        day,
        mainSport: dominantSport(daySessions),
        totalLoad,
      };
    });
    const maxLoad = Math.max(...cards.map((c) => c.totalLoad), 1);
    return cards.map((card) => ({
      ...card,
      barPercent: card.totalLoad > 0 ? Math.max(18, Math.round((card.totalLoad / maxLoad) * 100)) : 0,
    }));
  }, [visibleDays, sessions]);

  const progressionMonthsCount = progressionRange === "1m" ? 1 : progressionRange === "3m" ? 3 : progressionRange === "6m" ? 6 : 12;
  const progressionMonths = useMemo(() => {
    const now = new Date();
    return Array.from({ length: progressionMonthsCount }, (_, index) =>
      new Date(now.getFullYear(), now.getMonth() - (progressionMonthsCount - 1 - index), 1)
    );
  }, [progressionMonthsCount]);

  const progressionColumns = useMemo(
    () =>
      progressionMonths.map((monthDate) => {
        const monthSessions = sessions.filter((session) => {
          const date = parseISO(session.assignedDate);
          return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
        });
        return {
          monthDate,
          total: monthSessions.reduce((acc, s) => acc + computeSessionLoad(s), 0),
        };
      }),
    [progressionMonths, sessions]
  );
  const maxProgressionLoad = Math.max(...progressionColumns.map((c) => c.total), 1);
  const selectedPoints = Math.round((progressionColumns.at(-1)?.total || 0) * 3.8 + 55);

  const metrics = [
    { id: "current", label: "Charge actuelle", value: `${selectedPoints} pts`, status: "Moderee", icon: Activity, spark: [4, 5, 3, 6, 5, 7, 6] },
    { id: "acute", label: "Charge 7j", value: `${Math.round((sessionsThisWeek.length || 1) * 11)} pts`, status: "Semaine", icon: TrendingUp, spark: [2, 3, 3, 4, 5, 4, 6] },
    { id: "chronic", label: "Charge chronique", value: `${Math.round((sessions.length || 1) * 2.1)} pts`, status: "Stable", icon: Sparkles, spark: [3, 4, 5, 4, 6, 5, 6] },
    { id: "trend", label: "Tendance", value: "14 jours", status: "Evolution", icon: Waves, spark: [2, 2, 3, 4, 4, 5, 5] },
  ];

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <div className="ios-card rounded-[24px] border border-border/70 bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onPreviousWeek} className="rounded-2xl border border-border/70 bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors active:bg-muted">
            ←
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {calendarMode === "week"
                ? `Semaine du ${format(weekStart, "d MMM", { locale: fr })}`
                : format(selectedDate, "MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">Vue athlete</p>
          </div>
          <button type="button" onClick={onNextWeek} className="rounded-2xl border border-border/70 bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors active:bg-muted">
            →
          </button>
        </div>

        <div className="mb-3 inline-flex items-center gap-1 rounded-2xl bg-secondary p-1">
          <button
            type="button"
            className={cn(
              "rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors",
              calendarMode === "week" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => setCalendarMode("week")}
          >
            Semaine
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors",
              calendarMode === "month" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            )}
            onClick={() => setCalendarMode("month")}
          >
            Mois
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {visibleDayCards.map((card) => {
            const isCurrent = isSameDay(card.day, selectedDate);
            const inMonth = isSameMonth(card.day, selectedDate);
            return (
              <button
                key={card.day.toISOString()}
                type="button"
                onClick={() => onSelectDate(card.day)}
                className={cn(
                  "rounded-2xl border bg-card px-1.5 py-2 text-center transition-colors",
                  isCurrent ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70",
                  !inMonth && "opacity-40"
                )}
              >
                <p className={cn("text-[9px] font-semibold uppercase", isCurrent ? "text-primary-foreground/80" : "text-muted-foreground")}>{format(card.day, "EEE", { locale: fr })}</p>
                <p className={cn("text-sm font-semibold", isCurrent ? "text-primary-foreground" : "text-foreground")}>{format(card.day, "d")}</p>
                <div className={cn("mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full", sportSurfaceClass(card.mainSport), isCurrent && "bg-primary-foreground/15 text-primary-foreground")}>
                  <span className="scale-[0.85]">{sportIcon(card.mainSport)}</span>
                </div>
                <div className={cn("mx-auto mt-1 h-1 w-8 overflow-hidden rounded-full", isCurrent ? "bg-primary-foreground/25" : "bg-muted") }>
                  <div className={cn("h-1 rounded-full", sportBarClass(card.mainSport), isCurrent && "bg-primary-foreground")} style={{ width: `${card.barPercent}%` }} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
          {[
            { sport: "running", label: "Course a pied" },
            { sport: "cycling", label: "Velo" },
            { sport: "swimming", label: "Natation" },
            { sport: "strength", label: "Renforcement" },
            { sport: "other", label: "Repos" },
          ].map((item) => (
            <span key={item.sport} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5", sportDotClass(item.sport as SportType))} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="ios-card overflow-hidden rounded-[24px] border border-border/70 bg-card">
        <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Plan semaine</p>
        {weeklyRows.map((row) => {
          const durationSec = row.primary
            ? row.primary.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0)
            : 0;
          const distanceKm = row.primary ? kmForSession(row.primary) : 0;
          const summary = row.primary
            ? {
                title: row.isRest ? "Repos" : row.primary.title,
                duration: durationSec > 0 ? durationToLabel(durationSec) || undefined : undefined,
                distance: distanceKm > 0 ? `${Number(distanceKm.toFixed(1)).toString().replace(".", ",")} km` : undefined,
                intensityLabel: row.isRest ? "Récupération" : effortLabelForSession(row.primary),
              }
            : undefined;
          const accentColor =
            !row.primary ? "#9CA3AF" :
            row.isRest ? "#22C55E" :
            row.primary.blocks.some((b) => b.type === "interval") ? "#F97316" :
            row.primary.blocks.some((b) => b.zone === "Z4" || b.zone === "Z5" || b.zone === "Z6") ? "#8B5CF6" :
            "#60A5FA";
          return (
            <DayPlanningRow
              key={row.day.toISOString()}
              dayLabel={format(row.day, "EEEE", { locale: fr })}
              dateLabel={format(row.day, "d MMM", { locale: fr })}
              isSelected={isSameDay(row.day, selectedDate)}
              session={summary}
              isSent={false}
              accentColor={accentColor}
              onAdd={() => {
                onSelectDate(row.day);
                onOpenCalendar?.();
              }}
              onOpen={
                row.primary
                  ? () => {
                      onSelectDate(row.day);
                      setDetail(row.primary!);
                    }
                  : undefined
              }
              allowSessionActions={false}
            />
          );
        })}
      </div>

      <div className="ios-card rounded-[24px] border border-border/70 bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-lg font-semibold text-foreground">Ma progression</p>
          <div className="inline-flex rounded-2xl bg-secondary p-1">
            {(["1m", "3m", "6m", "1y"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setProgressionRange(range)}
                className={cn("rounded-xl px-2 py-1 text-[11px] font-semibold transition-colors", progressionRange === range ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3">
          <div className="flex h-[96px] items-end justify-between gap-2">
            {progressionColumns.map((column) => (
              <div key={column.monthDate.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="w-full bg-blue-500" style={{ height: `${Math.max(8, Math.round((column.total / maxProgressionLoad) * 70))}px` }} />
                <span className="text-[10px] font-semibold text-slate-500">{format(column.monthDate, "MMM", { locale: fr }).slice(0, 1).toUpperCase()}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-blue-500" />Course a pied</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-emerald-500" />Velo</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-sky-400" />Natation</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-violet-500" />Renforcement</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-slate-400" />Repos</span>
          </div>
        </div>
      <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {metrics.map((metric) => (
            <div key={metric.id} className="ios-card h-[110px] w-[144px] shrink-0 snap-start rounded-2xl border border-border/70 bg-card p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="bg-slate-100 p-1 text-slate-600"><metric.icon className="h-3 w-3" /></span>
                <p className="truncate text-[10px] font-semibold text-slate-500">{metric.label}</p>
              </div>
              <p className="text-base font-semibold leading-none text-slate-900">{metric.value}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{metric.status}</p>
              <div className="mt-2 flex h-6 items-end gap-1">
                {metric.spark.map((point, idx) => (
                  <span key={`${metric.id}-${idx}`} className="w-1 bg-blue-300/90" style={{ height: `${point * 3}px` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ios-card rounded-[24px] border border-border/70 bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Cette semaine</p>
        {loading ? (
          <div className="h-20 animate-pulse bg-muted/40" />
        ) : sessionsThisWeek.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">Aucune seance cette semaine.</div>
        ) : (
          <div className="space-y-2">
            {sessionsThisWeek.map((session) => {
              const status = mapParticipationToUiStatus(session.participationStatus, session.hasConflict);
              return (
                <button key={session.id} type="button" onClick={() => setDetail(session)} className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card px-3 py-2 text-left transition-colors active:bg-secondary">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(session.assignedDate), "EEE d MMM", { locale: fr })} · {Math.round(kmForSession(session) * 10) / 10} km
                    </p>
                  </div>
                  <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs font-semibold">{status === "done" ? "Faite" : "A faire"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="ios-card rounded-[24px] border border-border/70 bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{format(selectedDate, "EEEE d MMMM", { locale: fr })}</p>
        {sessionsForSelectedDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune seance prevue sur ce jour.</p>
        ) : (
          <div className="space-y-2">
            {sessionsForSelectedDay.map((session) => (
              <button key={session.id} type="button" onClick={() => setDetail(session)} className="w-full rounded-2xl border border-border/70 bg-card px-3 py-2 text-left transition-colors active:bg-secondary">
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
          if (detail) Promise.resolve(onConfirmSession(detail)).then(() => setDetail(null));
        }}
        onComplete={() => {
          if (detail) Promise.resolve(onCompleteSession(detail)).then(() => setDetail(null));
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

function computeSessionLoad(session: AthletePlanSessionModel): number {
  const km = kmForSession(session);
  if (km > 0) return km;
  const seconds = session.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0);
  return seconds > 0 ? seconds / 3600 : 0.2;
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

function sportSurfaceClass(sport: SportType): string {
  switch (sport) {
    case "running":
      return "bg-blue-500/14 text-blue-600";
    case "cycling":
      return "bg-emerald-500/15 text-emerald-600";
    case "swimming":
      return "bg-sky-400/18 text-sky-500";
    case "strength":
      return "bg-violet-500/14 text-violet-600";
    default:
      return "bg-slate-400/15 text-slate-500";
  }
}

function sportBarClass(sport: SportType): string {
  switch (sport) {
    case "running":
      return "bg-blue-500";
    case "cycling":
      return "bg-emerald-500";
    case "swimming":
      return "bg-sky-400";
    case "strength":
      return "bg-violet-500";
    default:
      return "bg-slate-400";
  }
}

function sportIcon(sport: SportType) {
  const className = "h-5 w-5";
  switch (sport) {
    case "running":
      return <Footprints className={className} />;
    case "cycling":
      return <Bike className={className} />;
    case "swimming":
      return <Waves className={className} />;
    case "strength":
      return <Dumbbell className={className} />;
    default:
      return <Moon className={className} />;
  }
}

function sportDotClass(sport: SportType): string {
  switch (sport) {
    case "running":
      return "bg-blue-500";
    case "cycling":
      return "bg-emerald-500";
    case "swimming":
      return "bg-sky-400";
    case "strength":
      return "bg-violet-500";
    default:
      return "bg-slate-400";
  }
}
