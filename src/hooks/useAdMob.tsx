import { useEffect, useRef, useCallback } from 'react';

// Configuration AdMob
const ADMOB_CONFIG = {
  APP_ID: 'ca-app-pub-XXXXXXXXXXXXXXX~XXXXXXXXXX',
  INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-XXXXXXXXXXXXXXX/XXXXXXXXXX',
  IS_TESTING: false,
};

// ✅ Détection des IDs placeholder
const isPlaceholderId = (id: string): boolean => {
  return id.includes('XXXXXXX') || id.includes('xxxxx') || id.length < 20;
};

interface AdMobState {
  isInitialized: boolean;
  isAdLoaded: boolean;
  lastAdTime: number;
  actionCount: number;
  sessionStartTime: number;
  lastSessionAdTime: number;
}

export const useAdMob = (userIsPremium: boolean = false) => {
  const stateRef = useRef<AdMobState>({
    isInitialized: false,
    isAdLoaded: false,
    lastAdTime: 0,
    actionCount: 0,
    sessionStartTime: Date.now(),
    lastSessionAdTime: 0,
  });

  // ✅ Vérifier si AdMob peut être initialisé (IDs valides + plateforme native)
  const canInitAdMob = useCallback((): boolean => {
    try {
      // Vérifier les IDs placeholder
      if (isPlaceholderId(ADMOB_CONFIG.APP_ID) || isPlaceholderId(ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID)) {
        console.log('⚠️ AdMob: IDs placeholder détectés, initialisation ignorée');
        return false;
      }

      // Vérifier si on est en mode natif via window.Capacitor (ESM-compatible)
      const cap = (window as any).Capacitor;
      if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('⚠️ AdMob: Erreur vérification:', error);
      return false;
    }
  }, []);

  // Initialisation AdMob
  const initializeAdMob = useCallback(async () => {
    if (stateRef.current.isInitialized || !canInitAdMob()) {
      return;
    }

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      
      await AdMob.initialize({
        testingDevices: ADMOB_CONFIG.IS_TESTING ? ['YOUR_TEST_DEVICE_ID'] : [],
        initializeForTesting: ADMOB_CONFIG.IS_TESTING,
      });

      stateRef.current.isInitialized = true;
      console.log('✅ AdMob initialized successfully');
      
      await loadInterstitialAd();
    } catch (error) {
      console.warn('⚠️ AdMob init failed (non-fatal):', error);
    }
  }, [canInitAdMob]);

  // Chargement d'une interstitielle
  const loadInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!stateRef.current.isInitialized) return false;

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID,
        isTesting: ADMOB_CONFIG.IS_TESTING,
      });

      stateRef.current.isAdLoaded = true;
      console.log('✅ Interstitial ad loaded');
      return true;
    } catch (error) {
      console.warn('⚠️ AdMob load failed:', error);
      stateRef.current.isAdLoaded = false;
      return false;
    }
  }, []);

  // Vérification des conditions d'affichage
  const canShowAd = useCallback((): boolean => {
    if (userIsPremium || !stateRef.current.isAdLoaded) return false;

    const now = Date.now();
    const timeSinceLastAd = now - stateRef.current.lastAdTime;
    const eightMinutesInMs = 8 * 60 * 1000;

    if (stateRef.current.actionCount < 2) return false;
    if (timeSinceLastAd < eightMinutesInMs) return false;

    return true;
  }, [userIsPremium]);

  // Affichage d'une interstitielle
  const showInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!canShowAd()) return false;

    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.showInterstitial();
      
      stateRef.current.lastAdTime = Date.now();
      stateRef.current.actionCount = 0;
      stateRef.current.isAdLoaded = false;
      
      setTimeout(() => loadInterstitialAd(), 1000);
      return true;
    } catch (error) {
      console.warn('⚠️ AdMob show failed:', error);
      return false;
    }
  }, [canShowAd, loadInterstitialAd]);

  const showAdAfterSessionCreation = useCallback(async () => {
    stateRef.current.actionCount++;
    await showInterstitialAd();
  }, [showInterstitialAd]);

  const showAdAfterJoiningSession = useCallback(async () => {
    stateRef.current.actionCount++;
    await showInterstitialAd();
  }, [showInterstitialAd]);

  // Timer de session
  const checkSessionTimer = useCallback(() => {
    if (userIsPremium || !stateRef.current.isInitialized) return;

    const now = Date.now();
    const sessionDuration = now - stateRef.current.sessionStartTime;
    const timeSinceLastSessionAd = now - stateRef.current.lastSessionAdTime;
    const eightMinutesInMs = 8 * 60 * 1000;

    if (sessionDuration >= eightMinutesInMs && timeSinceLastSessionAd >= eightMinutesInMs) {
      stateRef.current.lastSessionAdTime = now;
      if (stateRef.current.isAdLoaded) {
        showInterstitialAd();
      }
    }
  }, [userIsPremium, showInterstitialAd]);

  // Initialisation et listeners
  useEffect(() => {
    if (!canInitAdMob()) return;

    initializeAdMob();

    const sessionTimer = setInterval(checkSessionTimer, 60000);

    const addListeners = async () => {
      try {
        const { AdMob, InterstitialAdPluginEvents } = await import('@capacitor-community/admob');
        
        await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
          stateRef.current.isAdLoaded = true;
        });

        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
          stateRef.current.isAdLoaded = false;
          setTimeout(() => loadInterstitialAd(), 30000);
        });
      } catch (error) {
        console.warn('⚠️ AdMob listeners setup failed:', error);
      }
    };

    addListeners();

    return () => {
      clearInterval(sessionTimer);
    };
  }, [canInitAdMob, initializeAdMob, checkSessionTimer, loadInterstitialAd]);

  return {
    showAdAfterSessionCreation,
    showAdAfterJoiningSession,
  };
};
