import React, { useEffect, useRef } from 'react';
import type { Map } from 'mapbox-gl';
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from '@/lib/mapboxEmbed';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';

interface RoutePreviewProps {
  coordinates: unknown[];
  activityType: string;
}

const PREVIEW_SRC = 'route-preview-line';
const PREVIEW_LAYER = 'route-preview-line-layer';

export const RoutePreview = ({ coordinates, activityType }: RoutePreviewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      course: '#ef4444',
      velo: '#3b82f6',
      marche: '#22c55e',
      natation: '#0d9488',
    };
    return colors[type] || colors.course;
  };

  useEffect(() => {
    if (!mapContainer.current || !coordinates?.length || !getMapboxAccessToken()) return;

    let cancelled = false;
    void (async () => {
      const path = coordinates
        .map((coord: unknown): MapCoord | null => {
          const c = coord as Record<string, unknown> | unknown[];
          if (c && typeof c === 'object' && !Array.isArray(c) && c.lat != null && c.lng != null) {
            return { lat: Number(c.lat), lng: Number(c.lng) };
          }
          if (Array.isArray(coord) && coord.length >= 2) {
            return { lat: Number(coord[0]), lng: Number(coord[1]) };
          }
          return null;
        })
        .filter((coord): coord is MapCoord => coord !== null);

      if (path.length === 0 || !mapContainer.current) return;

      const color = getActivityColor(activityType);
      const m = await createEmbeddedMapboxMap(mapContainer.current, {
        center: path[0],
        zoom: 10,
        interactive: true,
      });
      if (cancelled) {
        m.remove();
        return;
      }
      mapInstanceRef.current = m;

      const apply = () => {
        setOrUpdateLineLayer(m, PREVIEW_SRC, PREVIEW_LAYER, path, { color, width: 3 });
        void fitMapToCoords(m, path, 20);
      };
      if (m.isStyleLoaded()) apply();
      else m.once('load', apply);
    })();

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [coordinates, activityType]);

  if (!coordinates?.length) {
    return (
      <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-sm text-gray-500">Aucun itinéraire disponible</span>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-32 w-full rounded-lg" style={{ minHeight: '128px' }} />;
};
