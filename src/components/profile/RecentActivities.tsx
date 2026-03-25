import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Activity } from "lucide-react";
import { getActivityConfig } from "@/lib/activityIcons";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";

interface ActivityItem {
  id: string;
  type: 'created' | 'joined';
  title: string;
  activity_type: string;
  distance_km: number | null;
  scheduled_at: string;
}

interface RecentActivitiesProps {
  userId: string;
  limit?: number;
}

export const RecentActivities = ({ userId, limit = 5 }: RecentActivitiesProps) => {
  const { formatKm } = useDistanceUnits();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    try {
      const [createdRes, joinedRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('id, title, activity_type, distance_km, scheduled_at')
          .eq('organizer_id', userId)
          .order('scheduled_at', { ascending: false })
          .limit(limit),
        supabase
          .from('session_participants')
          .select('session_id, sessions(id, title, activity_type, distance_km, scheduled_at)')
          .eq('user_id', userId)
          .order('joined_at', { ascending: false })
          .limit(limit),
      ]);

      const created: ActivityItem[] = (createdRes.data || []).map(s => ({
        id: s.id,
        type: 'created' as const,
        title: s.title,
        activity_type: s.activity_type,
        distance_km: s.distance_km,
        scheduled_at: s.scheduled_at,
      }));

      const joined: ActivityItem[] = (joinedRes.data || [])
        .filter((p: any) => p.sessions)
        .map((p: any) => ({
          id: p.sessions.id,
          type: 'joined' as const,
          title: p.sessions.title,
          activity_type: p.sessions.activity_type,
          distance_km: p.sessions.distance_km,
          scheduled_at: p.sessions.scheduled_at,
        }));

      // Merge, deduplicate, sort
      const merged = [...created, ...joined];
      const seen = new Set<string>();
      const unique = merged.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      unique.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      setActivities(unique.slice(0, limit));
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-[10px] overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-card rounded-[10px] p-6 text-center">
        <div className="text-3xl mb-2">🏃</div>
        <p className="text-[15px] font-medium text-foreground">Aucune activité récente</p>
        <p className="text-[13px] text-muted-foreground mt-1">Les séances créées et rejointes apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-[10px] overflow-hidden">
      {activities.map((activity, index) => {
        const config = getActivityConfig(activity.activity_type);
        const Icon = config.icon;
        const timeAgo = formatDistanceToNow(new Date(activity.scheduled_at), { addSuffix: true, locale: fr });

        return (
          <div key={activity.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-[30px] w-[30px] rounded-[7px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-[16px] w-[16px] text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground truncate">{activity.title}</p>
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  {activity.distance_km && (
                    <>
                      <span>{activity.distance_km != null ? formatKm(activity.distance_km) : "—"}</span>
                      <span>·</span>
                    </>
                  )}
                  <span className="capitalize">{activity.type === 'created' ? 'Organisée' : 'Participé'}</span>
                  <span>·</span>
                  <span>{timeAgo}</span>
                </div>
              </div>
            </div>
            {index < activities.length - 1 && <div className="h-px bg-border ml-[54px]" />}
          </div>
        );
      })}
    </div>
  );
};
