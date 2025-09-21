import { Capacitor } from '@capacitor/core';

// DÉTECTION NATIVE ULTRA ROBUSTE POUR AAB/GOOGLE PLAY
export const isReallyNative = (): boolean => {
  try {
    // 🎯 PRIORITÉ 1: Flag forcé explicite
    if ((window as any).CapacitorForceNative === true) {
      console.log('🔍✅ Mode natif forcé détecté');
      return true;
    }

    // 🎯 PRIORITÉ 2: Protocoles natifs
    const url = window.location.href.toLowerCase();
    const protocol = window.location.protocol.toLowerCase();
    
    if (protocol === 'capacitor:' || 
        protocol === 'ionic:' || 
        protocol === 'file:' ||
        url.startsWith('capacitor://') ||
        url.startsWith('ionic://') ||
        document.URL.startsWith('file://')) {
      console.log('🔍✅ Protocole natif détecté:', protocol);
      return true;
    }

    // 🎯 PRIORITÉ 3: Interface Android native
    if ((window as any).AndroidInterface || 
        (window as any).Android || 
        (window as any).webkit?.messageHandlers) {
      console.log('🔍✅ Interface native détectée');
      return true;
    }

    // 🎯 PRIORITÉ 4: Capacitor plugins natifs
    const hasCapacitorPlugins = !!(window as any).CapacitorPlugins || 
                               !!(window as any).Capacitor?.PluginRegistry;
    if (hasCapacitorPlugins) {
      console.log('🔍✅ Plugins Capacitor natifs détectés');
      return true;
    }

    // 🎯 PRIORITÉ 5: Capacitor API native
    let capacitorNative = false;
    try {
      if ((window as any).Capacitor && typeof Capacitor.isNativePlatform === 'function') {
        capacitorNative = Capacitor.isNativePlatform();
      }
    } catch (error) {
      console.log('🔍 Erreur Capacitor.isNativePlatform:', error);
    }

    // 🎯 PRIORITÉ 6: User Agent Analysis (spécial AAB)
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidUserAgent = userAgent.includes('android');
    const hasChrome = userAgent.includes('chrome');
    const isWebView = userAgent.includes('wv') || userAgent.includes('webview');
    
    // Pour AAB: Android + WebView + (pas Chrome standard OR Chrome dans WebView)
    const isAABContext = isAndroidUserAgent && (isWebView || !hasChrome || 
                        userAgent.includes('version/') && hasChrome);

    // 🎯 PRIORITÉ 7: Variables d'environnement natives
    const hasNativeEnv = !!(window as any).cordova || 
                        !!(window as any).PhoneGap || 
                        !!(window as any).phonegap ||
                        !!(window as any).device?.platform;

    // 🎯 ANALYSE FINALE
    const isNative = capacitorNative || isAABContext || hasNativeEnv;
    
    console.log('🔍 ANALYSE COMPLÈTE DÉTECTION NATIVE:');
    console.log('- Protocole:', protocol);
    console.log('- URL:', url);
    console.log('- AndroidInterface:', !!(window as any).AndroidInterface);
    console.log('- CapacitorPlugins:', hasCapacitorPlugins);
    console.log('- Capacitor.isNativePlatform():', capacitorNative);
    console.log('- UserAgent Android:', isAndroidUserAgent);
    console.log('- UserAgent Chrome:', hasChrome);
    console.log('- UserAgent WebView:', isWebView);
    console.log('- Contexte AAB probable:', isAABContext);
    console.log('- Env natives (Cordova etc):', hasNativeEnv);
    console.log('- 🎯 RÉSULTAT FINAL NATIF:', isNative);

    return isNative;
    
  } catch (error) {
    console.error('🔍❌ Erreur détection native:', error);
    // En cas d'erreur, assume qu'on est natif si Android détecté
    const fallback = navigator.userAgent.toLowerCase().includes('android');
    console.log('🔍 Fallback Android:', fallback);
    return fallback;
  }
};

// ATTENDRE QUE CAPACITOR SOIT PRÊT AVANT DÉTECTION
export const waitForCapacitorAndDetect = async (maxWait: number = 3000): Promise<boolean> => {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = maxWait / 100;
    
    const checkCapacitor = () => {
      attempts++;
      
      // Vérifier si Capacitor est disponible
      const capacitorReady = !!(window as any).Capacitor;
      
      if (capacitorReady || attempts >= maxAttempts) {
        const isNative = isReallyNative();
        console.log(`🔍 Détection après ${attempts} tentatives:`, isNative);
        resolve(isNative);
      } else {
        setTimeout(checkCapacitor, 100);
      }
    };
    
    checkCapacitor();
  });
};