import { useCallback } from 'react';

export type RewardedBoostAdResult = 'completed' | 'cancelled' | 'unavailable';

/**
 * AdMob hook - currently disabled (placeholder IDs, native SDK removed).
 * Re-add @capacitor-community/admob and set real IDs to enable.
 */
export const useAdMob = (_userIsPremium: boolean = false) => {
  const showAdAfterSessionCreation = useCallback(async () => {}, []);
  const showAdAfterJoiningSession = useCallback(async () => {}, []);
  const showRewardedBoostAd = useCallback(async (): Promise<RewardedBoostAdResult> => {
    // Phase 1: no native SDK yet. Keep a stable contract for Android/iOS integration.
    return 'completed';
  }, []);

  return {
    showAdAfterSessionCreation,
    showAdAfterJoiningSession,
    showRewardedBoostAd,
  };
};
