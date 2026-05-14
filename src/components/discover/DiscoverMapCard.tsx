import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { DiscoverSession } from "@/hooks/useDiscoverFeed";
import {
  MapboxBootErrorBody,
  MapboxBootLoadingBody,
} from "@/components/map/MapboxMapBootOverlay";
import { cn } from "@/lib/utils";
import { createEmbeddedMapboxMap, fitMapToCoords } from "@/lib/mapboxEmbed";
import type { MapCoord } from "@/lib/geoUtils";
import { loadMapboxGl } from "@/lib/mapboxLazy";
import { useNetworkQuality } from "@/lib/networkQuality";
import {
  createSessionPinButton,
  resolveSessionPinVariant,
} from "@/lib/mapSessionPin";
import { createUserLocationMapboxMarker } from "@/lib/mapUserLocationIcon";

type DiscoverMapCardProps = {
  sessions: DiscoverSession[];
  className?: string;
  /** Style Mapbox explicite (palette Découvrir). */
  mapStyleUrl?: string;
  /** Inclinaison après chargement (ex. mode 3D). */
  mapPitch?: number;
  /** Appelée quand l’utilisateur tape un pin (même comportement intent que la carte accueil). */
  onSessionMarkerClick?: (session: DiscoverSession) => void;
};

/**
 * Carte Mapbox embarquée (pins séances découverte + position utilisateur), même style pins que InteractiveMap.
 */
export function DiscoverMapCard({
  sessions,
  className = "",
  mapStyleUrl,
  mapPitch = 0,
  onSessionMarkerClick,
}: DiscoverMapCardProps) {
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
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isSlowBoot, setIsSlowBoot] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);

  const networkQuality = useNetworkQuality();
  const isOffline = networkQuality === "offline";

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
    if (isMapLoaded) {
      setIsSlowBoot(false);
      return;
    }
    const slowMs = networkQuality === "slow" || networkQuality === "offline" ? 4000 : 9000;
    const t = window.setTimeout(() => setIsSlowBoot(true), slowMs);
    return () => window.clearTimeout(t);
  }, [isMapLoaded, networkQuality, bootAttempt]);

  const retryMapBoot = useCallback(() => {
    setMapError(false);
    setIsSlowBoot(false);
    setIsMapLoaded(false);
    setBootAttempt((n) => n + 1);
  }, []);

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
          style: mapStyleUrl,
          pitch: mapPitch,
        });
        mapRef.current = map;
        if (cancelled || runId !== runIdRef.current) {
          map.remove();
          return;
        }

        map.once("load", () => {
          if (cancelled || runId !== runIdRef.current) return;
          setIsMapLoaded(true);
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
            map.setPitch(mapPitch);
            if (mapPitch > 0) {
              map.setMaxPitch(85);
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
      setIsMapLoaded(false);
    };
  }, [sessions, userCoord, mapStyleUrl, mapPitch, bootAttempt]);

  if (mapError) {
    return (
      <div
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center bg-muted",
          className,
        )}
      >
        <MapboxBootErrorBody
          message="Carte indisponible. Vérifie ta connexion ou réessaie."
          onRetry={retryMapBoot}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div
        className={cn(
          "absolute inset-0 z-[2] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none",
          isMapLoaded ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        role="status"
        aria-live="polite"
        aria-hidden={isMapLoaded}
      >
        {!isMapLoaded && (
          <MapboxBootLoadingBody
            networkQuality={networkQuality}
            isOffline={isOffline}
            isSlowBoot={isSlowBoot}
            onRetry={retryMapBoot}
          />
        )}
      </div>
    </div>
  );
}
