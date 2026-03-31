import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ElevationProfile3D } from './ElevationProfile3D';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchElevationsForCoords, samplePathCoords } from '@/lib/openElevation';
import { densifyMapCoords, pathLengthMeters, type MapCoord } from '@/lib/geoUtils';

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
      setLoading(true);
      try {
        const path: MapCoord[] = coordinates.map((c) => ({ lat: c.lat, lng: c.lng }));
        const dens = densifyMapCoords(path);
        const samples = Math.min(512, Math.max(dens.length, 50));
        const sampled = samplePathCoords(dens, samples);
        const el = await fetchElevationsForCoords(sampled);
        setElevations(el.length > 0 ? el : initialElevations);
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

    const path: MapCoord[] = coordinates.map((c) => ({ lat: c.lat, lng: c.lng }));
    const totalDist = path.length >= 2 ? pathLengthMeters(path) : 0;

    return {
      totalDistance: totalDist || routeStats?.totalDistance || 0,
      elevationGain: Math.round(gain),
      elevationLoss: Math.round(loss),
    };
  }, [elevations, routeStats, coordinates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background p-0"
        aria-describedby={undefined}
      >
        <div className="absolute top-0 left-0 z-40 pt-[env(safe-area-inset-top)]">
          <div className="px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 gap-1.5 rounded-full border-border/80 bg-card/90 px-3 shadow-sm backdrop-blur-md"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-[13px]">Retour</span>
            </Button>
          </div>
        </div>

        {/* flex-1 + min-h-0 : hauteur réelle pour le canvas Mapbox (éviter 0×0). */}
        <div className="relative flex min-h-0 flex-1 basis-0 flex-col">
          {loading ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-secondary/30">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="absolute inset-0 h-10 w-10 rounded-full bg-primary/15 animate-ping" />
              </div>
              <div className="text-center px-4">
                <p className="text-[15px] font-medium text-foreground">Préparation du survol 3D</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Chargement du relief et du tracé…</p>
              </div>
            </div>
          ) : (
            <ElevationProfile3D
              coordinates={coordinates}
              elevations={elevations}
              autoPlay={false}
              routeName={routeName}
              routeStats={computedStats}
              className="min-h-0 w-full flex-1 rounded-none"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
