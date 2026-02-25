import { useMemo } from "react";
import { format } from "date-fns";
import { parseRCC, computeRCCSummary } from "@/lib/rccParser";

const DAY_LABELS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

interface SessionData {
  scheduled_at: string;
  rcc_code?: string | null;
  distance_km?: number | null;
}

interface WeeklyBarChartProps {
  sessions: SessionData[];
  weekDays: Date[];
}

export const WeeklyBarChart = ({ sessions, weekDays }: WeeklyBarChartProps) => {
  const dayLoads = useMemo(() => {
    const loads: number[] = new Array(7).fill(0);

    sessions.forEach(s => {
      const dayKey = format(new Date(s.scheduled_at), "yyyy-MM-dd");
      const dayIndex = weekDays.findIndex(d => format(d, "yyyy-MM-dd") === dayKey);
      if (dayIndex === -1) return;

      let load = 0;
      if (s.rcc_code) {
        const { blocks } = parseRCC(s.rcc_code);
        if (blocks.length > 0) {
          const summary = computeRCCSummary(blocks);
          load = summary.totalDistanceKm || summary.totalDurationMin / 10;
        }
      }
      if (load === 0 && s.distance_km) {
        load = s.distance_km;
      }
      if (load === 0) load = 1; // minimum visible bar

      loads[dayIndex] += load;
    });

    return loads;
  }, [sessions, weekDays]);

  const maxLoad = Math.max(...dayLoads, 1);

  return (
    <div className="flex items-end justify-between gap-1 h-16 px-2">
      {dayLoads.map((load, i) => {
        const heightPct = load > 0 ? Math.max((load / maxLoad) * 100, 12) : 0;
        const hasSession = load > 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
              <div
                className={`w-full max-w-[20px] rounded-t-sm transition-all ${
                  hasSession ? "bg-primary" : "bg-muted"
                }`}
                style={{ height: hasSession ? `${heightPct}%` : 4 }}
              />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground leading-none">
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
