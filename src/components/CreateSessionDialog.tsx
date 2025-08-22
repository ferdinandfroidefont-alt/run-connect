import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Crown, UserCheck, ImagePlus, X, PenTool, Route, TrendingUp } from "lucide-react";
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
  onSessionCreated: () => void;
  map: google.maps.Map | null;
  presetLocation?: { lat: number; lng: number } | null;
  onCreateRoute?: () => void;
}

export const CreateSessionDialog = ({ isOpen, onClose, onSessionCreated, map, presetLocation, onCreateRoute }: CreateSessionDialogProps) => {
  const { user, subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
    interval_distance: "", // Distance de chaque fraction
    interval_pace: "", // Allure de chaque fraction
    interval_count: "", // Nombre de fractions
    location_name: "",
    friends_only: true, // Toujours activé par défaut
    image_url: "",
    club_id: null
  });

  const activityTypes = [
    { value: 'course', label: 'Course à pied' },
    { value: 'velo', label: 'Vélo' },
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

  // Fonction pour afficher l'itinéraire sélectionné sur la carte
  const displaySelectedRoute = (routeId: string) => {
    const route = userRoutes.find(r => r.id === routeId);
    if (route && map && route.coordinates) {
      // Effacer les tracés précédents
      if (window.currentRoutePolyline) {
        window.currentRoutePolyline.setMap(null);
      }

      // Créer le nouveau tracé
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

      // Stocker la référence pour pouvoir l'effacer plus tard
      window.currentRoutePolyline = polyline;

      // Ajuster la vue pour inclure tout l'itinéraire
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

    console.log('Recherche de lieu pour:', query);

    try {
      setIsSearching(true);
      
      // Utiliser directement l'API Google Maps côté client
      if (window.google && window.google.maps && window.google.maps.places) {
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        
        const request = {
          query: query,
          fields: ['name', 'geometry', 'formatted_address', 'place_id']
        };

        service.textSearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log('Résultats trouvés:', results.length);
            // Convertir au format attendu
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
            console.log('Aucun résultat ou erreur:', status);
            setSearchResults([]);
          }
          setIsSearching(false);
        });
      } else {
        // Fallback au proxy si Google Maps n'est pas chargé
        const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
          body: {
            address: query,
            type: 'geocode'
          }
        });

        if (error) throw error;

        if (data?.status === 'OK' && data?.results) {
          console.log('Résultats trouvés via proxy:', data.results.length);
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
        
        // Utilise notre proxy Google Maps au lieu du geocodeur direct
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
    
    if (onCreateRoute) {
      onClose(); // Ferme le dialog
      onCreateRoute(); // Lance le mode création d'itinéraire
      console.log('✓ onCreateRoute called successfully');
      toast({ 
        title: "Mode itinéraire activé", 
        description: "Cliquez sur la carte pour dessiner votre itinéraire" 
      });
    } else {
      console.log('❌ onCreateRoute is not available');
      toast({ 
        title: "Erreur", 
        description: "Fonction de création d'itinéraire non disponible",
        variant: "destructive"
      });
    }
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

      const { error } = await supabase
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
          interval_distance: formData.interval_distance ? parseFloat(formData.interval_distance) : null,
          interval_pace: formData.interval_pace || null,
          interval_count: formData.interval_count ? parseInt(formData.interval_count) : null,
          current_participants: 0,
          friends_only: formData.friends_only,
          image_url: imageUrl,
          route_id: routeMode === 'existing' && selectedRoute ? selectedRoute : null,
          club_id: formData.club_id
        }]);

      if (error) throw error;

      toast({ title: "Séance créée avec succès !" });
      
      // Force refresh sessions to ensure the new session appears with profile
      setTimeout(() => {
        onSessionCreated();
      }, 100);
      
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
      // Effacer l'itinéraire affiché sur la carte
      if (window.currentRoutePolyline) {
        window.currentRoutePolyline.setMap(null);
        window.currentRoutePolyline = null;
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
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
            <Select value={formData.activity_type} onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une activité" />
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
                   Clubs uniquement
                 </Label>
               </div>
               <Switch
                 id="club_mode"
                 checked={!!formData.club_id}
                 onCheckedChange={async (checked) => {
                   if (!checked) {
                     setFormData(prev => ({ ...prev, club_id: null }));
                   } else {
                     // Si on active le switch mais qu'aucun club n'est sélectionné,
                     // on doit sélectionner le premier club disponible
                     if (!formData.club_id) {
                       // Charger les clubs de l'utilisateur pour sélectionner le premier
                       try {
                         const { data: memberData } = await supabase
                           .from('group_members')
                           .select('conversation_id')
                           .eq('user_id', user?.id)
                           .limit(1);
                         
                         if (memberData && memberData.length > 0) {
                           const firstClubId = memberData[0].conversation_id;
                           setFormData(prev => ({ ...prev, club_id: firstClubId }));
                         } else {
                           // Pas de clubs disponibles, on désactive le switch
                           toast({
                             title: "Aucun club",
                             description: "Vous devez être membre d'un club pour utiliser cette option",
                             variant: "destructive"
                           });
                         }
                       } catch (error) {
                         console.error('Erreur lors du chargement des clubs:', error);
                         toast({
                           title: "Erreur",
                           description: "Impossible de charger vos clubs",
                           variant: "destructive"
                         });
                       }
                     }
                   }
                 }}
               />
             </div>
             
             {!!formData.club_id && (
               <div className="mt-3">
                 <ClubSelector
                   selectedClubId={formData.club_id}
                   onClubSelect={(clubId) => {
                     if (clubId) {
                       setFormData(prev => ({ ...prev, club_id: clubId }));
                     } else {
                       // Si on désélectionne le club, on désactive le switch
                       setFormData(prev => ({ ...prev, club_id: null }));
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
            <div>
              <Label htmlFor="pace_general">Allure prévue (min:sec/km)</Label>
              <Input
                id="pace_general"
                type="text"
                value={formData.pace_general}
                onChange={(e) => setFormData(prev => ({ ...prev, pace_general: e.target.value }))}
                placeholder="ex: 5:30"
                pattern="[0-9]{1,2}:[0-9]{2}"
              />
              <p className="text-xs text-muted-foreground mt-1">Format: mm:ss (ex: 5:30 pour 5min30s/km)</p>
            </div>
          )}

          {formData.session_type === 'fractionne' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="interval_distance">Distance par fraction (km)</Label>
                  <Input
                    id="interval_distance"
                    type="number"
                    step="0.1"
                    value={formData.interval_distance}
                    onChange={(e) => setFormData(prev => ({ ...prev, interval_distance: e.target.value }))}
                    placeholder="ex: 1.0"
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
                <Label htmlFor="interval_pace">Allure des fractions (min:sec/km)</Label>
                <Input
                  id="interval_pace"
                  type="text"
                  value={formData.interval_pace}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval_pace: e.target.value }))}
                  placeholder="ex: 4:00"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                />
                <p className="text-xs text-muted-foreground mt-1">Format: mm:ss (ex: 4:00 pour 4min/km)</p>
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
                                    <span>{formatDistance(route.total_distance)}</span>
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