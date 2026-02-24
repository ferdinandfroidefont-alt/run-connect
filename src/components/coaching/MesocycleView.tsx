import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseRCC, computeRCCSummary } from "@/lib/rccParser";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { startOfWeek, subWeeks, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface MesocycleViewProps {
  clubId: string;
  currentWeek: Date;
}

interface WeekData {
  label: string;
  km: number;
  sessions: number;
  intensity: string;
  intensityScore: number;
}

const intensityColor = (intensity: string) => {
  switch (intensity) {
    case "Très intense": return "hsl(0, 80%, 55%)";
    case "Intense": return "hsl(25, 90%, 55%)";
    case "Modérée": return "hsl(45, 90%, 50%)";
    default: return "hsl(140, 60%, 45%)";
  }
};

const chartConfig = {
  km: { label: "Distance (km)", color: "hsl(var(--primary))" },
};

export const MesocycleView = ({ clubId, currentWeek }: MesocycleViewProps) => {
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);

  useEffect(() => {
    loadData();
  }, [clubId, currentWeek]);

  const loadData = async () => {
    setLoading(true);
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const eightWeeksAgo = subWeeks(weekStart, 7); // 8 weeks total including current

    const { data } = await supabase
      .from("coaching_sessions")
      .select("id, rcc_code, scheduled_at")
      .eq("club_id", clubId)
      .gte("scheduled_at", eightWeeksAgo.toISOString())
      .lte("scheduled_at", new Date(weekStart.getTime() + 7 * 86400000).toISOString());

    // Group by week
    const weekMap = new Map<string, { km: number; sessions: number; fastestPace: number }>();

    // Init 8 weeks
    for (let i = 7; i >= 0; i--) {
      const ws = subWeeks(weekStart, i);
      const key = format(ws, "yyyy-MM-dd");
      weekMap.set(key, { km: 0, sessions: 0, fastestPace: Infinity });
    }

    (data || []).forEach(session => {
      const ws = startOfWeek(new Date(session.scheduled_at), { weekStartsOn: 1 });
      const key = format(ws, "yyyy-MM-dd");
      const entry = weekMap.get(key);
      if (!entry) return;

      entry.sessions++;
      if (session.rcc_code) {
        const { blocks } = parseRCC(session.rcc_code);
        const summary = computeRCCSummary(blocks);
        entry.km += summary.totalDistanceKm;
      }
    });

    const result: WeekData[] = [];
    let idx = 0;
    for (const [key, val] of weekMap.entries()) {
      const weekLabel = `S${idx - 7}`;
      let intensity = "Facile";
      if (val.km > 60) intensity = "Très intense";
      else if (val.km > 45) intensity = "Intense";
      else if (val.km > 30) intensity = "Modérée";

      const intensityScore = intensity === "Très intense" ? 4 : intensity === "Intense" ? 3 : intensity === "Modérée" ? 2 : 1;

      result.push({
        label: idx === 7 ? "S0" : weekLabel,
        km: Math.round(val.km * 10) / 10,
        sessions: val.sessions,
        intensity,
        intensityScore,
      });
      idx++;
    }

    setWeeklyData(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxKm = Math.max(...weeklyData.map(w => w.km), 1);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="label" className="text-[10px]" tick={{ fontSize: 10 }} />
          <YAxis className="text-[10px]" tick={{ fontSize: 10 }} width={35} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="font-medium">{value} km</span>
                )}
              />
            }
          />
          <defs>
            <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="km"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#kmGradient)"
          />
        </AreaChart>
      </ChartContainer>

      {/* Summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 px-1 font-medium">Sem.</th>
              <th className="text-right py-1.5 px-1 font-medium">km</th>
              <th className="text-right py-1.5 px-1 font-medium">Séances</th>
              <th className="text-right py-1.5 px-1 font-medium">Intensité</th>
            </tr>
          </thead>
          <tbody>
            {weeklyData.map((w, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 px-1 font-medium text-foreground">{w.label}</td>
                <td className="py-1.5 px-1 text-right text-foreground">{w.km}</td>
                <td className="py-1.5 px-1 text-right text-muted-foreground">{w.sessions}</td>
                <td className="py-1.5 px-1 text-right">
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0"
                    style={{ backgroundColor: intensityColor(w.intensity) + "22", color: intensityColor(w.intensity) }}
                  >
                    {w.intensity}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
