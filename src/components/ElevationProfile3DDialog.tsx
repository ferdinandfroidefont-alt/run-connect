import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ElevationProfile3D } from './ElevationProfile3D';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  const elevationsAreMissing = initialElevations.length === 0 || initialElevations.every(e => e === 0);

  useEffect(() => {
    if (!open || !elevationsAreMissing || coordinates.length < 2) {
      if (!elevationsAreMissing) setElevations(initialElevations);
      return;
    }

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
        setElevations(initialElevations);
      } finally {
        setLoading(false);
      }
    };

    fetchElevations();
  }, [open, coordinates, elevationsAreMissing, initialElevations]);

  const computedStats = React.useMemo(() => {
    if (routeStats && routeStats.totalDistance > 0) return routeStats;
    if (elevations.length < 2) return null;

    let gain = 0, loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }

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
        {/* Standard back header */}
        <div className="bg-card pt-[env(safe-area-inset-top)] border-b border-border/30 z-20 relative">
          <div className="flex items-center px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-primary gap-1"
            >
              <ArrowLeft className="h-5 w-5" />
              Retour
            </Button>
            <h2 className="flex-1 text-center font-semibold text-foreground pr-16">
              {routeName || 'Vue 3D'}
            </h2>
          </div>
        </div>

        <div className="w-full flex-1 relative" style={{ height: 'calc(100% - 52px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full bg-muted/10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement du relief...</p>
            </div>
          ) : (
            <ElevationProfile3D
              coordinates={coordinates}
              elevations={elevations}
              autoPlay={false}
              routeStats={computedStats}
              className="w-full h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
