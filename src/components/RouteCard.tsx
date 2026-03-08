import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Route, TrendingUp, Mountain, Edit, Trash2, Calendar, Download, Box, Navigation, Globe, Camera } from "lucide-react";
import { RoutePhotoUploader } from '@/components/routes-feed/RoutePhotoUploader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToGPX, downloadGPXFile, GPXTrackPoint } from '@/lib/gpxExport';
import { ElevationProfile3DDialog } from './ElevationProfile3DDialog';

interface RouteCardProps {
  route: {
    id: string;
    name: string;
    description: string | null;
    total_distance: number | null;
    total_elevation_gain: number | null;
    created_at: string;
    coordinates: any;
  };
  onEdit: (route: any) => void;
  onDelete: (routeId: string) => void;
  onPublishToggle?: (isPublic: boolean) => void;
  isPublic?: boolean;
}

export const RouteCard = ({ route, onEdit, onDelete, onPublishToggle, isPublic = false }: RouteCardProps) => {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const polyline = useRef<google.maps.Polyline | null>(null);
  const [show3DDialog, setShow3DDialog] = useState(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  const formatDistance = (meters: number | null) => {
    if (!meters) return "N/A";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${Math.round(meters / 1000 * 10) / 10} km`;
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return "N/A";
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (distance: number | null) => {
    if (!distance) return "N/A";
    // Estimation basée sur une vitesse moyenne de 10 km/h
    const hours = (distance / 1000) / 10;
    const totalMinutes = hours * 60;
    const h = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    
    if (h > 0) {
      return `${h}h${min.toString().padStart(2, '0')}min`;
    }
    return `${min}min`;
  };

  const handleExportGPX = () => {
    if (!route.coordinates || !Array.isArray(route.coordinates)) {
      console.error('Coordonnées invalides pour l\'export GPX');
      return;
    }

    // Convertir les coordonnées au format GPX
    const trackPoints: GPXTrackPoint[] = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return {
          lat: Number(coord.lat),
          lng: Number(coord.lng),
          elevation: coord.elevation ? Number(coord.elevation) : undefined
        };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return {
          lat: Number(coord[0]),
          lng: Number(coord[1]),
          elevation: coord.length > 2 ? Number(coord[2]) : undefined
        };
      }
      return null;
    }).filter((point): point is NonNullable<typeof point> => point !== null);

    if (trackPoints.length === 0) {
      console.error('Aucun point valide trouvé pour l\'export GPX');
      return;
    }

    const gpxContent = exportToGPX(route.name, trackPoints, route.description || undefined);
    const filename = route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadGPXFile(filename, gpxContent);
  };

  useEffect(() => {
    if (!mapContainer.current || !window.google || !route.coordinates?.length) return;

    // Convert coordinates to LatLng format
    const path = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return { lat: Number(coord.lat), lng: Number(coord.lng) };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return { lat: Number(coord[0]), lng: Number(coord[1]) };
      }
      return null;
    }).filter(coord => coord !== null);

    if (path.length === 0) return;

    // Calculate bounds
    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));

    // Initialize map
    map.current = new google.maps.Map(mapContainer.current, {
      center: bounds.getCenter(),
      zoom: 10,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      gestureHandling: 'none',
      clickableIcons: false,
      keyboardShortcuts: false,
      styles: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'road',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    // Create polyline
    polyline.current = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#ef4444',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: map.current
    });

    // Fit bounds with padding
    map.current.fitBounds(bounds, 20);

    // Cleanup
    return () => {
      if (polyline.current) {
        polyline.current.setMap(null);
      }
      if (map.current) {
        map.current = null;
      }
    };
  }, [route.coordinates]);

  if (!route.coordinates?.length) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-48 bg-gray-100 flex items-center justify-center">
            <span className="text-sm text-gray-500">Aucun tracé disponible</span>
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg truncate">{route.name}</h3>
              <div className="flex gap-1 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(route)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(route.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {route.description || "Aucune description"}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(route.created_at), 'dd MMM yyyy', { locale: fr })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        {/* Mini carte */}
        <div className="relative h-48 bg-gray-100">
          <div 
            ref={mapContainer} 
            className="absolute inset-0 w-full h-full"
            style={{ minHeight: '192px' }}
          />
          
          {/* Badge avec date et boutons d'action */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge variant="secondary" className="bg-white/90 text-xs text-black">
              {format(new Date(route.created_at), 'dd MMM yyyy', { locale: fr })}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportGPX}
                className="bg-white/90 hover:bg-white shadow-sm text-black hover:text-black"
                title="Exporter en GPX"
              >
                <Download className="h-3 w-3 text-black" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(route)}
                className="bg-white/90 hover:bg-white shadow-sm text-black hover:text-black"
              >
                <Edit className="h-3 w-3 text-black" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDelete(route.id)}
                className="bg-white/90 hover:bg-white shadow-sm text-black hover:text-black"
              >
                <Trash2 className="h-3 w-3 text-black" />
              </Button>
            </div>
          </div>
        </div>

        {/* Informations de l'itinéraire */}
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 truncate">{route.name}</h3>
          
          {/* Statistiques */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1 text-sm">
              <Route className="h-3 w-3" />
              <span className="font-medium">{formatDistance(route.total_distance)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Mountain className="h-3 w-3" />
              <span>{formatElevation(route.total_elevation_gain)}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-3 w-3" />
              <span>{formatDuration(route.total_distance)}</span>
            </div>
          </div>

          {route.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {route.description}
            </p>
          )}

          {/* Bouton Mode Entraînement */}
          <Button
            onClick={() => navigate(`/training/route/${route.id}`)}
            className="w-full mt-2 gap-2 text-xs bg-primary hover:bg-primary/90"
            size="sm"
          >
            <Navigation className="h-3.5 w-3.5" />
            Mode Entraînement
          </Button>

          {/* Bouton Vue 3D */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShow3DDialog(true)}
            className="w-full mt-1 gap-2 text-xs"
          >
            <Box className="h-3.5 w-3.5" />
            Vue 3D du parcours
          </Button>
        </div>

        {/* 3D Dialog */}
        <ElevationProfile3DDialog
          open={show3DDialog}
          onOpenChange={setShow3DDialog}
          coordinates={
            Array.isArray(route.coordinates)
              ? route.coordinates.map((c: any) => ({
                  lat: Number(c.lat ?? c[0]),
                  lng: Number(c.lng ?? c[1]),
                }))
              : []
          }
          elevations={
            Array.isArray(route.coordinates)
              ? route.coordinates.map((c: any) => Number(c.elevation ?? c[2] ?? 0))
              : []
          }
          routeName={route.name}
          routeStats={
            route.total_distance || route.total_elevation_gain
              ? {
                  totalDistance: route.total_distance || 0,
                  elevationGain: route.total_elevation_gain || 0,
                  elevationLoss: 0,
                }
              : null
          }
        />
      </CardContent>
    </Card>
  );
};