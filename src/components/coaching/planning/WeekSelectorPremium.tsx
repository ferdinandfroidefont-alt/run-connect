import { useMemo, useRef } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bike, ChevronLeft, ChevronRight, Dumbbell, Footprints, Moon, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekSelectorPremiumProps {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  indicatorsByDate?: Record<string, Array<{ color: string }>>;
  sessionSummaryByDate?: Record<string, DaySessionSummary>;
  showLegend?: boolean;
  /** Calendrier intégré dans une carte (maquette coach · Planification). */
  variant?: "default" | "embed";
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
  showLegend = false,
  variant = "default",
}: WeekSelectorPremiumProps) {
  const touchStartX = useRef<number | null>(null);

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
        };
      }),
    [indicatorsByDate, selectedDate, sessionSummaryByDate, weekStart]
  );

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} - ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;

  return (
    <div
      className={cn(
        "py-3",
        variant === "embed"
          ? "border-0 bg-transparent px-1"
          : "border-b border-border bg-card px-4"
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
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPreviousWeek}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">SEMAINE</p>
          <p className="text-[16px] font-semibold text-foreground">{weekLabel}</p>
        </div>
        <button
          type="button"
          onClick={onNextWeek}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

      <div className="no-scrollbar flex items-stretch gap-2 overflow-x-auto pb-0.5">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={cn(
              "flex min-w-[44px] flex-1 flex-col items-center rounded-lg px-1.5 py-2 transition-all",
              day.isSelected ? "bg-[#2563EB] text-white" : "bg-secondary text-foreground"
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
                <SessionIcon
                  sport={day.summary.sport}
                  className={cn("h-3 w-3", sessionTone(day.summary.sport))}
                />
                <p
                  className={cn(
                    "mt-0.5 text-[10px] font-medium leading-none",
                    sessionTone(day.summary.sport)
                  )}
                >
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
      {showLegend && (
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
      )}
    </div>
  );
}

