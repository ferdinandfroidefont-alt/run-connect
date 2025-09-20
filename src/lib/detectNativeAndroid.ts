import { Capacitor } from '@capacitor/core';

/**
 * Détecte de manière fiable si on est sur Android natif, même dans l'AAB Play Store
 * où Capacitor peut incorrectement détecter la plateforme comme "web"
 */
export const detectNativeAndroid = (): boolean => {
  try {
    console.log('🔍🔍🔍 DÉTECTION NATIVE ANDROID - MÉTHODES ULTRA-ROBUSTES');
    
    // Méthode 0: Vérifier le mode Force Android
    const forceAndroidMode = !!(window as any).ForceAndroidMode;
    const urlParams = new URLSearchParams(window.location.search);
    const forceViaURL = urlParams.has('forceAndroid') || urlParams.has('test');
    
    console.log('🔍 - Force Android Mode (global):', forceAndroidMode);
    console.log('🔍 - Force Android Mode (URL):', forceViaURL);
    
    if (forceAndroidMode || forceViaURL) {
      console.log('🔥✅ ANDROID FORCÉ - BYPASS COMPLET DE LA DÉTECTION');
      return true;
    }
    
    // Méthode 1: Vérifier si le fix AAB a été appliqué
    const aabFixed = !!(window as any).CapacitorAABFixed;
    const capacitorMode = (window as any).CapacitorMode;
    const capacitorIsNative = !!(window as any).CapacitorIsNative;
    
    console.log('🔍 - Fix AAB appliqué:', aabFixed);
    console.log('🔍 - CapacitorMode:', capacitorMode);
    console.log('🔍 - CapacitorIsNative:', capacitorIsNative);
    
    if (aabFixed && capacitorMode === 'android' && capacitorIsNative) {
      console.log('✅ Android natif détecté via fix AAB');
      return true;
    }
    
    // Méthode 2: Vérifier si Capacitor existe et dit qu'on est natif
    const capacitorExists = !!(window as any).Capacitor;
    
    if (capacitorExists) {
      // Essayer les méthodes de Capacitor (peuvent être overridées par le fix AAB)
      const platform = Capacitor.getPlatform?.();
      const isNative = Capacitor.isNativePlatform?.();
      
      console.log('🔍 - Capacitor exists:', capacitorExists);
      console.log('🔍 - getPlatform():', platform);
      console.log('🔍 - isNativePlatform():', isNative);
      
      // Si Capacitor dit qu'on est Android ou natif, on fait confiance
      if (platform === 'android' || isNative === true) {
        console.log('✅ Android natif détecté via Capacitor');
        return true;
      }
    }
    
    // Méthode 3: Analyse ULTRA-DÉTAILLÉE du User Agent et environnement
    const userAgent = navigator.userAgent || '';
    const isAndroidUA = /Android/i.test(userAgent);
    const isWebView = /wv\)|Version\/[\d.]+.*Chrome/i.test(userAgent);
    const hasAndroidSpecificAPIs = !!(window as any).Android || !!(window as any).webkit;
    const hasCapacitorPlugins = !!(window as any).CapacitorPlugin || capacitorExists;
    
    // Méthodes spécifiques AAB Play Store
    const isPlayStoreWebView = userAgent.includes('Chrome') && userAgent.includes('Android') && !userAgent.includes('Safari');
    const hasCapacitorBridge = !!(window as any).CapacitorWebView || !!(window as any).capacitorExports;
    const isInAppBrowser = /InApp|FB_IAB|FBAN|FBAV/i.test(userAgent);
    
    // Détection des plugins Capacitor disponibles
    const hasGeolocationPlugin = !!(window as any).CapacitorGeolocation;
    const hasCameraPlugin = !!(window as any).CapacitorCamera;
    const hasNotificationPlugin = !!(window as any).CapacitorPushNotifications;
    
    console.log('🔍 - User Agent Android:', isAndroidUA);
    console.log('🔍 - WebView detected:', isWebView);
    console.log('🔍 - Android APIs:', hasAndroidSpecificAPIs);
    console.log('🔍 - Capacitor plugins:', hasCapacitorPlugins);
    console.log('🔍 - Play Store WebView:', isPlayStoreWebView);
    console.log('🔍 - Capacitor Bridge:', hasCapacitorBridge);
    console.log('🔍 - In-App Browser:', isInAppBrowser);
    console.log('🔍 - Geolocation Plugin:', hasGeolocationPlugin);
    console.log('🔍 - Camera Plugin:', hasCameraPlugin);
    console.log('🔍 - Notification Plugin:', hasNotificationPlugin);
    console.log('🔍 - User Agent complet:', userAgent);
    
    // Critères AAB ULTRA-ROBUSTES
    const criteriaAndroidUA = isAndroidUA;
    const criteriaNativeEnvironment = isWebView || hasAndroidSpecificAPIs || hasCapacitorPlugins || hasCapacitorBridge;
    const criteriaPluginsAvailable = hasGeolocationPlugin || hasCameraPlugin || hasNotificationPlugin;
    const criteriaPlayStore = isPlayStoreWebView && !isInAppBrowser;
    
    // Si on a Android UA + (environnement natif OU plugins OU Play Store), c'est natif
    const isNativeAndroid = criteriaAndroidUA && (criteriaNativeEnvironment || criteriaPluginsAvailable || criteriaPlayStore);
    
    console.log('🔍 - Critère Android UA:', criteriaAndroidUA);
    console.log('🔍 - Critère Environnement Natif:', criteriaNativeEnvironment);
    console.log('🔍 - Critère Plugins Disponibles:', criteriaPluginsAvailable);
    console.log('🔍 - Critère Play Store:', criteriaPlayStore);
    console.log('🎯🎯🎯 RÉSULTAT FINAL Android natif:', isNativeAndroid);
    
    return isNativeAndroid;
    
  } catch (error) {
    console.error('❌ Erreur détection Android:', error);
    // En cas d'erreur, vérifier au moins si on force le mode
    const forceMode = !!(window as any).ForceAndroidMode || new URLSearchParams(window.location.search).has('forceAndroid');
    console.log('❌ Fallback sur force mode:', forceMode);
    return forceMode;
  }
};

/**
 * Attend que Capacitor soit prêt avant de faire la détection
 */
export const waitForCapacitorAndDetect = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const check = () => {
      const result = detectNativeAndroid();
      resolve(result);
    };
    
    // Si Capacitor existe déjà, vérifier immédiatement
    if ((window as any).Capacitor) {
      check();
    } else {
      // Sinon, attendre un petit peu et vérifier
      setTimeout(check, 100);
    }
  });
};