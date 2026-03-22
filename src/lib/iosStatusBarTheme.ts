/**
 * Barre d’état iOS (Capacitor) alignée sur le thème clair/sombre.
 * Une seule source de vérité pour éviter conflits avec le splash / main.tsx / ThemeContext.
 */
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

export async function applyIosStatusBarForTheme(isDark: boolean): Promise<void> {
  try {
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    if (!cap || cap.getPlatform?.() !== 'ios') return;

    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.show();

    if (isDark) {
      await StatusBar.setStyle({ style: Style.Light });
      try {
        await StatusBar.setBackgroundColor({ color: '#000000' });
      } catch {
        /* iOS peut ignorer setBackgroundColor */
      }
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      try {
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch {
        /* idem */
      }
    }
  } catch {
    /* Web ou plugin indisponible */
  }
}

export function applyWebChromeForTheme(isDark: boolean): void {
  const bg = isDark ? '#000000' : '#F2F2F7';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', bg);

  const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (apple) {
    apple.setAttribute('content', isDark ? 'black' : 'default');
  }

  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
}
