import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { getKeyBody } from '@/lib/googleMapsKey';
import { Camera, Loader2 } from 'lucide-react';
import { useRoutePhotosGallery, GalleryPhoto } from '@/hooks/useRoutePhotosGallery';
import { useGeolocation } from '@/hooks/useGeolocation';
import { RoutePhotoDetailSheet } from './RoutePhotoDetailSheet';

export const RoutePhotosGallery = () => {
  const { photos, loading } = useRoutePhotosGallery();
  const { position } = useGeolocation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Init Google Maps
  useEffect(() => {
    if (!mapContainer.current) return;
    let cancelled = false;

    const initMap = async () => {
      if (!window.google?.maps) {
        try {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: getKeyBody()
          });
          const key = apiKeyData?.apiKey || '';
          if (!key) return;
          const loader = new Loader({ apiKey: key, version: 'weekly', libraries: ['marker'] });
          await loader.importLibrary('maps');
          await loader.importLibrary('marker');
        } catch (e) {
          console.error('Failed to load Google Maps', e);
          return;
        }
      }
      if (cancelled || !mapContainer.current) return;

      const center = position
        ? { lat: position.lat, lng: position.lng }
        : { lat: 46.6, lng: 2.3 };

      mapRef.current = new google.maps.Map(mapContainer.current, {
        center,
        zoom: position ? 13 : 6,
        mapId: 'route-photos-map',
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      setMapReady(true);
    };

    initMap();
    return () => { cancelled = true; };
  }, []);

  // User position blue halo
  useEffect(() => {
    if (!mapRef.current || !position || !mapReady) return;

    // Remove old marker
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
    }

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(91,124,255,0.15);animation:pulseHalo 2s ease-out infinite;"></div>
        <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(91,124,255,0.25);"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:#5B7CFF;border:3px solid white;box-shadow:0 0 8px rgba(91,124,255,0.6);position:relative;z-index:2;"></div>
      </div>
    `;

    userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: position.lat, lng: position.lng },
      content: el,
      zIndex: 1,
    });
  }, [position, mapReady]);

  // Photo markers as circles
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];

    const geoPhotos = photos.filter(p => p.lat && p.lng);
    if (geoPhotos.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    if (position) bounds.extend({ lat: position.lat, lng: position.lng });

    geoPhotos.forEach((photo) => {
      const pos = { lat: photo.lat!, lng: photo.lng! };
      bounds.extend(pos);

      const el = document.createElement('div');
      el.style.cssText = 'cursor:pointer;transition:transform 0.2s;';
      el.innerHTML = `
        <div style="
          width:52px;height:52px;border-radius:50%;
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(91,124,255,0.3);
          overflow:hidden;background:#e2e8f0;
        ">
          <img src="${photo.photo_url}" 
               style="width:100%;height:100%;object-fit:cover;" 
               loading="lazy" />
        </div>
      `;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: pos,
        content: el,
        zIndex: 10,
      });

      marker.addListener('click', () => {
        setSelectedPhoto(photo);
      });

      markersRef.current.push(marker);
    });

    if (geoPhotos.length > 0) {
      mapRef.current.fitBounds(bounds, 60);
      // Don't zoom in too much if only one photo
      const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
        if (mapRef.current!.getZoom()! > 16) mapRef.current!.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    }
  }, [photos, mapReady, position]);

  // Inject pulse animation CSS
  useEffect(() => {
    const styleId = 'photo-gallery-halo-style';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes pulseHalo {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const geoPhotos = photos.filter(p => p.lat && p.lng);

  if (photos.length === 0) {
    return (
      <div className="bg-card p-8 text-center">
        <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-[17px] font-medium text-foreground mb-1">Aucune photo</p>
        <p className="text-[15px] text-muted-foreground">
          Les photos ajoutées aux itinéraires publics apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Count badge */}
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-border">
            <Camera className="h-3.5 w-3.5 text-primary" />
            <span className="text-[13px] font-medium">
              {geoPhotos.length} photo{geoPhotos.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <RoutePhotoDetailSheet
        photo={selectedPhoto}
        open={!!selectedPhoto}
        onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }}
      />
    </>
  );
};
