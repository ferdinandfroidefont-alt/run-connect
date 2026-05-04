import { useMemo, useRef } from "react";
import { addDays, format, getISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { Bike, Check, ChevronLeft, ChevronRight, Dumbbell, Footprints, Moon, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekSelectorPremiumProps {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  indicatorsByDate?: Record<string, Array<{ color: string }>>;
  sessionSummaryByDate?: Record<string, DaySessionSummary>;
  /** Jours où l’athlète ciblé a marqué la séance comme réalisée (vue coach semaine). */
  dayAthleteCompletedByDate?: Record<string, boolean>;
  showLegend?: boolean;
  /**
   * - embed : bande mini-semaine avec flèches (< maquette précédente).
   * - landing : grille L→D + ligne de dates (maquette 15 · Planification coach).
   * - coachWeek : grille 7×1 type maquette 16 (cellules carte + légende courte).
   */
  variant?: "default" | "embed" | "landing" | "coachWeek";
}

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

type CalendarSport = "running" | "cycling" | "swimming" | "strength" | "rest";

export type DaySessionSummary = {
  sport: CalendarSport;
  value: string;
};

const LEGEND_ITEMS: Array<{ sport: CalendarSport; label: string }> = [
  { sport: "running", label: "Course à pied" },
  { sport: "cycling", label: "Vélo" },
  { sport: "swimming", label: "Natation" },
  { sport: "strength", label: "Renforcement" },
  { sport: "rest", label: "Repos" },
];

/** Couleurs sport & légende — alignées sur apple-screens.jsx · ScreenCoachWeek */
const COACH_WEEK_SPORT: Record<CalendarSport, string> = {
  running: "#0a84ff",
  cycling: "#ff9500",
  swimming: "#5ac8fa",
  strength: "#af52de",
  rest: "rgba(60, 60, 67, 0.3)",
};

const COACH_WEEK_LEGEND: Array<{ sport: CalendarSport; label: string }> = [
  { sport: "running", label: "Course" },
  { sport: "cycling", label: "Vélo" },
  { sport: "swimming", label: "Natation" },
  { sport: "strength", label: "Renfo" },
  { sport: "rest", label: "Repos" },
];

function sessionTone(sport: CalendarSport) {
  switch (sport) {
    case "running":
      return "text-sky-500";
    case "cycling":
      return "text-emerald-500";
    case "swimming":
      return "text-cyan-500";
    case "strength":
      return "text-violet-500";
    default:
      return "text-muted-foreground";
  }
}

function legendDotTone(sport: CalendarSport) {
  switch (sport) {
    case "running":
      return "bg-sky-500";
    case "cycling":
      return "bg-emerald-500";
    case "swimming":
      return "bg-cyan-500";
    case "strength":
      return "bg-violet-500";
    default:
      return "bg-muted-foreground/70";
  }
}

function SessionIcon({ sport, className }: { sport: CalendarSport; className?: string }) {
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

export function WeekSelectorPremium({
  weekStart,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  indicatorsByDate = {},
  sessionSummaryByDate = {},
  dayAthleteCompletedByDate = {},
  showLegend = false,
  variant = "default",
}: WeekSelectorPremiumProps) {
  const touchStartX = useRef<number | null>(null);
  const isLanding = variant === "landing";
  const isCoachWeek = variant === "coachWeek";
  const useTextNav = variant === "embed" || isCoachWeek;

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, idx) => {
        const date = addDays(weekStart, idx);
        const key = format(date, "yyyy-MM-dd");
        return {
          key,
          date,
          dayNumber: format(date, "d"),
          initial: DAY_INITIALS[idx],
          isSelected: key === format(selectedDate, "yyyy-MM-dd"),
          indicators: indicatorsByDate[key] ?? [],
          summary: sessionSummaryByDate[key],
          athleteCompleted: Boolean(dayAthleteCompletedByDate[key]),
        };
      }),
    [dayAthleteCompletedByDate, indicatorsByDate, selectedDate, sessionSummaryByDate, weekStart]
  );

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} - ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;
  const coachWeekLabel = `Semaine ${getISOWeek(weekStart)} — ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;

  return (
    <div
      className={cn(
        isLanding ? "border-0 bg-transparent p-0" : "",
        isCoachWeek && "border-0 bg-transparent px-4 pb-3 pt-0",
        !isLanding && !isCoachWeek && "py-3",
        !isLanding && variant === "embed" && "border-0 bg-transparent px-1",
        !isLanding && variant !== "embed" && !isCoachWeek && "border-b border-border bg-card px-4"
      )}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < 38) return;
        if (delta < 0) onNextWeek();
        else onPreviousWeek();
      }}
    >
      {!isLanding ? (
        <div className={cn("mb-3 flex items-center justify-between", isCoachWeek ? "px-1 pb-2.5 pt-0" : "px-1")}>
          {useTextNav ? (
            <button type="button" onClick={onPreviousWeek} className="handoff-week-nav" aria-label="Semaine précédente">
              ‹
            </button>
          ) : (
            <button
              type="button"
              onClick={onPreviousWeek}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          <div className="text-center">
            {useTextNav ? (
              <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-foreground">
                {isCoachWeek ? coachWeekLabel : weekLabel}
              </p>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">SEMAINE</p>
                <p className="text-[16px] font-semibold text-foreground">{weekLabel}</p>
              </>
            )}
          </div>
          {useTextNav ? (
            <button type="button" onClick={onNextWeek} className="handoff-week-nav" aria-label="Semaine suivante">
              ›
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextWeek}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
              aria-label="Semaine suivante"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          )}
        </div>
      ) : null}

      {isLanding ? (
        <div className="grid grid-cols-7 px-2 pb-3 pt-3" style={{ gap: "2px" }}>
          {days.map((day) => (
            <div key={`hdr-${day.key}`} className="pb-1.5 text-center text-[11px] text-muted-foreground">
              {day.initial}
            </div>
          ))}
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className="flex flex-col items-center border-0 bg-transparent p-0 pt-1 text-inherit [-webkit-tap-highlight-color:transparent]"
            >
              <div
                className={cn(
                  "flex h-[30px] w-[30px] items-center justify-center rounded-[15px] font-display text-[17px] leading-none",
                  day.isSelected
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-transparent font-normal text-foreground"
                )}
              >
                {day.dayNumber}
              </div>
              <div className="mt-[3px] flex h-1 shrink-0 items-center justify-center gap-0.5">
                {day.summary ? (
                  <SessionIcon sport={day.summary.sport} className={cn("h-3 w-3", sessionTone(day.summary.sport))} />
                ) : day.indicators.length > 0 ? (
                  day.indicators.slice(0, 3).map((dot, idx) => (
                    <span key={`${day.key}-${idx}`} className="h-1 w-1 rounded-[2px]" style={{ backgroundColor: dot.color }} />
                  ))
                ) : null}
              </div>
            </button>
          ))}
        </div>
      ) : isCoachWeek ? (
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const tone = day.summary?.sport ? COACH_WEEK_SPORT[day.summary.sport] : undefined;
            const isEmpty = !day.summary && day.indicators.length === 0;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "relative flex flex-col items-center rounded-[10px] bg-card px-0.5 pb-[5px] pt-1.5 text-center [-webkit-tap-highlight-color:transparent]",
                  day.isSelected ? "border-[1.5px] border-[#0066cc]" : "border border-transparent"
                )}
              >
                <div className="text-[9px] tracking-[0.3px] text-muted-foreground">{day.initial}</div>
                <div
                  className={cn(
                    "font-display text-[14px] font-semibold leading-[1.1]",
                    day.isSelected ? "text-[#0066cc]" : "text-foreground"
                  )}
                >
                  {day.dayNumber}
                </div>
                <div className="relative mt-0.5 flex h-[26px] flex-col items-center justify-center gap-0.5">
                  {day.summary?.sport === "rest" ? (
                    <>
                      <span className="inline-flex" style={{ color: COACH_WEEK_SPORT.rest }}>
                        <SessionIcon sport="rest" className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[8.5px] font-medium leading-none" style={{ color: COACH_WEEK_SPORT.rest }}>
                        Repos
                      </span>
                    </>
                  ) : day.summary ? (
                    <>
                      <span className="inline-flex" style={{ color: tone }}>
                        <SessionIcon sport={day.summary.sport} className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[8.5px] font-semibold leading-none" style={{ color: tone }}>
                        {day.summary.value}
                      </span>
                    </>
                  ) : day.indicators.length > 0 ? (
                    <div className="flex items-center justify-center gap-0.5">
                      {day.indicators.slice(0, 3).map((dot, idx) => (
                        <span key={`${day.key}-${idx}`} className="h-1 w-1 rounded-[2px]" style={{ backgroundColor: dot.color }} />
                      ))}
                    </div>
                  ) : isEmpty ? (
                    <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-dashed border-muted-foreground/45 text-[12px] font-light leading-none text-muted-foreground">
                      +
                    </div>
                  ) : null}
                  {day.athleteCompleted ? (
                    <span
                      className="absolute -bottom-0.5 right-0 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#34C759] text-white shadow-sm"
                      title="Séance réalisée"
                    >
                      <Check className="h-2.5 w-2.5 stroke-[3]" stroke="currentColor" aria-hidden />
                      <span className="sr-only">Séance réalisée</span>
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-0.5">
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.date)}
              className={cn(
                "flex min-w-[44px] flex-1 flex-col items-center rounded-lg px-1.5 py-2 transition-all",
                day.isSelected
                  ? "bg-primary text-primary-foreground"
                  : variant === "embed"
                    ? "bg-[rgba(120,120,128,0.09)] text-foreground dark:bg-white/10"
                    : "bg-secondary text-foreground"
              )}
            >
              <p className={cn("text-[16px] font-semibold leading-none", day.isSelected ? "text-primary-foreground" : "text-foreground")}>
                {day.dayNumber}
              </p>
              <p className={cn("mt-1 text-[11px] font-medium leading-none", day.isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {day.initial}
              </p>
              {day.summary ? (
                <div className="mt-1.5 flex min-h-[24px] flex-col items-center justify-center">
                  <SessionIcon sport={day.summary.sport} className={cn("h-3 w-3", sessionTone(day.summary.sport))} />
                  <p className={cn("mt-0.5 text-[10px] font-medium leading-none", sessionTone(day.summary.sport))}>
                    {day.summary.value}
                  </p>
                </div>
              ) : day.indicators.length > 0 ? (
                <div className="mt-1.5 flex min-h-[24px] items-center justify-center gap-1">
                  {day.indicators.slice(0, 3).map((dot, idx) => (
                    <span
                      key={`${day.key}-${idx}`}
                      className={cn("h-1.5 w-1.5 rounded-full", day.isSelected ? "bg-primary-foreground/90" : "")}
                      style={day.isSelected ? undefined : { backgroundColor: dot.color }}
                    />
                  ))}
                </div>
              ) : (
                <div className="min-h-[24px]" />
              )}
            </button>
          ))}
        </div>
      )}
      {showLegend && !isCoachWeek ? (
        <div className="mt-2.5 flex items-center justify-center gap-2.5 overflow-x-auto pb-0.5 text-[10px] text-muted-foreground/80">
          {LEGEND_ITEMS.map((item) => (
            <div key={item.sport} className="flex flex-shrink-0 items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", legendDotTone(item.sport))}>
                <span className="sr-only">{item.label}</span>
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {showLegend && isCoachWeek ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 overflow-x-auto pb-0.5 text-[10px] text-muted-foreground">
          {COACH_WEEK_LEGEND.map((item) => (
            <div key={item.sport} className="flex flex-shrink-0 items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-[3px]" style={{ background: COACH_WEEK_SPORT[item.sport] }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
