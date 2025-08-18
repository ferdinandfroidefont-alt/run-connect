import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapControls } from './MapControls';
import { MapStyleSelector } from './MapStyleSelector';
import { toast } from 'sonner';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

export const InteractiveMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('roadmap');

  useEffect(() => {
    if (!mapContainer.current || !googleMapsApiKey) return;

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: 'weekly',
      libraries: ['geometry', 'places']
    });

    loader.load().then(() => {
      if (!mapContainer.current) return;

      // Initialize map
      map.current = new google.maps.Map(mapContainer.current, {
        zoom: 8,
        center: { lat: 48.8566, lng: 2.3522 }, // Paris coordinates
        mapTypeId: currentStyle as google.maps.MapTypeId,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        gestureHandling: 'greedy',
        styles: currentStyle === 'custom' ? [
          {
            featureType: 'all',
            elementType: 'geometry.fill',
            stylers: [{ color: '#f5f5f5' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#c9c9c9' }]
          }
        ] : undefined
      });

      toast.success("Carte Google Maps prête !");
    }).catch((error) => {
      console.error('Erreur lors du chargement de Google Maps:', error);
      toast.error("Erreur lors du chargement de la carte");
    });

    return () => {
      // Google Maps cleanup is handled automatically
    };
  }, [googleMapsApiKey, currentStyle]);

  const handleStyleChange = (style: string) => {
    setCurrentStyle(style);
    if (map.current) {
      if (style === 'custom') {
        map.current.setOptions({
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry.fill',
              stylers: [{ color: '#f5f5f5' }]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#c9c9c9' }]
            }
          ]
        });
      } else {
        map.current.setMapTypeId(style as google.maps.MapTypeId);
        map.current.setOptions({ styles: undefined });
      }
    }
  };

  const handleZoomIn = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom() || 8;
      map.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      const currentZoom = map.current.getZoom() || 8;
      map.current.setZoom(currentZoom - 1);
    }
  };

  const handleResetView = () => {
    if (map.current) {
      map.current.panTo({ lat: 48.8566, lng: 2.3522 });
      map.current.setZoom(8);
    }
  };

  const handleToggle3D = () => {
    if (!map.current) return;
    
    // Toggle between map and satellite view for "3D" effect
    const currentType = map.current.getMapTypeId();
    if (currentType === 'satellite') {
      map.current.setMapTypeId('roadmap');
      toast.info("Vue 2D activée");
    } else {
      map.current.setMapTypeId('satellite');
      toast.info("Vue satellite activée");
    }
  };

  if (isTokenDialogOpen) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-lg shadow-map-panel p-8 max-w-md w-full border border-border">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Configuration de la carte</h2>
          <p className="text-muted-foreground mb-6">
            Pour utiliser cette carte interactive, vous devez fournir votre clé API Google Maps.
            Visitez <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a> pour obtenir votre clé API.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Votre clé API Google Maps"
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={() => {
                if (googleMapsApiKey.trim()) {
                  setIsTokenDialogOpen(false);
                } else {
                  toast.error("Veuillez entrer une clé API valide");
                }
              }}
              disabled={!googleMapsApiKey.trim()}
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