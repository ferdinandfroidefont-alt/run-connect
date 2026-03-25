import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Route, TrendingUp, Mountain, Edit, Trash2, Download, Box, Navigation, Globe, Camera, Clock, MoreHorizontal, ChevronRight } from "lucide-react";
import { RoutePhotoUploader } from '@/components/routes-feed/RoutePhotoUploader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToGPX, downloadGPXFile, GPXTrackPoint } from '@/lib/gpxExport';
import { ElevationProfile3DDialog } from './ElevationProfile3DDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getUserLocationMarkerIcon } from '@/lib/mapUserLocationIcon';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';

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
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const { position } = useGeolocation();
  const [show3DDialog, setShow3DDialog] = useState(false);
  const [showPhotoUploader, setShowPhotoUploader] = useState(false);

  const formatElevation = (meters: number | null) => {
    if (!meters) return "—";
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (distance: number | null) => {
    if (!distance) return "—";
    const hours = (distance / 1000) / 10;
    const totalMinutes = hours * 60;
    const h = Math.floor(totalMinutes / 60);
    const min = Math.round(totalMinutes % 60);
    if (h > 0) return `${h}h${min.toString().padStart(2, '0')}`;
    return `${min} min`;
  };

  const handleExportGPX = () => {
    if (!route.coordinates || !Array.isArray(route.coordinates)) return;
    const trackPoints: GPXTrackPoint[] = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return { lat: Number(coord.lat), lng: Number(coord.lng), elevation: coord.elevation ? Number(coord.elevation) : undefined };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return { lat: Number(coord[0]), lng: Number(coord[1]), elevation: coord.length > 2 ? Number(coord[2]) : undefined };
      }
      return null;
    }).filter((point): point is NonNullable<typeof point> => point !== null);
    if (trackPoints.length === 0) return;
    const gpxContent = exportToGPX(route.name, trackPoints, route.description || undefined);
    const filename = route.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadGPXFile(filename, gpxContent);
  };

  useEffect(() => {
    if (!mapContainer.current || !window.google || !route.coordinates?.length) return;
    userLocationMarkerRef.current?.setMap(null);
    userLocationMarkerRef.current = null;
    const path = route.coordinates.map((coord: any) => {
      if (coord.lat !== undefined && coord.lng !== undefined) {
        return { lat: Number(coord.lat), lng: Number(coord.lng) };
      } else if (Array.isArray(coord) && coord.length >= 2) {
        return { lat: Number(coord[0]), lng: Number(coord[1]) };
      }
      return null;
    }).filter(coord => coord !== null);
    if (path.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));

    map.current = new google.maps.Map(mapContainer.current, {
      center: bounds.getCenter(),
      zoom: 10,
      mapTypeId: 'roadmap',
      disableDefaultUI: true,
      gestureHandling: 'none',
      clickableIcons: false,
      keyboardShortcuts: false,
      styles: [
        { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'landscape', stylers: [{ saturation: -30 }] },
      ]
    });

    polyline.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#5B7CFF',
      strokeOpacity: 0.9,
      strokeWeight: 3,
      map: map.current
    });

    map.current.fitBounds(bounds, 30);

    return () => {
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      if (polyline.current) polyline.current.setMap(null);
      map.current = null;
    };
  }, [route.coordinates]);

  useEffect(() => {
    if (!map.current) return;
    if (!position) {
      userLocationMarkerRef.current?.setMap(null);
      userLocationMarkerRef.current = null;
      return;
    }
    userLocationMarkerRef.current?.setMap(null);
    userLocationMarkerRef.current = new google.maps.Marker({
      map: map.current,
      position: { lat: position.lat, lng: position.lng },
      icon: getUserLocationMarkerIcon(),
      zIndex: 1000,
      title: 'Votre position',
    });
  }, [position, route.coordinates]);

  const hasCoordinates = route.coordinates?.length > 0;

  return (
    <>
      <div className="ios-card overflow-hidden">
        {/* Map preview */}
        {hasCoordinates ? (
          <div className="relative mx-4 mt-4 rounded-2xl overflow-hidden">
            <div
              ref={mapContainer}
              className="w-full h-44"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

            {/* Date badge */}
            <div className="absolute top-3 left-3">
              <span className="text-[11px] font-medium bg-background/80 backdrop-blur-sm text-foreground px-2.5 py-1 rounded-full">
                {format(new Date(route.created_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>

            {/* Actions menu */}
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm">
                    <MoreHorizontal className="h-4 w-4 text-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => onEdit(route)}>
                    <Edit className="h-4 w-4 mr-2" /> Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportGPX}>
                    <Download className="h-4 w-4 mr-2" /> Exporter GPX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShow3DDialog(true)}>
                    <Box className="h-4 w-4 mr-2" /> Vue 3D
                  </DropdownMenuItem>
                  {isPublic && (
                    <DropdownMenuItem onClick={() => setShowPhotoUploader(true)}>
                      <Camera className="h-4 w-4 mr-2" /> Ajouter photos
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDelete(route.id)} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Stats overlay at bottom */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-[12px] font-semibold bg-background/80 backdrop-blur-sm text-foreground px-2.5 py-1.5 rounded-full">
                <Route className="h-3 w-3" /> {formatMeters(route.total_distance)}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-semibold bg-background/80 backdrop-blur-sm text-foreground px-2.5 py-1.5 rounded-full">
                <Mountain className="h-3 w-3" /> {formatElevation(route.total_elevation_gain)}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-semibold bg-background/80 backdrop-blur-sm text-foreground px-2.5 py-1.5 rounded-full">
                <Clock className="h-3 w-3" /> {formatDuration(route.total_distance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4 rounded-2xl h-32 bg-secondary flex items-center justify-center">
            <Route className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}

        {/* Content */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] font-semibold text-foreground truncate">{route.name}</h3>
              {route.description && (
                <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">{route.description}</p>
              )}
            </div>
          </div>

          {/* Training button */}
          <button
            onClick={() => navigate(`/training/route/${route.id}`)}
            className="w-full mt-3 flex items-center justify-between bg-primary/10 hover:bg-primary/15 active:bg-primary/20 text-primary rounded-xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Navigation className="h-4 w-4" />
              <span className="text-[15px] font-semibold">Mode Entraînement</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </button>

          {/* Publish toggle */}
          {onPublishToggle && (
            <div className="flex items-center justify-between mt-3 bg-secondary/60 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-[14px] font-medium text-foreground">
                  {isPublic ? 'Publié dans le feed' : 'Publier'}
                </span>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={onPublishToggle}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3D Dialog */}
      <ElevationProfile3DDialog
        open={show3DDialog}
        onOpenChange={setShow3DDialog}
        coordinates={
          Array.isArray(route.coordinates)
            ? route.coordinates.map((c: any) => ({ lat: Number(c.lat ?? c[0]), lng: Number(c.lng ?? c[1]) }))
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
            ? { totalDistance: route.total_distance || 0, elevationGain: route.total_elevation_gain || 0, elevationLoss: 0 }
            : null
        }
      />

      <RoutePhotoUploader
        routeId={route.id}
        open={showPhotoUploader}
        onOpenChange={setShowPhotoUploader}
      />
    </>
  );
};
