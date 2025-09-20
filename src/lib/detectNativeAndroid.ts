import { Capacitor } from '@capacitor/core';

/**
 * Détecte de manière fiable si on est sur Android natif, même dans l'AAB Play Store
 * où Capacitor peut incorrectement détecter la plateforme comme "web"
 */
export const detectNativeAndroid = (): boolean => {
  try {
    // Méthode 1: Vérifier si Capacitor existe et dit qu'on est natif
    const capacitorExists = !!(window as any).Capacitor;
    
    if (capacitorExists) {
      // Essayer les méthodes de Capacitor (peuvent être overridées par le fix AAB)
      const platform = Capacitor.getPlatform?.();
      const isNative = Capacitor.isNativePlatform?.();
      
      console.log('🔍 Détection native Android:');
      console.log('- Capacitor exists:', capacitorExists);
      console.log('- getPlatform():', platform);
      console.log('- isNativePlatform():', isNative);
      
      // Si Capacitor dit qu'on est Android ou natif, on fait confiance
      if (platform === 'android' || isNative === true) {
        console.log('✅ Android natif détecté via Capacitor');
        return true;
      }
    }
    
    // Méthode 2: Vérifier le User Agent (fallback AAB)
    const userAgent = navigator.userAgent || '';
    const isAndroidUA = /Android/i.test(userAgent);
    const isWebView = /wv\)|Version\/[\d.]+.*Chrome/i.test(userAgent);
    const hasAndroidSpecificAPIs = !!(window as any).Android || !!(window as any).webkit;
    
    console.log('- User Agent Android:', isAndroidUA);
    console.log('- WebView detected:', isWebView);
    console.log('- Android APIs:', hasAndroidSpecificAPIs);
    
    // Si on a un UA Android et qu'on semble être dans une WebView native
    const isNativeAndroid = isAndroidUA && (isWebView || hasAndroidSpecificAPIs || capacitorExists);
    
    console.log('🎯 Résultat final Android natif:', isNativeAndroid);
    return isNativeAndroid;
    
  } catch (error) {
    console.error('❌ Erreur détection Android:', error);
    // En cas d'erreur, assumer qu'on est sur web
    return false;
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