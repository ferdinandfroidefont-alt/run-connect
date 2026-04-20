import { Capacitor } from '@capacitor/core';

// Helper: detect iOS WKWebView via User-Agent
const isIOSWebView = (): boolean => {
  const ua = navigator.userAgent;
  // Must be an Apple device
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  // Must have AppleWebKit (all iOS browsers/webviews do)
  if (!/AppleWebKit/i.test(ua)) return false;
  // Exclude known iOS browsers: regular Safari, Chrome iOS, Firefox iOS, Edge iOS, Opera iOS
  // Regular Safari has "Safari/" AND "Version/" in UA
  // WKWebView typically has NO "Safari/" token at all, or has it without "Version/"
  const isRegularSafari = /Safari\//.test(ua) && /Version\//.test(ua);
  const isKnownBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if (isRegularSafari || isKnownBrowser) return false;
  // If we get here: Apple device + AppleWebKit but NOT a known browser → WKWebView
  return true;
};

// Helper: detect Android WebView via User-Agent
const isAndroidWebView = (): boolean => {
  const ua = navigator.userAgent;
  // "wv" flag is set by Android WebView
  if (/Android/i.test(ua) && /wv/.test(ua)) return true;
  // RunConnect custom UA marker
  if (/RunConnect/i.test(ua) && /Android/i.test(ua)) return true;
  return false;
};

// Check protocol-based detection (capacitor://, file://, ionic://)
const isNativeProtocol = (): boolean => {
  try {
    const protocol = window.location.protocol;
    return protocol === 'capacitor:' || protocol === 'file:' || protocol === 'ionic:' || protocol === 'runconnect:';
  } catch {
    return false;
  }
};

// Check for WebKit message handlers (iOS native bridge)
const hasWebKitBridge = (): boolean => {
  try {
    return !!(window as any).webkit?.messageHandlers;
  } catch {
    return false;
  }
};

// ✅ DÉTECTION MULTI-PLATEFORME : Android + iOS
export const isReallyNative = (): boolean => {
  // Flag déjà défini par main.tsx
  if ((window as any).CapacitorForceNative === true) return true;
  
  // Détection Capacitor native
  if (Capacitor.isNativePlatform()) return true;
  
  // ✅ Custom UA marker (RunConnect-iOS or RunConnect)
  if (/RunConnect/i.test(navigator.userAgent)) return true;
  
  // ✅ Native protocol (capacitor://, file://, ionic://)
  if (isNativeProtocol()) return true;
  
  // ✅ AndroidBridge (injecté par MainActivity.java)
  if (typeof (window as any).AndroidBridge !== 'undefined') return true;
  
  // ✅ fcmToken injecté (indicateur Android natif)
  if (typeof (window as any).fcmToken !== 'undefined') return true;

  // ✅ iOS standalone mode (home screen app)
  if ((navigator as any).standalone === true) return true;

  // ✅ iOS WebKit bridge
  if (hasWebKitBridge()) return true;

  // ✅ iOS WKWebView detection via UA
  if (isIOSWebView()) return true;

  // ✅ Android WebView detection via UA
  if (isAndroidWebView()) return true;
  
  return false;
};

export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  
  const ua = navigator.userAgent;
  
  // Custom UA markers first
  if (/RunConnect-iOS/i.test(ua)) return 'ios';
  if (/RunConnect/i.test(ua) && /Android/i.test(ua)) return 'android';
  
  // UA-based fallback when Capacitor reports 'web'
  if (/iPhone|iPad|iPod/i.test(ua)) {
    // Only return 'ios' if we're actually in a native context
    if (isIOSWebView() || (navigator as any).standalone === true || isNativeProtocol() || hasWebKitBridge()) {
      return 'ios';
    }
  }
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
