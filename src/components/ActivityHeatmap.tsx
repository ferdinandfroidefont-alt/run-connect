import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityHeatmapProps {
  userId: string;
}

export const ActivityHeatmap = ({ userId }: ActivityHeatmapProps) => {
  const [activityData, setActivityData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
  }, [userId]);

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = subWeeks(endDate, 8);

      // Fetch sessions where user was a participant
      const { data: sessions } = await supabase
        .from('session_participants')
        .select('joined_at, validation_status')
        .eq('user_id', userId)
        .gte('joined_at', startDate.toISOString())
        .lte('joined_at', endDate.toISOString());

      // Count activities per day
      const counts: Record<string, number> = {};
      sessions?.forEach((session) => {
        const dateKey = format(new Date(session.joined_at), 'yyyy-MM-dd');
        counts[dateKey] = (counts[dateKey] || 0) + 1;
      });

      setActivityData(counts);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeeks = () => {
    const weeks = [];
    const endDate = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(endDate, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      weeks.push(days);
    }
    
    return weeks;
  };

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-primary/20';
    if (count === 2) return 'bg-primary/40';
    if (count === 3) return 'bg-primary/60';
    return 'bg-primary/80';
  };

  const weeks = generateWeeks();

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Chargement...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalActivities = Object.values(activityData).reduce((sum, count) => sum + count, 0);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="text-sm">Activité récente (8 semaines)</CardTitle>
      </CardHeader>
      <CardContent>
        {totalActivities === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune activité récente
          </div>
        ) : (
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                {week.map((day, dayIndex) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const count = activityData[dateKey] || 0;
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`h-4 w-4 rounded-sm ${getIntensityClass(count)} ${isToday ? 'ring-2 ring-primary' : ''} transition-all hover:scale-110`}
                      title={`${format(day, 'dd MMM yyyy', { locale: fr })}: ${count} activité${count > 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
            <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
              <span>Moins</span>
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-sm bg-muted/30" />
                <div className="h-3 w-3 rounded-sm bg-primary/20" />
                <div className="h-3 w-3 rounded-sm bg-primary/40" />
                <div className="h-3 w-3 rounded-sm bg-primary/60" />
                <div className="h-3 w-3 rounded-sm bg-primary/80" />
              </div>
              <span>Plus</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
