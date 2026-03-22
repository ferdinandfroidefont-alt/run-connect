import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';
import { Camera, Loader2, MapPinOff, RefreshCw, Route, X } from 'lucide-react';
import { useRoutePhotosGallery, GalleryPhoto, type GalleryMapRoutePreview } from '@/hooks/useRoutePhotosGallery';
import { useGeolocation } from '@/hooks/useGeolocation';
import { RoutePhotoDetailSheet } from './RoutePhotoDetailSheet';
import { getUserLocationMarkerIcon } from '@/lib/mapUserLocationIcon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function coordinatesToPath(coordinates: unknown): google.maps.LatLngLiteral[] {
  if (!Array.isArray(coordinates)) return [];
  const out: google.maps.LatLngLiteral[] = [];
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

export const RoutePhotosGallery = () => {
  const { photos, loading, refresh } = useRoutePhotosGallery();
  const { position } = useGeolocation();
  const positionRef = useRef(position);
  useLayoutEffect(() => {
    positionRef.current = position;
  }, [position]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [mapRoutePreview, setMapRoutePreview] = useState<{
    route: GalleryMapRoutePreview;
    contextPhoto: GalleryPhoto | null;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapInitNonce, setMapInitNonce] = useState(0);

  const clearRoutePreview = useCallback(() => setMapRoutePreview(null), []);

  // Fermer l’aperçu tracé quand on ouvre une autre photo
  useEffect(() => {
    if (selectedPhoto) setMapRoutePreview(null);
  }, [selectedPhoto?.id]);

  // Init Google Maps
  useEffect(() => {
    if (loading || !mapContainer.current) return;
    let cancelled = false;

    const initMap = async () => {
      setMapError(false);
      try {
        if (!window.google?.maps) {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody(),
          });
          const key = apiKeyData?.apiKey || '';
          if (!key) {
            if (!cancelled) setMapError(true);
            return;
          }
          const loader = new Loader({ apiKey: key, version: 'weekly' });
          await loader.importLibrary('maps');
        }
      } catch (e) {
        console.error('Failed to load Google Maps', e);
        if (!cancelled) setMapError(true);
        return;
      }

      if (cancelled || !mapContainer.current) return;

      const pos = positionRef.current;
      const center = pos ? { lat: pos.lat, lng: pos.lng } : { lat: 46.6, lng: 2.3 };

      mapRef.current = new google.maps.Map(mapContainer.current, {
        center,
        zoom: pos ? 13 : 6,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      setMapReady(true);

      const triggerResize = () => {
        if (mapRef.current) google.maps.event.trigger(mapRef.current, 'resize');
      };
      requestAnimationFrame(() => requestAnimationFrame(triggerResize));
    };

    initMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      routePolylineRef.current?.setMap(null);
      routePolylineRef.current = null;
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [loading, mapInitNonce]);

  useEffect(() => {
    if (!mapReady || !mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) google.maps.event.trigger(mapRef.current, 'resize');
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [mapReady]);

  // Position utilisateur — même style que la page principale (InteractiveMap)
  useEffect(() => {
    if (!mapRef.current || !position || !mapReady) return;

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: position.lat, lng: position.lng },
      icon: getUserLocationMarkerIcon(),
      zIndex: 1000,
      title: 'Votre position',
    });
  }, [position, mapReady]);

  // Marqueurs photos + polyline d’itinéraire (aperçu « à proximité »)
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    routePolylineRef.current?.setMap(null);
    routePolylineRef.current = null;

    const geoPhotos = photos.filter((p) => p.lat && p.lng);
    const routePath = mapRoutePreview?.route?.coordinates
      ? coordinatesToPath(mapRoutePreview.route.coordinates)
      : [];

    geoPhotos.forEach((photo) => {
      const pos = { lat: photo.lat!, lng: photo.lng! };
      const isFocus = mapRoutePreview?.contextPhoto?.id === photo.id;
      const marker = new google.maps.Marker({
        map,
        position: pos,
        icon: {
          url: photo.photo_url,
          scaledSize: new google.maps.Size(isFocus ? 56 : 48, isFocus ? 56 : 48),
          anchor: new google.maps.Point(isFocus ? 28 : 24, isFocus ? 28 : 24),
        },
        optimized: false,
        zIndex: isFocus ? 80 : 10,
      });
      marker.addListener('click', () => setSelectedPhoto(photo));
      markersRef.current.push(marker);
    });

    if (routePath.length >= 2) {
      routePolylineRef.current = new google.maps.Polyline({
        path: routePath,
        geodesic: true,
        strokeColor: '#5B7CFF',
        strokeOpacity: 0.95,
        strokeWeight: 5,
        map,
        zIndex: 5,
      });
    }

    const bounds = new google.maps.LatLngBounds();
    let hasPoint = false;
    const extend = (pt: google.maps.LatLngLiteral) => {
      bounds.extend(pt);
      hasPoint = true;
    };

    if (routePath.length >= 2) {
      routePath.forEach(extend);
    }
    const anchor = mapRoutePreview?.contextPhoto;
    if (anchor?.lat != null && anchor?.lng != null) {
      extend({ lat: anchor.lat, lng: anchor.lng });
    }
    if (position) extend({ lat: position.lat, lng: position.lng });

    if (!hasPoint && geoPhotos.length > 0) {
      geoPhotos.forEach((p) => extend({ lat: p.lat!, lng: p.lng! }));
      if (position) extend({ lat: position.lat, lng: position.lng });
    }

    let idleListener: google.maps.MapsEventListener | null = null;
    if (hasPoint) {
      map.fitBounds(bounds, 70);
      idleListener = google.maps.event.addListener(map, 'idle', () => {
        if (!mapRef.current) return;
        const z = mapRef.current.getZoom();
        const maxZ = routePath.length >= 2 ? 17 : 16;
        if (z != null && z > maxZ) mapRef.current.setZoom(maxZ);
        if (idleListener) {
          google.maps.event.removeListener(idleListener);
          idleListener = null;
        }
      });
    }

    return () => {
      if (idleListener) google.maps.event.removeListener(idleListener);
    };
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
              <div
                key={i}
                className="aspect-square w-[88px] shrink-0 rounded-ios-md bg-secondary animate-pulse"
              />
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
      <div className="flex flex-col min-h-[min(72dvh,640px)] gap-ios-3 mx-ios-4 pb-ios-2">
        <div
          className="relative w-full flex-1 min-h-[min(52dvh,420px)] rounded-ios-lg overflow-hidden border border-border bg-secondary shadow-inner ring-1 ring-black/5 dark:ring-white/10"
        >
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {mapError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/95 backdrop-blur-sm px-ios-6 text-center">
              <MapPinOff className="h-10 w-10 text-muted-foreground mb-ios-3" />
              <p className="text-ios-headline font-semibold text-foreground mb-ios-1">Carte indisponible</p>
              <p className="text-ios-footnote text-muted-foreground mb-ios-4 max-w-xs">
                Vérifiez la connexion ou la clé Google Maps, puis réessayez.
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
                mapRoutePreview ? 'left-ios-3 max-w-[calc(100%-8rem)]' : 'left-ios-3'
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
        </div>

        <div className="ios-card rounded-ios-lg border border-border shadow-sm p-ios-3">
          <div className="flex items-center justify-between mb-ios-2">
            <p className="text-ios-footnote font-semibold text-foreground uppercase tracking-wide">
              Galerie
            </p>
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
                  selectedPhoto?.id === photo.id
                    ? 'border-primary ring-2 ring-primary/25'
                    : 'border-border',
                  !photo.lat || !photo.lng ? 'opacity-95' : ''
                )}
              >
                <img
                  src={photo.photo_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
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
      </div>

      <RoutePhotoDetailSheet
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onOpenChange={(open) => {
          if (!open) setSelectedPhoto(null);
        }}
        onViewRouteOnMap={handleViewRouteOnMap}
      />
    </>
  );
};
