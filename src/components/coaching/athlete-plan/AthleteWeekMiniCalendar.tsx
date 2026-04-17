import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { AthletePlanSessionModel } from "./types";
import { mapParticipationToUiStatus } from "./planUtils";

const SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Props = {
  weekDays: Date[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  sessions: AthletePlanSessionModel[];
  className?: string;
};

export function AthleteWeekMiniCalendar({ weekDays, selectedDate, onSelectDate, sessions, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-border/80 bg-card p-3 shadow-sm", className)}>
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Aperçu</p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const selected = key === format(selectedDate, "yyyy-MM-dd");
          const daySessions = sessions.filter((s) => format(parseISO(s.assignedDate), "yyyy-MM-dd") === key);
          const busy = daySessions.length >= 3;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex min-h-[92px] flex-col items-center rounded-xl border px-1 py-2 text-center transition-all active:scale-[0.98]",
                selected ? "border-primary bg-primary/10 shadow-sm" : "border-border/60 bg-secondary/30",
                busy && !selected && "border-amber-400/40 bg-amber-500/5"
              )}
            >
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">{SHORT[idx]}</span>
              <span className="text-[16px] font-bold tabular-nums text-foreground">{format(day, "d")}</span>
              <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                {daySessions.length === 0 ? "—" : `${daySessions.length} séance${daySessions.length > 1 ? "s" : ""}`}
              </span>
              <div className="mt-1 flex min-h-[14px] flex-wrap justify-center gap-0.5">
                {daySessions.slice(0, 4).map((s) => {
                  const st = mapParticipationToUiStatus(s.participationStatus, s.hasConflict);
                  return (
                    <span
                      key={s.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        st === "conflict" && "bg-violet-500",
                        st === "planned" && "bg-sky-500",
                        st === "confirmed" && "bg-amber-500",
                        st === "done" && "bg-emerald-500",
                        st === "missed" && "bg-red-500"
                      )}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
