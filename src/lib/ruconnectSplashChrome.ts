import { Capacitor } from '@capacitor/core';
import {
  applyIosStatusBarForTheme,
  applyWebChromeForTheme,
  getPreferredDarkFromStorage,
} from '@/lib/iosStatusBarTheme';
import { RunConnectSplashChrome } from '@/plugins/runConnectSplashChrome';

/**
 * Splash RunConnect : même bleu Action (#0066CC) que le Launch Screen iOS natif.
 * À garder aligné avec `capacitor.config.ts` (ios.backgroundColor) et `index.html` (body initial).
 */
export const RUCONNECT_SPLASH_BACKGROUND = '#0066CC';
export const RUCONNECT_SPLASH_PRIMARY = '#0066CC';

/** Icône seule (cartes de chargement, fallback boot, etc.). */
export const RUCONNECT_SPLASH_ICON_URL = '/brand/runconnect-splash-icon.png';

/** Boucle vidéo plein écran (`LoadingScreen` : `<video>` autoplay + `playsInline` iOS). */
export const RUCONNECT_LOADING_SCREEN_MP4_URL = '/brand/runconnect-loading.mp4';
/** Image fixe si la vidéo est absente ou en erreur — JPEG attendu. */
export const RUCONNECT_LOADING_SCREEN_FALLBACK_URL = '/brand/runconnect-loading-splash.jpg';
/** GIF optionnel (non utilisé par défaut ; conserver pour tests / assets alternatifs). */
export const RUCONNECT_LOADING_SCREEN_GIF_URL = '/brand/runconnect-loading-splash.gif';

/** URL « principale » du splash (vidéo). */
export const RUCONNECT_LOADING_SCREEN_URL = RUCONNECT_LOADING_SCREEN_MP4_URL;

/** Chrome web (Safari / in-app) pendant le splash */
export function applyRuconnectSplashWebChrome(): void {
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById('root');
  root.style.backgroundColor = RUCONNECT_SPLASH_BACKGROUND;
  body.style.backgroundColor = RUCONNECT_SPLASH_BACKGROUND;
  if (appRoot) appRoot.style.backgroundColor = RUCONNECT_SPLASH_BACKGROUND;

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
    await StatusBar.hide({ animation: 'NONE' });
  } catch {
    /* Web ou plugin indisponible */
  }
}

/** Restaure le chrome après splash / écran d’attente bleu */
export async function restoreChromeAfterRuconnectSplash(): Promise<void> {
  const appRoot = document.getElementById('root');
  if (appRoot) appRoot.style.removeProperty('background-color');
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
