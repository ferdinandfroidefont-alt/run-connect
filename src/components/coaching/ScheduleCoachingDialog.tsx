import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";
import { CoachingBlocksPreview } from "./CoachingBlocksPreview";
import { MapPin, Calendar, Check, Clock, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CoachingSessionInfo {
  id: string;
  title: string;
  activity_type: string;
  description: string | null;
  distance_km: number | null;
  pace_target: string | null;
  session_blocks?: any;
  club_id: string;
  coach_id: string;
  default_location_name?: string | null;
  default_location_lat?: number | null;
  default_location_lng?: number | null;
}

interface ScheduleCoachingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: CoachingSessionInfo | null;
  onScheduled: () => void;
  suggestedDate?: string | null;
}

export const ScheduleCoachingDialog = ({
  isOpen,
  onClose,
  session,
  onScheduled,
  suggestedDate,
}: ScheduleCoachingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [customPace, setCustomPace] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Pre-fill suggested date and default location
  useEffect(() => {
    if (isOpen) {
      if (suggestedDate) {
        try {
          const d = new Date(suggestedDate);
          setScheduledAt(format(d, "yyyy-MM-dd'T'HH:mm"));
        } catch {}
      }
      if (session?.default_location_name && !locationName) {
        setLocationName(session.default_location_name);
        if (session.default_location_lat) setLocationLat(String(session.default_location_lat));
        if (session.default_location_lng) setLocationLng(String(session.default_location_lng));
      }
    }
  }, [suggestedDate, isOpen, session]);

  if (!session) return null;

  const handleSchedule = async () => {
    if (!user || !scheduledAt || !locationName.trim()) return;

    setLoading(true);
    try {
      const lat = locationLat ? parseFloat(locationLat) : 48.8566;
      const lng = locationLng ? parseFloat(locationLng) : 2.3522;

      // Create a real session on the map
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

      // Create/update participation
      const { data: existingParticipation } = await supabase
        .from("coaching_participations")
        .select("id")
        .eq("coaching_session_id", session.id)
        .eq("user_id", user.id)
        .maybeSingle();

      const participationData = {
        scheduled_at: new Date(scheduledAt).toISOString(),
        location_name: locationName.trim(),
        location_lat: lat,
        location_lng: lng,
        map_session_id: mapSession.id,
        status: "scheduled",
        custom_pace: customPace.trim() || null,
        custom_notes: customNotes.trim() || null,
      };

      if (existingParticipation) {
        await supabase
          .from("coaching_participations")
          .update(participationData)
          .eq("id", existingParticipation.id);
      } else {
        await supabase.from("coaching_participations").insert({
          coaching_session_id: session.id,
          user_id: user.id,
          ...participationData,
        });
      }

      // Notify coach
      const { data: athleteProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const athleteName = athleteProfile?.display_name || athleteProfile?.username || "Un athlète";

      sendPushNotification(
        session.coach_id,
        `📍 ${athleteName} a programmé sa séance`,
        session.title,
        "coaching_scheduled"
      );

      toast({ title: "Séance programmée !", description: "Elle apparaît maintenant sur la carte" });
      setScheduledAt("");
      setLocationName("");
      setLocationLat("");
      setLocationLng("");
      setCustomPace("");
      setCustomNotes("");
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
      <DialogContent fullScreen hideCloseButton>
        <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Calendar className="h-5 w-5" />
            Programmer ma séance
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-sm">{session.title}</p>
          {session.description && (
            <p className="text-xs text-muted-foreground mt-1">{session.description}</p>
          )}
        </div>

        {/* Structured blocks (read-only) */}
        {session.session_blocks && Array.isArray(session.session_blocks) && session.session_blocks.length > 0 && (
          <div className="mb-2">
            <CoachingBlocksPreview blocks={session.session_blocks} />
            <p className="text-xs text-muted-foreground mt-1 italic">🔒 Structure définie par le coach</p>
          </div>
        )}

        {suggestedDate && (
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 mb-2">
            <p className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">Le coach suggère :</span>
              {format(new Date(suggestedDate), "EEE d MMM à HH:mm", { locale: fr })}
            </p>
          </div>
        )}

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

          <div className="space-y-2">
            <Label>Mon allure personnelle</Label>
            <Input
              placeholder="Ex: 5:30/km"
              value={customPace}
              onChange={(e) => setCustomPace(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes personnelles</Label>
            <Textarea
              placeholder="Objectifs, sensations attendues..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        </div>

        <div className="sticky bottom-0 bg-background border-t p-4 flex gap-2">
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
      </DialogContent>
    </Dialog>
  );
};
