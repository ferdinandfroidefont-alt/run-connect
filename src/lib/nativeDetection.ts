import { Capacitor } from '@capacitor/core';

// ✅ DÉTECTION MULTI-PLATEFORME : Android + iOS
export const isReallyNative = (): boolean => {
  // Flag déjà défini par main.tsx
  if ((window as any).CapacitorForceNative === true) {
    return true;
  }
  
  // Détection Capacitor native (fonctionne pour iOS et Android)
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  
  // ✅ Détection AndroidBridge (injecté par MainActivity.java)
  // C'est le critère le plus fiable pour Android WebView
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    console.log('🤖 [NATIVE] AndroidBridge détecté - mode natif confirmé');
    return true;
  }
  
  // ✅ Détection via fcmToken injecté (indicateur Android natif)
  if (typeof (window as any).fcmToken !== 'undefined') {
    console.log('🔔 [NATIVE] fcmToken détecté - mode natif confirmé');
    return true;
  }
  
  return false;
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
};

export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  // Only return true for NATIVE Android (not web viewed on Android browser)
  const isNativeAndroid = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  return isNativeAndroid || hasAndroidBridge;
};

export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  return isReallyNative();
};