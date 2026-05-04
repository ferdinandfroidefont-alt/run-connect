import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { ATHLETE_PLAN_SPORT_STROKE, AthletePlanSportGlyph } from "@/components/coaching/athlete-plan/AthletePlanSportGlyph";

export type AthleteWeekDayStatus = "done" | "today" | "planned" | "rest";

export type AthleteWeekGridDay = {
  date: Date;
  status: AthleteWeekDayStatus;
  summary?: DaySessionSummary;
};

const LEGEND: Array<[NonNullable<DaySessionSummary["sport"]>, string]> = [
  ["running", "Course"],
  ["cycling", "Vélo"],
  ["swimming", "Natation"],
  ["strength", "Renfo"],
  ["rest", "Repos"],
];

export function CoachingAthleteWeekGrid({
  days,
  selectedDate: _ignoredSelectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  weekTitle,
}: {
  days: AthleteWeekGridDay[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  weekTitle: string;
}) {
  return (
    <div className="px-4 pb-3 pt-5">
      <div className="flex items-center justify-between px-1 pb-2.5">
        <button type="button" onClick={onPreviousWeek} className="px-2 py-1 text-[18px] text-[#0a84ff]" aria-label="Semaine précédente">
          ‹
        </button>
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.5px] text-foreground">{weekTitle}</p>
        <button type="button" onClick={onNextWeek} className="px-2 py-1 text-[18px] text-[#0a84ff]" aria-label="Semaine suivante">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d.date, "yyyy-MM-dd");
          const isToday = d.status === "today";
          const isDone = d.status === "done";
          const isRest = d.status === "rest";
          const summ = d.summary;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(d.date)}
              className={cn(
                "relative rounded-[10px] border bg-card pb-[5px] pl-0.5 pr-0.5 pt-1.5 text-center transition-opacity",
                isToday && "border-[#0a84ff] border-[1.5px]",
                !isToday && "border-transparent",
                isDone && "opacity-[0.65]"
              )}
            >
              <div className="text-[9px] tracking-[0.3px] text-muted-foreground">{format(d.date, "EEEEE", { locale: fr })}</div>
              <div
                className={cn(
                  "font-display text-[14px] font-semibold leading-tight",
                  isToday ? "text-[#0a84ff]" : "text-foreground"
                )}
              >
                {format(d.date, "d")}
              </div>
              <div className="mt-0.5 flex h-[26px] flex-col items-center justify-center gap-0.5">
                {isRest ? (
                  <>
                    <AthletePlanSportGlyph sport="rest" size={14} stroke={ATHLETE_PLAN_SPORT_STROKE.rest} />
                    <span className="max-w-[100%] truncate px-px text-[8.5px] font-medium leading-none text-muted-foreground/70">Repos</span>
                  </>
                ) : summ ? (
                  <>
                    <AthletePlanSportGlyph sport={summ.sport} size={14} />
                    <span
                      className="max-w-full truncate px-0.5 text-[8.5px] font-semibold leading-none"
                      style={{ color: ATHLETE_PLAN_SPORT_STROKE[summ.sport] ?? "#0a84ff" }}
                    >
                      {summ.value}
                    </span>
                  </>
                ) : null}
              </div>
              {isDone ? (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#34C759]" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap justify-center gap-2 text-[10px] leading-none text-muted-foreground [row-gap:8px]">
        {LEGEND.map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-[3px]" style={{ background: ATHLETE_PLAN_SPORT_STROKE[k] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
