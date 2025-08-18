import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: () => void;
  map: google.maps.Map | null;
}

export const CreateSessionDialog = ({ isOpen, onClose, onSessionCreated, map }: CreateSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    activity_type: "",
    session_type: "",
    intensity: "",
    scheduled_at: "",
    max_participants: "",
    location_name: ""
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
          current_participants: 0
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
        location_name: ""
      });
      setSelectedLocation(null);
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
              <Button
                type="button"
                onClick={handleSelectLocation}
                variant="outline"
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {selectedLocation ? "Changer le lieu" : "Sélectionner sur la carte"}
              </Button>
              {selectedLocation && (
                <p className="text-sm text-muted-foreground">
                  📍 {selectedLocation.name}
                </p>
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