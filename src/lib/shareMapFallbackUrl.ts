/**
 * Fond « carte » pour les artboards de partage.
 * Import Vite (?url) : fonctionne avec `base: './'` (Capacitor / sous-chemin), contrairement à `/public/...` en absolu.
 */
import shareMapFallback from '@/assets/profile-share-map-fallback.svg?url';

export const SHARE_MAP_FALLBACK_URL = shareMapFallback;
