import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapControls } from './MapControls';
import { MapStyleSelector } from './MapStyleSelector';
import { toast } from 'sonner';

export const InteractiveMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('mapbox://styles/mapbox/light-v11');

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle,
      projection: { name: 'globe' },
      zoom: 2,
      center: [2.3522, 48.8566], // Paris coordinates
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'top-right'
    );

    // Add atmosphere and fog effects for globe
    map.current.on('style.load', () => {
      if (map.current?.getProjection().name === 'globe') {
        map.current.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
      }
    });

    toast.success("Carte interactive prête !");

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, currentStyle]);

  const handleStyleChange = (style: string) => {
    setCurrentStyle(style);
    if (map.current) {
      map.current.setStyle(style);
    }
  };

  const handleZoomIn = () => {
    map.current?.zoomIn();
  };

  const handleZoomOut = () => {
    map.current?.zoomOut();
  };

  const handleResetView = () => {
    map.current?.flyTo({
      center: [2.3522, 48.8566],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      duration: 2000,
    });
  };

  const handleToggle3D = () => {
    if (!map.current) return;
    
    const currentPitch = map.current.getPitch();
    map.current.flyTo({
      pitch: currentPitch > 0 ? 0 : 60,
      duration: 1000,
    });
  };

  if (isTokenDialogOpen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-map-panel p-8 max-w-md w-full border border-border">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Configuration de la carte</h2>
          <p className="text-muted-foreground mb-6">
            Pour utiliser cette carte interactive, vous devez fournir votre token Mapbox public.
            Visitez <a href="https://mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a> pour obtenir votre token.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Votre token Mapbox public"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={() => {
                if (mapboxToken.trim()) {
                  setIsTokenDialogOpen(false);
                } else {
                  toast.error("Veuillez entrer un token valide");
                }
              }}
              disabled={!mapboxToken.trim()}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Commencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onToggle3D={handleToggle3D}
      />
      
      {/* Style Selector */}
      <MapStyleSelector
        currentStyle={currentStyle}
        onStyleChange={handleStyleChange}
      />
      
      {/* Logo/Title */}
      <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border shadow-map-control">
        <h1 className="text-lg font-bold bg-gradient-map bg-clip-text text-transparent">
          Carte Interactive
        </h1>
      </div>
    </div>
  );
};