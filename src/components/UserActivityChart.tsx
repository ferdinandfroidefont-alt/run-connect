import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, BarChart3, ChevronRight } from "lucide-react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [showDialog, setShowDialog] = useState(false);

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
  const totalSessions = totalCreated + totalJoined;

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.sessionsCreated, d.sessionsJoined)),
    5
  );

  return (
    <>
      {/* iOS List Item Row */}
      <button
        onClick={() => setShowDialog(true)}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-blue-500 flex items-center justify-center">
          <BarChart3 className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Activités récentes</span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">
              {loading ? "..." : `${totalSessions} séance${totalSessions > 1 ? 's' : ''}`}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>

      {/* Dialog with chart */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Activités récentes
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Séances créées et rejointes sur les 8 dernières semaines
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center h-[180px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={data}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="weekLabel" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '11px' }}
                      domain={[0, maxValue]}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessionsCreated" 
                      stroke="hsl(217, 91%, 60%)" 
                      strokeWidth={2}
                      name="Créées"
                      dot={{ fill: 'hsl(217, 91%, 60%)', r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessionsJoined" 
                      stroke="hsl(142, 71%, 45%)" 
                      strokeWidth={2}
                      name="Rejointes"
                      dot={{ fill: 'hsl(142, 71%, 45%)', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="flex justify-around mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">🔵 {totalCreated}</div>
                    <div className="text-xs text-muted-foreground">créées</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">🟢 {totalJoined}</div>
                    <div className="text-xs text-muted-foreground">rejointes</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
