import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import { createEmbeddedMapboxMap } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  sessionId?: string;
  onOpenSession?: () => void;
}

export const MiniMapPreview = ({ lat, lng, sessionId, onOpenSession }: MiniMapPreviewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleMapClick = useCallback(() => {
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
  }, [lat, lng, onOpenSession, sessionId, navigate]);

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
          zoom: 12,
          interactive: true,
        });
        mapInstanceRef.current = map;

        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'cursor-pointer';
        el.style.width = '42px';
        el.style.height = '54px';
        el.style.border = '0';
        el.style.padding = '0';
        el.style.background = 'transparent';
        el.style.position = 'relative';

        const pinCircle = document.createElement('span');
        pinCircle.style.position = 'absolute';
        pinCircle.style.left = '50%';
        pinCircle.style.top = '0';
        pinCircle.style.width = '36px';
        pinCircle.style.height = '36px';
        pinCircle.style.transform = 'translateX(-50%)';
        pinCircle.style.borderRadius = '999px';
        pinCircle.style.background = '#2563EB';
        pinCircle.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.28)';

        const pinCenter = document.createElement('span');
        pinCenter.style.position = 'absolute';
        pinCenter.style.left = '50%';
        pinCenter.style.top = '11px';
        pinCenter.style.width = '14px';
        pinCenter.style.height = '14px';
        pinCenter.style.transform = 'translateX(-50%)';
        pinCenter.style.borderRadius = '999px';
        pinCenter.style.background = '#fff';

        const pinTip = document.createElement('span');
        pinTip.style.position = 'absolute';
        pinTip.style.left = '50%';
        pinTip.style.top = '33px';
        pinTip.style.width = '14px';
        pinTip.style.height = '14px';
        pinTip.style.transform = 'translateX(-50%) rotate(45deg)';
        pinTip.style.background = '#2563EB';

        el.appendChild(pinCircle);
        el.appendChild(pinTip);
        el.appendChild(pinCenter);

        const mapboxgl = await loadMapboxGl();
        markerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);

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
  }, [lat, lng, handleMapClick]);

  if (error) {
    return (
      <div className="w-full h-full rounded-xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Carte indisponible</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 rounded-xl bg-muted animate-pulse flex items-center justify-center z-10">
          <span className="text-muted-foreground text-sm">Chargement...</span>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-xl cursor-pointer" onClick={handleMapClick} />
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground pointer-events-none">
        Cliquer pour voir
      </div>
    </div>
  );
};
