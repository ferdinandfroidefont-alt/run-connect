import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ElevationProfile3D } from './ElevationProfile3D';
import { Mountain } from 'lucide-react';

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
  elevations,
  routeName,
  routeStats,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreen className="p-0">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/90 to-transparent p-4">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mountain className="h-5 w-5 text-primary" />
            {routeName || 'Vue 3D du parcours'}
          </DialogTitle>
        </DialogHeader>
        <div className="w-full h-full">
          <ElevationProfile3D
            coordinates={coordinates}
            elevations={elevations}
            autoPlay
            elevationExaggeration={2}
            routeStats={routeStats}
            className="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
