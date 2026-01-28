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
  // Only return true for NATIVE Android (not web viewed on Android browser)
  const isNativeAndroid = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  return isNativeAndroid || hasAndroidBridge;
};

export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  return isReallyNative();
};