import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { generateRunConnectMarkerSVG, svgToDataUrl } from '@/lib/map-marker-generator';
import { supabase } from '@/integrations/supabase/client';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  profileImageUrl: string;
}

export const MiniMapPreview = ({ lat, lng, profileImageUrl }: MiniMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapRef.current || lat === undefined || lat === null || lng === undefined || lng === null) return;

    const initMap = async () => {
      try {
        // Check if Google Maps is already loaded
        if (!window.google?.maps) {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: { type: 'get-key' }
          });
          
          const googleMapsApiKey = apiKeyData?.apiKey || '';
          
          if (!googleMapsApiKey) {
            console.error('❌ MiniMapPreview: No Google Maps API key');
            setIsLoading(false);
            return;
          }
          
          const loader = new Loader({
            apiKey: googleMapsApiKey,
            version: 'weekly',
          });

          await loader.load();
        }

        if (!mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: 'none',
          clickableIcons: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // Generate custom marker
        const markerSvg = generateRunConnectMarkerSVG(profileImageUrl || '', 48);
        const markerDataUrl = svgToDataUrl(markerSvg);

        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          icon: {
            url: markerDataUrl,
            scaledSize: new google.maps.Size(48, 60),
            anchor: new google.maps.Point(24, 60),
          },
        });

        markerRef.current = marker;
        setIsLoading(false);
      } catch (error) {
        console.error('❌ MiniMapPreview error:', error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [lat, lng, profileImageUrl]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-xl">
      {isLoading && (
        <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse">
          <span className="text-muted-foreground text-sm">Chargement carte...</span>
        </div>
      )}
    </div>
  );
};
