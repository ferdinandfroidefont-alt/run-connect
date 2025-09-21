import { Capacitor } from '@capacitor/core';

export const isReallyNative = (): boolean => {
  // Vérifier le flag forcé d'abord
  if ((window as any).CapacitorForceNative) {
    console.log('🔍 Mode natif forcé détecté');
    return true;
  }

  // Vérifications multiples pour AAB
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidApp = userAgent.includes('android') && !userAgent.includes('chrome');
  const isCapacitorNative = !!(window as any).Capacitor && Capacitor.isNativePlatform();
  const hasNativePlugins = !!(window as any).CapacitorPlugins;
  const isFileProtocol = document.URL.startsWith('file://');
  const isCapacitorProtocol = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
  
  const result = isAndroidApp || isCapacitorNative || hasNativePlugins || isFileProtocol || isCapacitorProtocol;
  
  console.log('🔍 Détection native complète:');
  console.log('- UserAgent Android sans Chrome:', isAndroidApp);
  console.log('- Capacitor Native:', isCapacitorNative);
  console.log('- Plugins natifs:', hasNativePlugins);
  console.log('- Protocole file://:', isFileProtocol);
  console.log('- Protocole Capacitor/Ionic:', isCapacitorProtocol);
  console.log('- Résultat final:', result);
  
  return result;
};