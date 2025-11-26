import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from "lucide-react";
import { format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

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
      
      // Calculer la date de début (8 semaines en arrière)
      const weeksAgo = 8;
      const startDate = startOfWeek(subWeeks(new Date(), weeksAgo), { locale: fr });
      
      // Récupérer les séances créées par semaine
      const { data: createdSessions, error: createdError } = await supabase
        .from('sessions')
        .select('scheduled_at')
        .eq('organizer_id', userId)
        .gte('scheduled_at', startDate.toISOString());

      if (createdError) throw createdError;

      // Récupérer les séances rejointes par semaine
      const { data: joinedSessions, error: joinedError } = await supabase
        .from('session_participants')
        .select('joined_at, sessions!inner(scheduled_at)')
        .eq('user_id', userId)
        .gte('joined_at', startDate.toISOString());

      if (joinedError) throw joinedError;

      // Créer un tableau pour chaque semaine
      const weeklyData: Map<string, WeeklyActivity> = new Map();
      
      // Initialiser les 8 dernières semaines
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

      // Compter les séances créées par semaine
      createdSessions?.forEach(session => {
        const weekStart = startOfWeek(new Date(session.scheduled_at), { locale: fr });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const week = weeklyData.get(weekKey);
        if (week) {
          week.sessionsCreated++;
        }
      });

      // Compter les séances rejointes par semaine
      joinedSessions?.forEach(participant => {
        const weekStart = startOfWeek(new Date(participant.joined_at), { locale: fr });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        const week = weeklyData.get(weekKey);
        if (week) {
          week.sessionsJoined++;
        }
      });

      // Convertir la Map en tableau trié
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

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            Séances créées et rejointes sur les 8 dernières semaines
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.sessionsCreated, d.sessionsJoined)),
    5 // Minimum pour avoir un graphique lisible
  );

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold">📊 Activités récentes</h3>
      </CardHeader>
      <CardContent>
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
              labelStyle={{ color: 'hsl(var(--foreground))' }}
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
        
        <div className="flex justify-around mt-3 pt-3 border-t text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">
              🔵 {data.reduce((sum, d) => sum + d.sessionsCreated, 0)}
            </div>
            <div className="text-xs text-muted-foreground">créées</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              🟢 {data.reduce((sum, d) => sum + d.sessionsJoined, 0)}
            </div>
            <div className="text-xs text-muted-foreground">rejointes</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
