import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { parseRCC, rccToSessionBlocks, mergeParsedBlocksByIndex, type RCCResult, type ParsedBlock } from "@/lib/rccParser";
import { ACTIVITY_TYPES } from "@/components/session-creation/types";
import { LocationPickerMap } from "./LocationPickerMap";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { MapPin, Calendar, Clock, Send, Map } from "lucide-react";
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
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
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

      const { blocks, errors } = parseRCC(session.rcc_code || "");
      const stored = (session.session_blocks as any[]) || [];
      const merged = blocks.map((b, i) => ({
        ...b,
        rpe: typeof stored[i]?.rpe === "number" ? stored[i].rpe : undefined,
        recoveryRpe:
          b.type === "interval" && typeof stored[i]?.recoveryRpe === "number"
            ? stored[i].recoveryRpe
            : undefined,
      }));
      setParsedBlocks(merged);
      setParsedResult({ blocks, errors });

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

  const handleParsedChange = (r: RCCResult) => {
    setParsedResult(r);
    setParsedBlocks((prev) => mergeParsedBlocksByIndex(r.blocks, prev));
  };

  if (!session) return null;

  const handleSchedule = async () => {
    if (!user || !scheduledAt || !locationName.trim()) return;

    setLoading(true);
    try {
      const sessionBlocks =
        parsedBlocks.length > 0 ? rccToSessionBlocks(parsedBlocks) : session.session_blocks;

      // Create a real session on the map
      const { data: mapSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          organizer_id: user.id,
          title: objective.trim() || session.title,
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
        `${athleteName} a programmé sa séance`,
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
      <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 p-0">
        <CoachingFullscreenHeader title="Programmer ma séance" onBack={onClose} />

        <div className="min-h-0 flex-1 overflow-y-auto bg-secondary [-webkit-overflow-scrolling:touch] px-4 py-4">
          <div className="space-y-4">
            {session.coach_notes ? (
              <div className="ios-card rounded-xl border border-primary/25 bg-primary/10 p-4 shadow-[var(--shadow-card)]">
                <p className="mb-1 text-xs font-medium text-primary">Consignes du coach</p>
                <p className="text-sm text-foreground">{session.coach_notes}</p>
              </div>
            ) : null}

            {suggestedDate ? (
              <div className="ios-card rounded-xl border border-primary/25 bg-primary/5 p-3 text-xs shadow-[var(--shadow-card)]">
                <p className="flex min-w-0 flex-wrap items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="font-medium">Le coach suggère :</span>
                  <span>{format(new Date(suggestedDate), "EEE d MMM à HH:mm", { locale: fr })}</span>
                </p>
              </div>
            ) : null}

            <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Sport</Label>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs">Objectif</Label>
                  <Input
                    value={objective}
                    onChange={e => setObjective(e.target.value)}
                    className="h-11 rounded-xl border-border bg-card"
                  />
                </div>
              </div>
              <RCCEditor
                value={rccCode}
                onChange={setRccCode}
                onParsedChange={handleParsedChange}
              />
              {parsedBlocks.length > 0 ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Détail de la séance</Label>
                  <RCCBlocksPreview blocks={parsedBlocks} />
                </div>
              ) : null}
            </div>

            <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Date et heure *
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-11 rounded-xl border-border bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3 shrink-0" />
                  Lieu *
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Parc, stade, forêt..."
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-xl border-border bg-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl"
                    onClick={() => setShowMapPicker(true)}
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
              <div className="space-y-1.5">
                <Label className="text-xs">Mon allure personnelle</Label>
                <Input
                  placeholder="Ex: 5:30/km"
                  value={customPace}
                  onChange={(e) => setCustomPace(e.target.value)}
                  className="h-11 rounded-xl border-border bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes personnelles</Label>
                <Textarea
                  placeholder="Objectifs, sensations attendues..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl border-border bg-card"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 pt-4 pb-[max(1rem,var(--safe-area-bottom))]">
          <Button
            onClick={handleSchedule}
            disabled={loading || !scheduledAt || !locationName.trim()}
            className="h-11 w-full rounded-xl"
          >
            {loading ? "Publication..." : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Publier ma séance
              </>
            )}
          </Button>
        </div>

        <LocationPickerMap
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelect={(name, lat, lng) => {
            setLocationName(name);
            setLocationLat(lat);
            setLocationLng(lng);
          }}
          initialLat={locationLat}
          initialLng={locationLng}
        />
      </DialogContent>
    </Dialog>
  );
};
