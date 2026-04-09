import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Map, Marker } from 'mapbox-gl';
import { generateRoundProfileMarkerSVG, svgToDataUrl, imageUrlToBase64 } from '@/lib/map-marker-generator';
import { createEmbeddedMapboxMap } from '@/lib/mapboxEmbed';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  profileImageUrl: string;
  sessionId?: string;
}

export const MiniMapPreview = ({ lat, lng, profileImageUrl, sessionId }: MiniMapPreviewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleMapClick = useCallback(() => {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      zoom: '15',
      ...(sessionId && { sessionId }),
    });
    navigate(`/?${params.toString()}`);
  }, [lat, lng, sessionId, navigate]);

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
          zoom: 14,
          interactive: true,
        });
        mapInstanceRef.current = map;

        const el = document.createElement('div');
        el.className = 'cursor-pointer';
        el.style.width = '44px';
        el.style.height = '44px';

        if (profileImageUrl) {
          try {
            const base64Image = await imageUrlToBase64(profileImageUrl);
            const svg = generateRoundProfileMarkerSVG(base64Image, 44);
            const dataUrl = svgToDataUrl(svg);
            el.style.backgroundImage = `url(${dataUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.borderRadius = '50%';
            el.style.border = '3px solid white';
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
          } catch {
            el.style.borderRadius = '50%';
            el.style.background = '#385bdc';
            el.style.border = '3px solid white';
          }
        } else {
          el.style.borderRadius = '50%';
          el.style.background = '#385bdc';
          el.style.border = '3px solid white';
        }

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
  }, [lat, lng, profileImageUrl, handleMapClick]);

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
