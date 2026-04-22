import { useMemo, useRef } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekSelectorPremiumProps {
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  indicatorsByDate?: Record<string, Array<{ color: string }>>;
}

const DAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

export function WeekSelectorPremium({
  weekStart,
  selectedDate,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  indicatorsByDate = {},
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
        };
      }),
    [indicatorsByDate, selectedDate, weekStart]
  );

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} - ${format(addDays(weekStart, 6), "d MMM", { locale: fr })}`;

  return (
    <div
      className="border-b border-border bg-card px-4 py-3"
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
            {day.indicators.length > 0 && (
              <div className="mt-1.5 flex items-center justify-center gap-1">
                {day.indicators.slice(0, 3).map((dot, idx) => (
                  <span
                    key={`${day.key}-${idx}`}
                    className={cn("h-1.5 w-1.5 rounded-full", day.isSelected ? "bg-primary-foreground/90" : "")}
                    style={day.isSelected ? undefined : { backgroundColor: dot.color }}
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

