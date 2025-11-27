import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdMob } from "@/hooks/useAdMob";
import { supabase } from "@/integrations/supabase/client";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Crown, UserCheck, ImagePlus, X, PenTool, Route, TrendingUp, Loader2, Search, ChevronDown, Bike, Footprints, Waves, Dumbbell, Building2 } from "lucide-react";
import { ClubSelector } from "./ClubSelector";

// Add type declaration for global polyline reference
declare global {
  interface Window {
    currentRoutePolyline: google.maps.Polyline | null;
  }
}

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (sessionId?: string) => void;
  map: google.maps.Map | null;
  presetLocation?: { lat: number; lng: number } | null;
  onCreateRoute?: () => void;
}

export const CreateSessionDialog = ({ isOpen, onClose, onSessionCreated, map, presetLocation, onCreateRoute }: CreateSessionDialogProps) => {
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
  const [isOptionalOpen, setIsOptionalOpen] = useState(false);
  const [formData, setFormData] = useState({
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
    friends_only: true,
    image_url: "",
    club_id: null
  });

  const activityTypes = [
    { value: 'course', label: 'Course à pied' },
    { value: 'trail', label: 'Trail' },
    { value: 'velo', label: 'Vélo' },
    { value: 'vtt', label: 'VTT' },
    { value: 'marche', label: 'Marche' },
    { value: 'natation', label: 'Natation' },
  ];

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

  const displaySelectedRoute = (routeId: string) => {
    const route = userRoutes.find(r => r.id === routeId);
    if (route && map && route.coordinates) {
      if (window.currentRoutePolyline) {
        window.currentRoutePolyline.setMap(null);
      }

      const path = route.coordinates.map((coord: any) => ({
        lat: coord.lat,
        lng: coord.lng
      }));

      const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
      });

      window.currentRoutePolyline = polyline;

      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds);
    }
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return "N/A";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${Math.round(meters / 1000 * 10) / 10} km`;
  };

  const formatElevation = (meters: number | null) => {
    if (!meters) return "N/A";
    return `${Math.round(meters)} m`;
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: {
          lat: lat,
          lng: lng,
          type: 'reverse'
        }
      });

      if (error) throw error;

      if (data?.status === 'OK' && data?.results?.[0]) {
        setSelectedLocation({
          lat: lat,
          lng: lng,
          name: data.results[0].formatted_address
        });
        setFormData(prev => ({ ...prev, location_name: data.results[0].formatted_address }));
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

    try {
      setIsSearching(true);
      
      if (window.google && window.google.maps && window.google.maps.places) {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        
        const request = {
          query: query,
          fields: ['name', 'geometry', 'formatted_address', 'place_id']
        };

        service.textSearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const formattedResults = results.slice(0, 5).map(result => ({
              formatted_address: result.formatted_address || result.name,
              geometry: {
                location: {
                  lat: result.geometry?.location?.lat() || 0,
                  lng: result.geometry?.location?.lng() || 0
                }
              },
              place_id: result.place_id
            }));
            setSearchResults(formattedResults);
          } else {
            setSearchResults([]);
          }
          setIsSearching(false);
        });
      } else {
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: {
            address: query,
            type: 'geocode'
          }
        });

        if (error) throw error;

        if (data?.status === 'OK' && data?.results) {
          setSearchResults(data.results.slice(0, 5));
        } else {
          setSearchResults([]);
        }
        setIsSearching(false);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
      toast({ 
        title: "Erreur", 
        description: "Impossible de rechercher le lieu. Vérifiez votre connexion.", 
        variant: "destructive" 
      });
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
        
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: {
            lat: center.lat(),
            lng: center.lng(),
            type: 'reverse'
          }
        });

        if (error) throw error;

        if (data?.status === 'OK' && data?.results?.[0]) {
          setSelectedLocation({
            lat: center.lat(),
            lng: center.lng(),
            name: data.results[0].formatted_address
          });
          setFormData(prev => ({ ...prev, location_name: data.results[0].formatted_address }));
          toast({ title: "Lieu sélectionné !" });
        } else {
          throw new Error('Aucun résultat trouvé');
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
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "Erreur", 
          description: "L'image ne doit pas dépasser 5MB", 
          variant: "destructive" 
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Erreur", 
          description: "Veuillez sélectionner une image", 
          variant: "destructive" 
        });
        return;
      }

      setSelectedImage(file);
      
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
    if (!user) {
      toast({ 
        title: "Connexion requise", 
        description: "Vous devez être connecté pour créer un itinéraire",
        variant: "destructive"
      });
      return;
    }
    
    onClose();
    navigate('/route-create');
    
    toast({ 
      title: "Mode itinéraire activé", 
      description: "Cliquez sur la carte pour dessiner votre itinéraire" 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLocation) return;

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

      if (formData.friends_only && sessionData) {
        try {
          const { data: followers } = await supabase
            .from('user_follows')
            .select('follower_id')
            .eq('following_id', user.id)
            .eq('status', 'accepted');

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
      
      showAdAfterSessionCreation();
      
      onSessionCreated(sessionData?.id);
      onClose();
      
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
        friends_only: true,
        image_url: "",
        club_id: null
      });
      setSelectedLocation(null);
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Erreur lors de la création de la séance", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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
      friends_only: true,
      image_url: "",
      club_id: null
    });
    setSelectedLocation(null);
    setSelectedImage(null);
    setImagePreview(null);
    onClose();
  };

  const getActivityIcon = () => {
    switch (formData.activity_type) {
      case 'course': return Footprints;
      case 'velo': return Bike;
      case 'natation': return Waves;
      default: return Dumbbell;
    }
  };

  const ActivityIcon = getActivityIcon();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-white/10 rounded-[22px] overflow-hidden">
        {/* Header Custom Premium */}
        <div className="flex items-center gap-3 p-6 pb-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-b border-white/10">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <ActivityIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">Créer une séance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Organisez une sortie avec vos amis</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8 rounded-full hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content scrollable */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Section Informations de base */}
            <div className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Informations de base</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">Titre de la séance</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Sortie longue dimanche"
                  required
                  className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity_type" className="text-slate-300">Type d'activité</Label>
                  <Select
                    name="activity_type"
                    value={formData.activity_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, activity_type: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white/5 border-white/10">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_type" className="text-slate-300">Type de sortie</Label>
                  <Select
                    name="session_type"
                    value={formData.session_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, session_type: value })
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white/5 border-white/10">
                      <SelectValue placeholder="Sélectionnez" />
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
              </div>
            </div>

            {/* Section Date & Heure Premium */}
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <Label htmlFor="scheduled_at" className="text-white font-semibold">Date et heure</Label>
              </div>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                required
                className="rounded-xl bg-white/10 border-white/20 focus:border-primary/50 text-lg h-12"
              />
            </div>

            {/* Section Visibilité avec switchs iOS-style */}
            <div className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Visibilité</h3>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Amis uniquement</p>
                    <p className="text-xs text-slate-400">Seuls vos amis verront cette séance</p>
                  </div>
                </div>
                <Switch
                  checked={formData.friends_only}
                  onCheckedChange={(checked) => {
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
                    setFormData({ ...formData, friends_only: checked });
                  }}
                />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">Créer pour un club</p>
                    <p className="text-xs text-slate-400">Réserver cette séance à un club</p>
                  </div>
                </div>
                <Switch
                  checked={!!formData.club_id}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setFormData(prev => ({ ...prev, club_id: null }));
                    }
                  }}
                />
              </div>

              {!!formData.club_id || formData.club_id === null ? (
                <div className="pl-12">
                  <ClubSelector
                    selectedClubId={formData.club_id}
                    onClubSelect={(clubId) => {
                      setFormData(prev => ({ ...prev, club_id: clubId }));
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* Section Lieu */}
            <div className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Lieu de départ</h3>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="location_name"
                    name="location_name"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Chercher un lieu..."
                    required
                    className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-card/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectSearchResult(result)}
                          className="w-full px-4 py-2 text-left hover:bg-white/10 text-sm border-b border-white/10 last:border-b-0 flex items-start gap-2"
                        >
                          <MapPin className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                          <span className="text-white">{result.formatted_address}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectLocation}
                  className="rounded-xl"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              
              {selectedLocation && (
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selectedLocation.name}
                </p>
              )}
            </div>

            {/* Paramètres optionnels dans Collapsible */}
            <Collapsible open={isOptionalOpen} onOpenChange={setIsOptionalOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl bg-white/5 border-white/10 hover:bg-white/10 justify-between"
                >
                  <span className="text-slate-300">Paramètres optionnels</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOptionalOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="bg-card/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-300">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ajoutez des détails sur la séance..."
                      rows={3}
                      className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="distance_km" className="text-slate-300">
                        Distance {formData.activity_type === "natation" ? "(m)" : "(km)"}
                      </Label>
                      <Input
                        id="distance_km"
                        name="distance_km"
                        type="number"
                        step="0.1"
                        value={formData.distance_km || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, distance_km: e.target.value }))}
                        placeholder={formData.activity_type === "natation" ? "1500" : "10"}
                        className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pace_general" className="text-slate-300">
                        {formData.activity_type === "velo" ? "Puissance (W)" : "Allure"}
                      </Label>
                      <Input
                        id="pace_general"
                        name="pace_general"
                        value={formData.pace_general || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, pace_general: e.target.value }))}
                        placeholder={formData.activity_type === "velo" ? "250" : "5:30/km"}
                        className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_participants" className="text-slate-300">Participants max</Label>
                    <Input
                      id="max_participants"
                      name="max_participants"
                      type="number"
                      min="2"
                      value={formData.max_participants || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
                      placeholder="Illimité par défaut"
                      className="rounded-xl bg-white/5 border-white/10 focus:border-primary/50"
                    />
                  </div>

                  {/* Photo upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-slate-300">Photo du lieu</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="flex-1 rounded-xl bg-white/5 border-white/10"
                      />
                      {imagePreview && (
                        <div className="relative w-20 h-20">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-xl border border-white/20"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Route selection simplifié */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Parcours</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCreateRoute(!createRoute)}
                        className="text-xs rounded-lg"
                      >
                        {createRoute ? "Masquer" : "Gérer"}
                      </Button>
                    </div>

                    {createRoute && (
                      <div className="space-y-4 p-4 border border-white/10 rounded-xl bg-white/5">
                        <RadioGroup value={routeMode} onValueChange={(value: 'new' | 'existing') => setRouteMode(value)}>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={routeMode === 'new' ? "default" : "outline"}
                              onClick={() => setRouteMode('new')}
                              className="flex-1 rounded-xl"
                            >
                              Nouveau
                            </Button>
                            <Button
                              type="button"
                              variant={routeMode === 'existing' ? "default" : "outline"}
                              onClick={() => setRouteMode('existing')}
                              className="flex-1 rounded-xl"
                            >
                              Existant
                            </Button>
                          </div>
                        </RadioGroup>

                        {routeMode === 'new' ? (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-400">
                              Créez votre parcours directement sur la carte en double-cliquant pour placer des points.
                            </p>
                            <Button
                              type="button"
                              onClick={handleCreateRoute}
                              variant="outline"
                              className="w-full rounded-xl"
                            >
                              <Route className="h-4 w-4 mr-2" />
                              Créer un nouveau parcours
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Select
                              value={selectedRoute || ""}
                              onValueChange={(value) => {
                                setSelectedRoute(value);
                                displaySelectedRoute(value);
                              }}
                            >
                              <SelectTrigger className="rounded-xl bg-white/5 border-white/10">
                                <SelectValue placeholder="Sélectionnez un parcours" />
                              </SelectTrigger>
                              <SelectContent>
                                {userRoutes.map((route) => (
                                  <SelectItem key={route.id} value={route.id}>
                                    {route.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedRoute && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRoute('')}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Effacer la sélection
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </form>
        </div>

        {/* Barre d'action fixe en bas */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#0D1B33] via-[#0f172a] to-transparent border-t border-white/10 p-4 flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className="flex-1 h-12 rounded-xl border border-white/10 hover:bg-white/10"
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={loading || !selectedLocation} 
            onClick={handleSubmit}
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer la séance"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
