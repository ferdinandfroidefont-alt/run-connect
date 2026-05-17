import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { computePremiumDaysEarned } from "@/lib/referralProgram";

export type ReferralHistoryEntry = {
  referred_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type ReferralProgramData = {
  referralCode: string;
  invitedCount: number;
  daysEarned: number;
  history: ReferralHistoryEntry[];
};

export function useReferralProgram() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReferralProgramData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: statsRows, error: statsError }, { data: historyRows, error: historyError }, { data: profile, error: profileError }] =
        await Promise.all([
          supabase.rpc("get_referral_stats", { user_id_param: user.id }),
          supabase.rpc("get_referral_history", { user_id_param: user.id }),
          supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
        ]);

      if (statsError) throw statsError;
      if (historyError) throw historyError;
      if (profileError) throw profileError;

      const stats = statsRows?.[0];
      const invitedCount = Number(stats?.total_referrals ?? 0);
      const referralCode = (stats?.referral_code || profile?.referral_code || "").toUpperCase();

      setData({
        referralCode,
        invitedCount,
        daysEarned: Number(stats?.total_rewards ?? computePremiumDaysEarned(invitedCount)),
        history: (historyRows ?? []) as ReferralHistoryEntry[],
      });
    } catch (e) {
      console.error("useReferralProgram load error:", e);
      setError("Impossible de charger le parrainage.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { loading, data, error, reload: load };
}
