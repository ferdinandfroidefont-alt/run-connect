import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, BarChart3 } from "lucide-react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface UserActivityChartProps {
  userId: string;
  username?: string;
}

interface WeeklyActivity {
  week: string;
  weekLabel: string;
  sessionsCreated: number;
  sessionsJoined: number;
}

export const UserActivityChart = ({ userId, username }: UserActivityChartProps) => {
  const [data, setData] = useState<WeeklyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
  }, [userId]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      
      const weeksAgo = 8;
      const startDate = startOfWeek(subWeeks(new Date(), weeksAgo), { locale: fr });
      
      const { data: createdSessions, error: createdError } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('organizer_id', userId)
        .gte('scheduled_at', startDate.toISOString());

      if (createdError) throw createdError;

      const { data: joinedSessions, error: joinedError } = await supabase
        .from('session_participants')
        .select('joined_at, sessions!inner(scheduled_at)')
        .eq('user_id', userId)
        .gte('joined_at', startDate.toISOString());

      if (joinedError) throw joinedError;

      const weeklyData: Map<string, WeeklyActivity> = new Map();
      
      for (let i = weeksAgo - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { locale: fr });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const weekLabel = format(weekStart, 'dd MMM', { locale: fr });
        
        weeklyData.set(weekKey, {
          week: weekKey,
          weekLabel,
          sessionsCreated: 0,
          sessionsJoined: 0
        });
      }

      createdSessions?.forEach(session => {
        const weekStart = startOfWeek(new Date(session.scheduled_at), { locale: fr });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const week = weeklyData.get(weekKey);
        if (week) {
          week.sessionsCreated++;
        }
      });

      joinedSessions?.forEach(participant => {
        const weekStart = startOfWeek(new Date(participant.joined_at), { locale: fr });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const week = weeklyData.get(weekKey);
        if (week) {
          week.sessionsJoined++;
        }
      });

      const sortedData = Array.from(weeklyData.values()).sort((a, b) => 
        a.week.localeCompare(b.week)
      );

      setData(sortedData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCreated = data.reduce((sum, d) => sum + d.sessionsCreated, 0);
  const totalJoined = data.reduce((sum, d) => sum + d.sessionsJoined, 0);

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.sessionsCreated, d.sessionsJoined)),
    5
  );

  return (
    <div className="space-y-2">
      {/* Header */}
      <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4">
        Activités récentes
      </p>
      
      {/* iOS Inset Grouped Card */}
      <div className="bg-card rounded-[10px] overflow-hidden">
        {/* Header Row */}
        <div className="relative">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-[30px] w-[30px] rounded-[7px] bg-blue-500 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-[18px] w-[18px] text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] text-foreground">8 dernières semaines</p>
              <p className="text-[13px] text-muted-foreground">
                {totalCreated + totalJoined} séances au total
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-[54px] right-0 h-px bg-border" />
        </div>

        {/* Chart */}
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-[140px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '10px' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '10px' }}
                  domain={[0, maxValue]}
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
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessionsCreated" 
                  stroke="#007AFF" 
                  strokeWidth={2}
                  name="Créées"
                  dot={{ fill: '#007AFF', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sessionsJoined" 
                  stroke="#34C759" 
                  strokeWidth={2}
                  name="Rejointes"
                  dot={{ fill: '#34C759', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="absolute left-[54px] right-0 h-px bg-border" />

        {/* Stats Row */}
        <div className="flex border-t border-border">
          <div className="flex-1 py-3 text-center border-r border-border">
            <div className="text-[20px] font-bold text-[#007AFF]">{totalCreated}</div>
            <div className="text-[11px] text-muted-foreground">créées</div>
          </div>
          <div className="flex-1 py-3 text-center">
            <div className="text-[20px] font-bold text-[#34C759]">{totalJoined}</div>
            <div className="text-[11px] text-muted-foreground">rejointes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
