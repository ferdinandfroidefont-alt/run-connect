/**
 * Barre d’état (Capacitor iOS + Android) — une seule barre **système** native.
 * Pas de barre HTML « factice » : le Web utilise seulement env(safe-area-inset-*) pour le contenu.
 *
 * Hors splash :
 * - Mode clair : fond barre blanc #FFFFFF + icônes / texte sombres (Style.Dark)
 * - Mode sombre : fond barre = même teinte que `--background` (index.css .dark), pas du noir #000
 *   → évite la frange visible entre la zone système et le WebView sur iOS.
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

/** Couleur native de la barre d’état (hors contenu Web), mode clair */
const STATUS_BAR_LIGHT = '#FFFFFF';

/**
 * Triplet Shadcn/Tailwind `H S% L%` → hex #RRGGBB (sRGB) pour les plugins natifs.
 */
function shadcnHslTripletToHex(triplet: string): string | null {
  const parts = triplet.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return null;

  if (s === 0) {
    const v = Math.round(l * 255);
    return `#${[v, v, v].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hr = h / 360;
  const r = hue2rgb(p, q, hr + 1 / 3);
  const g = hue2rgb(p, q, hr);
  const b = hue2rgb(p, q, hr - 1 / 3);

  return `#${[r, g, b]
    .map((x) => Math.round(x * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** `hsl(H S% L%)` (CSS Color 4) pour html/body — aligné sur `--background`. */
function hslFromShadcnBackgroundVar(): string | null {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  if (!raw) return null;
  return `hsl(${raw})`;
}

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
        const triplet = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
        const hex = shadcnHslTripletToHex(triplet) ?? '#1c1c1c';
        await StatusBar.setBackgroundColor({ color: hex });
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
 * Le fond html/body doit être **strictement** la même teinte que `bg-background` / `#root`,
 * sinon sur iOS en mode sombre on voit une frange (#000 natif vs gris `--background`).
 * theme-color = même teinte que le canvas (PWA / Chrome mobile).
 */
export function applyWebChromeForTheme(isDark: boolean): void {
  const fromCss = hslFromShadcnBackgroundVar();
  const contentBg = fromCss ?? (isDark ? 'hsl(240 5% 11%)' : 'hsl(0 0% 100%)');
  const triplet = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  const chromeBarColor = shadcnHslTripletToHex(triplet) ?? (isDark ? '#1c1c1c' : STATUS_BAR_LIGHT);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', chromeBarColor);

  const apple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (apple) {
    apple.setAttribute('content', isDark ? 'black' : 'default');
  }

  document.documentElement.style.backgroundColor = contentBg;
  document.body.style.backgroundColor = contentBg;
}
