import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
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
}: MiniMapPreviewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

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
    setError(false);
    setIsLoading(true);

    if (!getMapboxAccessToken()) {
      setIsLoading(false);
      setError(true);
      return;
    }

    const { lat: cLat, lng: cLng } = normalizePreviewCoords(lat, lng);
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initMap = async () => {
      try {
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (!mapRef.current || cancelled) {
          if (!cancelled) {
            setError(true);
            setIsLoading(false);
          }
          return;
        }

        const map = await createEmbeddedMapboxMap(mapRef.current, {
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

        const onReady = () => {
          resizeMap();
          requestAnimationFrame(() => requestAnimationFrame(resizeMap));
        };
        if (map.isStyleLoaded()) onReady();
        else map.once('load', onReady);

        if (mapRef.current) {
          resizeObserver = new ResizeObserver(() => resizeMap());
          resizeObserver.observe(mapRef.current);
        }

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
        markerRef.current = new mapboxgl.Marker({
          element: wrap,
          anchor: 'bottom',
          offset: [0, SESSION_PIN_CENTER_OFFSET_Y],
        })
          .setLngLat([cLng, cLat])
          .addTo(map);

        map.on('click', handleMapClick);

        if (!cancelled) setIsLoading(false);
      } catch (err) {
        console.error('MiniMapPreview error:', err);
        if (!cancelled) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    void initMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, handleMapClick, avatarUrl, zoom, interactive, activityType]);

  if (error) {
    return (
      <div className="w-full h-full rounded-xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Carte indisponible</span>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${className ?? ''}`}>
      {isLoading && (
        <div className="absolute inset-0 rounded-xl bg-muted animate-pulse flex items-center justify-center z-10">
          <span className="text-muted-foreground text-sm">Chargement...</span>
        </div>
      )}
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
