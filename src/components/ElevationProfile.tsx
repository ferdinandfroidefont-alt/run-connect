import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Mountain, MapPin } from 'lucide-react';

interface ElevationProfileProps {
  elevations: number[];
  routeStats?: {
    totalDistance: number;
    elevationGain: number;
    elevationLoss: number;
    minElevation: number;
    maxElevation: number;
  } | null;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  elevations, 
  routeStats 
}) => {
  if (elevations.length === 0) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            Profil d'élévation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground text-sm">
          Tracez des points sur la carte pour voir le dénivelé
        </CardContent>
      </Card>
    );
  }

  // Créer le SVG du profil d'élévation
  const createElevationSVG = () => {
    const width = 300;
    const height = 120;
    const padding = 20;
    
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1; // Éviter division par 0
    
    // Créer les points du graphique
    const points = elevations.map((elev, index) => {
      const x = padding + (index / (elevations.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((elev - minElev) / elevRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="border rounded">
        {/* Grille de fond */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Zone sous la courbe */}
        <path
          d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="none"
        />
        
        {/* Ligne du profil */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        
        {/* Points sur la courbe */}
        {elevations.map((elev, index) => {
          const x = padding + (index / (elevations.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((elev - minElev) / elevRange) * (height - 2 * padding);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Étiquettes d'élévation */}
        <text x={padding} y={15} fontSize="10" fill="#666" textAnchor="start">
          {Math.round(maxElev)}m
        </text>
        <text x={padding} y={height - 5} fontSize="10" fill="#666" textAnchor="start">
          {Math.round(minElev)}m
        </text>
      </svg>
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mountain className="h-4 w-4" />
          Profil d'élévation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Graphique */}
        <div className="bg-muted/20 p-2 rounded">
          {createElevationSVG()}
        </div>
        
        {/* Statistiques */}
        {routeStats && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{(routeStats.totalDistance / 1000).toFixed(1)} km</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>+{routeStats.elevationGain}m</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span>-{routeStats.elevationLoss}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Mountain className="h-3 w-3" />
              <span>{routeStats.minElevation}-{routeStats.maxElevation}m</span>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          {elevations.length} point{elevations.length > 1 ? 's' : ''} tracé{elevations.length > 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};