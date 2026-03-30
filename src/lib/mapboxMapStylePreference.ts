import { MAPBOX_STYLE_BY_UI_ID } from '@/lib/mapboxConfig';

export const RUNCONNECT_MAP_STYLE_STORAGE_KEY = 'runconnect_map_style_id';

const VALID_IDS = new Set(Object.keys(MAPBOX_STYLE_BY_UI_ID));

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
