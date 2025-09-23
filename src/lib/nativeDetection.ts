import { Capacitor } from '@capacitor/core';

// DÉTECTION NATIVE SIMPLIFIÉE ET ROBUSTE POUR AAB
export const isReallyNative = (): boolean => {
  try {
    // 1. Flag forcé explicite (priorité absolue)
    if ((window as any).CapacitorForceNative === true) {
      console.log('✅ Mode natif forcé détecté');
      return true;
    }

    // 2. Protocoles natifs évidents
    const protocol = window.location.protocol.toLowerCase();
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      console.log('✅ Protocole natif:', protocol);
      return true;
    }

    // 3. Interface Android native
    if ((window as any).AndroidInterface || (window as any).Android) {
      console.log('✅ Interface Android native détectée');
      return true;
    }

    // 4. Capacitor API (simple et direct)
    let capacitorNative = false;
    try {
      capacitorNative = Capacitor.isNativePlatform();
    } catch (error) {
      // Ignore errors, continue with other checks
    }

    // 5. User Agent Android + WebView (spécial AAB)
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidUserAgent = userAgent.includes('android');
    const isWebView = userAgent.includes('wv') || 
                     userAgent.includes('webview') ||
                     (userAgent.includes('version/') && userAgent.includes('chrome'));
    
    // Pour AAB: Android + WebView = probablement natif
    const isAABContext = isAndroidUserAgent && isWebView;

    // 6. Variables d'environnement natives connues
    const hasNativeEnv = !!(window as any).cordova || !!(window as any).device?.platform;

    // RÉSULTAT FINAL
    const isNative = capacitorNative || isAABContext || hasNativeEnv;
    
    console.log('🔍 DÉTECTION NATIVE SIMPLIFIÉE:');
    console.log('- Capacitor.isNativePlatform():', capacitorNative);
    console.log('- Android UserAgent:', isAndroidUserAgent);
    console.log('- WebView détectée:', isWebView);
    console.log('- Contexte AAB:', isAABContext);
    console.log('- 🎯 RÉSULTAT:', isNative);

    return isNative;
    
  } catch (error) {
    console.error('❌ Erreur détection native:', error);
    // Fallback: si Android détecté, assume natif
    return navigator.userAgent.toLowerCase().includes('android');
  }
};

// Version simplifiée de l'attente Capacitor
export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  // Attendre un peu que Capacitor se charge
  await new Promise(resolve => setTimeout(resolve, 300));
  return isReallyNative();
};