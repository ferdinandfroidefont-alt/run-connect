import type { FC } from 'react';
import { RouteFlyover3D } from '@/components/RouteFlyover3D';

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
  fullCoordinates?: { lat: number; lng: number }[];
}

export const ElevationProfile3D: FC<ElevationProfile3DProps> = ({
  coordinates,
  elevations,
  autoPlay = false,
  elevationExaggeration = 1.3,
  className,
  routeName,
  routeStats,
  fullCoordinates,
}) => (
  <RouteFlyover3D
    coordinates={coordinates}
    elevations={elevations}
    autoPlay={autoPlay}
    elevationExaggeration={elevationExaggeration}
    className={className}
    routeName={routeName}
    routeStats={routeStats}
    fullCoordinates={fullCoordinates}
  />
);
