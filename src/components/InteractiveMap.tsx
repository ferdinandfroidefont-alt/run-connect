import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapControls } from './MapControls';
import { MapStyleSelector } from './MapStyleSelector';
import { SessionFilters } from './SessionFilters';
import { CreateSessionDialog } from './CreateSessionDialog';
import { SessionDetailsDialog } from './SessionDetailsDialog';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '@/hooks/useAuth';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Plus, Search, MapPin, Calendar, PersonStanding, Bike } from 'lucide-react';
import { toast } from 'sonner';
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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
    avatar_url: string | null;
  };
}

interface Filter {
  activity_types: string[];
  session_types: string[];
  search_query: string;
  selected_date: Date;
  friends_only: boolean;
}

export const InteractiveMap = () => {
  const { user } = useAuth();
  const { setRefreshSessions, setOpenCreateSession } = useAppContext();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState('roadmap');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [presetLocation, setPresetLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filters, setFilters] = useState<Filter>({
    activity_types: [],
    session_types: [],
    search_query: '',
    selected_date: new Date(),
    friends_only: false
  });
  const [searchAutocomplete, setSearchAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [userProfile, setUserProfile] = useState<{username: string, display_name: string, avatar_url: string | null} | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load user profile
  useEffect(() => {
    if (user) {
      const loadUserProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      };
      
      loadUserProfile();
    }
  }, [user]);

  // Register refresh function with context
  useEffect(() => {
    setRefreshSessions(() => loadSessions);
    setOpenCreateSession(() => setIsCreateDialogOpen(true));
  }, [setRefreshSessions, setOpenCreateSession]);

  // Load sessions from database
  const loadSessions = async () => {
    try {
      // Get start and end of selected date
      const startOfDay = new Date(filters.selected_date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filters.selected_date);
      endOfDay.setHours(23, 59, 59, 999);

      let query = supabase
        .from('sessions')
        .select('*')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString());

      // If friends_only filter is active, only show sessions from friends
      if (filters.friends_only && user) {
        // Get user's friends first
        const { data: friends } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friends?.map(f => f.following_id) || [];
        
        if (friendIds.length > 0) {
          query = query.in('organizer_id', friendIds);
        } else {
          // If user has no friends, show no sessions
          setSessions([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      
      // Get organizer profiles for all sessions
      const sessionsWithProfiles = [];
      for (const session of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', session.organizer_id)
          .single();
        
        sessionsWithProfiles.push({
          ...session,
          profiles: profile || { username: 'Utilisateur', display_name: 'Utilisateur', avatar_url: null }
        });
      }

      setSessions(sessionsWithProfiles);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Erreur lors du chargement des séances');
    }
  };

  // Create map markers for sessions
  const createMarkers = async () => {
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
    for (const session of filteredSessions) {
      try {
        const markerIcon = await createCustomMarker(session);
        
        const marker = new google.maps.Marker({
          position: { lat: Number(session.location_lat), lng: Number(session.location_lng) },
          map: map.current,
          title: session.title,
          icon: {
            url: markerIcon,
            scaledSize: new google.maps.Size(50, 50),
            anchor: new google.maps.Point(25, 50)
          }
        });

        marker.addListener('click', () => {
          setSelectedSession(session);
        });

        markers.current.push(marker);
      } catch (error) {
        console.error('Error creating marker for session:', session.id, error);
      }
    }
  };

  const createCustomMarker = (session: Session): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 50;
      
      canvas.width = size;
      canvas.height = size;
      
      if (!ctx) {
        resolve(getFallbackIcon(session.activity_type));
        return;
      }

      const drawMarker = (profileImage?: HTMLImageElement) => {
        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Dessiner le cercle de fond
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 3, 0, 2 * Math.PI);
        ctx.fillStyle = getActivityColor(session.activity_type);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (profileImage) {
          // Créer un masque circulaire pour l'image de profil
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2 - 6, 0, 2 * Math.PI);
          ctx.clip();
          // Calculer les dimensions pour un crop centré (object-fit: cover)
          const imgAspect = profileImage.width / profileImage.height;
          const targetSize = size - 12;
          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > 1) {
            // Image plus large que haute - crop horizontalement
            drawHeight = targetSize;
            drawWidth = drawHeight * imgAspect;
            drawX = 6 + (targetSize - drawWidth) / 2;
            drawY = 6;
          } else {
            // Image plus haute que large - crop verticalement
            drawWidth = targetSize;
            drawHeight = drawWidth / imgAspect;
            drawX = 6;
            drawY = 6 + (targetSize - drawHeight) / 2;
          }

          ctx.drawImage(profileImage, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
        } else {
          // Afficher les initiales si pas de photo
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const initials = (session.profiles.display_name || session.profiles.username || 'U')
            .charAt(0).toUpperCase();
          ctx.fillText(initials, size / 2, size / 2);
        }

        resolve(canvas.toDataURL());
      };

      // Si l'utilisateur a une photo de profil, la charger
      if (session.profiles.avatar_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => drawMarker(img);
        img.onerror = () => drawMarker(); // Fallback aux initiales si l'image ne charge pas
        img.src = session.profiles.avatar_url;
      } else {
        // Pas de photo, utiliser les initiales
        drawMarker();
      }
    });
  };

  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      'course': '#ef4444',
      'velo': '#3b82f6', 
      'marche': '#22c55e',
      'natation': '#0d9488'
    };
    return colors[activityType] || colors['course'];
  };

  const getFallbackIcon = (activityType: string) => {
    // Fallback simple SVG data URL
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIGZpbGw9IiNlZjQ0NDQiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlZjQ0NDQiLz48L3N2Zz4=';
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
        () => {
          loadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filters.selected_date, filters.friends_only]);

  // Initialize search autocomplete separately
  useEffect(() => {
    if (isMapLoaded && searchInputRef.current && !searchAutocomplete) {
      console.log('Initializing search autocomplete...');
      
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'fr' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Place selected:', place);
        
        if (place.geometry && place.geometry.location && map.current) {
          // Center map on selected location
          map.current.setCenter(place.geometry.location);
          map.current.setZoom(15);
          
          // Update search query
          setFilters(prev => ({ 
            ...prev, 
            search_query: place.formatted_address || place.name || ''
          }));
        }
      });

      setSearchAutocomplete(autocomplete);
      console.log('Search autocomplete initialized');
    }
  }, [isMapLoaded, searchAutocomplete]);

  // Update markers when sessions or filters change
  useEffect(() => {
    createMarkers();
  }, [sessions, filters]);

  useEffect(() => {
    if (!mapContainer.current || isMapLoaded) return;

    const initializeMap = async () => {
      try {
        // Récupérer la clé API Google Maps depuis Supabase
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

        setIsMapLoaded(true);

        // Add event listeners for map interactions
        let touchTimer: NodeJS.Timeout | null = null;
        let clickTimer: NodeJS.Timeout | null = null;

        // Double-click handler for creating sessions
        map.current.addListener('dblclick', (event: google.maps.MapMouseEvent) => {
          if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
          }
          handleCreateSessionAtLocation(event.latLng);
        });

        // Long press handler for mobile
        map.current.addListener('mousedown', (event: google.maps.MapMouseEvent) => {
          touchTimer = setTimeout(() => {
            handleCreateSessionAtLocation(event.latLng);
            touchTimer = null;
          }, 800); // 800ms for long press
        });

        map.current.addListener('mouseup', () => {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
        });

        map.current.addListener('mousemove', () => {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
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
      } catch (error) {
        console.error('Erreur lors du chargement de Google Maps:', error);
        toast.error("Erreur lors du chargement de la carte");
      }
    };

    initializeMap();
  }, [currentStyle]);

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

  const handleCreateSessionAtLocation = (latLng: google.maps.LatLng | null) => {
    if (!latLng || !user) {
      toast.error("Connectez-vous pour créer une séance");
      return;
    }
    
    setPresetLocation({ lat: latLng.lat(), lng: latLng.lng() });
    setIsCreateDialogOpen(true);
    toast.success("Double-cliquez ou appuyez longuement pour créer une séance ici !");
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-bold bg-gradient-map bg-clip-text text-transparent">
              RunConnect
            </h1>
            
            {/* User Profile Avatar */}
            {userProfile && (
              <Avatar className="w-10 h-10">
                <AvatarImage src={userProfile.avatar_url || undefined} alt={userProfile.display_name || userProfile.username} />
                <AvatarFallback>
                  {(userProfile.display_name || userProfile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex items-center gap-2">
              <NotificationCenter onSessionUpdated={loadSessions} />
            </div>
          </div>
        </div>
        
        {/* Search Bar and Date Filter - Floating over map */}
        <div className="absolute top-20 left-0 right-0 z-10 px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Rechercher un lieu ou une séance..."
              value={filters.search_query}
              onChange={(e) => setFilters(prev => ({ ...prev, search_query: e.target.value }))}
              className="pl-10"
            />
          </div>
          
          {/* Date Filter and Friends Filter */}
          <div className="mt-3 flex justify-start pl-2 gap-3">
            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative cursor-pointer">
                  {/* Calendar Icon Style */}
                  <div className="w-12 h-12 bg-red-500 rounded-t-lg relative shadow-lg">
                    {/* Top holes */}
                    <div className="absolute -top-1.5 left-2 w-1.5 h-3 bg-white rounded-full"></div>
                    <div className="absolute -top-1.5 right-2 w-1.5 h-3 bg-white rounded-full"></div>
                    {/* Month text */}
                    <div className="text-white text-xs font-bold text-center pt-1.5">
                      {format(filters.selected_date, "MMM", { locale: fr }).toUpperCase()}
                    </div>
                  </div>
                  {/* Calendar body */}
                  <div className="w-12 h-9 bg-white border-2 border-t-0 border-gray-200 rounded-b-lg flex items-center justify-center shadow-lg">
                    <div className="text-black text-lg font-bold">
                      {format(filters.selected_date, "d")}
                    </div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={filters.selected_date}
                  onSelect={(date) => {
                    if (date) {
                      setFilters(prev => ({ ...prev, selected_date: date }));
                    }
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Friends Only Filter */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, friends_only: !prev.friends_only }))}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shadow-lg border-2 h-9",
                filters.friends_only
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-1">
                <PersonStanding size={16} />
                <Bike size={16} />
              </div>
              <span className="text-sm font-medium">Amis uniquement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <SessionFilters filters={filters} onFiltersChange={setFilters} />
      
      {/* All Map Controls - grouped together on the left */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        {/* Locate Me and Style Selector */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleLocateMe}
            size="sm"
            variant="outline"
            className="w-10 h-10 bg-card/90 backdrop-blur-sm shadow-map-control"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          
          <MapStyleSelector
            currentStyle={currentStyle}
            onStyleChange={handleStyleChange}
          />
        </div>
        
        {/* Zoom and 3D Controls */}
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onToggle3D={handleToggle3D}
        />
      </div>
      

      {/* Create Session Dialog */}
      <CreateSessionDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setPresetLocation(null);
        }}
        onSessionCreated={loadSessions}
        map={map.current}
        presetLocation={presetLocation}
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