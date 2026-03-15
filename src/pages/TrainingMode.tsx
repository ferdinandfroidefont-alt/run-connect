import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainingMode, TurnInstruction } from '@/hooks/useTrainingMode';
import { Loader } from '@googlemaps/js-api-loader';
import { ArrowUp, CornerUpLeft, CornerUpRight, RotateCcw, Pause, Play, Square, AlertTriangle, Navigation, Locate, Mountain, Timer, Gauge, MapPin } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getKeyBody } from '@/lib/googleMapsKey';

const PRIMARY_BLUE = 'hsl(221, 83%, 53%)';
const TRAVELED_TEAL = '#14b8a6';
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

function getTurnIcon(direction: TurnInstruction['direction'], size = 'h-8 w-8') {
  switch (direction) {
    case 'left': return <CornerUpLeft className={size} />;
    case 'slight-left': return <CornerUpLeft className={size} />;
    case 'right': return <CornerUpRight className={size} />;
    case 'slight-right': return <CornerUpRight className={size} />;
    case 'u-turn': return <RotateCcw className={size} />;
    default: return <ArrowUp className={size} />;
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

function formatDistance(meters: number) {
  if (meters >= 1000) return (meters / 1000).toFixed(2);
  return (meters / 1000).toFixed(2);
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface NearbyParticipant {
  userId: string;
  name: string;
  avatarUrl: string | null;
  distance: number;
}

export default function TrainingMode() {
  const { sessionId, routeId } = useParams<{ sessionId?: string; routeId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    routeName,
    distanceTraveled,
    elevationGain,
    averageSpeed,
    activityType,
    elapsedTime,
    traveledPath,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  } = useTrainingMode(sessionId, routeId);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const borderPolylineRef = useRef<google.maps.Polyline | null>(null);
  const traveledPolylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [nearbyParticipants, setNearbyParticipants] = useState<NearbyParticipant[]>([]);

  const isCycling = activityType === 'cycling' || activityType === 'vélo' || activityType === 'velo';
  const hasRoute = routeCoordinates.length > 1;

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

  // Nearby participants polling
  useEffect(() => {
    if (!sessionId || !userPosition || !user) return;
    
    const fetchNearby = async () => {
      try {
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from('live_tracking_points')
          .select('user_id, lat, lng, recorded_at')
          .eq('session_id', sessionId)
          .neq('user_id', user.id)
          .gte('recorded_at', fiveMinAgo)
          .order('recorded_at', { ascending: false });

        if (!data || data.length === 0) {
          setNearbyParticipants([]);
          return;
        }

        // Get latest point per user
        const latestByUser = new Map<string, { lat: number; lng: number }>();
        for (const pt of data) {
          if (!latestByUser.has(pt.user_id)) {
            latestByUser.set(pt.user_id, { lat: Number(pt.lat), lng: Number(pt.lng) });
          }
        }

        const userIds = Array.from(latestByUser.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map<string, { name: string; avatar: string | null }>();
        profiles?.forEach(p => {
          profileMap.set(p.user_id!, { name: p.display_name || p.username || 'Participant', avatar: p.avatar_url });
        });

        const R = 6371000;
        const toRad = (d: number) => d * Math.PI / 180;
        const participants: NearbyParticipant[] = [];

        latestByUser.forEach((pos, uid) => {
          const dLat = toRad(pos.lat - userPosition.lat);
          const dLng = toRad(pos.lng - userPosition.lng);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(userPosition.lat)) * Math.cos(toRad(pos.lat)) * Math.sin(dLng/2)**2;
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const info = profileMap.get(uid);
          participants.push({
            userId: uid,
            name: info?.name || 'Participant',
            avatarUrl: info?.avatar || null,
            distance: Math.round(dist),
          });
        });

        participants.sort((a, b) => a.distance - b.distance);
        setNearbyParticipants(participants.slice(0, 3));
      } catch {
        // Silently fail
      }
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 15000);
    return () => clearInterval(interval);
  }, [sessionId, userPosition?.lat, userPosition?.lng, user?.id]);

  // Init map
  useEffect(() => {
    if (mapReady || !apiKey) return;
    // Allow map init even without route (free session tracking)
    const initMap = async () => {
      try {
        if (!(window as any).google?.maps) {
          const loader = new Loader({ apiKey, version: 'weekly', libraries: ['geometry', 'places', 'marker'] });
          await loader.load();
        }
        if (!mapRef.current) return;

        const center = routeCoordinates.length > 0
          ? { lat: routeCoordinates[0].lat, lng: routeCoordinates[0].lng }
          : { lat: 48.8566, lng: 2.3522 }; // Default Paris

        const map = new google.maps.Map(mapRef.current, {
          center,
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

        if (routeCoordinates.length > 1) {
          const borderPoly = new google.maps.Polyline({
            path: routeCoordinates,
            strokeColor: '#FFFFFF',
            strokeOpacity: 1,
            strokeWeight: 11,
            geodesic: true,
          });
          borderPoly.setMap(map);

          const polyline = new google.maps.Polyline({
            path: routeCoordinates,
            strokeColor: PRIMARY_BLUE,
            strokeOpacity: 1,
            strokeWeight: 7,
            geodesic: true,
          });
          polyline.setMap(map);

          polylineRef.current = polyline;
          borderPolylineRef.current = borderPoly;
        }

        // Traveled path polyline
        const traveledPoly = new google.maps.Polyline({
          path: [],
          strokeColor: TRAVELED_TEAL,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          geodesic: true,
        });
        traveledPoly.setMap(map);
        traveledPolylineRef.current = traveledPoly;

        googleMapRef.current = map;
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

    const gradient = ctx.createRadialGradient(cx, cy, 6, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, 2 * Math.PI);
    ctx.fill();

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
      map.panBy(0, -100);
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
    map.panBy(0, -100);
  }, [userPosition, heading, mapReady, updateMarker]);

  // Update traveled polyline
  useEffect(() => {
    if (!traveledPolylineRef.current || traveledPath.length === 0) return;
    traveledPolylineRef.current.setPath(traveledPath);
  }, [traveledPath]);

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

  const handleRecenter = useCallback(() => {
    if (!googleMapRef.current || !userPosition) return;
    googleMapRef.current.panTo(userPosition);
    googleMapRef.current.panBy(0, -100);
    googleMapRef.current.setZoom(18);
  }, [userPosition]);

  // --- LOADING ---
  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[15px] text-muted-foreground">Chargement...</p>
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
        className="absolute top-0 left-0 right-0 z-[9999]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <AnimatePresence mode="wait">
          {isPaused ? (
            <motion.div
              key="paused"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-2 rounded-2xl backdrop-blur-xl flex items-center justify-center gap-3 px-5 py-5"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            >
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Pause className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-[18px] font-semibold text-white">En pause</span>
            </motion.div>
          ) : hasRoute && nextTurn ? (
            <motion.div
              key={`turn-${nextTurn.segmentIndex}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-2 rounded-2xl backdrop-blur-xl overflow-hidden"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.92)' }}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  {getTurnIcon(nextTurn.direction, 'h-7 w-7 text-white')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[28px] font-bold text-white leading-none">
                    {formatTurnDistance(nextTurn.distanceMeters)}
                  </p>
                  <p className="text-[15px] text-white/80 mt-1">
                    {getTurnLabel(nextTurn.direction)}
                  </p>
                </div>
              </div>
              {routeName && (
                <div className="px-5 pb-3 pt-0">
                  <p className="text-[13px] text-white/60 truncate">{routeName}</p>
                </div>
              )}
            </motion.div>
          ) : hasRoute ? (
            <motion.div
              key="straight"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-2 rounded-2xl backdrop-blur-xl flex items-center gap-4 px-5 py-4"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.92)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <Navigation className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-semibold text-white">Suivez l'itinéraire</p>
                {routeName && <p className="text-[13px] text-white/60 mt-0.5 truncate">{routeName}</p>}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="free"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-3 mt-2 rounded-2xl backdrop-blur-xl flex items-center gap-4 px-5 py-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] font-semibold text-white">Suivi de séance</p>
                <p className="text-[13px] text-white/60 mt-0.5">GPS actif</p>
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
            style={{ top: 'calc(env(safe-area-inset-top) + 100px)', left: 12, right: 12 }}
          >
            <div className="bg-[#FF9500] text-white rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-[15px] font-semibold">Hors parcours</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nearby participants */}
      <AnimatePresence>
        {nearbyParticipants.length > 0 && isActive && !isPaused && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute z-[9998] flex flex-col gap-1.5"
            style={{ top: 'calc(env(safe-area-inset-top) + 110px)', left: 12 }}
          >
            {nearbyParticipants.map(p => (
              <div
                key={p.userId}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-white font-bold">{p.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-[12px] text-white font-medium truncate max-w-[80px]">{p.name.split(' ')[0]}</span>
                <span className="text-[11px] text-white/60">{p.distance > 999 ? `${(p.distance/1000).toFixed(1)}km` : `${p.distance}m`}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats panel + Controls */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[9999]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Stats panel */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-3 mb-3 rounded-[20px] backdrop-blur-xl overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.88)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
          >
            <div className={`grid ${isCycling ? 'grid-cols-4' : 'grid-cols-3'} divide-x divide-black/10`}>
              {/* Distance */}
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">
                  {formatDistance(distanceTraveled)}
                </span>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-1">km</span>
              </div>

              {/* Time */}
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">
                  {formatTime(elapsedTime)}
                </span>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-1">temps</span>
              </div>

              {/* Speed (cycling only) */}
              {isCycling && (
                <div className="flex flex-col items-center justify-center py-4 px-2">
                  <span className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">
                    {averageSpeed.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-1">km/h</span>
                </div>
              )}

              {/* Elevation */}
              <div className="flex flex-col items-center justify-center py-4 px-2">
                <span className="text-[28px] font-bold text-gray-900 leading-none tabular-nums">
                  +{Math.round(elevationGain)}
                </span>
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mt-1">m D+</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-6 pb-6 pt-1">
          {/* Stop */}
          <button
            onClick={handleQuit}
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
          >
            <Square className="h-5 w-5 text-white" fill="white" />
          </button>

          {/* Pause / Resume */}
          <button
            onClick={handlePauseToggle}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-90 backdrop-blur-lg"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
          >
            {isPaused ? (
              <Play className="h-8 w-8 text-white ml-1" fill="white" />
            ) : (
              <Pause className="h-8 w-8 text-white" fill="white" />
            )}
          </button>

          {/* Re-center */}
          <button
            onClick={handleRecenter}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
          >
            <Locate className="h-5 w-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}
