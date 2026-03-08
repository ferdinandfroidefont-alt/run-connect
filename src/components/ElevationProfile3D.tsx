import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Gauge, Mountain, MapPin, Timer } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ElevationProfile3DProps {
  coordinates: { lat: number; lng: number }[];
  elevations: number[];
  activityType?: string;
  autoPlay?: boolean;
  elevationExaggeration?: number;
  className?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
}

export const ElevationProfile3D: React.FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = false,
  className = '',
  routeStats,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const trailPolylineRef = useRef<google.maps.Polyline | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentElevation, setCurrentElevation] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [showCountdown, setShowCountdown] = useState(false);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Total distance
  const totalRouteDistance = useMemo(() => {
    if (routeStats?.totalDistance) return routeStats.totalDistance;
    let d = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const dlat = (coordinates[i].lat - coordinates[i - 1].lat) * 111320;
      const dlng = (coordinates[i].lng - coordinates[i - 1].lng) * 111320 * Math.cos((coordinates[i].lat * Math.PI) / 180);
      d += Math.sqrt(dlat * dlat + dlng * dlng);
    }
    return d;
  }, [coordinates, routeStats]);

  // Elevation stats
  const elevStats = useMemo(() => {
    if (routeStats) return routeStats;
    let gain = 0, loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff; else loss += Math.abs(diff);
    }
    return { totalDistance: totalRouteDistance, elevationGain: Math.round(gain), elevationLoss: Math.round(loss) };
  }, [elevations, routeStats, totalRouteDistance]);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || coordinates.length < 2) return;

    const initMap = async () => {
      try {
        if (!window.google?.maps) {
          const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
            body: { type: 'get-key' }
          });
          const apiKey = apiKeyData?.apiKey || '';
          const loader = new Loader({ apiKey, version: 'weekly', libraries: ['geometry', 'places'] });
          await loader.load();
        }

        if (!mapContainerRef.current) return;

        const centerLat = coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length;
        const centerLng = coordinates.reduce((s, c) => s + c.lng, 0) / coordinates.length;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          mapTypeId: 'satellite',
          tilt: 60,
          heading: 0,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });

        mapRef.current = map;

        const b = new google.maps.LatLngBounds();
        coordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
        map.fitBounds(b, 40);

        // Glow polyline (outer)
        new google.maps.Polyline({
          path: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#5B7CFF',
          strokeOpacity: 0.15,
          strokeWeight: 14,
          map,
        });

        // Shadow polyline
        new google.maps.Polyline({
          path: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#5B7CFF',
          strokeOpacity: 0.35,
          strokeWeight: 8,
          map,
        });

        // Main polyline
        const poly = new google.maps.Polyline({
          path: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#5B7CFF',
          strokeOpacity: 1,
          strokeWeight: 4,
          map,
        });
        polylineRef.current = poly;

        // Trail polyline (shows completed path)
        const trailPoly = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#22c55e',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });
        trailPolylineRef.current = trailPoly;

        // Start marker
        new google.maps.Marker({
          position: coordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 5,
        });

        // End marker
        new google.maps.Marker({
          position: coordinates[coordinates.length - 1],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 5,
        });

        // Runner marker (pulsing dot)
        const marker = new google.maps.Marker({
          position: coordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#5B7CFF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          zIndex: 10,
        });
        markerRef.current = marker;

        setMapReady(true);
      } catch (err) {
        console.error('Failed to init Google Maps 3D:', err);
      }
    };

    initMap();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [coordinates]);

  // Heading
  const computeHeading = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (window.google?.maps?.geometry) {
      return google.maps.geometry.spherical.computeHeading(
        new google.maps.LatLng(from.lat, from.lng),
        new google.maps.LatLng(to.lat, to.lng)
      );
    }
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }, []);

  // Animation loop
  useEffect(() => {
    if (!mapReady || !mapRef.current || coordinates.length < 2) return;

    let lastTime = 0;
    let headingSmooth = 0;

    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) {
        lastTime = 0;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTime) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      const speedMultiplier = speedRef.current;
      let newProgress = progressRef.current + delta * 0.006 * speedMultiplier;
      if (newProgress >= 1) {
        newProgress = 0;
        setIsPlaying(false);
      }

      setProgress(newProgress);
      progressRef.current = newProgress;

      const totalIdx = coordinates.length - 1;
      const exactIdx = newProgress * totalIdx;
      const idx = Math.min(Math.floor(exactIdx), totalIdx - 1);
      const frac = exactIdx - idx;

      const currentPos = {
        lat: coordinates[idx].lat + (coordinates[idx + 1].lat - coordinates[idx].lat) * frac,
        lng: coordinates[idx].lng + (coordinates[idx + 1].lng - coordinates[idx].lng) * frac,
      };

      // Update marker
      markerRef.current?.setPosition(currentPos);

      // Update trail
      if (trailPolylineRef.current) {
        const trailPath = coordinates.slice(0, idx + 1).map(c => ({ lat: c.lat, lng: c.lng }));
        trailPath.push(currentPos);
        trailPolylineRef.current.setPath(trailPath);
      }

      // Elevation
      if (elevations.length > idx + 1) {
        const elev = elevations[idx] + (elevations[idx + 1] - elevations[idx]) * frac;
        setCurrentElevation(Math.round(elev));
      }

      // Smooth heading
      const lookAheadIdx = Math.min(idx + 8, totalIdx);
      const targetHeading = computeHeading(currentPos, coordinates[lookAheadIdx]);
      
      // Smooth heading interpolation
      let diff = targetHeading - headingSmooth;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      headingSmooth += diff * 0.08;

      const map = mapRef.current;
      if (map) {
        map.moveCamera({
          center: currentPos,
          heading: headingSmooth,
          tilt: 65,
          zoom: 17.5,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [mapReady, coordinates, elevations, computeHeading]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && progress === 0) {
      setShowCountdown(true);
      setTimeout(() => { setShowCountdown(false); setIsPlaying(true); }, 800);
    } else {
      setIsPlaying(p => !p);
    }
  }, [isPlaying, progress]);

  const handleRecenter = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    if (!mapRef.current || coordinates.length < 2) return;
    if (trailPolylineRef.current) trailPolylineRef.current.setPath([]);
    markerRef.current?.setPosition(coordinates[0]);
    const b = new google.maps.LatLngBounds();
    coordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
    mapRef.current.moveCamera({ tilt: 45, heading: 0 });
    mapRef.current.fitBounds(b, 40);
  }, [coordinates]);

  const cycleSpeed = useCallback(() => {
    setSpeed(s => s === 1 ? 2 : s === 2 ? 4 : 1);
  }, []);

  const currentKm = (progress * totalRouteDistance / 1000).toFixed(2);
  const totalKm = (totalRouteDistance / 1000).toFixed(1);

  // Elevation mini-profile data for the progress bar
  const elevationProfile = useMemo(() => {
    if (elevations.length < 2) return [];
    const samples = 60;
    const step = Math.max(1, Math.floor(elevations.length / samples));
    const points: number[] = [];
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const range = max - min || 1;
    for (let i = 0; i < elevations.length; i += step) {
      points.push((elevations[i] - min) / range);
    }
    return points;
  }, [elevations]);

  if (coordinates.length < 2) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted/20 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour la vue 3D</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-black", className)} style={{ minHeight: 300 }}>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Countdown overlay */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            initial={{ opacity: 0, scale: 2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-20 w-20 rounded-full bg-primary flex items-center justify-center"
            >
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top gradient for stats readability */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />

      {/* Live stats HUD — top left */}
      <div className="absolute top-3 left-3 z-20">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-4 py-3 space-y-2 min-w-[140px] border border-white/10">
          {/* Distance */}
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[20px] font-bold text-white leading-tight tabular-nums">{currentKm}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">km</p>
            </div>
          </div>

          {/* Elevation */}
          <div className="flex items-center gap-2">
            <Mountain className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[16px] font-semibold text-white leading-tight tabular-nums">{currentElevation}m</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">altitude</p>
            </div>
          </div>

          {/* Progress percentage */}
          <div className="pt-1 border-t border-white/10">
            <p className="text-[11px] text-white/40">{Math.round(progress * 100)}% · {totalKm} km total</p>
          </div>
        </div>
      </div>

      {/* Elevation gain/loss chips — top right */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <div className="bg-black/60 backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-white/10">
          <span className="text-[11px] text-emerald-400 font-semibold">↑ {elevStats.elevationGain}m</span>
        </div>
        <div className="bg-black/60 backdrop-blur-xl rounded-xl px-3 py-1.5 flex items-center gap-1.5 border border-white/10">
          <span className="text-[11px] text-red-400 font-semibold">↓ {elevStats.elevationLoss}m</span>
        </div>
      </div>

      {/* Bottom controls bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
        {/* Elevation mini-profile behind progress */}
        {elevationProfile.length > 0 && (
          <div className="h-10 mx-4 mb-1 flex items-end gap-px opacity-40">
            {elevationProfile.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-t-sm transition-colors",
                  (i / elevationProfile.length) < progress ? "bg-primary" : "bg-white/30"
                )}
                style={{ height: `${Math.max(4, h * 100)}%` }}
              />
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="mx-4 h-1 bg-white/20 rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-3 px-4 pb-3">
          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRecenter}
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </Button>

          {/* Play/Pause — larger */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 p-0 shadow-lg shadow-primary/30"
          >
            {isPlaying
              ? <Pause className="h-6 w-6 text-primary-foreground" />
              : <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
            }
          </Button>

          {/* Speed */}
          <Button
            size="sm"
            variant="ghost"
            onClick={cycleSpeed}
            className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
          >
            <span className="text-[12px] font-bold text-white">{speed}x</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
