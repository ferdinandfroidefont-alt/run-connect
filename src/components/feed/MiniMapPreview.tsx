import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import {
  MapboxBootErrorBody,
  MapboxBootLoadingBody,
} from '@/components/map/MapboxMapBootOverlay';
import { createEmbeddedMapboxMap } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { useNetworkQuality } from '@/lib/networkQuality';
import { cn } from '@/lib/utils';
import {
  createSessionPinButton,
  resolveSessionPinVariant,
  SESSION_PIN_CENTER_OFFSET_Y,
} from '@/lib/mapSessionPin';

/** Paris — évite Number(null)===0 et la paire (0,0) souvent stockée à tort quand les coords manquent. */
const COORD_FALLBACK = { lat: 48.8566, lng: 2.3522 };

function normalizePreviewCoords(lat: number, lng: number): { lat: number; lng: number } {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return COORD_FALLBACK;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return COORD_FALLBACK;
  if (la === 0 && ln === 0) return COORD_FALLBACK;
  return { lat: la, lng: ln };
}

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  sessionId?: string;
  onOpenSession?: () => void;
  avatarUrl?: string | null;
  activityType?: string;
  interactive?: boolean;
  showHint?: boolean;
  className?: string;
  zoom?: number;
  /** Attendre width/height > 0 avant init (dialog, animations). */
  waitForLayout?: boolean;
  /** Désactive le boot Mapbox (ex. hors viewport). */
  enabled?: boolean;
}

