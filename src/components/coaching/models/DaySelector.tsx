import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DaySelectorProps {
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
}

export function DaySelector({ days, selected, onSelect }: DaySelectorProps) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const active = format(day, "yyyy-MM-dd") === format(selected, "yyyy-MM-dd");
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(day)}
            className={cn(
              "rounded-xl px-1 py-2 text-center",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
            )}
          >
            <p className="text-[10px] font-semibold uppercase">{format(day, "EEEEE", { locale: fr })}</p>
            <p className="text-[13px] font-bold leading-tight">{format(day, "d", { locale: fr })}</p>
          </button>
        );
      })}
    </div>
  );
}

