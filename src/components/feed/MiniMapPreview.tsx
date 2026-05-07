import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import { createSessionPinButton, resolveSessionPinVariant } from '@/lib/mapSessionPin';

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
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      zoom: '15',
      ...(sessionId && { sessionId }),
    });
    navigate(`/?${params.toString()}`);
  }, [interactive, lat, lng, onOpenSession, sessionId, navigate]);

  useEffect(() => {
    if (!mapRef.current || lat === undefined || lat === null || lng === undefined || lng === null) {
      setIsLoading(false);
      setError(true);
      return;
    }

    if (!getMapboxAccessToken()) {
      setIsLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    const initMap = async () => {
      try {
        if (!mapRef.current || cancelled) return;

        const map = await createEmbeddedMapboxMap(mapRef.current, {
          center: { lat, lng },
          zoom,
          interactive,
        });
        mapInstanceRef.current = map;

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
        markerRef.current = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([lng, lat])
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
