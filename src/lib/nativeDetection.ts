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
  return Capacitor.getPlatform() === 'android' || 
         !!(window as any).AndroidBridge ||
         (navigator.userAgent.includes('Android') && navigator.userAgent.includes('wv'));
};

export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  return isReallyNative();
};