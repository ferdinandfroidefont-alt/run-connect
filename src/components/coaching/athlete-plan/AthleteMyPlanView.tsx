import { useEffect, useMemo, useState } from "react";
import {
  differenceInMonths,
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
import type { AthleteCoachBrief, AthletePlanSessionModel } from "./types";
import { applyConflictFlags, kmForSession, mapParticipationToUiStatus, sessionVolumeLabel } from "./planUtils";
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
  const [progressionRange, setProgressionRange] = useState<"1m" | "3m" | "6m" | "1y">("1y");
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
  const progressionMonthsCount = progressionRange === "1m" ? 1 : progressionRange === "3m" ? 3 : progressionRange === "6m" ? 6 : 12;
  const progressionMonths = useMemo(() => {
    const start = startOfMonth(new Date());
    return Array.from({ length: progressionMonthsCount }, (_, index) =>
      startOfMonth(new Date(start.getFullYear(), start.getMonth() - (progressionMonthsCount - 1 - index), 1))
    );
  }, [progressionMonthsCount]);
  const progressionColumns = useMemo(() => {
    return progressionMonths.map((monthDate) => {
      const monthSessions = sessions.filter((session) => {
        const date = parseISO(session.assignedDate);
        return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
      });
      const bySport = monthSessions.reduce<Record<SportType, number>>(
        (acc, session) => {
          const load = computeSessionLoad(session);
          acc[session.sport] += load;
          return acc;
        },
        { running: 0, cycling: 0, swimming: 0, strength: 0, other: 0 }
      );
      return {
        monthDate,
        bySport,
        total: Object.values(bySport).reduce((a, b) => a + b, 0),
      };
    });
  }, [progressionMonths, sessions]);
  const maxProgressionLoad = Math.max(...progressionColumns.map((column) => column.total), 1);
  const [selectedProgressionIndex, setSelectedProgressionIndex] = useState(Math.max(progressionMonthsCount - 1, 0));
  const safeProgressionIndex = Math.min(selectedProgressionIndex, progressionColumns.length - 1);
  const selectedProgression = progressionColumns[safeProgressionIndex] ?? progressionColumns[progressionColumns.length - 1] ?? null;
  const currentMonthIndex = progressionColumns.findIndex((column) => isCurrentMonth(column.monthDate));
  const activeProgressionIndex = safeProgressionIndex >= 0 ? safeProgressionIndex : Math.max(currentMonthIndex, 0);
  const selectedPoints = selectedProgression ? Math.round(selectedProgression.total * 3.8 + 55) : 0;
  const previousYearTotal = useMemo(() => {
    const previousYear = new Date().getFullYear() - 1;
    return sessions
      .filter((session) => parseISO(session.assignedDate).getFullYear() === previousYear)
      .reduce((acc, session) => acc + computeSessionLoad(session), 0);
  }, [sessions]);
  const currentYearTotal = useMemo(
    () =>
      sessions
        .filter((session) => parseISO(session.assignedDate).getFullYear() === new Date().getFullYear())
        .reduce((acc, session) => acc + computeSessionLoad(session), 0),
    [sessions]
  );
  const yearDeltaPct = previousYearTotal > 0 ? Math.round(((currentYearTotal - previousYearTotal) / previousYearTotal) * 100) : 3;
  const yearDeltaPts = Math.max(1, Math.round(Math.abs((currentYearTotal - previousYearTotal) * 0.35))) || 3;
  const cardMetrics = useMemo(() => {
    const last7 = sessions
      .filter((session) => differenceInMonths(new Date(), parseISO(session.assignedDate)) <= 1)
      .slice(-7);
    const last42 = sessions
      .filter((session) => differenceInMonths(new Date(), parseISO(session.assignedDate)) <= 2)
      .slice(-42);
    const acute = last7.reduce((acc, session) => acc + computeSessionLoad(session), 0);
    const chronic = last42.reduce((acc, session) => acc + computeSessionLoad(session), 0);
    const trend = acute >= chronic * 0.85 && acute <= chronic * 1.15 ? "Stable" : acute < chronic ? "Basse" : "Haute";
    return [
      { id: "current", label: "Charge actuelle", value: `${selectedPoints} pts`, status: "Modérée", icon: Activity, spark: [4, 5, 3, 6, 5, 7, 6] },
      { id: "acute", label: "Charge aiguë (7j)", value: `${Math.max(12, Math.round(acute * 4))} pts`, status: acute > chronic ? "Haute" : "Basse", icon: TrendingUp, spark: [2, 3, 3, 4, 5, 4, 6] },
      { id: "chronic", label: "Charge chronique (42j)", value: `${Math.max(20, Math.round(chronic * 2.1))} pts`, status: "Stable", icon: Sparkles, spark: [3, 4, 5, 4, 6, 5, 6] },
      { id: "trend", label: "Tendance", value: trend, status: "Depuis 14 jours", icon: Waves, spark: [2, 2, 3, 4, 4, 5, 5] },
    ];
  }, [sessions, selectedPoints]);

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
      const daySessions = sessions
        .filter((s) => isSameDay(parseISO(s.assignedDate), day))
        .sort((a, b) => computeSessionLoad(b) - computeSessionLoad(a));
      const mainSport = dominantSport(daySessions);
      const totalLoad = daySessions.reduce((acc, s) => acc + computeSessionLoad(s), 0);
      const first = daySessions[0] ?? null;
      const second = daySessions[1] ?? null;
      const firstSummary = first ? sessionVolumeLabel(first) : "";
      const secondSummary = second ? sessionVolumeLabel(second) : "";
      const summary = firstSummary || daySummaryFallback(first);
      const secondarySummary = secondSummary || daySummaryFallback(second);
      return {
        day,
        sessions: daySessions,
        totalLoad,
        mainSport,
        summary: summary || "Repos",
        secondarySummary: daySessions.length > 1 ? secondarySummary || null : null,
      };
    });
    const maxLoad = Math.max(...cards.map((c) => c.totalLoad), 1);
    return cards.map((card) => ({
      ...card,
      barPercent: card.totalLoad > 0 ? Math.max(18, Math.round((card.totalLoad / maxLoad) * 100)) : 0,
    }));
  }, [visibleDays, sessions]);
  useEffect(() => {
    setSelectedProgressionIndex(Math.max(progressionMonthsCount - 1, 0));
  }, [progressionMonthsCount]);

  return (
    <div className="space-y-4 px-4 pb-28 pt-2">
      <div className="rounded-[24px] border border-slate-200/70 bg-[#F7F8FA] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPreviousWeek}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">
              {calendarMode === "week"
                ? `Semaine du ${format(weekStart, "d MMM", { locale: fr })}`
                : format(selectedDate, "MMMM yyyy", { locale: fr })}
            </p>
            <p className="text-xs text-slate-500">Vue athlète</p>
          </div>
          <button
            type="button"
            onClick={onNextWeek}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            →
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              calendarMode === "week" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            )}
            onClick={() => setCalendarMode("week")}
          >
            Semaine
          </button>
          <button
            type="button"
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
              calendarMode === "month" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            )}
            onClick={() => setCalendarMode("month")}
          >
            Mois
          </button>
        </div>

        {calendarMode === "week" ? (
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2.5 px-1">
              {visibleDayCards.map((card) => {
                const isCurrent = isSameDay(card.day, selectedDate);
                const inMonth = isSameMonth(card.day, selectedDate);
                return (
                  <button
                    key={card.day.toISOString()}
                    type="button"
                    onClick={() => onSelectDate(card.day)}
                    className={cn(
                      "w-[94px] shrink-0 rounded-[18px] border bg-white px-2.5 py-3 text-left transition duration-200 active:scale-[0.98]",
                      isCurrent
                        ? "border-blue-500 shadow-[0_4px_10px_rgba(37,99,235,0.14)]"
                        : "border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
                      !inMonth && "opacity-45"
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase text-slate-500">
                      {format(card.day, "EEE", { locale: fr })}
                    </p>
                    <p className="text-[33px] font-semibold leading-none text-slate-900">{format(card.day, "d")}</p>
                    <div className={cn("mt-2.5 flex h-12 w-12 items-center justify-center rounded-full", sportSurfaceClass(card.mainSport))}>
                      {sportIcon(card.mainSport)}
                    </div>
                    <div className="mt-2 h-1 w-full rounded-full bg-slate-200/80">
                      <div
                        className={cn("h-1 rounded-full transition-all", sportBarClass(card.mainSport))}
                        style={{ width: `${card.barPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold leading-tight text-slate-900">{card.summary}</p>
                    {card.secondarySummary ? (
                      <p className="truncate text-[11px] text-slate-500">{card.secondarySummary}</p>
                    ) : (
                      <p className="h-[16px] text-[11px] text-transparent">.</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
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
                    "rounded-2xl border bg-white px-1.5 py-2 text-center transition active:scale-[0.98]",
                    isCurrent ? "border-blue-500 shadow-[0_3px_8px_rgba(37,99,235,0.13)]" : "border-slate-200",
                    !inMonth && "opacity-40"
                  )}
                >
                  <p className="text-[9px] font-semibold uppercase text-slate-400">{format(card.day, "EEE", { locale: fr })}</p>
                  <p className="text-sm font-semibold text-slate-900">{format(card.day, "d")}</p>
                  <div className={cn("mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full", sportSurfaceClass(card.mainSport))}>
                    <span className="scale-[0.85]">{sportIcon(card.mainSport)}</span>
                  </div>
                  <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-slate-200/80">
                    <div className={cn("h-1 rounded-full", sportBarClass(card.mainSport))} style={{ width: `${card.barPercent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
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

      <div className="mt-7 space-y-3 rounded-[24px] border border-slate-200/80 bg-[#F7F8FA] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[22px] font-semibold leading-tight text-slate-900">Ma progression</p>
            <p className="mt-0.5 text-xs text-slate-500">Analyse de ta charge d'entraînement</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            {[
              { key: "1m", label: "1 mois" },
              { key: "3m", label: "3 mois" },
              { key: "6m", label: "6 mois" },
              { key: "1y", label: "1 an" },
            ].map((range) => (
              <button
                key={range.key}
                type="button"
                onClick={() => {
                  setProgressionRange(range.key as "1m" | "3m" | "6m" | "1y");
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
                  progressionRange === range.key ? "bg-blue-500 text-white shadow-[0_2px_5px_rgba(59,130,246,0.34)]" : "text-slate-500"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="border-r border-slate-100 pr-2">
            <p className="text-[32px] font-semibold leading-none text-blue-600">{yearDeltaPct >= 0 ? `+${yearDeltaPct}%` : `${yearDeltaPct}%`}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{yearDeltaPts >= 0 ? `+${yearDeltaPts}` : yearDeltaPts} pts</p>
            <p className="text-xs text-slate-500">vs année passée</p>
          </div>
          <div className="pl-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Charge actuelle</p>
            <p className="mt-0.5 text-[31px] font-semibold leading-none text-slate-900">{selectedPoints} pts</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
              Modérée
            </span>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white p-3">
          <div className="relative min-h-[250px]">
            <div className="absolute inset-x-0 bottom-0 top-2">
              <div className="flex h-full items-end justify-between gap-1.5 pb-5">
                {progressionColumns.map((column, index) => {
                  const active = index === activeProgressionIndex || (activeProgressionIndex < 0 && index === currentMonthIndex);
                  const totalBlocks = Math.max(2, Math.round((column.total / maxProgressionLoad) * 13));
                  const sequence = buildSportBlockSequence(column.bySport, totalBlocks);
                  return (
                    <button
                      key={column.monthDate.toISOString()}
                      type="button"
                      onClick={() => setSelectedProgressionIndex(index)}
                      className="flex min-w-[20px] flex-1 flex-col items-center gap-1.5 text-center"
                    >
                      {active ? (
                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-[0_4px_10px_rgba(59,130,246,0.35)]">
                          {Math.round(column.total * 3.8 + 55)} pts
                        </span>
                      ) : (
                        <span className="h-5" />
                      )}
                      <div className={cn("flex flex-col-reverse gap-1 transition duration-300", active ? "scale-[1.04]" : "scale-100")}>
                        {sequence.map((sport, blockIndex) => (
                          <span
                            key={`${column.monthDate.toISOString()}-${blockIndex}`}
                            className={cn(
                              "h-2.5 w-4 rounded-[4px] transition-transform duration-200",
                              sportBlockClass(sport),
                              active && "shadow-[0_1px_3px_rgba(37,99,235,0.2)]"
                            )}
                          />
                        ))}
                      </div>
                      <p className={cn("text-[10px] font-semibold", active ? "text-blue-600" : "text-slate-500")}>
                        {format(column.monthDate, progressionMonthsCount > 6 ? "MMM" : "LLL", { locale: fr }).slice(0, 1).toUpperCase()}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-slate-600">
            {[
              { sport: "running", label: "Course à pied" },
              { sport: "cycling", label: "Vélo" },
              { sport: "swimming", label: "Natation" },
              { sport: "strength", label: "Renforcement" },
              { sport: "other", label: "Autres" },
            ].map((item) => (
              <span key={item.sport} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", sportDotClass(item.sport as SportType))} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {cardMetrics.map((metric) => (
            <div
              key={metric.id}
              className="w-[168px] shrink-0 snap-start rounded-[16px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 p-1.5 text-slate-600">
                  <metric.icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-[11px] font-semibold text-slate-500">{metric.label}</p>
              </div>
              <p className="text-xl font-semibold leading-none text-slate-900">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.status}</p>
              <div className="mt-3 flex h-7 items-end gap-1">
                {metric.spark.map((point, idx) => (
                  <span
                    key={`${metric.id}-${idx}`}
                    className="w-1.5 rounded-full bg-blue-300/90"
                    style={{ height: `${point * 4}px` }}
                  />
                ))}
              </div>
            </div>
          ))}
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

function computeSessionLoad(session: AthletePlanSessionModel): number {
  const km = kmForSession(session);
  if (km > 0) return km;
  const seconds = session.blocks.reduce((acc, block) => acc + (block.durationSec || 0) * (block.repetitions || 1), 0);
  return seconds > 0 ? seconds / 3600 : 0.2;
}

function daySummaryFallback(session: AthletePlanSessionModel | null): string {
  if (!session) return "Repos";
  switch (session.sport) {
    case "strength":
      return "Renfo";
    case "cycling":
      return "Vélo";
    case "swimming":
      return "Natation";
    case "running":
      return "Course";
    default:
      return "Repos";
  }
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

function isCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function sportBlockClass(sport: SportType): string {
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

function buildSportBlockSequence(bySport: Record<SportType, number>, totalBlocks: number): SportType[] {
  const sports: SportType[] = ["running", "cycling", "swimming", "strength", "other"];
  const total = Math.max(Object.values(bySport).reduce((acc, value) => acc + value, 0), 1);
  const allocated = sports.map((sport) => ({
    sport,
    blocks: Math.max(0, Math.round((bySport[sport] / total) * totalBlocks)),
  }));
  let used = allocated.reduce((acc, item) => acc + item.blocks, 0);
  while (used < totalBlocks) {
    allocated[used % allocated.length].blocks += 1;
    used += 1;
  }
  while (used > totalBlocks) {
    const idx = allocated.findIndex((item) => item.blocks > 0);
    if (idx < 0) break;
    allocated[idx].blocks -= 1;
    used -= 1;
  }
  const output: SportType[] = [];
  allocated.forEach((item) => {
    for (let i = 0; i < item.blocks; i += 1) output.push(item.sport);
  });
  return output.length ? output : ["other", "other"];
}
