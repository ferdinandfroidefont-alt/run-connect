import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";

interface ProfileQuickStatsProps {
  userId: string;
  followerCount?: number;
  followingCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  /** Affiche la colonne Fiabilité (ex. profil perso), à côté des abonnés / abonnements */
  reliabilityPercent?: number | null;
  onReliabilityClick?: () => void;
  /** Profil public / lecture seule : affiche la colonne Fiabilité (connecté), « – » si pas de donnée */
  showReliabilityColumn?: boolean;
}

export const ProfileQuickStats = ({
  userId,
  followerCount = 0,
  followingCount = 0,
  onFollowersClick,
  onFollowingClick,
  reliabilityPercent,
  onReliabilityClick,
  showReliabilityColumn,
}: ProfileQuickStatsProps) => {
  const { formatKm } = useDistanceUnits();
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

  const showReliability =
    showReliabilityColumn === true ||
    typeof onReliabilityClick === "function" ||
    (reliabilityPercent != null && !Number.isNaN(Number(reliabilityPercent)));

  const stats: {
    value: string | number;
    label: string;
    onClick?: () => void;
  }[] = [
    { value: totalActivities, label: "Activités", onClick: undefined },
    { value: formatKm(totalDistance), label: "Distance", onClick: undefined },
    { value: followerCount, label: "Abonnés", onClick: onFollowersClick },
    { value: followingCount, label: "Abonnements", onClick: onFollowingClick },
  ];

  if (showReliability) {
    const rel =
      reliabilityPercent != null && !Number.isNaN(Number(reliabilityPercent))
        ? `${Math.round(Number(reliabilityPercent))}%`
        : "–";
    stats.push({
      value: rel,
      label: "Fiabilité",
      onClick: onReliabilityClick,
    });
  }

  const colCount = stats.length;

  return (
    <div
      className={`grid w-full min-w-0 overflow-hidden ${
        colCount === 5 ? "grid-cols-5" : "grid-cols-4"
      }`}
    >
      {/* Refonte Apple StatTile (mockup 19) — display 22/700/-0.5px + label 13 ink60 */}
      {stats.map((stat, i) => {
        const cell = (
          <>
            <p className="font-display truncate px-0.5 text-[22px] font-bold tabular-nums leading-none tracking-[-0.5px] text-foreground">
              {loading && stat.label !== "Fiabilité" ? "–" : stat.value}
            </p>
            <p className="mt-1 truncate px-0.5 text-[13px] font-normal text-muted-foreground">
              {stat.label}
            </p>
          </>
        );
        const className = `min-h-[60px] min-w-0 touch-manipulation py-3 text-center transition-colors active:bg-secondary/60 ${
          i < colCount - 1 ? "border-r border-border/50" : ""
        }`;
        return stat.onClick ? (
          <button key={stat.label} type="button" onClick={stat.onClick} className={className}>
            {cell}
          </button>
        ) : (
          <div key={stat.label} className={className}>
            {cell}
          </div>
        );
      })}
    </div>
  );
};
