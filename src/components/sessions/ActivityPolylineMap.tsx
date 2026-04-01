import { useEffect, useRef, useId } from "react";
import mapboxgl from "mapbox-gl";
import { getMapboxAccessToken } from "@/lib/mapboxConfig";
import { createEmbeddedMapboxMap, fitMapToCoords, setOrUpdateLineLayer, removeLineLayer } from "@/lib/mapboxEmbed";
import type { MapCoord } from "@/lib/geoUtils";
import { cn } from "@/lib/utils";

const LINE_COLOR = "#2563eb";

type ActivityPolylineMapProps = {
  coords: MapCoord[];
  fallbackLat: number;
  fallbackLng: number;
  className?: string;
  /** Ouverture pleine carte (même comportement que le fil) */
  onOpenFullMap?: () => void;
};

/**
 * Carte compacte avec tracé GPS (live tracking points) ou point de repli sur le lieu de RDV.
 */
export function ActivityPolylineMap({ coords, fallbackLat, fallbackLng, className, onOpenFullMap }: ActivityPolylineMapProps) {
  const reactId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const sourceId = `ca-line-src-${reactId}`;
  const layerId = `ca-line-${reactId}`;

  useEffect(() => {
    if (!containerRef.current || !getMapboxAccessToken()) return;

    let cancelled = false;
    const map = createEmbeddedMapboxMap(containerRef.current, {
      center: { lat: fallbackLat, lng: fallbackLng },
      zoom: coords.length >= 2 ? 13 : 14,
      interactive: !!onOpenFullMap,
    });
    mapRef.current = map;

    const boot = () => {
      if (cancelled) return;
      if (coords.length >= 2) {
        setOrUpdateLineLayer(map, sourceId, layerId, coords, { color: LINE_COLOR, width: 4 });
        fitMapToCoords(map, coords, 20);
      } else {
        removeLineLayer(map, sourceId, layerId);
        map.jumpTo({ center: [fallbackLng, fallbackLat], zoom: 14 });
        markerRef.current?.remove();
        markerRef.current = new mapboxgl.Marker({ color: LINE_COLOR }).setLngLat([fallbackLng, fallbackLat]).addTo(map);
      }
    };

    if (map.isStyleLoaded()) boot();
    else map.once("load", boot);

    if (onOpenFullMap) {
      map.on("click", onOpenFullMap);
    }

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [coords, fallbackLat, fallbackLng, onOpenFullMap, sourceId, layerId]);

  return (
    <div
      ref={containerRef}
      className={cn("h-36 w-full overflow-hidden rounded-[10px] border border-border bg-muted/40", onOpenFullMap && "cursor-pointer", className)}
      role={onOpenFullMap ? "button" : undefined}
      tabIndex={onOpenFullMap ? 0 : undefined}
      onKeyDown={
        onOpenFullMap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenFullMap();
              }
            }
          : undefined
      }
    />
  );
}
