import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { X, Check, ChevronDown, ChevronUp, Undo, Trash2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { ElevationProfile } from '@/components/ElevationProfile';
import { useGeolocation } from '@/hooks/useGeolocation';

declare global {
  interface Window {
    google: typeof google;
  }
}

export const RouteCreation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setHideBottomNav } = useAppContext();
  const { getCurrentPosition } = useGeolocation();
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const routePath = useRef<google.maps.Polyline | null>(null);
  const routeCoordinates = useRef<google.maps.LatLng[]>([]);
  const waypoints = useRef<google.maps.LatLng[]>([]);
  const elevationService = useRef<google.maps.ElevationService | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);

  // Cacher le menu du bas au montage
  useEffect(() => {
    setHideBottomNav(true);
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;

    const initializeMap = async () => {
      try {
        const { data: apiKeyData } = await supabase.functions.invoke('google-maps-proxy', {
          body: { type: 'get-key' }
        });
        
        const googleMapsApiKey = apiKeyData?.apiKey || 'FALLBACK_KEY';
        
        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: 'weekly',
          libraries: ['geometry', 'places']
        });

        await loader.load();
        
        if (!mapContainer.current) return;

        map.current = new google.maps.Map(mapContainer.current, {
          zoom: 13,
          center: { lat: 48.8566, lng: 2.3522 },
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          gestureHandling: 'greedy',
        });

        setIsMapLoaded(true);

        elevationService.current = new google.maps.ElevationService();
        directionsService.current = new google.maps.DirectionsService();
        directionsRenderer.current = new google.maps.DirectionsRenderer({
          draggable: false,
          map: null,
          polylineOptions: {
            strokeColor: '#3b82f6',
            strokeOpacity: 1.0,
            strokeWeight: 4,
          }
        });

        // Centrer sur la position utilisateur
        getCurrentPosition()
          .then((position) => {
            if (position) {
              map.current?.setCenter(position);
              map.current?.setZoom(14);
            }
          })
          .catch(() => {
            console.log('Position non disponible, centré sur Paris');
          });

        // Créer le parcours au clic
        map.current.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          addWaypoint(event.latLng);
        });

      } catch (error) {
        console.error('Erreur lors du chargement de la carte:', error);
        toast.error("Erreur lors du chargement de la carte");
      }
    };

    initializeMap();
  }, [isMapLoaded]);

  const addWaypoint = async (latLng: google.maps.LatLng) => {
    waypoints.current.push(latLng);

    if (waypoints.current.length === 1) {
      // Premier point - initialiser le polyline
      routePath.current = new google.maps.Polyline({
        path: waypoints.current,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });
    } else if (waypoints.current.length >= 2) {
      // Points suivants - tracer l'itinéraire
      await createDirectionsRoute();
    }
  };

  const createDirectionsRoute = async () => {
    if (waypoints.current.length < 2 || !directionsService.current || !map.current) return;

    const origin = waypoints.current[0];
    const destination = waypoints.current[waypoints.current.length - 1];
    const intermediateWaypoints = waypoints.current.slice(1, -1).map(point => ({
      location: point,
      stopover: true
    }));

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.current!.route(
          {
            origin: origin,
            destination: destination,
            waypoints: intermediateWaypoints,
            travelMode: google.maps.TravelMode.WALKING,
            optimizeWaypoints: false
          },
          (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      if (routePath.current) {
        routePath.current.setMap(null);
      }

      routePath.current = new google.maps.Polyline({
        path: result.routes[0].overview_path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });

      routeCoordinates.current = result.routes[0].overview_path;
      
      await updateElevationProfile();
      calculateRouteStats();
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'itinéraire:', error);
      toast.error("Impossible de tracer l'itinéraire");
    }
  };

  const updateElevationProfile = async () => {
    if (routeCoordinates.current.length === 0 || !elevationService.current) return;

    try {
      const result = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        elevationService.current!.getElevationAlongPath(
          {
            path: routeCoordinates.current,
            samples: Math.min(256, routeCoordinates.current.length)
          },
          (results, status) => {
            if (status === 'OK' && results) {
              resolve(results);
            } else {
              reject(new Error(`Elevation request failed: ${status}`));
            }
          }
        );
      });

      const elevations = result.map(r => r.elevation);
      setRouteElevations(elevations);
    } catch (error) {
      console.error('Erreur lors de la récupération des altitudes:', error);
    }
  };

  const calculateRouteStats = () => {
    if (routeCoordinates.current.length < 2) {
      setTotalDistance(0);
      setTotalElevationGain(0);
      return;
    }

    let distance = 0;
    for (let i = 0; i < routeCoordinates.current.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        routeCoordinates.current[i],
        routeCoordinates.current[i + 1]
      );
    }
    setTotalDistance(distance / 1000);

    let elevationGain = 0;
    for (let i = 1; i < routeElevations.length; i++) {
      const diff = routeElevations[i] - routeElevations[i - 1];
      if (diff > 0) {
        elevationGain += diff;
      }
    }
    setTotalElevationGain(elevationGain);
  };

  const handleUndo = () => {
    if (waypoints.current.length === 0) return;
    
    waypoints.current.pop();
    
    if (waypoints.current.length === 0) {
      if (routePath.current) {
        routePath.current.setMap(null);
        routePath.current = null;
      }
      routeCoordinates.current = [];
      setRouteElevations([]);
      setTotalDistance(0);
      setTotalElevationGain(0);
    } else if (waypoints.current.length === 1) {
      if (routePath.current) {
        routePath.current.setMap(null);
      }
      routePath.current = new google.maps.Polyline({
        path: waypoints.current,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });
    } else {
      createDirectionsRoute();
    }
  };

  const handleClear = () => {
    waypoints.current = [];
    routeCoordinates.current = [];
    if (routePath.current) {
      routePath.current.setMap(null);
      routePath.current = null;
    }
    setRouteElevations([]);
    setTotalDistance(0);
    setTotalElevationGain(0);
  };

  const handleRecenter = async () => {
    try {
      const position = await getCurrentPosition();
      if (position) {
        map.current?.setCenter(position);
        map.current?.setZoom(14);
      }
    } catch {
      toast.error("Position non disponible");
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleFinish = () => {
    if (waypoints.current.length < 2) {
      toast.error("Veuillez tracer un parcours avec au moins 2 points");
      return;
    }

    // Sauvegarder le parcours dans localStorage pour le transmettre
    const routeData = {
      coordinates: routeCoordinates.current.map(coord => ({
        lat: coord.lat(),
        lng: coord.lng()
      })),
      distance: totalDistance,
      elevationGain: totalElevationGain,
      elevations: routeElevations
    };

    localStorage.setItem('pendingRoute', JSON.stringify(routeData));
    
    // Retourner à la carte principale avec un paramètre pour ouvrir le dialog de sauvegarde
    navigate('/?saveRoute=true');
  };

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Barre supérieure minimaliste */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm border-b border-border/30 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="text-2xl">✏️</span>
            Mode création d'itinéraire
          </h1>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="bg-background/80 hover:bg-background/90 backdrop-blur-sm border border-border/50"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleFinish}
              className="bg-primary/90 hover:bg-primary backdrop-blur-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Terminer
            </Button>
          </div>
        </div>
      </div>

      {/* Carte plein écran */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Outils latéraux */}
      <div className="absolute right-4 top-20 flex flex-col gap-2 z-10">
        <Button
          size="icon"
          variant="outline"
          onClick={handleRecenter}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg"
          title="Recentrer"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleUndo}
          disabled={waypoints.current.length === 0}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg disabled:opacity-50"
          title="Annuler dernier point"
        >
          <Undo className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={handleClear}
          disabled={waypoints.current.length === 0}
          className="bg-background/80 hover:bg-background/90 backdrop-blur-md border-border/50 shadow-lg disabled:opacity-50"
          title="Effacer tout"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats flottantes */}
      {totalDistance > 0 && (
        <div className="absolute top-20 left-4 z-10 bg-background/80 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-lg">
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-semibold text-foreground">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Dénivelé:</span>
              <span className="font-semibold text-foreground">{totalElevationGain.toFixed(0)} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Profil d'élévation */}
      {routeElevations.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <div className="mx-4 mb-4">
            <div className="bg-background/80 backdrop-blur-md border border-border/50 rounded-lg shadow-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-background/90 transition-colors"
                onClick={() => setShowElevationProfile(!showElevationProfile)}
              >
                <span className="text-sm font-medium text-foreground">Profil d'élévation</span>
                {showElevationProfile ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              {showElevationProfile && (
                <div className="p-4 pt-0">
                  <ElevationProfile elevations={routeElevations} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-4 py-2 shadow-lg">
        <p className="text-sm text-foreground text-center">
          👆 Cliquez sur la carte pour tracer votre parcours
        </p>
      </div>
    </div>
  );
};

export default RouteCreation;
