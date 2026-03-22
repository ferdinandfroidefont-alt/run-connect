import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileQuickStatsProps {
  userId: string;
  followerCount?: number;
  followingCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

export const ProfileQuickStats = ({
  userId,
  followerCount = 0,
  followingCount = 0,
  onFollowersClick,
  onFollowingClick,
}: ProfileQuickStatsProps) => {
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const [createdRes, joinedRes, distanceRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .eq('organizer_id', userId),
        supabase
          .from('session_participants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('sessions')
          .select('distance_km')
          .eq('organizer_id', userId)
          .not('distance_km', 'is', null),
      ]);

      const created = createdRes.count || 0;
      const joined = joinedRes.count || 0;
      setTotalActivities(created + joined);

      const dist = distanceRes.data?.reduce((sum, s) => sum + (Number(s.distance_km) || 0), 0) || 0;
      setTotalDistance(Math.round(dist));
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: totalActivities, label: "Activités", onClick: undefined },
    { value: `${totalDistance} km`, label: "Distance", onClick: undefined },
    { value: followerCount, label: "Abonnés", onClick: onFollowersClick },
    { value: followingCount, label: "Abonnements", onClick: onFollowingClick },
  ];

  return (
    <div className="grid grid-cols-4 bg-card rounded-[10px] overflow-hidden">
      {stats.map((stat, i) => {
        const Wrapper = stat.onClick ? 'button' : 'div';
        return (
          <Wrapper
            key={stat.label}
            onClick={stat.onClick}
            className={`py-2.5 text-center transition-colors active:bg-secondary/60 ${
              i < 3 ? 'border-r border-border/50' : ''
            }`}
          >
            <p className="text-[18px] font-bold text-foreground leading-none">
              {loading ? '–' : stat.value}
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
          </Wrapper>
        );
      })}
    </div>
  );
};
