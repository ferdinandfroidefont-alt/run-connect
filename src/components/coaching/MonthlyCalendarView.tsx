import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export interface MonthSessionDot {
  id: string;
  scheduled_at: string;
  objective: string | null;
  title: string;
  activity_type: string;
}

function dotClassForSession(s: MonthSessionDot): string {
  const t = `${s.objective || ""} ${s.title || ""}`.toLowerCase();
  if (t.includes("vma") || t.includes("interval") || t.includes("fractionné")) return "bg-red-500";
  if (t.includes("seuil") || t.includes("tempo")) return "bg-orange-500";
  if (t.includes("récup") || t.includes("recup")) return "bg-emerald-400";
  if (t.includes("spé") || t.includes("spe")) return "bg-violet-500";
  return "bg-green-500";
}

interface MonthlyCalendarViewProps {
  monthDate: Date;
  sessions: MonthSessionDot[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function MonthlyCalendarView({ monthDate, sessions, onPrevMonth, onNextMonth }: MonthlyCalendarViewProps) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDay = useMemo(() => {
    const m: Record<string, MonthSessionDot[]> = {};
    for (const s of sessions) {
      const k = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      if (!m[k]) m[k] = [];
      m[k].push(s);
    }
    return m;
  }, [sessions]);

  return (
    <div className="ios-card border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <button
          type="button"
          onClick={onPrevMonth}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-[16px] font-bold text-foreground capitalize">
          {format(monthDate, "MMMM yyyy", { locale: fr })}
        </p>
        <button
          type="button"
          onClick={onNextMonth}
          className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {WEEKDAY_LABELS.map((l) => (
            <div key={l} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {l}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const daySessions = byDay[key] || [];
            const inMonth = isSameMonth(day, monthDate);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            return (
              <div
                key={key}
                className={`min-h-[52px] rounded-lg border border-border/40 p-1 flex flex-col items-center ${
                  inMonth ? "bg-card" : "bg-secondary/30 opacity-60"
                } ${isToday ? "ring-1 ring-primary/50" : ""}`}
              >
                <span className={`text-[12px] font-semibold tabular-nums ${inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="flex flex-wrap gap-0.5 justify-center mt-0.5 max-w-full">
                  {daySessions.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClassForSession(s)}`}
                      title={s.title}
                    />
                  ))}
                  {daySessions.length > 4 && (
                    <span className="text-[8px] text-muted-foreground font-medium">+{daySessions.length - 4}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="px-4 pb-3 text-[11px] text-muted-foreground text-center">
        Points = séances envoyées · vert EF · orange seuil · rouge VMA · bleu récup
      </p>
    </div>
  );
}
