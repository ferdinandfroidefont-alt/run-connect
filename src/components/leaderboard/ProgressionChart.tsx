import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, subWeeks, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressionData {
  weekLabel: string;
  points: number;
  rank: number | null;
}

export const ProgressionChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProgressionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [pointsDiff, setPointsDiff] = useState(0);

  useEffect(() => {
    if (user) fetchProgressionData();
  }, [user]);

  const fetchProgressionData = async () => {
    if (!user) return;

    try {
      const weeksBack = 8;
      const startDate = startOfWeek(subWeeks(new Date(), weeksBack), { locale: fr });

      const { data: historyData, error } = await supabase
        .from('score_history')
        .select('seasonal_points, total_points, rank, week_start')
        .eq('user_id', user.id)
        .gte('week_start', startDate.toISOString().split('T')[0])
        .order('week_start', { ascending: true });

      if (error) {
        console.error('Error fetching progression:', error);
        return;
      }

      if (historyData && historyData.length > 0) {
        const formatted = historyData.map((item) => ({
          weekLabel: format(new Date(item.week_start), 'dd MMM', { locale: fr }),
          points: item.seasonal_points || item.total_points || 0,
          rank: item.rank,
        }));

        setData(formatted);

        // Calculate trend
        if (formatted.length >= 2) {
          const latest = formatted[formatted.length - 1].points;
          const previous = formatted[formatted.length - 2].points;
          const diff = latest - previous;
          setPointsDiff(diff);
          setTrend(diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable');
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
          <div className="h-5 w-40 bg-secondary rounded animate-pulse" />
        </div>
        <div className="px-4 py-6">
          <div className="h-[140px] bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="h-[30px] w-[30px] rounded-[7px] bg-indigo-500 flex items-center justify-center">
            <TrendingUp className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-[17px] font-semibold text-foreground">Ma Progression</span>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-[15px] text-muted-foreground">
            📊 Pas assez de données encore. Reviens la semaine prochaine !
          </p>
        </div>
      </div>
    );
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const trendLabel = trend === 'up' ? `+${pointsDiff}` : trend === 'down' ? `${pointsDiff}` : '±0';

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="h-[30px] w-[30px] rounded-[7px] bg-indigo-500 flex items-center justify-center">
          <TrendingUp className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] font-semibold text-foreground">Ma Progression</span>
          <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span className="text-[13px] font-medium">{trendLabel} pts</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="progressionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="weekLabel" 
              stroke="hsl(var(--muted-foreground))" 
              style={{ fontSize: '11px' }} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              style={{ fontSize: '11px' }} 
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px'
              }}
              formatter={(value: number) => [`${value} pts`, 'Points']}
            />
            <Area
              type="monotone"
              dataKey="points"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              fill="url(#progressionGradient)"
              dot={{ fill: 'hsl(var(--primary))', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
