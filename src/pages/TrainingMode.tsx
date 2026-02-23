import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { Loader } from '@googlemaps/js-api-loader';
import { ArrowLeft } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const ROUTE_COLOR = '#FF6B35';
const MAP_ID = 'training-map';

export default function TrainingMode() {
  const { sessionId, routeId } = useParams<{ sessionId?: string; routeId?: string }>();
  const navigate = useNavigate();
  const {
    routeCoordinates,
    userPosition,
    heading,
    remainingDistance,
    isOffRoute,
    isActive,
    elapsedTime,
    loading,
    error,
    sessionTitle,
    startTracking,
    stopTracking,
  } = useTrainingMode(sessionId, routeId);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showOffRouteToast, setShowOffRouteToast] = useState(false);
  const offRouteToastTimer = useRef<NodeJS.Timeout | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key via proxy
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: { type: 'get-key' },
        });
        if (error) throw error;
        if (data?.apiKey) setApiKey(data.apiKey);
      } catch (err) {
        console.error('Failed to fetch Google Maps API key:', err);
      }
    };
    fetchKey();
  }, []);

  // Init Google Maps
  useEffect(() => {
    if (routeCoordinates.length === 0 || mapReady || !apiKey) return;

    const initMap = async () => {
      try {
        // Reuse existing Google Maps if already loaded, otherwise load with all libraries
        if (!(window as any).google?.maps) {
          const loader = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['geometry', 'places', 'marker'],
          });
          await loader.load();
        }
        if (!mapRef.current) return;

        const bounds = new google.maps.LatLngBounds();
        routeCoordinates.forEach(c => bounds.extend(c));

        const map = new google.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 15,
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
        });

        map.fitBounds(bounds, 60);

        const polyline = new google.maps.Polyline({
          path: routeCoordinates,
          strokeColor: ROUTE_COLOR,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          geodesic: true,
        });
        polyline.setMap(map);

        googleMapRef.current = map;
        polylineRef.current = polyline;
        setMapReady(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    };

    initMap();
  }, [routeCoordinates, mapReady, apiKey]);

  // Create canvas-based blue dot icon (same as InteractiveMap)
  const createBlueDotIcon = useCallback(() => {
    const size = 60;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 5, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 8, 0, 2 * Math.PI);
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }, []);

  const updateBlueDot = useCallback((map: google.maps.Map, pos: { lat: number; lng: number }) => {
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
      return;
    }
    const iconUrl = createBlueDotIcon();
    markerRef.current = new google.maps.Marker({
      map,
      position: pos,
      icon: {
        url: iconUrl,
        scaledSize: new google.maps.Size(60, 60),
        anchor: new google.maps.Point(30, 30),
      },
      zIndex: 1000,
      title: 'Votre position',
    });
  }, [createBlueDotIcon]);

  // Center map on initial position & show blue dot
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;

    const centerOn = (lat: number, lng: number) => {
      const map = googleMapRef.current!;
      updateBlueDot(map, { lat, lng });
      map.panTo({ lat, lng });
      map.setZoom(16);
    };

    const getInitialPosition = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          centerOn(pos.coords.latitude, pos.coords.longitude);
          return;
        }
      } catch {}
      navigator.geolocation.getCurrentPosition(
        (pos) => centerOn(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    getInitialPosition();
  }, [mapReady, updateBlueDot]);

  // Update blue dot position on GPS updates
  useEffect(() => {
    if (!googleMapRef.current || !userPosition || !mapReady) return;
    updateBlueDot(googleMapRef.current, userPosition);
    googleMapRef.current.panTo(userPosition);
  }, [userPosition, mapReady, updateBlueDot]);

  // Off-route toast
  useEffect(() => {
    if (isOffRoute && isActive) {
      setShowOffRouteToast(true);
      if (offRouteToastTimer.current) clearTimeout(offRouteToastTimer.current);
      offRouteToastTimer.current = setTimeout(() => setShowOffRouteToast(false), 4000);
    } else {
      setShowOffRouteToast(false);
    }
  }, [isOffRoute, isActive]);

  // Auto-start tracking when map is ready
  useEffect(() => {
    if (mapReady && !isActive && !loading) {
      startTracking();
    }
  }, [mapReady, loading]);

  const handleStop = useCallback(() => {
    stopTracking().catch(() => {});
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [stopTracking, navigate]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-2 border-b border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/', { replace: true }); }}
              className="px-0 font-normal"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-muted-foreground">Chargement de l'itinéraire...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 py-2 border-b border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/', { replace: true }); }}
              className="px-0 font-normal"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Retour
            </Button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-[17px] text-foreground font-medium mb-2">Erreur</p>
          <p className="text-[15px] text-muted-foreground mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      {/* Map - isolated stacking context so Google Maps z-indexes stay below our UI */}
      <div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
        <div ref={mapRef} className="w-full h-full bg-secondary" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[9999] bg-card pt-[env(safe-area-inset-top)] pointer-events-auto">
        <div className="flex items-center px-4 py-2 border-b border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { stopTracking().catch(() => {}); if (window.history.length > 1) { navigate(-1); } else { navigate('/', { replace: true }); } }}
            className="px-0 font-normal"
            style={{ position: 'relative', zIndex: 10000 }}
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Retour
          </Button>
        </div>
      </div>

      {/* Off-route toast */}
      <AnimatePresence>
        {showOffRouteToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-32 left-4 right-4 z-[9999]"
          >
            <div className="bg-[#FF9500] text-white rounded-xl px-4 py-3 text-center shadow-lg">
              <p className="text-[15px] font-medium">Vous vous éloignez du parcours</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
