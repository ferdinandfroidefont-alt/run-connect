import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProfileMetricsResult = {
  followerCount: number;
  followingCount: number;
  reliabilityRate: number | null;
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
};

export function useProfileMetrics(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-metrics", userId],
    enabled: !!userId,
    staleTime: 25_000,
    queryFn: async (): Promise<ProfileMetricsResult> => {
      const uid = userId!;
      const [{ data: followerData }, { data: followingData }] = await Promise.all([
        supabase.rpc("get_follower_count", { profile_user_id: uid }),
        supabase.rpc("get_following_count", { profile_user_id: uid }),
      ]);

      let reliabilityRate: number | null = null;
      let totalSessionsJoined = 0;
      let totalSessionsCompleted = 0;
      let totalSessionsCreated = 0;

      const { data: statsData } = await supabase
        .from("user_stats")
        .select("reliability_rate, total_sessions_joined, total_sessions_completed")
        .eq("user_id", uid)
        .maybeSingle();

      if (statsData) {
        reliabilityRate = Number(statsData.reliability_rate) || 100;
        totalSessionsJoined = statsData.total_sessions_joined || 0;
        totalSessionsCompleted = statsData.total_sessions_completed || 0;
      } else {
        reliabilityRate = 100;
      }

      const { count: createdCount } = await supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .eq("organizer_id", uid);
      totalSessionsCreated = createdCount || 0;

      return {
        followerCount: typeof followerData === "number" ? followerData : Number(followerData) || 0,
        followingCount: typeof followingData === "number" ? followingData : Number(followingData) || 0,
        reliabilityRate,
        totalSessionsCreated,
        totalSessionsJoined,
        totalSessionsCompleted,
      };
    },
  });
}
