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
  avatarUrl?: string | null;
}

export const MiniMapPreview = ({ lat, lng, sessionId, onOpenSession, avatarUrl }: MiniMapPreviewProps) => {
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
        el.style.width = '50px';
        el.style.height = '64px';
        el.style.border = '0';
        el.style.padding = '0';
        el.style.background = 'transparent';
        el.style.position = 'relative';

        const pinCircle = document.createElement('span');
        pinCircle.style.position = 'absolute';
        pinCircle.style.left = '50%';
        pinCircle.style.top = '2px';
        pinCircle.style.width = '44px';
        pinCircle.style.height = '44px';
        pinCircle.style.transform = 'translateX(-50%)';
        pinCircle.style.borderRadius = '999px';
        pinCircle.style.background = '#2563EB';
        pinCircle.style.boxShadow = '0 7px 18px rgba(15,23,42,0.3)';

        const pinTip = document.createElement('span');
        pinTip.style.position = 'absolute';
        pinTip.style.left = '50%';
        pinTip.style.top = '48px';
        pinTip.style.width = '18px';
        pinTip.style.height = '16px';
        pinTip.style.transform = 'translateX(-50%)';
        pinTip.style.clipPath = 'polygon(50% 100%, 0 0, 100% 0)';
        pinTip.style.background = '#2563EB';
        pinTip.style.filter = 'drop-shadow(0 3px 5px rgba(15,23,42,0.28))';

        const avatarRing = document.createElement('span');
        avatarRing.style.position = 'absolute';
        avatarRing.style.left = '50%';
        avatarRing.style.top = '8px';
        avatarRing.style.width = '30px';
        avatarRing.style.height = '30px';
        avatarRing.style.transform = 'translateX(-50%)';
        avatarRing.style.borderRadius = '999px';
        avatarRing.style.border = '2px solid #fff';
        avatarRing.style.overflow = 'hidden';
        avatarRing.style.zIndex = '1';
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl || '/placeholder.svg';
        avatarImg.alt = '';
        avatarImg.draggable = false;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        avatarRing.appendChild(avatarImg);

        el.appendChild(pinCircle);
        el.appendChild(pinTip);
        el.appendChild(avatarRing);

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
  }, [lat, lng, handleMapClick, avatarUrl]);

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
