import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader } from '@googlemaps/js-api-loader';
import { generateRoundProfileMarkerSVG, svgToDataUrl, imageUrlToBase64 } from '@/lib/map-marker-generator';
import { getKeyBody } from '@/lib/googleMapsKey';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  profileImageUrl: string;
  sessionId?: string;
}

export const MiniMapPreview = ({ lat, lng, profileImageUrl, sessionId }: MiniMapPreviewProps) => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleMapClick = useCallback(() => {
    // Navigate to home page with the session location
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      zoom: '15',
      ...(sessionId && { sessionId })
    });
    navigate(`/?${params.toString()}`);
  }, [lat, lng, sessionId, navigate]);

  useEffect(() => {
    if (!mapRef.current || lat === undefined || lat === null || lng === undefined || lng === null) {
      setIsLoading(false);
      setError(true);
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      try {
        // Check if Google Maps is already loaded (by InteractiveMap)
        if (!window.google?.maps) {
          // Need to load Google Maps
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody()
          });
          
          const googleMapsApiKey = apiKeyData?.apiKey || '';
          
          if (!googleMapsApiKey) {
            console.error('❌ MiniMapPreview: No API key');
            if (isMounted) {
              setError(true);
              setIsLoading(false);
            }
            return;
          }

          const loader = new Loader({
            apiKey: googleMapsApiKey,
            version: 'weekly',
            libraries: ['geometry', 'places'] // Same libraries as InteractiveMap
          });

          await loader.load();
        }

        if (!isMounted || !mapRef.current) return;

        const position = { lat, lng };

        const map = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] }
          ]
        });

        mapInstanceRef.current = map;

        // Create round profile marker
        let markerIcon: google.maps.Icon | google.maps.Symbol;
        
        if (profileImageUrl) {
          try {
            const base64Image = await imageUrlToBase64(profileImageUrl);
            const svg = generateRoundProfileMarkerSVG(base64Image, 44);
            const dataUrl = svgToDataUrl(svg);
            markerIcon = {
              url: dataUrl,
              scaledSize: new google.maps.Size(44, 44),
              anchor: new google.maps.Point(22, 22)
            };
          } catch {
            markerIcon = {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 18,
              fillColor: '#385bdc',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 3
            };
          }
        } else {
          markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 18,
            fillColor: '#385bdc',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3
          };
        }

        new google.maps.Marker({
          map,
          position,
          icon: markerIcon
        });

        // Add click listener for navigation
        map.addListener('click', handleMapClick);

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ MiniMapPreview error:', err);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
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
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-xl cursor-pointer"
        onClick={handleMapClick}
      />
      {/* Overlay hint */}
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-muted-foreground pointer-events-none">
        Cliquer pour voir
      </div>
    </div>
  );
};
