import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import {
  angularDistanceDeg,
  isProjectedPointInInnerRect,
  rayExitOnInnerRect,
  screenBearingDeg,
  type MapInnerRect,
} from "@/lib/mapOffscreenGeometry";

export type OffscreenIndicatorItem = {
  sessionId: string;
  lng: number;
  lat: number;
  x: number;
  y: number;
  distanceKm: number;
  activityType: string;
};

type SessionLike = {
  id: string;
  location_lat: number | string;
  location_lng: number | string;
  distance_km?: number;
  activity_type: string;
};

function measureInnerRect(
  mapContainer: HTMLElement,
  topStackEl: HTMLElement | null,
  feedSheetEl: HTMLElement | null,
  immersive: boolean,
): MapInnerRect | null {
  const w = mapContainer.clientWidth;
  const h = mapContainer.clientHeight;
  if (w < 80 || h < 80) return null;

  const mapRect = mapContainer.getBoundingClientRect();
  const margin = 10;
  const rightControlsClear = 58;

  let minY = margin;
  if (!immersive && topStackEl) {
    const hr = topStackEl.getBoundingClientRect();
    minY = Math.max(margin, hr.bottom - mapRect.top + 6);
  }

  let maxY = h - margin;
  if (feedSheetEl) {
    const fr = feedSheetEl.getBoundingClientRect();
    const topLocal = fr.top - mapRect.top;
    if (topLocal < h && topLocal > 0) {
      maxY = Math.min(maxY, topLocal - 10);
    }
  }

  const minX = margin;
  const maxX = w - margin - rightControlsClear;

  if (maxX - minX < 48 || maxY - minY < 48) return null;

  return { minX, minY, maxX, maxY };
}

const MIN_BEARING_SEPARATION = 18;
const MAX_INDICATORS = 3;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function pickIndicators(
  sessions: SessionLike[],
  map: mapboxgl.Map,
  inner: MapInnerRect,
): OffscreenIndicatorItem[] {
  const centerLngLat = map.getCenter();
  const centerScreen = map.project([centerLngLat.lng, centerLngLat.lat]);

  type Row = { s: SessionLike; px: number; py: number; dist: number; bearing: number; inInner: boolean };
  const rows: Row[] = [];

  for (const s of sessions) {
    const lng = Number(s.location_lng);
    const lat = Number(s.location_lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;

    const p = map.project([lng, lat]);
    const dist =
      typeof s.distance_km === "number" && Number.isFinite(s.distance_km)
        ? s.distance_km
        : haversineKm(centerLngLat.lat, centerLngLat.lng, lat, lng);

    const inInner = isProjectedPointInInnerRect(p.x, p.y, inner);
    const bearing = screenBearingDeg(centerScreen.x, centerScreen.y, p.x, p.y);
    rows.push({ s, px: p.x, py: p.y, dist, bearing, inInner });
  }

  if (rows.some((r) => r.inInner)) {
    return [];
  }

  const off = rows.filter((r) => !r.inInner);
  if (off.length === 0) {
    return [];
  }

  off.sort((a, b) => a.dist - b.dist);

  const chosen: Row[] = [];
  for (const o of off) {
    if (chosen.length >= MAX_INDICATORS) break;
    if (chosen.some((c) => angularDistanceDeg(c.bearing, o.bearing) < MIN_BEARING_SEPARATION)) {
      continue;
    }
    chosen.push(o);
  }

  const out: OffscreenIndicatorItem[] = [];
  for (const o of chosen) {
    const exit = rayExitOnInnerRect(centerScreen.x, centerScreen.y, o.px, o.py, inner);
    out.push({
      sessionId: o.s.id,
      lng: Number(o.s.location_lng),
      lat: Number(o.s.location_lat),
      x: exit.x,
      y: exit.y,
      distanceKm: o.dist,
      activityType: o.s.activity_type,
    });
  }

  return out;
}

const THROTTLE_MS = 120;

export function useOffscreenSessionIndicators(opts: {
  map: mapboxgl.Map | null;
  isMapLoaded: boolean;
  isActive: boolean;
  immersive: boolean;
  sessions: SessionLike[];
  mapContainerRef: React.RefObject<HTMLElement | null>;
  topStackRef: React.RefObject<HTMLElement | null>;
  /** Recharge la zone utile quand la hauteur du feed change (snap). */
  feedSnap?: number;
}): OffscreenIndicatorItem[] {
  const { map, isMapLoaded, isActive, immersive, sessions, mapContainerRef, topStackRef, feedSnap } = opts;
  const [items, setItems] = useState<OffscreenIndicatorItem[]>([]);

  const sessionKey = useMemo(
    () =>
      sessions
        .map((s) => `${s.id}:${s.location_lat}:${s.location_lng}`)
        .sort()
        .join("|"),
    [sessions],
  );

  const recompute = useCallback(() => {
    const m = map;
    const el = mapContainerRef.current;
    if (!m || !el || !isMapLoaded || !isActive) {
      setItems([]);
      return;
    }
    const feed =
      typeof document !== "undefined"
        ? (document.querySelector("[data-home-feed-sheet]") as HTMLElement | null)
        : null;
    const inner = measureInnerRect(el as HTMLElement, topStackRef.current, feed, immersive);
    if (!inner) {
      setItems([]);
      return;
    }
    setItems(pickIndicators(sessions, m, inner));
  }, [map, isMapLoaded, isActive, immersive, sessions, mapContainerRef, topStackRef, feedSnap]);

  useEffect(() => {
    if (!map || !isMapLoaded || !isActive) {
      setItems([]);
      return;
    }

    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        recompute();
      }, THROTTLE_MS);
    };

    schedule();
    map.on("moveend", schedule);
    map.on("zoomend", schedule);
    map.on("resize", schedule);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (mapContainerRef.current && ro) ro.observe(mapContainerRef.current);

    const onWinResize = () => schedule();
    window.addEventListener("resize", onWinResize);
    window.visualViewport?.addEventListener("resize", onWinResize);

    let mo: MutationObserver | null = null;
    const feedEl = document.querySelector("[data-home-feed-sheet]");
    if (feedEl && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => schedule());
      mo.observe(feedEl, { attributes: true, attributeFilter: ["style", "class"] });
    }

    return () => {
      if (t) clearTimeout(t);
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      map.off("resize", schedule);
      ro?.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.visualViewport?.removeEventListener("resize", onWinResize);
      mo?.disconnect();
    };
  }, [map, isMapLoaded, isActive, recompute, mapContainerRef]);

  useEffect(() => {
    recompute();
  }, [recompute, sessionKey, feedSnap]);

  return items;
}
