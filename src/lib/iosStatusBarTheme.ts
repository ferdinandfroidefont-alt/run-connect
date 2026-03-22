/**
 * Barre d’état (Capacitor iOS + Android) — une seule barre **système** native.
 * Pas de barre HTML « factice » : le Web utilise seulement env(safe-area-inset-*) pour le contenu.
 *
 * Hors splash :
 * - Mode clair : fond barre blanc #FFFFFF + icônes / texte sombres (Style.Dark)
 * - Mode sombre : fond barre noir #000000 + icônes / texte clairs (Style.Light)
 *
 * Splash (voir ruconnectSplashChrome) : overlay true + fond bleu + Style.Light (icônes blanches).
 */
import { Capacitor } from '@capacitor/core';

const THEME_STORAGE_KEY = 'runconnect-ui-theme';

export function getPreferredDarkFromStorage(): boolean {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Couleur native de la barre d’état (hors contenu Web) */
const STATUS_BAR_LIGHT = '#FFFFFF';
const STATUS_BAR_DARK = '#000000';

/**
 * Applique la barre d’état native pour le thème courant (iOS et Android).
 * overlay: false → le WebView commence **sous** la barre : pas de double bandeau (barre système + padding safe-area redondant côté natif).
 */
export async function applyIosStatusBarForTheme(isDark: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.show();

    if (isDark) {
      await StatusBar.setStyle({ style: Style.Light });
      try {
        await StatusBar.setBackgroundColor({ color: STATUS_BAR_DARK });
      } catch {
        /* iOS peut ignorer setBackgroundColor */
      }
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      try {
        await StatusBar.setBackgroundColor({ color: STATUS_BAR_LIGHT });
      } catch {
        /* idem */
      }
    }
  } catch {
    /* Web ou plugin indisponible */
  }
}

/**
 * Métadonnées + fond document (zone **contenu** sous la barre système).
 * theme-color = teinte des barres Chrome / PWA (alignée sur la barre d’état native clair/sombre).
 */
export function applyWebChromeForTheme(isDark: boolean): void {
  const contentBg = isDark ? STATUS_BAR_DARK : '#F2F2F7';
  const chromeBarColor = isDark ? STATUS_BAR_DARK : STATUS_BAR_LIGHT;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', chromeBarColor);

  const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (apple) {
    apple.setAttribute('content', isDark ? 'black' : 'default');
  }

  document.documentElement.style.backgroundColor = contentBg;
  document.body.style.backgroundColor = contentBg;
}
