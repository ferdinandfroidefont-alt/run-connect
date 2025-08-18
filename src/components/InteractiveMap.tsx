import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapControls } from './MapControls';
import { MapStyleSelector } from './MapStyleSelector';
import { SessionFilters } from './SessionFilters';
import { CreateSessionDialog } from './CreateSessionDialog';
import { SessionDetailsDialog } from './SessionDetailsDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Plus, Search, MapPin } from 'lucide-react';
import { toast } from 'sonner';

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  organizer_id: string;
  profiles: {
    username: string;
    display_name: string;
  };
}

interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
}

export const InteractiveMap = () => {
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(true);
  const [currentStyle, setCurrentStyle] = useState('roadmap');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<Filter>({
    activity_types: [],
    session_types: [],
    search_query: ''
  });

  // Load sessions from database
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString());

      if (error) throw error;
      
      // Get organizer profiles separately
      const sessionsWithProfiles = await Promise.all(
        (data || []).map(async (session) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('user_id', session.organizer_id)
            .single();
          
          return {
            ...session,
            profiles: profile || { username: 'Utilisateur', display_name: null }
          };
        })
      );
      
      setSessions(sessionsWithProfiles as Session[]);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des séances');
    }
  };

  // Create map markers for sessions
  const createMarkers = () => {
    if (!map.current || !window.google) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Filter sessions based on current filters
    const filteredSessions = sessions.filter(session => {
      const matchesActivity = filters.activity_types.length === 0 || filters.activity_types.includes(session.activity_type);
      const matchesType = filters.session_types.length === 0 || filters.session_types.includes(session.session_type);
      const matchesSearch = !filters.search_query || 
        session.title.toLowerCase().includes(filters.search_query.toLowerCase()) ||
        session.location_name.toLowerCase().includes(filters.search_query.toLowerCase());
      
      return matchesActivity && matchesType && matchesSearch;
    });

    // Create markers for filtered sessions
    filteredSessions.forEach(session => {
      const marker = new google.maps.Marker({
        position: { lat: Number(session.location_lat), lng: Number(session.location_lng) },
        map: map.current,
        title: session.title,
        icon: {
          url: getActivityIcon(session.activity_type),
          scaledSize: new google.maps.Size(32, 32),
        }
      });

      marker.addListener('click', () => {
        setSelectedSession(session);
      });

      markers.current.push(marker);
    });
  };

  const getActivityIcon = (activityType: string) => {
    const icons: Record<string, string> = {
      'course': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNlZjQ0NDQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEzLjQ5IDEwLjQ4TDE2IDcuOTYgMTYuNzUgOUwyMiA3bC0yLjI1LTMuMjUgMi4yNS0zLjI1TDE3LjUgMGwtMi41IDUuNS0yLjUtNUwxMi41IDcuNSAxNS40IDkuNGwtMS45MSAxLjA4em0tNy43MiA0IDEuNDUgMi40NEw2IDEuOTFIMmwtMS43MyAzbC0xLjczLTNIMi4yOGwtMyA1LjE4IDMgNS4xOGgzLjQ0eiIvPjwvc3ZnPg==',
      'velo': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMzYjgyZjYiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTE1LjUgNS41YzEuMSAwIDItLjkgMi0ycy0uOS0yLTItMi0yIC45LTIgMiAuOSAyIDIgMm0tMy4wOCAzSDlsLS4zMS0xSDhsLTIgNUg0bDIuODYtNy4xNWMuMTQtLjM0LjQ1LS41OS44Mi0uNzJDNy45MiA1IDggNS4wOCA4LjEyIDUuMTJjLjE0LS4wNi4yOC0uMTIuNDQtLjEyaDMuOThjLjUyIDAgLjk4LjMzIDEuMTYuOGwuOTggMi4yOC4yLjQ1TDE3IDExSDlsMSAyaDguMDhMMjAuNSAxMWgtMC4yM2wtMi40NS01LjgzYy0uMjMtLjU1LS43My0uOTQtMS4zNC0uOTRIMTIuNDJabTEuNzMgN2gtMS4xNGwtMS40NSAzLjNjLS4zMS43LS45OSAxLjE1LTEuNzcgMS4xNUg5bC0xLTJoMi41OWwxLjUtMy4zWiIvPjwvc3ZnPg==',
      'marche': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMyMmM1NWUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEzLjUgNS41YzEuMSAwIDItLjkgMi0ycy0uOS0yLTItMi0yIC45LTIgMiAuOSAyIDIgMm0yIDItSDEzbC0zIDQtMi0yVjhINU4xbDIgMlYzaDEuNUwxNS41IDcuNVptMCAwdjMuMjVsMS43NSAxLjc1TDE5IDEwVjhsLTMuNS0uNVoiLz48L3N2Zz4=',
      'natation': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiMwZDk0ODgiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEgMjFjMCAuNS40IDEgMSAxaDIwYy42IDAgMS0uNSAxLTFzLS40LTEtMS0xSDJjLS42IDAtMSAuNS0xIDFtMTktNWMtMS4xIDAtMi4zLjQtMy4yIDFsLS44LS43Yy0uNS0uNS0xLjItLjgtMi0uOHMtMS41LjMtMiAuOGwtLjggLjdjLS45LS42LTItMS0zLjItMWgtLjVjLTEgMC0yIC40LTIuNyAxbC0uOC0uN2MtLjktLjYtMi0xLTMuMi0xSDJjLS42IDAtMSAuNS0xIDFzLjQgMSAxIDFoLjVjLjggMCAxLjUuMyAyIC44bC44LjdjLjkuNiAyIDEgMy4yIDFoLjVjMSAwIDItLjQgMi43LTFsLjguN2MuOS42IDIgMSAzLjIgMWguNWMxIDAgMi0uNCAyLjctMWwuOC43Yy45LjYgMiAxIDMuMiAxSDE5Yy42IDAgMS0uNSAxLTFzLS40LTEtMS0xem0wLTNjLTEuMSAwLTIuMy40LTMuMiAxbC0uOC0uN2MtLjUtLjUtMS4yLS44LTItLjhzLTEuNS4zLTIgLjhsLS44LjdjLS45LS42LTItMS0zLjItMWgtLjVjLTEgMC0yIC40LTIuNyAxbC0uOC0uN2MtLjktLjYtMi0xLTMuMi0xSDJjLS42IDAtMSAuNS0xIDFzLjQgMSAxIDFoLjVjLjggMCAxLjUuMyAyIC44bC44LjdjLjkuNiAyIDEgMy4yIDFoLjVjMSAwIDItLjQgMi43LTFsLjguN2MuOS42IDIgMSAzLjIgMWguNWMxIDAgMi0uNCAyLjctMWwuOC43Yy45LjYgMiAxIDMuMiAxSDE5Yy42IDAgMS0uNSAxLTFzLS40LTEtMS0xem0wLTNjLTEuMSAwLTIuMy40LTMuMiAxbC0uOC0uN2MtLjUtLjUtMS4yLS44LTItLjhzLTEuNS4zLTIgLjhsLS44LjdjLS45LS42LTItMS0zLjItMWgtLjVjLTEgMC0yIC40LTIuNyAxbC0uOC0uN2MtLjktLjYtMi0xLTMuMi0xSDJjLS42IDAtMSAuNS0xIDFzLjQgMSAxIDFoLjVjLjggMCAxLjUuMyAyIC44bC44LjdjLjkuNiAyIDEgMy4yIDFoLjVjMSAwIDItLjQgMi43LTFsLjguN2MuOS42IDIgMSAzLjIgMWguNWMxIDAgMi0uNCAyLjctMWwuOC43Yy45LjYgMiAxIDMuMiAxSDE5Yy42IDAgMS0uNSAxLTFzLS40LTEtMS0xem0tMTEtN2MxLjEgMCAyLS45IDItMnMtLjktMi0yLTItMiAuOS0yIDIgLjkgMiAyIDJtMCAyYy0uNSAwLTEgLjItMS4zLjVMOC4zIDRjLS4zLS40LS44LS42LTEuMy0uNmgtM2MtLjYgMC0xIC41LTEgMXMuNCAxIDEgMWgyLjRsMS45IDIuNkM3LjggNyA4IDYgOSA2aDJjMS4xIDAgMiAuOSAyIDJ2N2MwIDEuMS0uOSAyLTIgMkg5Yy0xLjEgMC0yLS45LTItMlY4aC0xYy0uNiAwLTEtLjUtMS0xcy40LTEgMS0xaDJ6Ii8+PC9zdmc+'
    };
    return icons[activityType] || icons['course'];
  };

  // Real-time updates for sessions
  useEffect(() => {
    if (!user) return;

    loadSessions();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => loadSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update markers when sessions or filters change
  useEffect(() => {
    createMarkers();
  }, [sessions, filters]);

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
        zoom: 12,
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

      // Try to get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            map.current?.setCenter(pos);
            map.current?.setZoom(14);
            toast.success("Position détectée !");
          },
          () => {
            toast.info("Localisation non disponible, centré sur Paris");
          }
        );
      }

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
      map.current.setZoom(12);
    }
  };

  const handleLocateMe = () => {
    if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.current?.setCenter(pos);
          map.current?.setZoom(16);
          toast.success("Vous êtes ici !");
        },
        () => {
          toast.error("Impossible de vous localiser");
        }
      );
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
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold bg-gradient-map bg-clip-text text-transparent">
            RunConnect
          </h1>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground" />
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Créer
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lieu ou une séance..."
              value={filters.search_query}
              onChange={(e) => setFilters(prev => ({ ...prev, search_query: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <SessionFilters filters={filters} onFiltersChange={setFilters} />
      
      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onToggle3D={handleToggle3D}
      />

      {/* Locate Me Button */}
      <Button
        onClick={handleLocateMe}
        size="sm"
        variant="outline"
        className="absolute bottom-6 right-6 bg-card/90 backdrop-blur-sm shadow-map-control"
      >
        <MapPin className="h-4 w-4" />
      </Button>
      
      {/* Style Selector */}
      <MapStyleSelector
        currentStyle={currentStyle}
        onStyleChange={handleStyleChange}
      />

      {/* Create Session Dialog */}
      <CreateSessionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSessionCreated={loadSessions}
        map={map.current}
      />

      {/* Session Details Dialog */}
      <SessionDetailsDialog
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={loadSessions}
      />
    </div>
  );
};