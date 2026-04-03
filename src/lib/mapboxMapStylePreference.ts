import { MAPBOX_NAVIGATION_DAY_STYLE, MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';

export const RUNCONNECT_MAP_STYLE_STORAGE_KEY = 'runconnect_map_style_id';

/** Émis après `syncMapStyleWithAppTheme` pour que les cartes montées appliquent le nouveau fond. */
export const MAP_STYLE_THEME_SYNC_EVENT = 'runconnect:map-style-theme-sync';

const VALID_IDS = new Set(Object.keys(MAPBOX_STYLE_BY_UI_ID));

/** Sauvegarde du style carte avant passage auto en « dark » (restauration au retour clair). */
const MAP_STYLE_BEFORE_THEME_DARK_KEY = 'runconnect_map_style_before_theme_dark';

/** Style Mapbox effectif — identique à la carte Accueil (`InteractiveMap`). */
export function getHomeMapboxStyleUrl(): string {
  const id = getStoredMapStyleId();
  return MAPBOX_STYLE_BY_UI_ID[id] ?? MAPBOX_NAVIGATION_DAY_STYLE;
}

export function getStoredMapStyleId(): string {
  if (typeof window === 'undefined') return 'roadmap';
  try {
    const v = window.localStorage.getItem(RUNCONNECT_MAP_STYLE_STORAGE_KEY);
    if (v && VALID_IDS.has(v)) return v;
  } catch {
    /* ignore */
  }
  return 'roadmap';
}

export function persistMapStyleId(id: string): void {
  if (typeof window === 'undefined') return;
  if (!VALID_IDS.has(id)) return;
  try {
    window.localStorage.setItem(RUNCONNECT_MAP_STYLE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** À appeler quand l’utilisateur choisit un style dans le sélecteur (évite un retour arrière thème obsolète). */
export function clearMapStyleThemeRollback(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MAP_STYLE_BEFORE_THEME_DARK_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Alignement carte / thème UI : mode sombre → style Mapbox « dark » ;
 * retour clair → restaure le style précédent (si enregistré).
 */
export function syncMapStyleWithAppTheme(isDark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (isDark) {
      const cur = getStoredMapStyleId();
      if (cur !== 'dark') {
        window.localStorage.setItem(MAP_STYLE_BEFORE_THEME_DARK_KEY, cur);
      }
      persistMapStyleId('dark');
    } else {
      const prev = window.localStorage.getItem(MAP_STYLE_BEFORE_THEME_DARK_KEY);
      if (prev && VALID_IDS.has(prev)) {
        persistMapStyleId(prev);
      }
      window.localStorage.removeItem(MAP_STYLE_BEFORE_THEME_DARK_KEY);
    }
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new CustomEvent(MAP_STYLE_THEME_SYNC_EVENT, { detail: { styleId: getStoredMapStyleId() } })
    );
  } catch {
    /* ignore */
  }
}
