import React, { useEffect, useRef } from 'react';

interface RoutePreviewProps {
  coordinates: any[];
  activityType: string;
}

export const RoutePreview = ({ coordinates, activityType }: RoutePreviewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const polyline = useRef<google.maps.Polyline | null>(null);

  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      'course': '#ef4444',
      'velo': '#3b82f6', 
      'marche': '#22c55e',
      'natation': '#0d9488'
    };
    return colors[activityType] || colors['course'];
  };

  useEffect(() => {
    if (!mapContainer.current || !window.google || !coordinates?.length) return;

    // Convert coordinates to LatLng format
    const path = coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return { lat: Number(coord.lat), lng: Number(coord.lng) };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return { lat: Number(coord[0]), lng: Number(coord[1]) };
      }
      return null;
    }).filter(coord => coord !== null);

    if (path.length === 0) return;

    // Calculate bounds
    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));

    // Initialize map
    map.current = new google.maps.Map(mapContainer.current, {
      center: bounds.getCenter(),
      zoom: 10,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      gestureHandling: 'cooperative',
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'road',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create polyline
    polyline.current = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#5B7CFF',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: map.current
    });

    // Fit bounds
    map.current.fitBounds(bounds);

    // Add some padding to bounds
    const extendedBounds = new google.maps.LatLngBounds();
    path.forEach(coord => extendedBounds.extend(coord));
    map.current.fitBounds(extendedBounds, 20);

    // Cleanup
    return () => {
      if (polyline.current) {
        polyline.current.setMap(null);
      }
      if (map.current) {
        map.current = null;
      }
    };
  }, [coordinates, activityType]);

  if (!coordinates?.length) {
    return (
      <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-sm text-gray-500">Aucun itinéraire disponible</span>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      className="h-32 w-full rounded-lg"
      style={{ minHeight: '128px' }}
    />
  );
};