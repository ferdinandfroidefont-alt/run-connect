import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { X, Check, ChevronDown, ChevronUp, Undo, Trash2, Navigation, Route, MapPin } from 'lucide-react';
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
  const waypointMarkers = useRef<google.maps.Marker[]>([]);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [routeElevations, setRouteElevations] = useState<number[]>([]);
  const [showElevationProfile, setShowElevationProfile] = useState(true);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalElevationGain, setTotalElevationGain] = useState(0);
  const [totalElevationLoss, setTotalElevationLoss] = useState(0);
  const [isManualMode, setIsManualMode] = useState(false);

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

  // Ajouter un marqueur visuel pour chaque waypoint
  const addWaypointMarker = (latLng: google.maps.LatLng, index: number) => {
    if (!map.current) return;
    
    const marker = new google.maps.Marker({
      position: latLng,
      map: map.current,
      label: {
        text: String(index + 1),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px'
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: isManualMode ? '#f97316' : '#3b82f6',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2
      }
    });
    waypointMarkers.current.push(marker);
  };

  // Effacer tous les marqueurs
  const clearMarkers = () => {
    waypointMarkers.current.forEach(marker => marker.setMap(null));
    waypointMarkers.current = [];
  };

  const addWaypoint = async (latLng: google.maps.LatLng) => {
    waypoints.current.push(latLng);
    addWaypointMarker(latLng, waypoints.current.length - 1);

    if (waypoints.current.length === 1) {
      // Premier point - initialiser le polyline
      routePath.current = new google.maps.Polyline({
        path: waypoints.current,
        geodesic: true,
        strokeColor: isManualMode ? '#f97316' : '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });
      routeCoordinates.current = [latLng];
    } else if (waypoints.current.length >= 2) {
      if (isManualMode) {
        // Mode manuel - ligne droite entre points
        await createManualRoute();
      } else {
        // Mode guidé - suivre les routes
        await createDirectionsRoute();
      }
    }
  };

  // Mode manuel : tracé en ligne droite
  const createManualRoute = async () => {
    if (waypoints.current.length < 2 || !map.current) return;

    // Créer un chemin direct entre tous les points
    routeCoordinates.current = [...waypoints.current];

    if (routePath.current) {
      routePath.current.setMap(null);
    }

    routePath.current = new google.maps.Polyline({
      path: routeCoordinates.current,
      geodesic: true,
      strokeColor: '#f97316',
      strokeOpacity: 1.0,
      strokeWeight: 4,
      strokeDasharray: [10, 5],
      map: map.current,
    } as google.maps.PolylineOptions);

    await updateElevationAndStats();
  };

  // Mode guidé : suivre les routes existantes
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
      
      await updateElevationAndStats();
      
    } catch (error) {
      console.error('Erreur lors de la création de l\'itinéraire:', error);
      toast.error("Impossible de tracer l'itinéraire sur route. Essayez le mode manuel.");
    }
  };

  // Mise à jour élévation ET stats en une seule fonction pour éviter race condition
  const updateElevationAndStats = async () => {
    if (routeCoordinates.current.length === 0 || !elevationService.current) return;

    // Calculer d'abord la distance (pas besoin d'attendre l'élévation)
    let distance = 0;
    for (let i = 0; i < routeCoordinates.current.length - 1; i++) {
      distance += google.maps.geometry.spherical.computeDistanceBetween(
        routeCoordinates.current[i],
        routeCoordinates.current[i + 1]
      );
    }
    setTotalDistance(distance / 1000);

    try {
      // Augmenter le nombre d'échantillons pour plus de précision
      const numSamples = Math.min(512, Math.max(routeCoordinates.current.length, 100));
      
      const result = await new Promise<google.maps.ElevationResult[]>((resolve, reject) => {
        elevationService.current!.getElevationAlongPath(
          {
            path: routeCoordinates.current,
            samples: numSamples
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
      
      // Calculer D+ et D- AVANT setState pour éviter race condition
      let elevationGain = 0;
      let elevationLoss = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 0) {
          elevationGain += diff;
        } else {
          elevationLoss += Math.abs(diff);
        }
      }
      
      // Mettre à jour tous les états en même temps
      setRouteElevations(elevations);
      setTotalElevationGain(Math.round(elevationGain));
      setTotalElevationLoss(Math.round(elevationLoss));
      
    } catch (error) {
      console.error('Erreur lors de la récupération des altitudes:', error);
    }
  };

  // Toggle mode et recréer la route si elle existe
  const handleModeToggle = async () => {
    const newMode = !isManualMode;
    setIsManualMode(newMode);
    
    if (waypoints.current.length >= 2) {
      // Recréer la route avec le nouveau mode
      clearMarkers();
      waypoints.current.forEach((wp, i) => addWaypointMarker(wp, i));
      
      if (newMode) {
        await createManualRoute();
      } else {
        await createDirectionsRoute();
      }
    }
    
    toast.success(newMode ? "Mode manuel activé (hors-piste)" : "Mode guidé activé (routes)");
  };

  const handleUndo = async () => {
    if (waypoints.current.length === 0) return;
    
    waypoints.current.pop();
    
    // Supprimer le dernier marqueur
    const lastMarker = waypointMarkers.current.pop();
    if (lastMarker) lastMarker.setMap(null);
    
    if (waypoints.current.length === 0) {
      if (routePath.current) {
        routePath.current.setMap(null);
        routePath.current = null;
      }
      routeCoordinates.current = [];
      setRouteElevations([]);
      setTotalDistance(0);
      setTotalElevationGain(0);
      setTotalElevationLoss(0);
    } else if (waypoints.current.length === 1) {
      if (routePath.current) {
        routePath.current.setMap(null);
      }
      routePath.current = new google.maps.Polyline({
        path: waypoints.current,
        geodesic: true,
        strokeColor: isManualMode ? '#f97316' : '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map.current,
      });
      routeCoordinates.current = [...waypoints.current];
      setRouteElevations([]);
      setTotalDistance(0);
      setTotalElevationGain(0);
      setTotalElevationLoss(0);
    } else {
      if (isManualMode) {
        await createManualRoute();
      } else {
        await createDirectionsRoute();
      }
    }
  };

  const handleClear = () => {
    waypoints.current = [];
    routeCoordinates.current = [];
    clearMarkers();
    if (routePath.current) {
      routePath.current.setMap(null);
      routePath.current = null;
    }
    setRouteElevations([]);
    setTotalDistance(0);
    setTotalElevationGain(0);
    setTotalElevationLoss(0);
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
      elevationLoss: totalElevationLoss,
      elevations: routeElevations,
      isManual: isManualMode
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

      {/* Toggle Mode */}
      <div className="absolute left-4 top-20 z-10">
        <div className="bg-background/90 backdrop-blur-md border border-border/50 rounded-xl p-1 shadow-lg flex gap-1">
          <Button
            size="sm"
            variant={!isManualMode ? "default" : "ghost"}
            onClick={() => !isManualMode ? null : handleModeToggle()}
            className={`gap-2 ${!isManualMode ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-muted-foreground'}`}
          >
            <Route className="w-4 h-4" />
            Guidé
          </Button>
          <Button
            size="sm"
            variant={isManualMode ? "default" : "ghost"}
            onClick={() => isManualMode ? null : handleModeToggle()}
            className={`gap-2 ${isManualMode ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-muted-foreground'}`}
          >
            <MapPin className="w-4 h-4" />
            Manuel
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {isManualMode ? "🛤️ Tracé libre hors-piste" : "🚶 Suit les chemins"}
        </p>
      </div>

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
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">📏</span>
              <span className="font-semibold text-foreground">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-green-500">⬆️</span>
              <span className="font-semibold text-foreground">D+ {totalElevationGain}m</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <span className="text-red-500">⬇️</span>
              <span className="font-semibold text-foreground">D- {totalElevationLoss}m</span>
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

      {/* Instructions - seulement si pas encore de tracé */}
      {waypoints.current.length === 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 backdrop-blur-md border border-border/50 rounded-full px-4 py-2 shadow-lg">
          <p className="text-sm text-foreground text-center">
            👆 Cliquez sur la carte pour tracer votre parcours
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteCreation;
