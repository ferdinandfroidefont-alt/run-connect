import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import type { Map, Marker } from 'mapbox-gl';
import { loadMapboxGl } from '@/lib/mapboxLazy';
import { Camera, Loader2, MapPinOff, RefreshCw, Route, X } from 'lucide-react';
import { useRoutePhotosGallery, GalleryPhoto, type GalleryMapRoutePreview } from '@/hooks/useRoutePhotosGallery';
import { useGeolocation } from '@/hooks/useGeolocation';
import { RoutePhotoDetailSheet } from './RoutePhotoDetailSheet';
import { createUserLocationMapboxMarker } from '@/lib/mapUserLocationIcon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  createEmbeddedMapboxMap,
  setOrUpdateLineLayer,
  removeLineLayer,
} from '@/lib/mapboxEmbed';
import { getMapboxAccessToken } from '@/lib/mapboxConfig';
import type { MapCoord } from '@/lib/geoUtils';

function coordinatesToPath(coordinates: unknown): MapCoord[] {
  if (!Array.isArray(coordinates)) return [];
  const out: MapCoord[] = [];
  for (const coord of coordinates) {
    const c = coord as Record<string, unknown>;
    if (c?.lat !== undefined && c?.lng !== undefined) {
      out.push({ lat: Number(c.lat), lng: Number(c.lng) });
    } else if (Array.isArray(coord) && coord.length >= 2) {
      out.push({ lat: Number(coord[0]), lng: Number(coord[1]) });
    }
  }
  return out.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

const GALLERY_ROUTE_SRC = 'gallery-route-preview';
const GALLERY_ROUTE_LAYER = 'gallery-route-preview-layer';

interface RoutePhotosGalleryProps {
  syncKey?: number;
}

export const RoutePhotosGallery = ({ syncKey = 0 }: RoutePhotosGalleryProps) => {
  const { photos, loading, refresh } = useRoutePhotosGallery();
  const { position, getCurrentPosition } = useGeolocation();

  useEffect(() => {
    void getCurrentPosition();
  }, [getCurrentPosition]);
  const positionRef = useRef(position);
  useLayoutEffect(() => {
    positionRef.current = position;
  }, [position]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [mapRoutePreview, setMapRoutePreview] = useState<{
    route: GalleryMapRoutePreview;
    contextPhoto: GalleryPhoto | null;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapInitNonce, setMapInitNonce] = useState(0);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  useEffect(() => {
    if (!syncKey) return;
    refresh();
  }, [syncKey, refresh]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => mapRef.current?.resize());
    });
  }, [mapFullscreen, mapReady]);

  const clearRoutePreview = useCallback(() => setMapRoutePreview(null), []);

  useEffect(() => {
    if (selectedPhoto) setMapRoutePreview(null);
  }, [selectedPhoto?.id]);

  useEffect(() => {
    if (loading || !mapContainer.current) return;
    if (!getMapboxAccessToken()) {
      setMapError(true);
      return;
    }

    let cancelled = false;
    setMapError(false);

    void (async () => {
      try {
        const pos = positionRef.current;
        const center = pos ? { lat: pos.lat, lng: pos.lng } : { lat: 46.6, lng: 2.3 };
        const map = await createEmbeddedMapboxMap(mapContainer.current!, {
          center,
          zoom: pos ? 13 : 6,
          interactive: true,
        });
        if (cancelled) {
          map.remove();
          return;
        }
        mapRef.current = map;

        const onReady = () => {
          if (!cancelled) {
            setMapReady(true);
            requestAnimationFrame(() => requestAnimationFrame(() => map.resize()));
          }
        };
        if (map.isStyleLoaded()) onReady();
        else map.once('load', onReady);
      } catch (e) {
        console.error('RoutePhotosGallery map init', e);
        if (!cancelled) setMapError(true);
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [loading, mapInitNonce]);

  useEffect(() => {
    if (!mapReady || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [mapReady]);

  useEffect(() => {
    if (!mapRef.current || !position || !mapReady) return;
    userMarkerRef.current?.remove();
    void (async () => {
      const mk = await createUserLocationMapboxMarker(position.lng, position.lat);
      if (!mapRef.current) {
        mk.remove();
        return;
      }
      userMarkerRef.current = mk.addTo(mapRef.current);
    })();
  }, [position, mapReady]);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    void (async () => {
      const mapboxgl = await loadMapboxGl();

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      removeLineLayer(map, GALLERY_ROUTE_SRC, GALLERY_ROUTE_LAYER);

      const geoPhotos = photos.filter((p) => p.lat && p.lng);
      const routePath = mapRoutePreview?.route?.coordinates
        ? coordinatesToPath(mapRoutePreview.route.coordinates)
        : [];

      if (routePath.length >= 2) {
        setOrUpdateLineLayer(map, GALLERY_ROUTE_SRC, GALLERY_ROUTE_LAYER, routePath, {
          color: '#5B7CFF',
          width: 5,
        });
      }

      geoPhotos.forEach((photo) => {
        const pos = { lat: photo.lat!, lng: photo.lng! };
        const isFocus = mapRoutePreview?.contextPhoto?.id === photo.id;
        const wrap = document.createElement('div');
        const side = isFocus ? 56 : 48;
        wrap.style.width = `${side}px`;
        wrap.style.height = `${side}px`;
        wrap.style.borderRadius = '9999px';
        wrap.style.overflow = 'hidden';
        wrap.style.border = '3px solid white';
        wrap.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        wrap.style.cursor = 'pointer';
        const img = document.createElement('img');
        img.src = photo.photo_url;
        img.alt = '';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        wrap.appendChild(img);
        wrap.addEventListener('click', () => setSelectedPhoto(photo));
        const marker = new mapboxgl.Marker({ element: wrap })
          .setLngLat([pos.lng, pos.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoint = false;
      const extend = (pt: MapCoord) => {
        bounds.extend([pt.lng, pt.lat]);
        hasPoint = true;
      };

      if (routePath.length >= 2) routePath.forEach(extend);
      const anchor = mapRoutePreview?.contextPhoto;
      if (anchor?.lat != null && anchor?.lng != null) extend({ lat: anchor.lat, lng: anchor.lng });
      if (position) extend({ lat: position.lat, lng: position.lng });

      if (!hasPoint && geoPhotos.length > 0) {
        geoPhotos.forEach((p) => extend({ lat: p.lat!, lng: p.lng! }));
        if (position) extend({ lat: position.lat, lng: position.lng });
      }

      if (hasPoint) {
        map.fitBounds(bounds, {
          padding: 70,
          duration: 0,
          maxZoom: routePath.length >= 2 ? 17 : 16,
        });
      }
    })();
  }, [photos, mapReady, position, mapRoutePreview]);

  const handleViewRouteOnMap = useCallback((route: GalleryMapRoutePreview, contextPhoto: GalleryPhoto) => {
    setSelectedPhoto(null);
    setMapRoutePreview({ route, contextPhoto });
  }, []);

  if (loading) {
    return (
      <div className="mx-ios-4 flex flex-col gap-ios-3 pb-ios-2">
        <div
          className="relative min-h-[min(52dvh,320px)] rounded-ios-lg border border-border bg-secondary shadow-inner ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-pulse"
          aria-hidden
        />
        <div className="ios-card rounded-ios-lg border border-border p-ios-3 shadow-sm">
          <div className="h-3 w-28 bg-secondary rounded-ios-sm animate-pulse mb-ios-3" />
          <div className="flex gap-ios-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-square w-[88px] shrink-0 rounded-ios-md bg-secondary animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-ios-2 py-ios-2 text-ios-footnote text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          Chargement des photos…
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="ios-card p-ios-8 text-center mx-ios-4 border border-border rounded-ios-lg shadow-sm">
        <div className="mb-ios-4 inline-flex p-ios-4 rounded-full bg-secondary">
          <Camera className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-ios-headline font-semibold text-foreground mb-ios-1">Aucune photo</p>
        <p className="text-ios-subheadline text-muted-foreground leading-relaxed">
          Les photos publiques des itinéraires apparaîtront ici sur la carte et dans la galerie ci-dessous.
        </p>
      </div>
    );
  }

  const geoPhotos = photos.filter((p) => p.lat && p.lng);
  const noGeoCount = photos.length - geoPhotos.length;

  return (
    <>
      <div
        className={cn(
          'flex flex-col gap-ios-3 pb-ios-2',
          mapFullscreen
            ? 'fixed inset-0 z-[90] mx-0 min-h-0 bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
            : 'min-h-[min(72dvh,640px)] mx-ios-4',
        )}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden border border-border bg-secondary shadow-inner ring-1 ring-black/5 dark:ring-white/10',
            mapFullscreen
              ? 'flex flex-1 min-h-0 flex-col rounded-none border-0 ring-0 shadow-none'
              : 'flex-1 min-h-[min(52dvh,420px)] rounded-ios-lg',
          )}
        >
          {mapFullscreen && (
            <div className="shrink-0 z-20 flex items-center justify-between gap-ios-2 border-b border-border bg-background px-ios-4 py-ios-2">
              <span className="text-ios-headline font-semibold text-foreground">Carte</span>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setMapFullscreen(false)}>
                Réduire
              </Button>
            </div>
          )}

          <div className={cn('relative w-full', mapFullscreen ? 'min-h-0 flex-1' : 'min-h-[min(52dvh,420px)]')}>
            <div ref={mapContainer} className="absolute inset-0 h-full w-full" />

            {mapError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm px-ios-6 text-center">
                <MapPinOff className="h-10 w-10 text-muted-foreground mb-ios-3" />
                <p className="text-ios-headline font-semibold text-foreground mb-ios-1">Carte indisponible</p>
                <p className="text-ios-footnote text-muted-foreground mb-ios-4 max-w-xs">
                  Vérifiez la connexion ou le jeton Mapbox (VITE_MAPBOX_ACCESS_TOKEN), puis réessayez.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-ios-2"
                  onClick={() => {
                    setMapInitNonce((n) => n + 1);
                    refresh();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            )}

            {!mapError && mapRoutePreview && (
              <div className="absolute top-ios-3 right-ios-3 z-10 flex flex-col items-end gap-ios-2 max-w-[min(100%,280px)]">
                <div className="bg-card/95 backdrop-blur-md rounded-ios-lg px-ios-3 py-ios-2 shadow-sm border border-border flex items-start gap-ios-2">
                  <Route className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-ios-caption1 font-medium text-foreground leading-snug line-clamp-2">
                    {mapRoutePreview.route.name || 'Itinéraire'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full shadow-sm gap-ios-1.5"
                  onClick={clearRoutePreview}
                >
                  <X className="h-4 w-4" />
                  Fermer le tracé
                </Button>
              </div>
            )}

            {!mapError && (
              <div
                className={cn(
                  'absolute top-ios-3 z-10 pointer-events-none',
                  mapRoutePreview ? 'left-ios-3 max-w-[calc(100%-8rem)]' : 'left-ios-3',
                )}
              >
                <div className="bg-card/95 backdrop-blur-md rounded-full pl-ios-2 pr-ios-3 py-ios-1 flex items-center gap-ios-1.5 shadow-sm border border-border">
                  <Camera className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-ios-caption1 font-medium text-foreground tabular-nums">
                    {geoPhotos.length} carte
                    {noGeoCount > 0 ? ` · ${noGeoCount} sans lieu` : ''}
                  </span>
                </div>
              </div>
            )}

            {!mapError && !mapFullscreen && (
              <button
                type="button"
                className="absolute bottom-[5.5rem] right-ios-3 z-[15] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/95 text-xl shadow-md backdrop-blur-md transition-transform active:scale-95"
                onClick={() => setMapFullscreen(true)}
                aria-label="Plein écran"
              >
                ⛶
              </button>
            )}
          </div>
        </div>

        {!mapFullscreen && (
          <div className="ios-card rounded-ios-lg border border-border shadow-sm p-ios-3">
            <div className="flex items-center justify-between mb-ios-2">
              <p className="text-ios-footnote font-semibold text-foreground uppercase tracking-wide">Galerie</p>
              <span className="text-ios-caption1 text-muted-foreground tabular-nums">
                {photos.length} photo{photos.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-ios-2 overflow-x-auto pb-ios-1 scrollbar-hide -mx-ios-1 px-ios-1">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className={cn(
                    'relative shrink-0 aspect-square w-[88px] rounded-ios-md overflow-hidden border-2 transition-transform active:scale-[0.97]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    selectedPhoto?.id === photo.id ? 'border-primary ring-2 ring-primary/25' : 'border-border',
                    !photo.lat || !photo.lng ? 'opacity-95' : '',
                  )}
                >
                  <img src={photo.photo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {(!photo.lat || !photo.lng) && (
                    <span className="absolute bottom-ios-1 left-ios-1 right-ios-1 text-ios-caption1 font-medium text-white bg-black/60 backdrop-blur-sm rounded-ios-sm px-ios-1 py-0.5 truncate text-center">
                      Sans GPS
                    </span>
                  )}
                </button>
              ))}
            </div>
            {noGeoCount > 0 && (
              <p className="text-ios-caption1 text-muted-foreground mt-ios-2 leading-snug border-t border-border pt-ios-2">
                Les photos sans position restent visibles ici ; seules les photos géolocalisées apparaissent sur la carte.
              </p>
            )}
          </div>
        )}
      </div>

      <RoutePhotoDetailSheet
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onOpenChange={(open) => {
          if (!open) setSelectedPhoto(null);
        }}
        onViewRouteOnMap={handleViewRouteOnMap}
        onPhotoDeleted={refresh}
      />
    </>
  );
};
