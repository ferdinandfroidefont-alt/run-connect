import { Capacitor } from '@capacitor/core';

// Helper: detect iOS WKWebView via User-Agent
const isIOSWebView = (): boolean => {
  const ua = navigator.userAgent;
  // iPhone/iPad present BUT no "Safari/" token → WKWebView (not regular Safari browser)
  const isAppleDevice = /iPhone|iPad|iPod/i.test(ua);
  if (!isAppleDevice) return false;
  // Regular Safari includes "Safari/" in UA; WKWebView does not
  const hasSafariToken = /Safari\//.test(ua);
  const isChromeOrFirefox = /CriOS|FxiOS/.test(ua);
  return !hasSafariToken || isChromeOrFirefox;
};

// Helper: detect Android WebView via User-Agent
const isAndroidWebView = (): boolean => {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /wv/.test(ua);
};

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
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    return true;
  }
  
  // ✅ Détection via fcmToken injecté (indicateur Android natif)
  if (typeof (window as any).fcmToken !== 'undefined') {
    return true;
  }

  // ✅ iOS standalone mode (home screen app)
  if ((navigator as any).standalone === true) {
    return true;
  }

  // ✅ iOS WKWebView detection via UA
  if (isIOSWebView()) {
    return true;
  }

  // ✅ Android WebView detection via UA ("wv" flag)
  if (isAndroidWebView()) {
    return true;
  }
  
  return false;
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  
  // UA-based fallback when Capacitor reports 'web'
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  if (isAndroidWebView()) return 'android';
  
  return 'web';
};

export const isIOS = (): boolean => {
  return getPlatform() === 'ios';
};

export const isAndroid = (): boolean => {
  const isNativeAndroid = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
  const hasAndroidBridge = !!(window as any).AndroidBridge;
  return isNativeAndroid || hasAndroidBridge || isAndroidWebView();
};

export const waitForCapacitorAndDetect = async (maxWait: number = 2000): Promise<boolean> => {
  return isReallyNative();
};