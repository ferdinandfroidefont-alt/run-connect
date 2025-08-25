import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, InterstitialAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';

// Configuration AdMob
const ADMOB_CONFIG = {
  // ID de test pour le développement
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',
  
  // IDs de production (à activer plus tard)
  // APP_ID: 'ca-app-pub-XXXXXXXXXXXXXXX~XXXXXXXXXX',
  // INTERSTITIAL_AD_UNIT_ID: 'ca-app-pub-XXXXXXXXXXXXXXX/XXXXXXXXXX',
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

  // Initialisation AdMob
  const initializeAdMob = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Plateforme web détectée - les pubs ne s\'affichent que sur mobile natif');
      return;
    }
    
    if (stateRef.current.isInitialized) {
      return;
    }

    try {
      await AdMob.initialize({
        testingDevices: ['YOUR_TEST_DEVICE_ID'],
        initializeForTesting: true,
      });

      stateRef.current.isInitialized = true;
      console.log('AdMob initialized successfully');
      
      // Précharger la première interstitielle
      await loadInterstitialAd();
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
    }
  }, []);

  // Chargement d'une interstitielle
  const loadInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !stateRef.current.isInitialized) {
      return false;
    }

    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID,
        isTesting: true, // Mettre à false en production
      });

      stateRef.current.isAdLoaded = true;
      console.log('Interstitial ad loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load interstitial ad:', error);
      stateRef.current.isAdLoaded = false;
      return false;
    }
  }, []);

  // Vérification des conditions d'affichage
  const canShowAd = useCallback((): boolean => {
    if (userIsPremium) {
      console.log('AdMob: User is premium, skipping ad');
      return false;
    }

    if (!stateRef.current.isAdLoaded) {
      console.log('AdMob: Ad not loaded, skipping');
      return false;
    }

    const now = Date.now();
    const timeSinceLastAd = now - stateRef.current.lastAdTime;
    const eightMinutesInMs = 8 * 60 * 1000;

    // Vérifier le cap de fréquence: minimum 2 actions ET 8 minutes
    if (stateRef.current.actionCount < 2) {
      console.log('AdMob: Not enough actions (need 2, have', stateRef.current.actionCount, ')');
      return false;
    }

    if (timeSinceLastAd < eightMinutesInMs) {
      console.log('AdMob: Too soon since last ad (need 8min, been', Math.round(timeSinceLastAd / 60000), 'min)');
      return false;
    }

    return true;
  }, [userIsPremium]);

  // Affichage d'une interstitielle
  const showInterstitialAd = useCallback(async (): Promise<boolean> => {
    if (!canShowAd()) {
      return false;
    }

    try {
      await AdMob.showInterstitial();
      
      // Réinitialiser les compteurs après affichage
      stateRef.current.lastAdTime = Date.now();
      stateRef.current.actionCount = 0;
      stateRef.current.isAdLoaded = false;
      
      console.log('Interstitial ad shown successfully');
      
      // Précharger la prochaine interstitielle
      setTimeout(() => loadInterstitialAd(), 1000);
      
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }, [canShowAd, loadInterstitialAd]);

  // Affichage après création de séance
  const showAdAfterSessionCreation = useCallback(async () => {
    console.log('AdMob: Session created, checking ad conditions');
    stateRef.current.actionCount++;
    await showInterstitialAd();
  }, [showInterstitialAd]);

  // Affichage après avoir rejoint une séance
  const showAdAfterJoiningSession = useCallback(async () => {
    console.log('AdMob: Joined session, checking ad conditions');
    stateRef.current.actionCount++;
    await showInterstitialAd();
  }, [showInterstitialAd]);

  // Timer de session (8 minutes)
  const checkSessionTimer = useCallback(() => {
    if (userIsPremium) return;

    const now = Date.now();
    const sessionDuration = now - stateRef.current.sessionStartTime;
    const timeSinceLastSessionAd = now - stateRef.current.lastSessionAdTime;
    const eightMinutesInMs = 8 * 60 * 1000;

    // Si 8 minutes se sont écoulées depuis le début de la session
    // ET 8 minutes depuis la dernière pub de session
    if (sessionDuration >= eightMinutesInMs && timeSinceLastSessionAd >= eightMinutesInMs) {
      console.log('AdMob: 8 minutes session timer reached');
      stateRef.current.lastSessionAdTime = now;
      
      // Ne pas compter comme une action pour le timer de session
      if (stateRef.current.isAdLoaded) {
        showInterstitialAd();
      }
    }
  }, [userIsPremium, showInterstitialAd]);

  // Initialisation et listeners
  useEffect(() => {
    initializeAdMob();

    // Timer de vérification toutes les minutes
    const sessionTimer = setInterval(checkSessionTimer, 60000);

    // Listeners pour les événements AdMob
    const addListeners = async () => {
      if (Capacitor.isNativePlatform()) {
        await AdMob.addListener(InterstitialAdPluginEvents.Loaded, (info: AdLoadInfo) => {
          console.log('Interstitial ad loaded:', info);
          stateRef.current.isAdLoaded = true;
        });

        await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (info) => {
          console.error('Interstitial ad failed to load:', info);
          stateRef.current.isAdLoaded = false;
          // Réessayer de charger après 30 secondes
          setTimeout(() => loadInterstitialAd(), 30000);
        });
      }
    };

    addListeners();

    return () => {
      clearInterval(sessionTimer);
      // Les listeners seront automatiquement nettoyés
    };
  }, [initializeAdMob, checkSessionTimer, loadInterstitialAd]);

  return {
    showAdAfterSessionCreation,
    showAdAfterJoiningSession,
  };
};