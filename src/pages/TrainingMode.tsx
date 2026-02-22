import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { Loader } from '@googlemaps/js-api-loader';
import { Navigation, ChevronLeft } from 'lucide-react';
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
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
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
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['marker'],
        });

        const google = await loader.load();
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

  // Update user marker position
  useEffect(() => {
    if (!googleMapRef.current || !userPosition || !mapReady) return;

    const map = googleMapRef.current;

    if (!markerRef.current) {
      try {
        // Try AdvancedMarkerElement first
        const dotEl = document.createElement('div');
        dotEl.innerHTML = `
          <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:rgba(91,124,255,0.2);animation:pulse-ring 2s ease-out infinite;"></div>
            <div style="width:14px;height:14px;border-radius:50%;background:#5B7CFF;border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);position:relative;z-index:1;"></div>
          </div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: userPosition,
          content: dotEl,
        });
        markerRef.current = marker;
      } catch {
        // Fallback to classic Marker
        const marker = new google.maps.Marker({
          map,
          position: userPosition,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#5B7CFF',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2.5,
          },
        });
        markerRef.current = marker;
      }
    } else {
      if (markerRef.current instanceof google.maps.Marker) {
        markerRef.current.setPosition(userPosition);
      } else {
        (markerRef.current as google.maps.marker.AdvancedMarkerElement).position = userPosition;
      }
    }

    map.panTo(userPosition);
  }, [userPosition, mapReady]);

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

  const handleStop = useCallback(async () => {
    try { await stopTracking(); } catch {}
    navigate(-1);
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
        <div className="text-center">
          <p className="text-[17px] text-foreground font-medium mb-2">Erreur</p>
          <p className="text-[15px] text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-[15px] font-medium"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* Map - isolated stacking context so Google Maps z-indexes stay below our UI */}
      <div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
        <div ref={mapRef} className="w-full h-full bg-secondary" />
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[9999] safe-area-top pointer-events-auto">
        <div className="backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3 pt-[env(safe-area-inset-top,12px)]">
            {/* Back button */}
            <button
              onClick={async () => { try { await stopTracking(); } catch {} navigate(-1); }}
              className="w-9 h-9 rounded-full bg-background border border-border/50 flex items-center justify-center shadow-sm active:opacity-70 transition-opacity relative z-[10000]"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-muted-foreground truncate">{sessionTitle}</p>
              <p className="text-[22px] font-semibold text-foreground tabular-nums">
                {formatDistance(remainingDistance)} restants
              </p>
            </div>
            
            {/* Compass */}
            <div
              className="w-10 h-10 rounded-full bg-background/90 border border-border/50 flex items-center justify-center shadow-sm"
              style={{ transform: `rotate(${-heading}deg)`, transition: 'transform 0.3s ease-out' }}
            >
              <Navigation className="h-5 w-5 text-primary" style={{ transform: 'rotate(-45deg)' }} />
            </div>
          </div>

          {isActive && (
            <div className="flex items-center gap-4 px-4 pb-2">
              <span className="text-[13px] text-muted-foreground tabular-nums">
                ⏱ {formatTime(elapsedTime)}
              </span>
            </div>
          )}
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

      {/* Bottom - Stop button */}
      <div className="absolute bottom-0 left-0 right-0 z-[9999] pb-[env(safe-area-inset-bottom,20px)] pointer-events-auto">
        <div className="px-4 pb-4">
          <button
            onClick={handleStop}
            className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl text-[17px] font-semibold active:opacity-80 transition-opacity shadow-lg relative z-[10000]"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
}
