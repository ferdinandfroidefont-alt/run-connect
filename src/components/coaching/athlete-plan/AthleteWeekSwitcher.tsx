import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  weekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  className?: string;
};

export function AthleteWeekSwitcher({ weekStart, onPreviousWeek, onNextWeek, className }: Props) {
  const end = addDays(weekStart, 6);
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border border-border/80 bg-card px-2 py-2.5 shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={onPreviousWeek}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground shadow-sm active:scale-[0.98]"
        aria-label="Semaine précédente"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 px-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Semaine</p>
        <p className="truncate text-[15px] font-semibold text-foreground">
          {format(weekStart, "d MMM", { locale: fr })} – {format(end, "d MMM yyyy", { locale: fr })}
        </p>
      </div>
      <button
        type="button"
        onClick={onNextWeek}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground shadow-sm active:scale-[0.98]"
        aria-label="Semaine suivante"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
