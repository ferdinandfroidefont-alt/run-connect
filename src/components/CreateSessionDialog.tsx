import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdMob } from "@/hooks/useAdMob";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Crown, UserCheck, ImagePlus, X, PenTool, Route, TrendingUp } from "lucide-react";
import { ClubSelector } from "./ClubSelector";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";
import type { Map } from "mapbox-gl";
import { loadMapboxGl } from "@/lib/mapboxLazy";
import { geocodeSearchMapbox, reverseGeocodeMapbox } from "@/lib/mapboxGeocode";
import { setOrUpdateLineLayer, removeLineLayer } from "@/lib/mapboxEmbed";
import type { MapCoord } from "@/lib/geoUtils";

const CREATE_SESSION_ROUTE_SRC = "create-session-route-preview";
const CREATE_SESSION_ROUTE_LAYER = "create-session-route-preview-layer";

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId?: string) => void;
  map: Map | null;
  presetLocation?: { lat: number; lng: number } | null;
  onCreateRoute?: () => void;
}

export const CreateSessionDialog = ({ isOpen, onClose, onSessionCreated, map, presetLocation, onCreateRoute }: CreateSessionDialogProps) => {
  const { formatMeters } = useDistanceUnits();
  const { user, subscriptionInfo } = useAuth();
  const { showAdAfterSessionCreation } = useAdMob(subscriptionInfo?.subscribed || false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [createRoute, setCreateRoute] = useState(false);
  const [routeMode, setRouteMode] = useState<'new' | 'existing'>('new');
  const [userRoutes, setUserRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routesLoading, setRoutesLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    activity_type: "",
    session_type: "",
    scheduled_at: "",
    max_participants: "",
    distance_km: "",
    pace_general: "", // Allure générale pour footing/sortie longue
    pace_unit: "speed", // "speed" (km/h) ou "power" (watts) pour vélo
    interval_unit: "distance", // "distance" (km) ou "time" (minutes) pour fractionné
    interval_distance: "", // Distance de chaque fraction
    interval_pace: "", // Allure de chaque fraction
    interval_count: "", // Nombre de fractions
    location_name: "",
    friends_only: true, // Toujours activé par défaut
    image_url: "",
    club_id: null
  });

  const activityTypes = [
    { value: 'course', label: '🏃 Course à pied' },
    { value: 'trail', label: '⛰️ Trail' },
    { value: 'velo', label: '🚴 Vélo' },
    { value: 'vtt', label: '🚵 VTT' },
    { value: 'bmx', label: '🚲 BMX' },
    { value: 'gravel', label: '🚴‍♂️ Gravel' },
    { value: 'marche', label: '🚶 Marche' },
    { value: 'natation', label: '🏊 Natation' },
    { value: 'football', label: '⚽ Football' },
    { value: 'basket', label: '🏀 Basketball' },
    { value: 'volley', label: '🏐 Volleyball' },
    { value: 'badminton', label: '🏸 Badminton' },
    { value: 'pingpong', label: '🏓 Tennis de table' },
    { value: 'tennis', label: '🎾 Tennis' },
    { value: 'escalade', label: '🧗 Escalade' },
    { value: 'petanque', label: '⚪ Pétanque' },
    { value: 'rugby', label: '🏉 Rugby' },
    { value: 'handball', label: '🤾 Handball' },
    { value: 'fitness', label: '💪 Fitness' },
    { value: 'yoga', label: '🧘 Yoga' },
    { value: 'musculation', label: '🏋️ Musculation' },
    { value: 'crossfit', label: '🔥 CrossFit' },
    { value: 'boxe', label: '🥊 Boxe' },
    { value: 'arts_martiaux', label: '🥋 Arts martiaux' },
    { value: 'golf', label: '⛳ Golf' },
    { value: 'ski', label: '⛷️ Ski' },
    { value: 'snowboard', label: '🏂 Snowboard' },
    { value: 'randonnee', label: '🥾 Randonnée' },
    { value: 'kayak', label: '🛶 Kayak' },
    { value: 'surf', label: '🏄 Surf' },
  ];

  const [activitySearchOpen, setActivitySearchOpen] = useState(false);

  const sessionTypes = [
    { value: 'footing', label: 'Footing' },
    { value: 'sortie_longue', label: 'Sortie longue' },
    { value: 'fractionne', label: 'Fractionné' },
    { value: 'competition', label: 'Compétition' },
  ];

  // Auto-select preset location when dialog opens
  useEffect(() => {
    if (presetLocation && isOpen) {
      handleReverseGeocode(presetLocation.lat, presetLocation.lng);
    }
    if (isOpen && user) {
      loadUserRoutes();
    }
  }, [presetLocation, isOpen, user]);

  const loadUserRoutes = async () => {
    if (!user) return;

    setRoutesLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRoutes(data || []);
    } catch (error) {
      console.error('Error loading user routes:', error);
    } finally {
      setRoutesLoading(false);
    }
  };

  // Fonction pour afficher l'itinéraire sélectionné sur la carte
  const displaySelectedRoute = (routeId: string) => {
    void (async () => {
      const route = userRoutes.find((r) => r.id === routeId);
      if (route && map && route.coordinates) {
        const path: MapCoord[] = route.coordinates.map((coord: { lat: number; lng: number }) => ({
          lat: coord.lat,
          lng: coord.lng,
        }));
        if (path.length === 0) return;

        const mapboxgl = await loadMapboxGl();
        const applyLine = () => {
          setOrUpdateLineLayer(map, CREATE_SESSION_ROUTE_SRC, CREATE_SESSION_ROUTE_LAYER, path, {
            color: "#3b82f6",
            width: 3,
          });
          const b = new mapboxgl.LngLatBounds([path[0]!.lng, path[0]!.lat], [path[0]!.lng, path[0]!.lat]);
          for (let i = 1; i < path.length; i++) b.extend([path[i]!.lng, path[i]!.lat]);
          map.fitBounds(b, { padding: 48, duration: 400, maxZoom: 16 });
        };
        if (map.isStyleLoaded()) applyLine();
        else map.once("load", applyLine);
      }
    })();
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return "N/A";
    return `${Math.round(meters)} m`;
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      const name = await reverseGeocodeMapbox(lat, lng);
      if (name) {
        setSelectedLocation({ lat, lng, name });
        setFormData((prev) => ({ ...prev, location_name: name }));
        toast({ title: "Lieu sélectionné !" });
      }
    } catch (error) {
      console.error('Erreur géocodage:', error);
      toast({ title: "Erreur", description: "Erreur lors de la géolocalisation", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('Recherche de lieu pour:', query);

    try {
      setIsSearching(true);
      const rows = await geocodeSearchMapbox(query, 5);
      setSearchResults(rows.map((r) => ({ ...r, place_id: "" })));
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher le lieu. Vérifiez votre connexion.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const location = result.geometry.location;
    setSelectedLocation({
      lat: location.lat,
      lng: location.lng,
      name: result.formatted_address
    });
    setFormData(prev => ({ ...prev, location_name: result.formatted_address }));
    setLocationSearch(result.formatted_address);
    setSearchResults([]);
    toast({ title: "Lieu sélectionné !" });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearch) {
        handleSearchLocation(locationSearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const handleSelectLocation = async () => {
    if (!map) return;

    const center = map.getCenter();
    if (center) {
      try {
        setLoading(true);
        const name = await reverseGeocodeMapbox(center.lat, center.lng);
        if (name) {
          setSelectedLocation({
            lat: center.lat,
            lng: center.lng,
            name,
          });
          setFormData((prev) => ({ ...prev, location_name: name }));
          toast({ title: "Lieu sélectionné !" });
        } else {
          throw new Error("Aucun résultat trouvé");
        }
      } catch (error) {
        console.error('Erreur géocodage:', error);
        toast({ title: "Erreur", description: "Erreur lors de la géolocalisation", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "Erreur", 
          description: "L'image ne doit pas dépasser 5MB", 
          variant: "destructive" 
        });
        return;
      }

      // Vérifier le type
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner une image", 
          variant: "destructive" 
        });
        return;
      }

      setSelectedImage(file);
      
      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('session-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('session-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Erreur upload image:', error);
      toast({ 
        title: "Erreur", 
        description: "Erreur lors de l'upload de l'image", 
        variant: "destructive" 
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateRoute = () => {
    console.log('🎯 handleCreateRoute called - starting route creation mode');
    
    if (!user) {
      toast({ 
        title: "Connexion requise", 
        description: "Vous devez être connecté pour créer un itinéraire",
        variant: "destructive"
      });
      return;
    }
    
    // Fermer le dialog
    onClose();
    
    // Naviguer vers la page de création d'itinéraire
    navigate('/route-create');
    
    toast({ 
      title: "Mode itinéraire activé", 
      description: "Cliquez sur la carte pour dessiner votre itinéraire" 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLocation) return;

    // Vérifier si l'utilisateur essaie de créer une séance publique sans abonnement premium
    if (!formData.friends_only && !subscriptionInfo?.subscribed) {
      toast({ 
        title: "Abonnement requis", 
        description: "Les séances publiques nécessitent un abonnement premium. Activez 'Amis uniquement' ou souscrivez à un abonnement.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Upload de l'image si sélectionnée
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const { data: sessionData, error } = await supabase
        .from('sessions')
        .insert([{
          organizer_id: user.id,
          title: formData.title,
          description: formData.description,
          activity_type: formData.activity_type,
          session_type: formData.session_type,
          location_lat: selectedLocation.lat,
          location_lng: selectedLocation.lng,
          location_name: formData.location_name,
          scheduled_at: formData.scheduled_at,
          max_participants: parseInt(formData.max_participants) || null,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
          pace_general: formData.pace_general || null,
          pace_unit: formData.pace_unit || 'speed',
          interval_distance: formData.interval_distance ? parseFloat(formData.interval_distance) : null,
          interval_pace: formData.interval_pace || null,
          interval_pace_unit: formData.pace_unit || 'speed',
          interval_count: formData.interval_count ? parseInt(formData.interval_count) : null,
          current_participants: 0,
          friends_only: formData.friends_only,
          image_url: imageUrl,
          route_id: routeMode === 'existing' && selectedRoute ? selectedRoute : null,
          club_id: formData.club_id
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notifications to friends if it's a friends-only session
      if (formData.friends_only && sessionData) {
        try {
          // Get user's followers (friends)
          const { data: followers } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', user.id)
            .eq('status', 'accepted');

          // Send notification to each friend
          if (followers && followers.length > 0) {
            for (const follower of followers) {
              await sendPushNotification(
                follower.follower_id,
                'Nouvelle séance d\'ami',
                `${user.email?.split('@')[0] || 'Un ami'} a créé une séance: ${formData.title}`,
                'friend_session',
                {
                  organizer_name: user.email?.split('@')[0] || 'Un ami',
                  session_title: formData.title,
                  session_id: sessionData.id,
                  activity_type: formData.activity_type,
                  scheduled_at: formData.scheduled_at
                }
              );
            }
          }
        } catch (notifError) {
          console.error('Error sending notifications to friends:', notifError);
        }
      }

      toast({ title: "Séance créée avec succès !" });
      
      // Afficher une interstitielle après la création (si conditions remplies)
      showAdAfterSessionCreation();
      
      // Force refresh sessions with retry to ensure the new session appears
      console.log('🎯 Séance créée, rechargement de la carte...');
      setTimeout(() => {
        onSessionCreated(sessionData.id); // Pass session ID for animation
      }, 300);
      
      // Center map on new session for visual confirmation
      if (map && selectedLocation) {
        setTimeout(() => {
          map.easeTo({ center: [selectedLocation.lng, selectedLocation.lat], zoom: 15, duration: 500 });
        }, 400);
      }
      
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        activity_type: "",
        session_type: "",
        scheduled_at: "",
        max_participants: "",
        distance_km: "",
        pace_general: "",
        pace_unit: "speed",
        interval_unit: "distance",
        interval_distance: "",
        interval_pace: "",
        interval_count: "",
        location_name: "",
        friends_only: true, // Activé par défaut
        image_url: "",
        club_id: null
      });
      setSelectedLocation(null);
      setLocationSearch("");
      setSearchResults([]);
      setSelectedRoute('');
      if (map) removeLineLayer(map, CREATE_SESSION_ROUTE_SRC, CREATE_SESSION_ROUTE_LAYER);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-screen sm:max-w-md sm:h-auto overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Créer une séance</DialogTitle>
          <DialogDescription>
            Organisez une séance sportive pour votre communauté
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre de la séance</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="ex: Footing matinal au parc"
              required
            />
          </div>

          <div>
            <Label htmlFor="activity_type">Type d'activité</Label>
            <Popover open={activitySearchOpen} onOpenChange={setActivitySearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={activitySearchOpen}
                  className="w-full justify-between bg-background/50 backdrop-blur-sm"
                >
                  {formData.activity_type
                    ? activityTypes.find((type) => type.value === formData.activity_type)?.label
                    : "Choisir une activité"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un sport..." />
                  <CommandList>
                    <CommandEmpty>Aucun sport trouvé.</CommandEmpty>
                    <CommandGroup>
                      {activityTypes.map((type) => (
                        <CommandItem
                          key={type.value}
                          value={type.value}
                          onSelect={(currentValue) => {
                            setFormData(prev => ({ ...prev, activity_type: currentValue }));
                            setActivitySearchOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              formData.activity_type === type.value ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {type.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="session_type">Type de sortie</Label>
            <Select value={formData.session_type} onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {sessionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Friends Only (Free Feature) - Premier filtre */}
          <div className="border rounded-lg p-4 bg-green-50/50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <Label htmlFor="friends_only" className="text-sm font-medium">
                  Amis uniquement (recommandé)
                </Label>
              </div>
              <Switch
                id="friends_only"
                checked={formData.friends_only}
                onCheckedChange={(checked) => {
                  // Si l'utilisateur essaie de désactiver "amis uniquement" sans premium
                  if (!checked && !subscriptionInfo?.subscribed) {
                    toast({
                      title: "Abonnement requis",
                      description: "Les séances publiques nécessitent un abonnement premium",
                      variant: "destructive"
                    });
                    onClose();
                    navigate('/subscription');
                    return;
                  }
                  setFormData(prev => ({ ...prev, friends_only: checked }));
                }}
              />
            </div>
            <p className="text-xs text-green-600 mt-2">
              {formData.friends_only 
                ? "Seuls vos amis pourront voir cette séance (gratuit)" 
                : subscriptionInfo?.subscribed 
                  ? "Cette séance sera visible par tous" 
                  : "Fonctionnalité premium requise"}
            </p>
          </div>

           {/* Club Selection - Deuxième filtre */}
           <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <Users className="h-4 w-4 text-blue-600" />
                 <Label htmlFor="club_mode" className="text-sm font-medium">
                   Club
                 </Label>
               </div>
               <Switch
                 id="club_mode"
                 checked={!!formData.club_id}
                 onCheckedChange={(checked) => {
                   if (!checked) {
                     setFormData(prev => ({ ...prev, club_id: null }));
                   } else {
                     // Si on active le switch, on active juste le mode club sans auto-sélection
                     // L'utilisateur pourra choisir le club qu'il veut
                   }
                 }}
               />
             </div>
             
             {!!formData.club_id && (
               <div className="mt-3">
                 <ClubSelector
                   selectedClubId={formData.club_id}
                   onClubSelect={(clubId) => {
                     setFormData(prev => ({ ...prev, club_id: clubId }));
                   }}
                 />
               </div>
             )}
             
             {/* Afficher le sélecteur même si aucun club n'est sélectionné pour permettre la sélection */}
             {!formData.club_id && (
               <div className="mt-3">
                 <ClubSelector
                   selectedClubId={null}
                   onClubSelect={(clubId) => {
                     if (clubId) {
                       setFormData(prev => ({ ...prev, club_id: clubId }));
                     }
                   }}
                 />
               </div>
             )}
             
             <p className="text-xs text-blue-600 mt-2">
               {formData.club_id 
                 ? "Seuls les membres de ce club pourront voir cette séance" 
                 : "Cette séance sera visible par tous les amis"}
             </p>
           </div>

          <div>
            <Label htmlFor="scheduled_at">Date et heure</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>

          <div>
            <Label htmlFor="max_participants">Nombre max de participants (optionnel)</Label>
            <Input
              id="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
              placeholder="Laisser vide pour illimité"
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="distance_km">Distance prévue (km)</Label>
            <Input
              id="distance_km"
              type="number"
              step="0.1"
              value={formData.distance_km}
              onChange={(e) => setFormData(prev => ({ ...prev, distance_km: e.target.value }))}
              placeholder="ex: 5.2"
              min="0"
            />
          </div>

          {/* Champs d'allure selon le type de séance */}
          {(formData.session_type === 'footing' || formData.session_type === 'sortie_longue') && (
            <div className="space-y-3">
              {/* Sélecteur d'unité pour le vélo */}
              {formData.activity_type === 'velo' && (
                <div>
                  <Label>Unité de mesure</Label>
                  <Select 
                    value={formData.pace_unit} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, pace_unit: value, pace_general: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speed">Vitesse (km/h)</SelectItem>
                      <SelectItem value="power">Puissance (watts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="pace_general">
                  {formData.activity_type === 'course' 
                    ? 'Allure prévue (min:sec/km)' 
                    : formData.activity_type === 'natation'
                      ? 'Allure prévue (min:sec/100m)'
                      : formData.activity_type === 'velo' 
                        ? (formData.pace_unit === 'power' ? 'Puissance prévue (watts)' : 'Vitesse prévue (km/h)')
                        : 'Vitesse prévue (km/h)'
                  }
                </Label>
                <Input
                  id="pace_general"
                  type="text"
                  value={formData.pace_general}
                  onChange={(e) => setFormData(prev => ({ ...prev, pace_general: e.target.value }))}
                  placeholder={
                    formData.activity_type === 'course' 
                      ? 'ex: 5:30' 
                      : formData.activity_type === 'natation'
                        ? 'ex: 1:45'
                        : formData.activity_type === 'velo' 
                          ? (formData.pace_unit === 'power' ? 'ex: 250' : 'ex: 25')
                          : 'ex: 6'
                  }
                  pattern={
                    (formData.activity_type === 'course' || formData.activity_type === 'natation') 
                      ? '[0-9]{1,2}:[0-9]{2}' 
                      : '[0-9]{1,3}'
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.activity_type === 'course' 
                    ? 'Format: mm:ss (ex: 5:30 pour 5min30s/km)'
                    : formData.activity_type === 'natation'
                      ? 'Format: mm:ss (ex: 1:45 pour 1min45s/100m)'
                      : formData.activity_type === 'velo' 
                        ? (formData.pace_unit === 'power' ? 'Puissance en watts (ex: 250)' : 'Vitesse en kilomètres par heure (ex: 25)')
                        : 'Vitesse en kilomètres par heure (ex: 6)'
                  }
                </p>
              </div>
            </div>
          )}

          {formData.session_type === 'fractionne' && (
            <div className="space-y-3">
              {/* Sélecteur d'unité pour le vélo (fractionné) */}
              {formData.activity_type === 'velo' && (
                <div>
                  <Label>Unité de mesure</Label>
                  <Select 
                    value={formData.pace_unit} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, pace_unit: value, interval_pace: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="speed">Vitesse (km/h)</SelectItem>
                      <SelectItem value="power">Puissance (watts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label>Unité de fraction</Label>
                <Select
                  value={formData.interval_unit}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, interval_unit: value, interval_distance: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distance">Distance (km)</SelectItem>
                    <SelectItem value="time">Temps (minutes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="interval_distance">
                    {formData.interval_unit === "time" ? "Temps par fraction (min)" : "Distance par fraction (km)"}
                  </Label>
                  <Input
                    id="interval_distance"
                    type="number"
                    step={formData.interval_unit === "time" ? "1" : "0.1"}
                    value={formData.interval_distance}
                    onChange={(e) => setFormData(prev => ({ ...prev, interval_distance: e.target.value }))}
                    placeholder={formData.interval_unit === "time" ? "ex: 5" : "ex: 1.0"}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="interval_count">Nombre de fractions</Label>
                  <Input
                    id="interval_count"
                    type="number"
                    value={formData.interval_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, interval_count: e.target.value }))}
                    placeholder="ex: 6"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="interval_pace">
                  {formData.activity_type === 'course' 
                    ? 'Allure des fractions (min:sec/km)' 
                    : formData.activity_type === 'natation'
                      ? 'Allure des fractions (min:sec/100m)'
                      : formData.activity_type === 'velo'
                        ? (formData.pace_unit === 'power' ? 'Puissance des fractions (watts)' : 'Vitesse des fractions (km/h)')
                        : 'Vitesse des fractions (km/h)'
                  }
                </Label>
                <Input
                  id="interval_pace"
                  type="text"
                  value={formData.interval_pace}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval_pace: e.target.value }))}
                  placeholder={
                    formData.activity_type === 'course' 
                      ? 'ex: 4:00' 
                      : formData.activity_type === 'natation'
                        ? 'ex: 1:30'
                        : formData.activity_type === 'velo'
                          ? (formData.pace_unit === 'power' ? 'ex: 300' : 'ex: 30')
                          : 'ex: 8'
                  }
                  pattern={
                    (formData.activity_type === 'course' || formData.activity_type === 'natation') 
                      ? '[0-9]{1,2}:[0-9]{2}' 
                      : '[0-9]{1,3}'
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.activity_type === 'course' 
                    ? 'Format: mm:ss (ex: 4:00 pour 4min/km)'
                    : formData.activity_type === 'natation'
                      ? 'Format: mm:ss (ex: 1:30 pour 1min30s/100m)'
                      : formData.activity_type === 'velo'
                        ? (formData.pace_unit === 'power' ? 'Puissance en watts (ex: 300)' : 'Vitesse en kilomètres par heure (ex: 30)')
                        : 'Vitesse en kilomètres par heure (ex: 8)'
                  }
                </p>
              </div>
            </div>
          )}

          <div>
            <Label>Lieu de rendez-vous</Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Rechercher un lieu..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                        className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm border-b border-border last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{result.formatted_address}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                onClick={handleSelectLocation}
                variant="outline"
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {selectedLocation ? "Changer le lieu (carte)" : "Sélectionner sur la carte"}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                💡 Astuce : Double-cliquez sur la carte pour placer un marqueur (à activer dans les paramètres)
              </p>
              
              {selectedLocation && (
                <p className="text-sm text-muted-foreground">
                  📍 {selectedLocation.name}
                </p>
              )}
            </div>
          </div>

          {/* Route Selection Option */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <Label className="text-sm font-medium">
                  Itinéraire (optionnel)
                </Label>
              </div>
              
              <RadioGroup value={routeMode} onValueChange={(value: 'new' | 'existing') => setRouteMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new-route" />
                  <Label htmlFor="new-route" className="text-sm cursor-pointer">
                    Créer un nouvel itinéraire
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing-route" />
                  <Label htmlFor="existing-route" className="text-sm cursor-pointer">
                    Utiliser un itinéraire existant
                  </Label>
                </div>
              </RadioGroup>

              {routeMode === 'new' ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateRoute}
                    disabled={!onCreateRoute}
                    className="w-full gap-2"
                  >
                    <PenTool className="h-3 w-3" />
                    Dessiner un itinéraire
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Créez un itinéraire personnalisé sur la carte pour votre séance
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {routesLoading ? (
                    <div className="text-center py-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-muted-foreground mt-1">Chargement des itinéraires...</p>
                    </div>
                  ) : userRoutes.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sélectionner un itinéraire</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                        <div className="space-y-1 p-2">
                          {userRoutes.map((route) => (
                            <div
                              key={route.id}
                              onClick={() => {
                                setSelectedRoute(route.id);
                                displaySelectedRoute(route.id);
                              }}
                              className={`p-3 rounded-md cursor-pointer transition-colors hover:bg-muted ${
                                selectedRoute === route.id ? 'bg-primary/10 border-primary border' : 'border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Route className="h-4 w-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{route.name}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{formatMeters(route.total_distance)}</span>
                                    {route.total_elevation_gain && (
                                      <>
                                        <span>•</span>
                                        <TrendingUp className="h-3 w-3" />
                                        <span>{formatElevation(route.total_elevation_gain)}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun itinéraire trouvé</p>
                      <p className="text-xs">Créez d'abord un itinéraire avec le bouton crayon sur la carte</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Image du lieu (optionnel)</Label>
            <div className="space-y-3">
              {!imagePreview ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="session-image"
                  />
                  <label 
                    htmlFor="session-image" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Ajouter une photo du lieu
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG, WebP - Max 5MB
                    </span>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Détails sur la séance, niveau requis, matériel..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading || !selectedLocation || uploadingImage}
              className="flex-1"
            >
              {uploadingImage ? "Upload image..." : loading ? "Création..." : "Créer la séance"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};