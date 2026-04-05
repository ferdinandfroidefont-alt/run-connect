import { useEffect, useRef } from "react";
import type { MapCoord } from "@/lib/geoUtils";
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer } from "@/lib/mapboxEmbed";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";

interface ActivityPolylineMapProps {
  coords: MapCoord[];
  fallbackLat?: number;
  fallbackLng?: number;
  className?: string;
}

const SRC = "activity-polyline";
const LAYER = "activity-polyline-layer";

export function ActivityPolylineMap({ coords, fallbackLat, fallbackLng, className }: ActivityPolylineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !getMapboxAccessToken()) return;
    if (!coords || coords.length < 2) return;

    const map = createEmbeddedMapboxMap(containerRef.current, {
      center: coords[0],
      zoom: 12,
      interactive: false,
    });

    const apply = () => {
      setOrUpdateLineLayer(map, SRC, LAYER, coords, { color: "#3b82f6", width: 3 });
      fitMapToCoords(map, coords, 24);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);

    return () => { map.remove(); };
  }, [coords]);

  if (!coords || coords.length < 2) {
    return <div className={className ?? "h-32 w-full rounded-lg bg-muted"} />;
  }

  return <div ref={containerRef} className={className ?? "h-32 w-full rounded-lg overflow-hidden"} />;
}
