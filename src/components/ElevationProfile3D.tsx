import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Mountain, MapPin, TrendingUp } from 'lucide-react';
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
  routeName?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
}

// Haversine distance in meters
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const ElevationProfile3D: React.FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = false,
  className = '',
  routeName,
  routeStats,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const remainingPolyRef = useRef<google.maps.Polyline | null>(null);
  const traveledPolyRef = useRef<google.maps.Polyline | null>(null);
  const traveledGlowRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentElevation, setCurrentElevation] = useState(0);
  const [currentSlope, setCurrentSlope] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 3>(1);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  // Pre-compute cumulative distances
  const cumulativeDistances = useMemo(() => {
    const dists = [0];
    for (let i = 1; i < coordinates.length; i++) {
      dists.push(dists[i - 1] + haversine(coordinates[i - 1], coordinates[i]));
    }
    return dists;
  }, [coordinates]);

  const totalRouteDistance = useMemo(() => {
    if (routeStats?.totalDistance) return routeStats.totalDistance;
    return cumulativeDistances[cumulativeDistances.length - 1] || 0;
  }, [cumulativeDistances, routeStats]);

  // Pre-compute slopes (%)
  const slopes = useMemo(() => {
    const result: number[] = [0];
    for (let i = 1; i < coordinates.length; i++) {
      const dElev = (elevations[i] || 0) - (elevations[i - 1] || 0);
      const dHoriz = haversine(coordinates[i - 1], coordinates[i]);
      result.push(dHoriz > 1 ? (dElev / dHoriz) * 100 : 0);
    }
    return result;
  }, [coordinates, elevations]);

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

        // Remaining path (semi-transparent, full route)
        const remainingPoly = new google.maps.Polyline({
          path: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#5B7CFF',
          strokeOpacity: 0.3,
          strokeWeight: 6,
          map,
        });
        remainingPolyRef.current = remainingPoly;

        // Traveled glow (outer)
        const traveledGlow = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#22c55e',
          strokeOpacity: 0.2,
          strokeWeight: 12,
          map,
        });
        traveledGlowRef.current = traveledGlow;

        // Traveled path (vivid)
        const traveledPoly = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor: '#22c55e',
          strokeOpacity: 1,
          strokeWeight: 5,
          map,
        });
        traveledPolyRef.current = traveledPoly;

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

        // Drone marker — directional arrow
        const marker = new google.maps.Marker({
          position: coordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#5B7CFF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
            rotation: 0,
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

  // Heading computation
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
    let tiltSmooth = 65;
    let zoomSmooth = 17.5;

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

      // Update marker position and rotation
      if (markerRef.current) {
        markerRef.current.setPosition(currentPos);
      }

      // Update traveled polylines
      const trailPath = coordinates.slice(0, idx + 1).map(c => ({ lat: c.lat, lng: c.lng }));
      trailPath.push(currentPos);
      traveledPolyRef.current?.setPath(trailPath);
      traveledGlowRef.current?.setPath(trailPath);

      // Elevation & slope
      if (elevations.length > idx + 1) {
        const elev = elevations[idx] + (elevations[idx + 1] - elevations[idx]) * frac;
        setCurrentElevation(Math.round(elev));
      }

      const slopeVal = slopes[idx] || 0;
      const smoothSlope = slopeVal + ((slopes[Math.min(idx + 1, totalIdx)] || 0) - slopeVal) * frac;
      setCurrentSlope(Math.round(smoothSlope * 10) / 10);

      // Smooth heading with increased look-ahead
      const lookAheadIdx = Math.min(idx + 15, totalIdx);
      const targetHeading = computeHeading(currentPos, coordinates[lookAheadIdx]);

      let diff = targetHeading - headingSmooth;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      headingSmooth += diff * 0.06;

      // Update marker rotation
      if (markerRef.current) {
        const icon = markerRef.current.getIcon() as google.maps.Symbol;
        if (icon) {
          markerRef.current.setIcon({ ...icon, rotation: headingSmooth });
        }
      }

      // Dynamic tilt based on slope (uphill = less tilt, downhill = more tilt)
      const targetTilt = 65 + Math.max(-10, Math.min(5, smoothSlope * 0.5));
      tiltSmooth += (targetTilt - tiltSmooth) * 0.04;

      // Dynamic zoom based on heading change rate
      const headingChangeRate = Math.abs(diff);
      const targetZoom = headingChangeRate > 15 ? 16.5 : 17;
      zoomSmooth += (targetZoom - zoomSmooth) * 0.03;

      const map = mapRef.current;
      if (map) {
        map.moveCamera({
          center: currentPos,
          heading: headingSmooth,
          tilt: tiltSmooth,
          zoom: zoomSmooth,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [mapReady, coordinates, elevations, slopes, computeHeading]);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying && progress === 0) {
      setCountdownNum(3);
      setShowCountdown(true);
      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdownNum(count);
        } else {
          clearInterval(interval);
          setShowCountdown(false);
          setIsPlaying(true);
        }
      }, 600);
    } else {
      setIsPlaying(p => !p);
    }
  }, [isPlaying, progress]);

  const handleRecenter = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    progressRef.current = 0;
    if (!mapRef.current || coordinates.length < 2) return;
    traveledPolyRef.current?.setPath([]);
    traveledGlowRef.current?.setPath([]);
    markerRef.current?.setPosition(coordinates[0]);
    const b = new google.maps.LatLngBounds();
    coordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
    mapRef.current.moveCamera({ tilt: 45, heading: 0 });
    mapRef.current.fitBounds(b, 40);
  }, [coordinates]);

  const cycleSpeed = useCallback(() => {
    setSpeed(s => s === 1 ? 2 : s === 2 ? 3 : 1);
  }, []);

  const currentKm = (progress * totalRouteDistance / 1000).toFixed(2);

  // Elevation mini-profile data
  const elevationProfile = useMemo(() => {
    if (elevations.length < 2) return [];
    const samples = 80;
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

      {/* Countdown overlay with numbers */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={countdownNum}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="h-24 w-24 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
              >
                <span className="text-[40px] font-bold text-primary-foreground">{countdownNum}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* HUD Stats Bar — full width */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="mx-3 mt-2 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 px-4 py-3">
          {/* Route name subtitle */}
          {routeName && (
            <p className="text-[11px] text-white/50 text-center mb-2 truncate">{routeName}</p>
          )}
          <div className="flex items-center justify-around">
            {/* Distance */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                <p className="text-[24px] font-bold text-white leading-tight tabular-nums">{currentKm}</p>
              </div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">km</p>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/15" />

            {/* Slope */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <p className="text-[24px] font-bold text-white leading-tight tabular-nums">
                  {currentSlope > 0 ? '+' : ''}{currentSlope.toFixed(1)}
                </p>
              </div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">pente %</p>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-white/15" />

            {/* Altitude */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Mountain className="h-3 w-3 text-amber-400" />
                <p className="text-[24px] font-bold text-white leading-tight tabular-nums">{currentElevation}</p>
              </div>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">altitude m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom controls area */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom)]">
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Elevation mini-profile with cursor */}
        {elevationProfile.length > 0 && (
          <div className="relative h-16 mx-4 mb-2">
            {/* Gain/loss labels */}
            <div className="absolute top-0 right-0 flex gap-2 z-10">
              <span className="text-[10px] font-semibold text-emerald-400">↑{elevStats.elevationGain}m</span>
              <span className="text-[10px] font-semibold text-red-400">↓{elevStats.elevationLoss}m</span>
            </div>

            {/* Bars */}
            <div className="flex items-end gap-px h-full pt-4 opacity-50">
              {elevationProfile.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t-sm transition-colors duration-150",
                    (i / elevationProfile.length) < progress ? "bg-emerald-400" : "bg-white/25"
                  )}
                  style={{ height: `${Math.max(6, h * 100)}%` }}
                />
              ))}
            </div>

            {/* Cursor line */}
            <div
              className="absolute top-3 bottom-0 w-0.5 bg-white rounded-full z-10 transition-[left] duration-100"
              style={{ left: `${progress * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-primary shadow-lg" />
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mx-4 h-1 bg-white/20 rounded-full overflow-hidden mb-3 relative z-10">
          <motion.div
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3 relative z-10">
          {/* Reset */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRecenter}
            className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </Button>

          {/* Play/Pause — 60px */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlayPause}
            className="h-[60px] w-[60px] rounded-full bg-primary hover:bg-primary/90 p-0 shadow-lg shadow-primary/30"
          >
            {isPlaying
              ? <Pause className="h-6 w-6 text-primary-foreground" />
              : <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
            }
          </Button>

          {/* Speed with label */}
          <div className="flex flex-col items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={cycleSpeed}
              className="h-11 w-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 p-0"
            >
              <span className="text-[12px] font-bold text-white">{speed}x</span>
            </Button>
            <span className="text-[9px] text-white/40 font-medium">vitesse</span>
          </div>
        </div>
      </div>
    </div>
  );
};
