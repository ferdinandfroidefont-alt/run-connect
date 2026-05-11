/**
 * Détection de la qualité du réseau et options Mapbox associées (bandwidth-aware).
 *
 * Sur les WebViews mobiles (Android/iOS), `navigator.connection` (NetworkInformation API) est exposé
 * et donne `effectiveType` (4g / 3g / 2g / slow-2g) + `saveData` + `downlink` (Mbps). On s'en sert pour
 * éviter de surcharger les utilisateurs avec un mauvais signal :
 *  - localIdeographFontFamily : évite ~plusieurs centaines de Ko de glyphes CJK que Mapbox télécharge.
 *  - antialias désactivé en conn lente.
 *  - cache de tuiles plus large : moins de re-téléchargements.
 *  - mode haute qualité « 3D » coupé en conn lente (déjà géré côté style préf).
 */

import { useSyncExternalStore } from "react";

export type NetworkQuality = "fast" | "slow" | "offline" | "unknown";

type NetworkInfoLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getNetworkInfo(): NetworkInfoLike | null {
  if (typeof navigator === "undefined") return null;
  const n = navigator as Navigator & {
    connection?: NetworkInfoLike;
    mozConnection?: NetworkInfoLike;
    webkitConnection?: NetworkInfoLike;
  };
  return n.connection ?? n.mozConnection ?? n.webkitConnection ?? null;
}

/** Vrai si le navigateur signale un réseau « lent » (slow-2g / 2g / saveData / downlink très bas). */
export function isSlowConnection(): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const info = getNetworkInfo();
  if (!info) return false;
  if (info.saveData === true) return true;
  const eff = (info.effectiveType ?? "").toLowerCase();
  if (eff === "slow-2g" || eff === "2g") return true;
  if (typeof info.downlink === "number" && info.downlink > 0 && info.downlink < 0.4) return true;
  return false;
}

export function getNetworkQuality(): NetworkQuality {
  if (typeof navigator === "undefined") return "unknown";
  if (navigator.onLine === false) return "offline";
  return isSlowConnection() ? "slow" : "fast";
}

/** Options Mapbox `new Map({...})` économes en bande passante / CPU. Sans effet visuel sensible. */
export function getMapboxLowDataOptions(): {
  localIdeographFontFamily: string;
  maxTileCacheSize: number;
  crossSourceCollisions: boolean;
  antialias: boolean;
  fadeDuration: number;
} {
  const slow = isSlowConnection();
  return {
    /** Évite le téléchargement des glyphes CJK : grosse économie même sur app FR. */
    localIdeographFontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    /** Plus de tuiles gardées en cache → moins de re-fetch lors d'un dézoom / retour. */
    maxTileCacheSize: slow ? 96 : 64,
    /** Moins de calcul de collisions inter-sources : utile sur conn lente / CPU faible. */
    crossSourceCollisions: !slow,
    /** Antialias = canvas plus coûteux ; on coupe en conn lente. */
    antialias: !slow,
    /** Fade plus rapide : tuiles affichées dès qu'elles arrivent. */
    fadeDuration: slow ? 0 : 150,
  };
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  const info = getNetworkInfo();
  info?.addEventListener?.("change", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
    info?.removeEventListener?.("change", callback);
  };
}

function getSnapshot(): NetworkQuality {
  return getNetworkQuality();
}

function getServerSnapshot(): NetworkQuality {
  return "unknown";
}

/** Hook React pour observer la qualité du réseau (SSR-safe). */
export function useNetworkQuality(): NetworkQuality {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
