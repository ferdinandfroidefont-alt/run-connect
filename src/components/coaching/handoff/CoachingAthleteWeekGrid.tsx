import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { Bike, Dumbbell, Footprints, Moon, Waves } from "lucide-react";

export type AthleteWeekDayStatus = "done" | "today" | "planned" | "rest";

export type AthleteWeekGridDay = {
  date: Date;
  status: AthleteWeekDayStatus;
  summary?: DaySessionSummary;
};

const SPORT: Record<
  NonNullable<DaySessionSummary["sport"]>,
  { label: string; stroke: string }
> = {
  running: { label: "Course", stroke: "#0a84ff" },
  cycling: { label: "Vélo", stroke: "#ff9500" },
  swimming: { label: "Natation", stroke: "#5ac8fa" },
  strength: { label: "Renfo", stroke: "#af52de" },
  rest: { label: "Repos", stroke: "rgba(60,60,67,0.3)" },
};

function SportGlyph({ sport, size = 14, stroke }: { sport: keyof typeof SPORT; size?: number; stroke?: string }) {
  const c = stroke ?? SPORT[sport].stroke;
  const sw = 1.8;
  if (sport === "running") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="10" cy="3" r="1.4" stroke={c} strokeWidth={sw} />
        <path
          d="M5 14l2-4 2.5 2 1.5 3M3 9l2.5-3.5L8 6.5l1.5 2.5L13 9"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (sport === "cycling") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="3.5" cy="11" r="2.2" stroke={c} strokeWidth={sw} />
        <circle cx="12.5" cy="11" r="2.2" stroke={c} strokeWidth={sw} />
        <path d="M3.5 11l3-5h4l2 5M6.5 6h2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (sport === "swimming") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M1 11c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0M1 7.5c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <circle cx="11" cy="4" r="1.3" stroke={c} strokeWidth={sw} />
      </svg>
    );
  }
  if (sport === "strength") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 8h12M3.5 5v6M5 4v8M11 4v8M12.5 5v6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11 9.5A4.5 4.5 0 016.5 5a4.5 4.5 0 014.4-4.5C8.7 1.6 7 4 7 6.7a5.3 5.3 0 005.3 5.3c1.6 0 3-.7 4-1.8a4.5 4.5 0 01-5.3-.7z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SessionIcon({ sport, className }: { sport: DaySessionSummary["sport"]; className?: string }) {
  switch (sport) {
    case "running":
      return <Footprints className={cn("h-3.5 w-3.5 text-[#0a84ff]", className)} aria-hidden />;
    case "cycling":
      return <Bike className={cn("h-3.5 w-3.5 text-[#ff9500]", className)} aria-hidden />;
    case "swimming":
      return <Waves className={cn("h-3.5 w-3.5 text-[#5ac8fa]", className)} aria-hidden />;
    case "strength":
      return <Dumbbell className={cn("h-3.5 w-3.5 text-[#af52de]", className)} aria-hidden />;
    default:
      return <Moon className={cn("h-3.5 w-3.5 text-muted-foreground/50", className)} aria-hidden />;
  }
}

const LEGEND: Array<[keyof typeof SPORT, string]> = [
  ["running", "Course"],
  ["cycling", "Vélo"],
  ["swimming", "Natation"],
  ["strength", "Renfo"],
  ["rest", "Repos"],
];

export function CoachingAthleteWeekGrid({
  days,
  selectedDate,
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
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between px-1 pb-2.5">
        <button type="button" onClick={onPreviousWeek} className="px-2 py-1 text-[18px] text-[#0a84ff]" aria-label="Semaine précédente">
          ‹
        </button>
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground">{weekTitle}</p>
        <button type="button" onClick={onNextWeek} className="px-2 py-1 text-[18px] text-[#0a84ff]" aria-label="Semaine suivante">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d.date, "yyyy-MM-dd");
          const isSelected = format(selectedDate, "yyyy-MM-dd") === key;
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
                "relative rounded-[10px] border bg-card py-1.5 text-center transition-opacity",
                isToday && "border-[#0a84ff] border-[1.5px]",
                !isToday && isSelected && "ring-1 ring-[#0a84ff]/50",
                !isToday && !isSelected && "border-transparent",
                isDone && "opacity-[0.65]"
              )}
            >
              <div className="text-[9px] tracking-[0.05em] text-muted-foreground">{format(d.date, "EEEEE", { locale: fr })}</div>
              <div
                className={cn(
                  "font-[system-ui] text-[14px] font-semibold leading-tight",
                  isToday ? "text-[#0a84ff]" : "text-foreground"
                )}
              >
                {format(d.date, "d")}
              </div>
              <div className="mt-0.5 flex h-[26px] flex-col items-center justify-center gap-0.5">
                {isRest ? (
                  <>
                    <SportGlyph sport="rest" size={14} stroke="rgba(60,60,67,0.3)" />
                    <span className="text-[8.5px] font-medium leading-none text-muted-foreground/70">Repos</span>
                  </>
                ) : summ ? (
                  <>
                    <SessionIcon sport={summ.sport} />
                    <span
                      className="max-w-full truncate px-0.5 text-[8.5px] font-semibold leading-none"
                      style={{
                        color:
                          summ.sport === "running"
                            ? "#0a84ff"
                            : summ.sport === "cycling"
                              ? "#ff9500"
                              : summ.sport === "swimming"
                                ? "#5ac8fa"
                                : summ.sport === "strength"
                                  ? "#af52de"
                                  : "rgba(60,60,67,0.3)",
                      }}
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
      <div className="mt-2.5 flex flex-wrap justify-center gap-2 text-[10px] text-muted-foreground">
        {LEGEND.map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SPORT[k].stroke }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
