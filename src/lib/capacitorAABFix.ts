import { Capacitor } from '@capacitor/core';

// FIX CRITIQUE pour AAB Play Store
export const forceCapacitorAndroidDetection = () => {
  console.log('🔥 FORCE CAPACITOR ANDROID DETECTION');
  
  const platform = Capacitor.getPlatform();
  const userAgent = navigator.userAgent.toLowerCase();
  const isAndroidUA = userAgent.includes('android');
  
  console.log('🔥 - Platform détectée:', platform);
  console.log('🔥 - UserAgent Android:', isAndroidUA);
  console.log('🔥 - Est Native:', Capacitor.isNativePlatform());
  console.log('🔥 - Capacitor disponible:', !!(window as any).Capacitor);
  
  // Si Capacitor détecte "web" mais on est sur Android (AAB Play Store bug)
  if (platform === 'web' && isAndroidUA && (window as any).Capacitor) {
    console.log('🚨 DÉTECTION AAB BUG - FORCE ANDROID MODE');
    
    // Override la méthode getPlatform
    const originalGetPlatform = Capacitor.getPlatform;
    Capacitor.getPlatform = () => {
      console.log('🔥 OVERRIDE: getPlatform() retourne "android" au lieu de "web"');
      return 'android';
    };
    
    // Override isNativePlatform
    const originalIsNative = Capacitor.isNativePlatform;
    Capacitor.isNativePlatform = () => {
      console.log('🔥 OVERRIDE: isNativePlatform() retourne true au lieu de false');
      return true;
    };
    
    // Force le mode natif dans l'objet global
    (window as any).CapacitorMode = 'android';
    (window as any).CapacitorIsNative = true;
    (window as any).CapacitorAABFixed = true; // Marque que le fix AAB a été appliqué
    
    console.log('✅ CAPACITOR ANDROID MODE FORCÉ');
    return true;
  }
  
  return false;
};

// Auto-exécution au chargement
export const initCapacitorFix = () => {
  // Attendre que Capacitor soit chargé
  const checkCapacitor = () => {
    if ((window as any).Capacitor) {
      console.log('🔥 Capacitor détecté, application du fix...');
      forceCapacitorAndroidDetection();
    } else {
      console.log('🔥 Capacitor pas encore chargé, retry dans 100ms...');
      setTimeout(checkCapacitor, 100);
    }
  };
  
  checkCapacitor();
};