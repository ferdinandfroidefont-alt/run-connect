import { useMemo, useRef } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DayIndicator = {
  color: string;
};

interface WeekSelectorProps {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  indicatorsByDate?: Record<string, DayIndicator[]>;
}

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

export function WeekSelector({
  weekStart,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  indicatorsByDate = {},
}: WeekSelectorProps) {
  const touchStartX = useRef<number | null>(null);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const date = addDays(weekStart, idx);
      const key = format(date, "yyyy-MM-dd");
      const selected = format(selectedDate, "yyyy-MM-dd") === key;
      return {
        date,
        key,
        dayNumber: format(date, "d"),
        dayInitial: DAY_INITIALS[idx],
        selected,
        indicators: indicatorsByDate[key] || [],
      };
    });
  }, [indicatorsByDate, selectedDate, weekStart]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} - ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;

  return (
    <div
      className="-mx-ios-4 border-b border-border bg-card px-ios-4 py-3"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const deltaX = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(deltaX) < 36) return;
        if (deltaX < 0) onNextWeek();
        else onPreviousWeek();
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors active:bg-muted"
          onClick={onPreviousWeek}
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors active:bg-muted"
          onClick={onNextWeek}
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
              "relative min-w-[52px] flex-1 rounded-2xl px-2 py-2 text-center transition-all duration-200",
              "border border-transparent",
              day.selected
                ? "bg-[#2563EB] text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)]"
                : "bg-secondary text-foreground active:bg-muted"
            )}
          >
            <p className={cn("text-[16px] font-semibold leading-none", day.selected ? "text-white" : "text-foreground")}>
              {day.dayNumber}
            </p>
            <p className={cn("mt-1 text-[11px] font-medium leading-none", day.selected ? "text-white/90" : "text-muted-foreground")}>
              {day.dayInitial}
            </p>
            {day.indicators.length > 0 && (
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {day.indicators.slice(0, 3).map((indicator, idx) => (
                  <span
                    key={`${day.key}-${idx}`}
                    className={cn("h-1.5 w-1.5 rounded-full", day.selected ? "bg-white/90" : "")}
                    style={day.selected ? undefined : { backgroundColor: indicator.color }}
                  />
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

