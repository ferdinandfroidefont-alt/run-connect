import { Capacitor } from '@capacitor/core';
import {
  applyIosStatusBarForTheme,
  applyWebChromeForTheme,
  getPreferredDarkFromStorage,
} from '@/lib/iosStatusBarTheme';

/**
 * Écran splash Ruconnect : une seule teinte de bleu partout (fond icône = fond écran = WKWebView).
 * À garder aligné avec capacitor.config.ts (ios.backgroundColor) et index.html (body initial).
 */
export const RUCONNECT_SPLASH_BLUE = '#2455EB';

/** Icône splash RunConnect (fichier dans `public/brand/`). */
export const RUCONNECT_SPLASH_ICON_URL = '/brand/runconnect-splash-icon.png';

/** Chrome web (Safari / in-app) pendant le splash */
export function applyRuconnectSplashWebChrome(): void {
  const root = document.documentElement;
  const body = document.body;
  root.style.backgroundColor = RUCONNECT_SPLASH_BLUE;
  body.style.backgroundColor = RUCONNECT_SPLASH_BLUE;

  const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (metaTheme) metaTheme.setAttribute('content', RUCONNECT_SPLASH_BLUE);

  const metaApple = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]'
  ) as HTMLMetaElement | null;
  if (metaApple) metaApple.setAttribute('content', 'black-translucent');
}

/**
 * Barre d’état **système** uniquement (pas de doublon HTML) :
 * - overlay true → le fond bleu du Web remonte sous la barre ; une seule bande visible.
 * - Style.Light → pictogrammes / heure en clair sur le bleu.
 * - padding env(safe-area-inset-*) sur l’écran de chargement = marge contenu, pas une 2e barre.
 */
export async function applyRuconnectSplashNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light });
    try {
      await StatusBar.setBackgroundColor({ color: RUCONNECT_SPLASH_BLUE });
    } catch {
      /* iOS peut ignorer setBackgroundColor ; overlay + fond HTML suffit */
    }
  } catch {
    /* Web ou plugin indisponible */
  }
}

/** Restaure le chrome après splash / écran d’attente bleu */
export async function restoreChromeAfterRuconnectSplash(): Promise<void> {
  const isDark = getPreferredDarkFromStorage();
  applyWebChromeForTheme(isDark);
  if (Capacitor.isNativePlatform()) {
    await applyIosStatusBarForTheme(isDark);
  }
}
