import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { generateRunConnectMarkerSVG, svgToDataUrl } from '@/lib/map-marker-generator';

interface MiniMapPreviewProps {
  lat: number;
  lng: number;
  profileImageUrl: string;
}

export const MiniMapPreview = ({ lat, lng, profileImageUrl }: MiniMapPreviewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;

    const initMap = async () => {
      const loader = new Loader({
        apiKey: 'AIzaSyDH-lVLOBo0bK5l-sNBFQI_e6gqbMx_L8g',
        version: 'weekly',
      });

      await loader.load();

      const map = new google.maps.Map(mapRef.current!, {
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
    };

    initMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [lat, lng, profileImageUrl]);

  return <div ref={mapRef} className="w-full h-full rounded-xl" />;
};
