import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { rccToSessionBlocks, type RCCResult } from "@/lib/rccParser";
import { ACTIVITY_TYPES } from "@/components/session-creation/types";
import { LocationPickerMap } from "./LocationPickerMap";
import { MapPin, Calendar, Check, Clock, ChevronLeft, Send, Map } from "lucide-react";
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
  objective?: string | null;
  rcc_code?: string | null;
  coach_notes?: string | null;
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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [locationLat, setLocationLat] = useState<number>(48.8566);
  const [locationLng, setLocationLng] = useState<number>(2.3522);

  // Form state — mirrors CreateCoachingSessionDialog
  const [activityType, setActivityType] = useState("course");
  const [objective, setObjective] = useState("");
  const [rccCode, setRccCode] = useState("");
  const [parsedResult, setParsedResult] = useState<RCCResult>({ blocks: [], errors: [] });
  const [scheduledAt, setScheduledAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [customPace, setCustomPace] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Pre-fill from coaching session
  useEffect(() => {
    if (isOpen && session) {
      setActivityType(session.activity_type || "course");
      setObjective(session.objective || session.title || "");
      setRccCode(session.rcc_code || "");
      setLocationName(session.default_location_name || "");
      setCustomPace(session.pace_target || "");
      setCustomNotes("");
      setLocationLat(session.default_location_lat || 48.8566);
      setLocationLng(session.default_location_lng || 2.3522);

      if (suggestedDate) {
        try {
          const d = new Date(suggestedDate);
          setScheduledAt(format(d, "yyyy-MM-dd'T'HH:mm"));
        } catch {}
      } else {
        setScheduledAt("");
      }
    }
  }, [isOpen, session, suggestedDate]);

  if (!session) return null;

  const handleSchedule = async () => {
    if (!user || !scheduledAt || !locationName.trim()) return;

    setLoading(true);
    try {
      const sessionBlocks = parsedResult.blocks.length > 0 ? rccToSessionBlocks(parsedResult.blocks) : session.session_blocks;

      // Create a real session on the map
      const { data: mapSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          organizer_id: user.id,
          title: `📋 ${objective.trim() || session.title}`,
          description: session.description,
          activity_type: activityType,
          session_type: "footing",
          scheduled_at: new Date(scheduledAt).toISOString(),
          location_name: locationName.trim(),
          location_lat: locationLat,
          location_lng: locationLng,
          distance_km: session.distance_km,
          session_blocks: sessionBlocks,
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
            <span className="flex-1">Programmer ma séance</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
          {/* Coach notes */}
          {session.coach_notes && (
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-1">📝 Consignes du coach</p>
              <p className="text-sm">{session.coach_notes}</p>
            </div>
          )}

          {suggestedDate && (
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Le coach suggère :</span>
                {format(new Date(suggestedDate), "EEE d MMM à HH:mm", { locale: fr })}
              </p>
            </div>
          )}

          {/* Sport + Objective */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sport</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Objectif</Label>
              <Input
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* RCC Editor */}
          <RCCEditor
            value={rccCode}
            onChange={setRccCode}
            onParsedChange={setParsedResult}
          />

          {/* Date + Location */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date et heure *
            </Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Lieu *
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Parc, stade, forêt..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="h-9 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setShowMapPicker(true)}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Personal adjustments */}
          <div className="space-y-1.5">
            <Label className="text-xs">Mon allure personnelle</Label>
            <Input
              placeholder="Ex: 5:30/km"
              value={customPace}
              onChange={(e) => setCustomPace(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes personnelles</Label>
            <Textarea
              placeholder="Objectifs, sensations attendues..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          <Button
            onClick={handleSchedule}
            disabled={loading || !scheduledAt || !locationName.trim()}
            className="w-full"
          >
            {loading ? "Publication..." : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publier ma séance
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
