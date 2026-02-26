import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingMode, TurnInstruction } from '@/hooks/useTrainingMode';
import { Loader } from '@googlemaps/js-api-loader';
import { ArrowUp, CornerUpLeft, CornerUpRight, RotateCcw, Pause, Play, X, AlertTriangle, Navigation } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const PRIMARY_BLUE = 'hsl(221, 83%, 53%)';
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

function getTurnIcon(direction: TurnInstruction['direction']) {
  switch (direction) {
    case 'left': return <CornerUpLeft className="h-8 w-8" />;
    case 'slight-left': return <CornerUpLeft className="h-8 w-8" />;
    case 'right': return <CornerUpRight className="h-8 w-8" />;
    case 'slight-right': return <CornerUpRight className="h-8 w-8" />;
    case 'u-turn': return <RotateCcw className="h-8 w-8" />;
    default: return <ArrowUp className="h-8 w-8" />;
  }
}

function getTurnLabel(direction: TurnInstruction['direction']) {
  switch (direction) {
    case 'left': return 'Tournez à gauche';
    case 'slight-left': return 'Légèrement à gauche';
    case 'right': return 'Tournez à droite';
    case 'slight-right': return 'Légèrement à droite';
    case 'u-turn': return 'Demi-tour';
    default: return 'Tout droit';
  }
}

function formatTurnDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function TrainingMode() {
  const { sessionId, routeId } = useParams<{ sessionId?: string; routeId?: string }>();
  const navigate = useNavigate();
  const {
    routeCoordinates,
    userPosition,
    heading,
    isOffRoute,
    isActive,
    isPaused,
    loading,
    error,
    nextTurn,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  } = useTrainingMode(sessionId, routeId);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const borderPolylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Fetch API key
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', { body: { type: 'get-key' } });
        if (error) throw error;
        if (data?.apiKey) setApiKey(data.apiKey);
      } catch (err) {
        console.error('Failed to fetch Google Maps API key:', err);
      }
    };
    fetchKey();
  }, []);

  // Init map
  useEffect(() => {
    if (routeCoordinates.length === 0 || mapReady || !apiKey) return;

    const initMap = async () => {
      try {
        if (!(window as any).google?.maps) {
          const loader = new Loader({ apiKey, version: 'weekly', libraries: ['geometry', 'places', 'marker'] });
          await loader.load();
        }
        if (!mapRef.current) return;

        const bounds = new google.maps.LatLngBounds();
        routeCoordinates.forEach(c => bounds.extend(c));

        const map = new google.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 18,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'none',
          tilt: 45,
          styles: MAP_STYLES,
        });

        // White border polyline (underneath)
        const borderPoly = new google.maps.Polyline({
          path: routeCoordinates,
          strokeColor: '#FFFFFF',
          strokeOpacity: 1,
          strokeWeight: 11,
          geodesic: true,
        });
        borderPoly.setMap(map);

        // Blue route polyline (on top)
        const polyline = new google.maps.Polyline({
          path: routeCoordinates,
          strokeColor: PRIMARY_BLUE,
          strokeOpacity: 1,
          strokeWeight: 7,
          geodesic: true,
        });
        polyline.setMap(map);

        googleMapRef.current = map;
        polylineRef.current = polyline;
        borderPolylineRef.current = borderPoly;
        setMapReady(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    };

    initMap();
  }, [routeCoordinates, mapReady, apiKey]);

  // Create directional blue dot with heading arrow
  const createDirectionalIcon = useCallback((h: number) => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    // Halo
    const gradient = ctx.createRadialGradient(cx, cy, 6, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Direction arrow
    const rad = (h - 90) * Math.PI / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-7, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(7, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Center dot
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }, []);

  const updateMarker = useCallback((map: google.maps.Map, pos: { lat: number; lng: number }, h: number) => {
    const iconUrl = createDirectionalIcon(h);
    if (markerRef.current) {
      markerRef.current.setPosition(pos);
      markerRef.current.setIcon({
        url: iconUrl,
        scaledSize: new google.maps.Size(64, 64),
        anchor: new google.maps.Point(32, 32),
      });
      return;
    }
    markerRef.current = new google.maps.Marker({
      map,
      position: pos,
      icon: {
        url: iconUrl,
        scaledSize: new google.maps.Size(64, 64),
        anchor: new google.maps.Point(32, 32),
      },
      zIndex: 1000,
    });
  }, [createDirectionalIcon]);

  // Center on initial position
  useEffect(() => {
    if (!mapReady || !googleMapRef.current) return;

    const centerOn = (lat: number, lng: number) => {
      const map = googleMapRef.current!;
      updateMarker(map, { lat, lng }, 0);
      map.panTo({ lat, lng });
      map.panBy(0, -150);
      map.setZoom(18);
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
  }, [mapReady, updateMarker]);

  // Update position + heading on GPS updates
  useEffect(() => {
    if (!googleMapRef.current || !userPosition || !mapReady) return;
    const map = googleMapRef.current;
    updateMarker(map, userPosition, heading);
    map.setHeading(heading);
    map.panTo(userPosition);
    map.panBy(0, -150);
  }, [userPosition, heading, mapReady, updateMarker]);

  // Auto-start tracking
  useEffect(() => {
    if (mapReady && !isActive && !loading) {
      startTracking();
    }
  }, [mapReady, loading]);

  const handleQuit = useCallback(() => {
    stopTracking().catch(() => {});
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  }, [stopTracking, navigate]);

  const handlePauseToggle = useCallback(() => {
    if (isPaused) resumeTracking();
    else pauseTracking();
  }, [isPaused, pauseTracking, resumeTracking]);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-muted-foreground">Chargement de la navigation...</p>
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[17px] text-foreground font-medium mb-2">Erreur</p>
          <p className="text-[15px] text-muted-foreground mb-6">{error}</p>
          <button onClick={handleQuit} className="text-primary text-[17px] font-medium">Retour</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      {/* Map - full screen */}
      <div className="absolute inset-0" style={{ zIndex: 0, isolation: 'isolate' }}>
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Direction banner */}
      <div
        className="absolute top-0 left-0 right-0 z-[9999] bg-primary text-primary-foreground"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-center gap-3 px-4 py-4"
            >
              <Pause className="h-6 w-6 opacity-80" />
              <span className="text-[17px] font-semibold">Navigation en pause</span>
            </motion.div>
          ) : nextTurn ? (
            <motion.div
              key={`turn-${nextTurn.segmentIndex}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="flex-shrink-0">
                {getTurnIcon(nextTurn.direction)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[22px] font-bold leading-tight">
                  {formatTurnDistance(nextTurn.distanceMeters)}
                </p>
                <p className="text-[14px] opacity-80 mt-0.5">
                  {getTurnLabel(nextTurn.direction)}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="straight"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="flex-shrink-0">
                <Navigation className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-semibold">Suivez l'itinéraire</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Off-route toast */}
      <AnimatePresence>
        {isOffRoute && isActive && !isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute z-[9999]"
            style={{ top: 'calc(env(safe-area-inset-top) + 80px)', left: 16, right: 16 }}
          >
            <div className="bg-[#FF9500] text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-[15px] font-medium">Vous êtes hors parcours</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating controls */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[9999] flex items-center justify-center gap-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
      >
        {/* Quit button */}
        <button
          onClick={handleQuit}
          className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-90"
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Pause / Resume button */}
        <button
          onClick={handlePauseToggle}
          className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-90"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {isPaused ? (
            <Play className="h-6 w-6 text-white" />
          ) : (
            <Pause className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
