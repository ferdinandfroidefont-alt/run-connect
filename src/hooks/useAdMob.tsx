import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  RewardAdPluginEvents,
  type RewardAdOptions,
} from '@capacitor-community/admob';

export type RewardedBoostAdResult = 'completed' | 'cancelled' | 'unavailable';

/**
 * AdMob hook with rewarded ads for session boost.
 * Uses Google test IDs by default until public env IDs are configured.
 */
export const useAdMob = (_userIsPremium: boolean = false) => {
  const showAdAfterSessionCreation = useCallback(async () => {}, []);
  const showAdAfterJoiningSession = useCallback(async () => {}, []);

  const showRewardedBoostAd = useCallback(async (): Promise<RewardedBoostAdResult> => {
    if (!Capacitor.isNativePlatform()) return 'completed';

    const platform = Capacitor.getPlatform();
    const adId =
      platform === 'ios'
        ? (import.meta.env.VITE_ADMOB_REWARDED_IOS_ID as string | undefined) ||
          'ca-app-pub-3940256099942544/1712485313'
        : (import.meta.env.VITE_ADMOB_REWARDED_ANDROID_ID as string | undefined) ||
          'ca-app-pub-3940256099942544/5224354917';

    const options: RewardAdOptions = {
      adId,
      isTesting: !import.meta.env.VITE_ADMOB_REWARDED_ANDROID_ID && !import.meta.env.VITE_ADMOB_REWARDED_IOS_ID,
    };

    try {
      let rewarded = false;

      const rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      });
      const dismissedListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {});

      await AdMob.prepareRewardVideoAd(options);
      await AdMob.showRewardVideoAd();

      await rewardedListener.remove();
      await dismissedListener.remove();

      return rewarded ? 'completed' : 'cancelled';
    } catch (error) {
      console.warn('[AdMob] rewarded unavailable:', error);
      return 'unavailable';
    }
  }, []);

  return {
    showAdAfterSessionCreation,
    showAdAfterJoiningSession,
    showRewardedBoostAd,
  };
};
