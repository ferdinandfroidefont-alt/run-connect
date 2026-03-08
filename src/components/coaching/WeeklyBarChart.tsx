import { useMemo } from "react";
import { format } from "date-fns";
import { parseRCC, computeRCCSummary } from "@/lib/rccParser";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface SessionData {
  scheduled_at: string;
  rcc_code?: string | null;
  distance_km?: number | null;
  title?: string | null;
  objective?: string | null;
}

interface WeeklyBarChartProps {
  sessions: SessionData[];
  weekDays: Date[];
}

function getBarColor(session: SessionData): string {
  const t = ((session.title || "") + " " + (session.objective || "")).toLowerCase();
  if (t.includes("vma") || t.includes("interval") || t.includes("fractionné")) return "bg-red-500";
  if (t.includes("seuil") || t.includes("tempo") || t.includes("threshold")) return "bg-orange-500";
  if (t.includes("récup") || t.includes("recup") || t.includes("recovery")) return "bg-blue-400";
  if (t.includes("ppg") || t.includes("renforcement")) return "bg-purple-500";
  return "bg-green-500"; // EF / default
}

export const WeeklyBarChart = ({ sessions, weekDays }: WeeklyBarChartProps) => {
  const dayData = useMemo(() => {
    const loads: number[] = new Array(7).fill(0);
    const colors: string[] = new Array(7).fill("bg-muted/50");

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
      if (load === 0 && s.distance_km) load = s.distance_km;
      if (load === 0) load = 1;
      loads[dayIndex] += load;
      colors[dayIndex] = getBarColor(s);
    });
    return { loads, colors };
  }, [sessions, weekDays]);

  const maxLoad = Math.max(...dayData.loads, 1);
  const totalKm = dayData.loads.reduce((s, l) => s + l, 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-2 px-1" style={{ height: 72 }}>
        {dayData.loads.map((load, i) => {
          const heightPct = load > 0 ? Math.max((load / maxLoad) * 100, 15) : 0;
          const hasSession = load > 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              {hasSession && (
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {Math.round(load * 10) / 10}
                </span>
              )}
              <div className="w-full flex items-end justify-center flex-1">
                <div
                  className={`w-full max-w-[24px] rounded-lg transition-all ${
                    hasSession ? dayData.colors[i] : "bg-muted/50"
                  }`}
                  style={{ height: hasSession ? `${heightPct}%` : 4 }}
                />
              </div>
              <span className={`text-[11px] font-semibold leading-none ${
                hasSession ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {DAY_LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
      {totalKm > 0 && (
        <div className="text-center mt-2">
          <span className="text-[12px] text-muted-foreground">
            Total : <strong className="text-foreground">{Math.round(totalKm * 10) / 10} km</strong>
          </span>
        </div>
      )}
    </div>
  );
};
