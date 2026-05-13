import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import { createEmbeddedMapboxMap, fitMapToCoords } from "@/lib/mapboxEmbed";
import type { MapCoord } from "@/lib/geoUtils";
import { loadMapboxGl } from "@/lib/mapboxLazy";
import {
  createSessionPinButton,
  resolveSessionPinVariant,
} from "@/lib/mapSessionPin";
import { createUserLocationMapboxMarker } from "@/lib/mapUserLocationIcon";

type DiscoverMapCardProps = {
  sessions: DiscoverSession[];
  className?: string;
  /** Appelée quand l’utilisateur tape un pin (même comportement intent que la carte accueil). */
  onSessionMarkerClick?: (session: DiscoverSession) => void;
};

/**
 * Carte Mapbox embarquée (pins séances découverte + position utilisateur), même style pins que InteractiveMap.
 */
export function DiscoverMapCard({ sessions, className = "", onSessionMarkerClick }: DiscoverMapCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const runIdRef = useRef(0);
  const onClickRef = useRef(onSessionMarkerClick);
  onClickRef.current = onSessionMarkerClick;
  const { getCurrentPosition } = useGeolocation();
  const [userCoord, setUserCoord] = useState<MapCoord | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await getCurrentPosition(0, { mode: "fast" });
        if (!cancelled && p) setUserCoord({ lat: p.lat, lng: p.lng });
      } catch {
        /* ignore — fit sur les séances seules */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getCurrentPosition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    const runId = ++runIdRef.current;

    const teardown = async () => {
      for (const m of markersRef.current) {
        try {
          m.remove();
        } catch {
          /* no-op */
        }
      }
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* no-op */
        }
        mapRef.current = null;
      }
    };

    void (async () => {
      await teardown();
      if (cancelled || runId !== runIdRef.current) return;

      try {
        const center = userCoord ?? { lat: 48.8566, lng: 2.3522 };
        const map = await createEmbeddedMapboxMap(el, {
          interactive: true,
          center,
          zoom: 12,
          antialias: true,
        });
        mapRef.current = map;
        if (cancelled || runId !== runIdRef.current) {
          map.remove();
          return;
        }

        map.once("load", () => {
          if (cancelled || runId !== runIdRef.current) return;
          map.resize();

          void (async () => {
            const mapboxgl = await loadMapboxGl();
            if (cancelled || runId !== runIdRef.current || !mapRef.current) return;

            markersRef.current = [];
            for (const session of sessions) {
              const lng = Number(session.location_lng);
              const lat = Number(session.location_lat);
              if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                continue;
              }
              if (lat === 0 && lng === 0) continue;

              const wrap = document.createElement("div");
              wrap.className = "rc-session-pin rc-session-pin-pop";
              wrap.style.position = "relative";
              wrap.style.width = "1px";
              wrap.style.height = "1px";
              wrap.style.overflow = "visible";

              const pin = createSessionPinButton({
                avatarUrl: session.organizer.avatar_url || "/placeholder.svg",
                ariaLabel: session.title || "Séance",
                variant: resolveSessionPinVariant(),
                activityType: session.activity_type,
              });
              wrap.appendChild(pin);
              wrap.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const fn = onClickRef.current;
                if (fn) fn(session);
              });

              const marker = new mapboxgl.Marker({ element: wrap, anchor: "bottom" })
                .setLngLat([lng, lat])
                .addTo(map);
              markersRef.current.push(marker);
            }

            if (userCoord) {
              const um = await createUserLocationMapboxMarker(userCoord.lng, userCoord.lat);
              um.addTo(map);
              userMarkerRef.current = um;
            }

            const coords: MapCoord[] = sessions
              .map((s) => ({ lat: Number(s.location_lat), lng: Number(s.location_lng) }))
              .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && !(c.lat === 0 && c.lng === 0));
            if (userCoord) coords.push(userCoord);

            if (coords.length > 0) {
              await fitMapToCoords(map, coords, 48);
            }
          })();
        });
        setMapError(false);
      } catch {
        if (!cancelled) setMapError(true);
      }
    })();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => mapRef.current?.resize()) : null;
    ro?.observe(el);

    return () => {
      cancelled = true;
      runIdRef.current += 1;
      ro?.disconnect();
      void teardown();
    };
  }, [sessions, userCoord]);

  if (mapError) {
    return (
      <div className={`flex h-64 flex-col items-center justify-center rounded-2xl bg-muted ${className}`}>
        <p className="px-4 text-center text-[13px] text-muted-foreground">Carte indisponible</p>
      </div>
    );
  }

  return (
    <div className={`relative h-64 w-full overflow-hidden rounded-2xl bg-muted ${className}`}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/[0.06]" aria-hidden />
    </div>
  );
}
