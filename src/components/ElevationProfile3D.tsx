import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Locate } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from '@/integrations/supabase/client';

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
  const shadowPolylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const animationRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [currentElevation, setCurrentElevation] = useState(0);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Compute bounds
  // bounds computed inline where needed

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
          const loader = new Loader({
            apiKey,
            version: 'weekly',
            libraries: ['geometry', 'places'],
          });
          await loader.load();
        }

        if (!mapContainerRef.current) return;

        // Center of route
        const centerLat = coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length;
        const centerLng = coordinates.reduce((s, c) => s + c.lng, 0) / coordinates.length;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 15,
          mapTypeId: 'satellite',
          tilt: 45,
          heading: 0,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapRef.current = map;

        // Fit bounds
        const b = new google.maps.LatLngBounds();
        coordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));
        map.fitBounds(b, 40);

        // Shadow polyline (halo)
        const shadowPoly = new google.maps.Polyline({
          path: coordinates.map(c => ({ lat: c.lat, lng: c.lng })),
          geodesic: true,
          strokeColor: '#5B7CFF',
          strokeOpacity: 0.2,
          strokeWeight: 10,
          map,
        });
        shadowPolylineRef.current = shadowPoly;

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

        // Runner marker
        const marker = new google.maps.Marker({
          position: coordinates[0],
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: '#5B7CFF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });
        markerRef.current = marker;

        setMapReady(true);
      } catch (err) {
        console.error('Failed to init Google Maps 3D:', err);
      }
    };

    initMap();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [coordinates]);

  // Compute heading between two points
  const computeHeading = useCallback((from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (window.google?.maps?.geometry) {
      return google.maps.geometry.spherical.computeHeading(
        new google.maps.LatLng(from.lat, from.lng),
        new google.maps.LatLng(to.lat, to.lng)
      );
    }
    // Fallback
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

    const animate = (timestamp: number) => {
      if (!isPlayingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (!lastTime) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Very slow speed
      let newProgress = progressRef.current + delta * 0.008;
      if (newProgress >= 1) newProgress = 0;

      setProgress(newProgress);
      progressRef.current = newProgress;

      // Current position
      const totalIdx = coordinates.length - 1;
      const exactIdx = newProgress * totalIdx;
      const idx = Math.min(Math.floor(exactIdx), totalIdx - 1);
      const frac = exactIdx - idx;

      const currentPos = {
        lat: coordinates[idx].lat + (coordinates[idx + 1].lat - coordinates[idx].lat) * frac,
        lng: coordinates[idx].lng + (coordinates[idx + 1].lng - coordinates[idx].lng) * frac,
      };

      // Update marker
      if (markerRef.current) {
        markerRef.current.setPosition(currentPos);
      }

      // Update elevation
      if (elevations.length > idx + 1) {
        const elev = elevations[idx] + (elevations[idx + 1] - elevations[idx]) * frac;
        setCurrentElevation(Math.round(elev));
      }

      // Look-ahead for heading
      const lookAheadIdx = Math.min(idx + 5, totalIdx);
      const heading = computeHeading(currentPos, coordinates[lookAheadIdx]);

      // Smooth camera move
      const map = mapRef.current;
      if (map) {
        map.moveCamera({
          center: currentPos,
          heading,
          tilt: 60,
          zoom: 17,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mapReady, coordinates, elevations, computeHeading]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const handleRecenter = useCallback(() => {
    setIsPlaying(false);
    if (!mapRef.current || coordinates.length < 2) return;

    const b = new google.maps.LatLngBounds();
    coordinates.forEach(c => b.extend({ lat: c.lat, lng: c.lng }));

    mapRef.current.moveCamera({
      tilt: 45,
      heading: 0,
    });
    mapRef.current.fitBounds(b, 40);
  }, [coordinates]);

  const currentKm = (progress * totalRouteDistance / 1000).toFixed(2);

  if (coordinates.length < 2) {
    return (
      <div className={`flex items-center justify-center h-64 bg-muted/20 rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Pas assez de points pour la vue 3D</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ minHeight: 300 }}>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Controls overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={handlePlayPause}
          className="bg-background/80 backdrop-blur-sm border border-border/50 h-8 w-8 p-0"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleRecenter}
          className="bg-background/80 backdrop-blur-sm border border-border/50 h-8 w-8 p-0"
        >
          <Locate className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Live stats overlay */}
      <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 text-xs space-y-1.5 z-10">
        <div className="text-primary font-bold text-sm">{currentKm} km</div>
        <div className="text-foreground">⛰️ {currentElevation} m</div>
        {routeStats && (
          <>
            <div className="border-t border-border/30 pt-1 mt-1 text-muted-foreground">
              Total : {(routeStats.totalDistance / 1000).toFixed(1)} km
            </div>
            <div className="text-green-400">↑ {routeStats.elevationGain}m</div>
            <div className="text-red-400">↓ {routeStats.elevationLoss}m</div>
          </>
        )}
        <div className="text-muted-foreground">{Math.round(progress * 100)}%</div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30 z-10">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
};
