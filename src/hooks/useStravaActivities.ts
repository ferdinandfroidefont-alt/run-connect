import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StravaActivityItem = {
  id: number;
  name: string;
  sportType: string;
  startDate: string;
  distanceM: number;
  movingTimeSec: number;
  startLat?: number;
  startLng?: number;
  polyline?: string;
};

export function useStravaActivities(enabled: boolean) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<StravaActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !user) return;
    setLoading(true);
    setUpstreamError(null);
    try {
      const { data, error } = await supabase.functions.invoke("strava-recent-activities", {
        body: { afterDays: 45 },
      });
      if (error) {
        setUpstreamError(error.message);
        setActivities([]);
        return;
      }
      if (data?.error === "Strava not connected") {
        setStravaConnected(false);
        setActivities([]);
        return;
      }
      if (data?.error === "Strava API error") {
        setStravaConnected(true);
        setUpstreamError(data?.detail === "token_expired" ? "token_expired" : "strava_api");
        setActivities([]);
        return;
      }
      setStravaConnected(true);
      setActivities((data?.activities as StravaActivityItem[]) || []);
    } catch {
      setUpstreamError("fetch_failed");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, user]);

  useEffect(() => {
    if (enabled && user) void refetch();
  }, [enabled, user, refetch]);

  return { activities, loading, refetch, stravaConnected, upstreamError };
}
