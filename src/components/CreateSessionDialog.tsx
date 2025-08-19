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
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Users, Crown, UserCheck } from "lucide-react";

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
  map: google.maps.Map | null;
  presetLocation?: { lat: number; lng: number } | null;
}

export const CreateSessionDialog = ({ isOpen, onClose, onSessionCreated, map, presetLocation }: CreateSessionDialogProps) => {
  const { user, subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    activity_type: "",
    session_type: "",
    intensity: "",
    scheduled_at: "",
    max_participants: "",
    location_name: "",
    friends_only: false
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

  const intensityLevels = [
    { value: 'facile', label: 'Facile' },
    { value: 'modere', label: 'Modéré' },
    { value: 'intense', label: 'Intense' },
  ];

  // Auto-select preset location when dialog opens
  useEffect(() => {
    if (presetLocation && isOpen) {
      handleReverseGeocode(presetLocation.lat, presetLocation.lng);
    }
  }, [presetLocation, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLocation) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .insert([{
          organizer_id: user.id,
          title: formData.title,
          description: formData.description,
          activity_type: formData.activity_type,
          session_type: formData.session_type,
          intensity: formData.intensity,
          location_lat: selectedLocation.lat,
          location_lng: selectedLocation.lng,
          location_name: formData.location_name,
          scheduled_at: formData.scheduled_at,
          max_participants: parseInt(formData.max_participants) || null,
          current_participants: 0,
          friends_only: formData.friends_only
        }]);

      if (error) throw error;

      toast({ title: "Séance créée avec succès !" });
      onSessionCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        activity_type: "",
        session_type: "",
        intensity: "",
        scheduled_at: "",
        max_participants: "",
        location_name: "",
        friends_only: false
      });
      setSelectedLocation(null);
      setLocationSearch("");
      setSearchResults([]);
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
            <Label htmlFor="intensity">Intensité</Label>
            <Select value={formData.intensity} onValueChange={(value) => setFormData(prev => ({ ...prev, intensity: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir l'intensité" />
              </SelectTrigger>
              <SelectContent>
                {intensityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
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
              disabled={loading || !selectedLocation}
              className="flex-1"
            >
              {loading ? "Création..." : "Créer la séance"}
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