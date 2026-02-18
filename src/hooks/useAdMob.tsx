import { useCallback } from 'react';

/**
 * AdMob hook - currently disabled (placeholder IDs, native SDK removed).
 * Re-add @capacitor-community/admob and set real IDs to enable.
 */
export const useAdMob = (_userIsPremium: boolean = false) => {
  const showAdAfterSessionCreation = useCallback(async () => {}, []);
  const showAdAfterJoiningSession = useCallback(async () => {}, []);

  return {
    showAdAfterSessionCreation,
    showAdAfterJoiningSession,
  };
};
