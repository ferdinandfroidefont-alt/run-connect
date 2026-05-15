import { Capacitor } from '@capacitor/core';
import {
  applyIosStatusBarForTheme,
  applyWebChromeForTheme,
  getPreferredDarkFromStorage,
} from '@/lib/iosStatusBarTheme';
import { RunConnectSplashChrome } from '@/plugins/runConnectSplashChrome';

/** Dégradé plein écran — maquette splash (19), avant React. */
export const RUCONNECT_SPLASH_GRADIENT =
  'linear-gradient(180deg, #1B6FE6 0%, #2D81F0 50%, #4090F5 100%)';

/**
 * Couleur de secours / theme-color pendant le splash (dominante du dégradé).
 */
export const RUCONNECT_SPLASH_BACKGROUND = '#1B6FE6';
export const RUCONNECT_SPLASH_PRIMARY = '#2D81F0';

/** Icône seule (cartes de chargement, fallback boot, etc.). */
export const RUCONNECT_SPLASH_ICON_URL = '/brand/runconnect-splash-icon.png';

/** Legacy : ancienne boucle vidéo splash (non utilisée par `LoadingScreen`). */
export const RUCONNECT_LOADING_SCREEN_MP4_URL = '/brand/runconnect-loading.mp4';
/** SVG vectoriel (secours marketing / anciens écrans). */
export const RUCONNECT_LOADING_SCREEN_FALLBACK_URL = '/brand/runconnect-loading-splash.svg';
/** GIF optionnel (tests / assets alternatifs). */
export const RUCONNECT_LOADING_SCREEN_GIF_URL = '/brand/runconnect-loading-splash.gif';

/** Photo plein écran pendant la préparation du tunnel d’arrivée (`Onboarding`). */
export const RUCONNECT_ONBOARDING_ARRIVAL_BG_URL = '/brand/onboarding-arrival-bg.png';

/** URL legacy (vidéo). */
export const RUCONNECT_LOADING_SCREEN_URL = RUCONNECT_LOADING_SCREEN_MP4_URL;

export const RUCONNECT_LOADING_SCREEN_BACKGROUND_STYLE = RUCONNECT_SPLASH_GRADIENT;

/** Chrome web (Safari / in-app) pendant le splash */
export function applyRuconnectSplashWebChrome(): void {
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById('root');
  root.style.background = RUCONNECT_LOADING_SCREEN_BACKGROUND_STYLE;
  body.style.background = RUCONNECT_LOADING_SCREEN_BACKGROUND_STYLE;
  if (appRoot) appRoot.style.background = RUCONNECT_LOADING_SCREEN_BACKGROUND_STYLE;

  const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (metaTheme) metaTheme.setAttribute('content', RUCONNECT_SPLASH_BACKGROUND);

  const metaApple = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  ) as HTMLMetaElement | null;
  if (metaApple) metaApple.setAttribute('content', 'black-translucent');
}

/**
 * Barre d’état et insets natifs pendant le splash :
 * - Home indicator masqué côté iOS (`RunConnectBridgeViewController`) tant que le splash plein écran est affiché.
 * - StatusBar masquée (`hide`) pour coller au rendu edge-to-edge ; rétablie dans `restoreChromeAfterRuconnectSplash`.
 */
export async function applyRuconnectSplashNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (Capacitor.getPlatform() === 'ios') {
      await RunConnectSplashChrome.setLoadingPresentationActive({ active: true });
    }
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.hide();
  } catch {
    /* Web ou plugin indisponible */
  }
}

/** Restaure le chrome après splash / écran d’attente */
export async function restoreChromeAfterRuconnectSplash(): Promise<void> {
  document.documentElement.style.removeProperty('background');
  document.body.style.removeProperty('background');
  const appRoot = document.getElementById('root');
  if (appRoot) appRoot.style.removeProperty('background');
  const isDark = getPreferredDarkFromStorage();
  applyWebChromeForTheme(isDark);
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'ios') {
      try {
        await RunConnectSplashChrome.setLoadingPresentationActive({ active: false });
      } catch {
        /* ignore */
      }
    }
    await applyIosStatusBarForTheme(isDark);
  }
}
