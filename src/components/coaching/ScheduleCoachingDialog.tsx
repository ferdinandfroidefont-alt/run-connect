import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Check } from "lucide-react";

interface CoachingSessionInfo {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  distance_km: number | null;
  pace_target: string | null;
  session_blocks?: any;
  club_id: string;
}

interface ScheduleCoachingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: CoachingSessionInfo | null;
  onScheduled: () => void;
}

export const ScheduleCoachingDialog = ({
  isOpen,
  onClose,
  session,
  onScheduled,
}: ScheduleCoachingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");

  if (!session) return null;

  const handleSchedule = async () => {
    if (!user || !scheduledAt || !locationName.trim()) return;

    setLoading(true);
    try {
      const lat = locationLat ? parseFloat(locationLat) : 48.8566;
      const lng = locationLng ? parseFloat(locationLng) : 2.3522;

      // 1. Create a real session on the map
      const { data: mapSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          organizer_id: user.id,
          title: `📋 ${session.title}`,
          description: session.description,
          activity_type: session.activity_type,
          session_type: "footing",
          scheduled_at: new Date(scheduledAt).toISOString(),
          location_name: locationName.trim(),
          location_lat: lat,
          location_lng: lng,
          distance_km: session.distance_km,
          session_blocks: session.session_blocks,
          coaching_session_id: session.id,
          club_id: session.club_id,
        })
        .select("id")
        .single();

      if (sessionError) throw sessionError;

      // 2. Create/update participation
      const { data: existingParticipation } = await supabase
        .from("coaching_participations")
        .select("id")
        .eq("coaching_session_id", session.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingParticipation) {
        await supabase
          .from("coaching_participations")
          .update({
            scheduled_at: new Date(scheduledAt).toISOString(),
            location_name: locationName.trim(),
            location_lat: lat,
            location_lng: lng,
            map_session_id: mapSession.id,
          })
          .eq("id", existingParticipation.id);
      } else {
        await supabase.from("coaching_participations").insert({
          coaching_session_id: session.id,
          user_id: user.id,
          status: "confirmed",
          scheduled_at: new Date(scheduledAt).toISOString(),
          location_name: locationName.trim(),
          location_lat: lat,
          location_lng: lng,
          map_session_id: mapSession.id,
        });
      }

      toast({ title: "Séance programmée !", description: "Elle apparaît maintenant sur la carte" });
      setScheduledAt("");
      setLocationName("");
      setLocationLat("");
      setLocationLng("");
      onScheduled();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programmer ma séance
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-muted/50 mb-2">
          <p className="font-medium text-sm">{session.title}</p>
          {session.description && (
            <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Date et heure *
            </Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Lieu *
            </Label>
            <Input
              placeholder="Ex: Parc des Buttes-Chaumont"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="48.8566"
                value={locationLat}
                onChange={(e) => setLocationLat(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="2.3522"
                value={locationLng}
                onChange={(e) => setLocationLng(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={loading || !scheduledAt || !locationName.trim()}
              className="flex-1"
            >
              {loading ? "..." : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Programmer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