export const MiniMapPreview = ({
  lat,
  lng,
  sessionId,
  onOpenSession,
  avatarUrl,
  activityType,
  interactive = true,
  showHint,
  className,
  zoom = 12,
  waitForLayout = false,
  enabled = true,
}: MiniMapPreviewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isSlowBoot, setIsSlowBoot] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);

  const networkQuality = useNetworkQuality();
  const isOffline = networkQuality === 'offline';

  useEffect(() => {
    if (mapError) {
      setIsSlowBoot(false);
      return;
    }
    if (isMapLoaded) {
      setIsSlowBoot(false);
      return;
    }
    const slowMs = networkQuality === 'slow' || networkQuality === 'offline' ? 4000 : 9000;
    const t = window.setTimeout(() => setIsSlowBoot(true), slowMs);
    return () => window.clearTimeout(t);
  }, [isMapLoaded, mapError, networkQuality, bootAttempt]);

  const retryMapBoot = useCallback(() => {
    setMapError(false);
    setIsSlowBoot(false);
    setIsMapLoaded(false);
    setBootAttempt((n) => n + 1);
  }, []);

  const handleMapClick = useCallback(() => {
    if (!interactive) return;
    if (onOpenSession) {
      onOpenSession();
      return;
    }
    const c = normalizePreviewCoords(lat, lng);
    const params = new URLSearchParams({
      lat: c.lat.toString(),
      lng: c.lng.toString(),
      zoom: '15',
      ...(sessionId && { sessionId }),
    });
    navigate(`/?${params.toString()}`);
  }, [interactive, lat, lng, onOpenSession, sessionId, navigate]);

  useEffect(() => {
    setMapError(false);
    setIsMapLoaded(false);

    if (!enabled) {
      return;
    }

    if (!getMapboxAccessToken()) {
      setIsMapLoaded(false);
      setMapError(true);
      return;
    }

    const { lat: cLat, lng: cLng } = normalizePreviewCoords(lat, lng);
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let layoutRafId: number | null = null;
    let layoutAttempts = 0;

    const initMap = async () => {
      try {
        const container = mapRef.current;
        if (!container || cancelled) {
          if (!cancelled) {
            setMapError(true);
            setIsMapLoaded(false);
          }
          return;
        }

        const map = await createEmbeddedMapboxMap(container, {
          center: { lat: cLat, lng: cLng },
          zoom,
          interactive,
        });
        mapInstanceRef.current = map;

        const resizeMap = () => {
          if (cancelled) return;
          try {
            map.resize();
          } catch {
            /* ignore */
          }
        };

        const wrap = document.createElement('div');
        wrap.className = 'rc-session-pin';
        wrap.style.position = 'relative';
        wrap.style.width = '1px';
        wrap.style.height = '1px';
        wrap.style.overflow = 'visible';

        const pin = createSessionPinButton({
          avatarUrl: avatarUrl || '/placeholder.svg',
          ariaLabel: 'Séance sur la carte',
          variant: resolveSessionPinVariant(),
          activityType,
        });
        wrap.appendChild(pin);

        const mapboxgl = await loadMapboxGl();
        if (cancelled || !mapInstanceRef.current) {
          markerRef.current?.remove();
          markerRef.current = null;
          map.remove();
          return;
        }

        markerRef.current = new mapboxgl.Marker({
          element: wrap,
          anchor: 'bottom',
          offset: [0, SESSION_PIN_CENTER_OFFSET_Y],
        })
          .setLngLat([cLng, cLat])
          .addTo(map);

        map.on('click', handleMapClick);

        const onReady = () => {
          resizeMap();
          requestAnimationFrame(() => requestAnimationFrame(resizeMap));
          window.setTimeout(resizeMap, 120);
          window.setTimeout(resizeMap, 400);
          if (!cancelled) setIsMapLoaded(true);
        };
        if (map.isStyleLoaded()) onReady();
        else map.once('load', onReady);

        if (mapRef.current) {
          resizeObserver = new ResizeObserver(() => resizeMap());
          resizeObserver.observe(mapRef.current);
        }
      } catch (err) {
        console.error('MiniMapPreview error:', err);
        if (!cancelled) {
          setMapError(true);
          setIsMapLoaded(false);
        }
      }
    };

    const tryStart = () => {
      if (cancelled) return;
      const el = mapRef.current;
      if (!el) {
        if (layoutAttempts++ < 80) {
          layoutRafId = requestAnimationFrame(tryStart);
          return;
        }
        setMapError(true);
        return;
      }
      if (waitForLayout && (el.offsetWidth < 2 || el.offsetHeight < 2)) {
        if (layoutAttempts++ < 80) {
          layoutRafId = requestAnimationFrame(tryStart);
          return;
        }
        setMapError(true);
        return;
      }
      void initMap();
    };

    tryStart();

    return () => {
      cancelled = true;
      if (layoutRafId != null) cancelAnimationFrame(layoutRafId);
      resizeObserver?.disconnect();
      resizeObserver = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      setIsMapLoaded(false);
    };
  }, [
    lat,
    lng,
    handleMapClick,
    avatarUrl,
    zoom,
    interactive,
    activityType,
    bootAttempt,
    waitForLayout,
    enabled,
  ]);

  if (mapError) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center rounded-xl bg-muted px-3 py-4',
          className,
        )}
      >
        <MapboxBootErrorBody
          compact
          message="Carte indisponible. Vérifie ta connexion ou réessaie."
          onRetry={retryMapBoot}
        />
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      <div
        className={cn(
          'absolute inset-0 z-[2] flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none',
          isMapLoaded ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        role="status"
        aria-live="polite"
        aria-hidden={isMapLoaded}
      >
        {!isMapLoaded ? (
          <MapboxBootLoadingBody
            className="max-w-[240px] px-4 [&_svg]:h-6 [&_svg]:w-6 [&_p]:text-[12px]"
            networkQuality={networkQuality}
            isOffline={isOffline}
            isSlowBoot={isSlowBoot}
            onRetry={retryMapBoot}
          />
        ) : null}
      </div>
      <div
        ref={mapRef}
        className={`h-full w-full rounded-xl ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={handleMapClick}
      />
      {(showHint ?? interactive) && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
          Cliquer pour voir
        </div>
      )}
    </div>
  );
};
