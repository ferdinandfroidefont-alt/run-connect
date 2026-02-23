import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Calendar, MapPin } from "lucide-react";

interface CreateCoachingSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: () => void;
}

const activityTypes = [
  { value: "running", label: "Course à pied" },
  { value: "cycling", label: "Vélo" },
  { value: "walking", label: "Marche" },
  { value: "swimming", label: "Natation" },
  { value: "musculation", label: "Musculation" },
  { value: "randonnee", label: "Randonnée" },
];

export const CreateCoachingSessionDialog = ({
  isOpen,
  onClose,
  clubId,
  onCreated,
}: CreateCoachingSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [activityType, setActivityType] = useState("running");
  const [distanceKm, setDistanceKm] = useState("");
  const [paceTarget, setPaceTarget] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !scheduledAt || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("coaching_sessions").insert({
        club_id: clubId,
        coach_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_at: new Date(scheduledAt).toISOString(),
        activity_type: activityType,
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        pace_target: paceTarget.trim() || null,
        status: "planned",
      });

      if (error) throw error;

      toast({ title: "Séance créée", description: "La séance d'entraînement a été publiée" });
      resetForm();
      onCreated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setActivityType("running");
    setDistanceKm("");
    setPaceTarget("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Nouvelle séance coaching
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              placeholder="Ex: Fractionné 10x400m"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description / Consignes</Label>
            <Textarea
              placeholder="Détaillez le contenu de la séance..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Date et heure *</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type d'activité</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="10"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Allure cible</Label>
              <Input
                placeholder="5:30/km"
                value={paceTarget}
                onChange={(e) => setPaceTarget(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim() || !scheduledAt}
              className="flex-1"
            >
              {loading ? "Création..." : "Publier"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
