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
    location_name: "",
    friends_only: false,
    image_url: ""
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
        .select('id, name, description, total_distance, total_elevation_gain, created_at')
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
      
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: {
          address: query,
          type: 'geocode'
        }
      });

      console.log('Réponse proxy Google Maps:', { data, error });

      if (error) {
        console.error('Erreur lors de l\'appel au proxy:', error);
        throw error;
      }

      if (data?.status === 'OK' && data?.results) {
        console.log('Résultats trouvés:', data.results.length);
        setSearchResults(data.results.slice(0, 5)); // Limit to 5 results
      } else {
        console.log('Aucun résultat ou statut non OK:', data?.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
      toast({ 
        title: "Erreur", 
        description: "Impossible de rechercher le lieu. Vérifiez votre connexion.", 
        variant: "destructive" 
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
          current_participants: 0,
          friends_only: formData.friends_only,
          image_url: imageUrl
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
        location_name: "",
        friends_only: false,
        image_url: ""
      });
      setSelectedLocation(null);
      setLocationSearch("");
      setSearchResults([]);
      setSelectedImage(null);
      setImagePreview(null);
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
                    <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un itinéraire" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoutes.map((route) => (
                          <SelectItem key={route.id} value={route.id}>
                            <div className="flex items-center gap-2 w-full">
                              <Route className="h-3 w-3" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{route.name}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

          {/* Premium Feature: Friends Only */}
          <div className="border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <Label htmlFor="friends_only" className="text-sm font-medium">
                  Amis uniquement
                </Label>
                <Crown className="h-3 w-3 text-yellow-500" />
              </div>
              {subscriptionInfo?.subscribed ? (
                <Switch
                  id="friends_only"
                  checked={formData.friends_only}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, friends_only: checked }));
                  }}
                />
              ) : (
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    onClose();
                    navigate('/subscription');
                  }}
                >
                  <Switch
                    id="friends_only"
                    checked={false}
                    disabled={true}
                    className="pointer-events-none"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {subscriptionInfo?.subscribed 
                ? "Seuls vos amis pourront voir et rejoindre cette séance"
                : "Cliquez pour devenir Premium et accéder à cette fonctionnalité"
              }
            </p>
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