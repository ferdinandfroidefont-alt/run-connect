import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, ImagePlus, X, Upload } from "lucide-react";

interface EditSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
  session: any;
}

export const EditSessionDialog = ({ isOpen, onClose, onSessionUpdated, session }: EditSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
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
    location_lat: "",
    location_lng: "",
    image_url: "",
  });

  useEffect(() => {
    if (session && isOpen) {
      // Convert scheduled_at to datetime-local format
      const scheduledDate = new Date(session.scheduled_at);
      const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      setFormData({
        title: session.title || "",
        description: session.description || "",
        activity_type: session.activity_type || "",
        session_type: session.session_type || "",
        scheduled_at: localDateTime,
        max_participants: session.max_participants?.toString() || "",
        distance_km: session.distance_km?.toString() || "",
        pace_general: session.pace_general || "",
        pace_unit: session.pace_unit || "speed",
        interval_unit: "distance", // Default value
        interval_distance: session.interval_distance?.toString() || "",
        interval_pace: session.interval_pace || "",
        interval_count: session.interval_count?.toString() || "",
        location_name: session.location_name || "",
        location_lat: session.location_lat?.toString() || "",
        location_lng: session.location_lng?.toString() || "",
        image_url: session.image_url || "",
      });
      setImagePreview(session.image_url || null);
    }
  }, [session, isOpen]);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image valide",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
    const filePath = `session-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('session-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('session-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) return;

    if (!formData.title || !formData.activity_type || !formData.session_type || !formData.scheduled_at || !formData.location_name) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (selectedImage) {
        setUploadingImage(true);
        imageUrl = await uploadImage(selectedImage);
        setUploadingImage(false);
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          title: formData.title,
          description: formData.description,
          activity_type: formData.activity_type,
          session_type: formData.session_type,
          scheduled_at: new Date(formData.scheduled_at).toISOString(),
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
          pace_general: formData.pace_general || null,
          pace_unit: formData.pace_unit || 'speed',
          interval_distance: formData.interval_distance ? parseFloat(formData.interval_distance) : null,
          interval_pace: formData.interval_pace || null,
          interval_pace_unit: formData.pace_unit || 'speed',
          interval_count: formData.interval_count ? parseInt(formData.interval_count) : null,
          location_name: formData.location_name,
          location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
          location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
          image_url: imageUrl || null,
        })
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Séance modifiée avec succès",
      });
      
      onSessionUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la modification de la séance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const isSessionPast = () => {
    if (!session?.scheduled_at) return false;
    return new Date(session.scheduled_at) < new Date();
  };

  if (isSessionPast()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modification impossible</DialogTitle>
            <DialogDescription>
              Les séances passées ne peuvent pas être modifiées.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={onClose}>Fermer</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
          <DialogDescription>
            Modifiez tous les détails de votre séance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titre */}
          <div>
            <Label htmlFor="title">Titre de la séance *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="ex: Sortie longue du dimanche"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre séance..."
              rows={3}
            />
          </div>

          {/* Type d'activité */}
          <div>
            <Label>Type d'activité *</Label>
            <Select
              value={formData.activity_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, activity_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une activité" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de séance */}
          <div>
            <Label>Type de séance *</Label>
            <Select
              value={formData.session_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {sessionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date et heure */}
          <div>
            <Label htmlFor="scheduled_at">
              <Calendar className="h-4 w-4 inline mr-2" />
              Date et heure *
            </Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
              required
            />
          </div>

          {/* Lieu */}
          <div>
            <Label htmlFor="location_name">
              <MapPin className="h-4 w-4 inline mr-2" />
              Lieu du rendez-vous *
            </Label>
            <Input
              id="location_name"
              value={formData.location_name}
              onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
              placeholder="ex: Parc de la Tête d'Or"
              required
            />
          </div>

          {/* Max participants */}
          <div>
            <Label htmlFor="max_participants">Nombre maximum de participants</Label>
            <Input
              id="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
              placeholder="Laisser vide pour illimité"
              min="1"
            />
          </div>

          {/* Distance pour Footing/Sortie longue */}
          {(formData.session_type === 'footing' || formData.session_type === 'sortie_longue') && (
            <>
              <div>
                <Label htmlFor="distance_km">Distance prévue (km)</Label>
                <Input
                  id="distance_km"
                  type="number"
                  step="0.1"
                  value={formData.distance_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, distance_km: e.target.value }))}
                  placeholder="ex: 10.5"
                  min="0"
                />
              </div>

              {/* Allure générale */}
              {formData.activity_type === 'velo' && (
                <div>
                  <Label>Unité pour l'allure</Label>
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
                    ? 'Allure générale (min:sec/km)' 
                    : formData.activity_type === 'natation'
                      ? 'Allure générale (min:sec/100m)'
                      : formData.activity_type === 'velo'
                        ? (formData.pace_unit === 'power' ? 'Puissance moyenne (watts)' : 'Vitesse moyenne (km/h)')
                        : 'Vitesse moyenne (km/h)'
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
                        ? 'ex: 2:00'
                        : formData.activity_type === 'velo'
                          ? (formData.pace_unit === 'power' ? 'ex: 250' : 'ex: 28')
                          : 'ex: 20'
                  }
                />
              </div>
            </>
          )}

          {/* Fractionnés */}
          {formData.session_type === 'fractionne' && (
            <>
              {formData.activity_type === 'velo' && (
                <div>
                  <Label>Unité pour l'allure des fractions</Label>
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
                          ? (formData.pace_unit === 'power' ? 'ex: 300' : 'ex: 32')
                          : 'ex: 25'
                  }
                />
              </div>
            </>
          )}

          {/* Image */}
          <div>
            <Label>Image de la séance</Label>
            <div className="space-y-2">
              {imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Aperçu"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  className="hidden"
                  id="session-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('session-image-upload')?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingImage ? 'Téléchargement...' : imagePreview ? 'Changer l\'image' : 'Ajouter une image'}
                </Button>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || uploadingImage}>
              {loading ? "Modification..." : "Modifier la séance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
