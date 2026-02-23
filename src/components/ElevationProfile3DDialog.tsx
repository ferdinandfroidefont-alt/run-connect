import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ElevationProfile3D } from './ElevationProfile3D';
import { Mountain, Loader2 } from 'lucide-react';

interface ElevationProfile3DDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coordinates: { lat: number; lng: number }[];
  elevations: number[];
  routeName?: string;
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
  } | null;
}

export const ElevationProfile3DDialog: React.FC<ElevationProfile3DDialogProps> = ({
  open,
  onOpenChange,
  coordinates,
  elevations: initialElevations,
  routeName,
  routeStats,
}) => {
  const [elevations, setElevations] = useState<number[]>(initialElevations);
  const [loading, setLoading] = useState(false);

  // Check if elevations are all zero (missing data)
  const elevationsAreMissing = initialElevations.length === 0 || initialElevations.every(e => e === 0);

  useEffect(() => {
    if (!open || !elevationsAreMissing || coordinates.length < 2) {
      if (!elevationsAreMissing) setElevations(initialElevations);
      return;
    }

    // Fetch elevations from Google Elevation API
    const fetchElevations = async () => {
      if (!window.google?.maps) return;

      setLoading(true);
      try {
        const elevationService = new google.maps.ElevationService();
        const path = coordinates.map(c => ({ lat: c.lat, lng: c.lng }));
        const samples = Math.min(512, Math.max(coordinates.length, 50));

        const result = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
          elevationService.getElevationAlongPath(
            { path, samples },
            (results, status) => {
              if (status === 'OK' && results) resolve(results);
              else reject(new Error(`Elevation API failed: ${status}`));
            }
          );
        });

        setElevations(result.map(r => r.elevation));
      } catch (error) {
        console.error('Erreur récupération élévations:', error);
        // Keep zero elevations as fallback
        setElevations(initialElevations);
      } finally {
        setLoading(false);
      }
    };

    fetchElevations();
  }, [open, coordinates, elevationsAreMissing, initialElevations]);

  // Compute stats from fetched elevations if routeStats missing
  const computedStats = React.useMemo(() => {
    if (routeStats && routeStats.totalDistance > 0) return routeStats;
    if (elevations.length < 2) return null;

    let gain = 0, loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

    // Estimate distance from coordinates
    let totalDist = 0;
    if (window.google?.maps?.geometry) {
      for (let i = 0; i < coordinates.length - 1; i++) {
        totalDist += google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(coordinates[i].lat, coordinates[i].lng),
          new google.maps.LatLng(coordinates[i + 1].lat, coordinates[i + 1].lng)
        );
      }
    }

    return {
      totalDistance: totalDist || routeStats?.totalDistance || 0,
      elevationGain: Math.round(gain),
      elevationLoss: Math.round(loss),
    };
  }, [elevations, routeStats, coordinates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreen className="p-0" aria-describedby={undefined}>
        <DialogHeader className="absolute top-0 left-0 right-12 z-10 bg-gradient-to-b from-background/90 to-transparent p-4">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mountain className="h-5 w-5 text-primary" />
            {routeName || 'Vue 3D du parcours'}
          </DialogTitle>
        </DialogHeader>
        <div className="w-full h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full bg-[#0a0a1a] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement du relief...</p>
            </div>
          ) : (
            <ElevationProfile3D
              coordinates={coordinates}
              elevations={elevations}
              autoPlay={false}
              elevationExaggeration={2}
              routeStats={computedStats}
              className="w-full h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
