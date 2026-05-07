import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { parseRCC, rccToSessionBlocks, mergeParsedBlocksByIndex, type RCCResult, type ParsedBlock } from "@/lib/rccParser";
import { LocationPickerMap } from "./LocationPickerMap";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
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
      <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0"
          header={<CoachingFullscreenHeader title="Créer une séance" onBack={onClose} />}
          scrollClassName="bg-secondary px-4 py-4"
          footer={
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
          }
        >
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

            <div className="space-y-5 rounded-[18px] border border-[#e0e0e0] bg-[#f5f5f7] p-[17px]">
              <div className="grid grid-cols-2 gap-2 rounded-full border border-[#e0e0e0] bg-white p-1">
                <button type="button" className="h-11 rounded-full border border-[#0066cc] bg-[#0066cc] text-[15px] font-semibold text-white">Construire</button>
                <button type="button" className="h-11 rounded-full border border-[#e0e0e0] bg-white text-[15px] font-semibold text-[#1d1d1f]">Modèles</button>
              </div>

              <div className="space-y-1">
                <Input
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Nom de la séance"
                  className="h-auto border-0 bg-transparent px-0 py-0 font-display text-[52px] font-semibold leading-[1.04] tracking-[-0.5px] text-[#1d1d1f] placeholder:text-[#7a7a7a] shadow-none focus-visible:ring-0"
                />
                <p className="text-[14px] text-[#7a7a7a]">11 km · ~54 min</p>
              </div>

              <div className="grid grid-cols-4 gap-[10px]">
                {[
                  { key: "course", emoji: "🏃", bg: "#007AFF" },
                  { key: "velo", emoji: "🚴", bg: "#FF3B30" },
                  { key: "natation", emoji: "🏊", bg: "#5AC8FA" },
                  { key: "musculation", emoji: "💪", bg: "#FF9500" },
                ].map((sport) => (
                  <button
                    key={sport.key}
                    type="button"
                    onClick={() => setActivityType(sport.key)}
                    className="relative aspect-square rounded-[14px] text-[36px]"
                    style={{ backgroundColor: sport.bg }}
                  >
                    {activityType === sport.key ? (
                      <span className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[0_0_0_2px_#f5f5f7,0_0_0_4px_#0066cc]" />
                    ) : null}
                    {sport.emoji}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Schéma de séance</p>
                <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-3">
                  <svg viewBox="0 0 360 230" xmlns="http://www.w3.org/2000/svg" className="w-full">
                    <line x1="40" y1="20" x2="360" y2="20" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="50" x2="360" y2="50" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="80" x2="360" y2="80" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="110" x2="360" y2="110" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="140" x2="360" y2="140" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="170" x2="360" y2="170" stroke="#e0e0e0" strokeDasharray="2 3" />
                    <line x1="40" y1="200" x2="360" y2="200" stroke="#1d1d1f" strokeOpacity="0.18" />
                    <g fontFamily="SF Pro Text, system-ui, sans-serif" fontSize="10" fontWeight="600" fill="#7a7a7a">
                      <text x="32" y="38" textAnchor="end">Z6</text>
                      <text x="32" y="68" textAnchor="end">Z5</text>
                      <text x="32" y="98" textAnchor="end">Z4</text>
                      <text x="32" y="128" textAnchor="end">Z3</text>
                      <text x="32" y="158" textAnchor="end">Z2</text>
                      <text x="32" y="188" textAnchor="end">Z1</text>
                    </g>
                    <rect x="40" y="170" width="144" height="30" fill="#B5B5BA" rx="3" />
                    <rect x="184" y="50" width="37" height="150" fill="#FF9500" rx="3" />
                    <rect x="221" y="170" width="6" height="30" fill="#B5B5BA" rx="2" />
                    <rect x="227" y="50" width="37" height="150" fill="#FF9500" rx="3" />
                    <rect x="264" y="170" width="59" height="30" fill="#B5B5BA" rx="3" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2">
                <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Ajouter un bloc</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Continu", code: "20'>5'30", svg: <rect x="2" y="9" width="40" height="6" rx="2" fill="#0066cc" /> },
                    { label: "Intervalle", code: "6x3'>3'30", svg: <><rect x="2" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/><rect x="11" y="14" width="3" height="6" rx="1" fill="#B5B5BA"/><rect x="17" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/><rect x="26" y="14" width="3" height="6" rx="1" fill="#B5B5BA"/><rect x="32" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/></> },
                    { label: "Pyramide", code: "200>4'00, 400>4'10, 600>4'20, 400>4'10, 200>4'00", svg: <><rect x="2" y="14" width="5" height="6" rx="1" fill="#34C759"/><rect x="9" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/><rect x="16" y="4" width="5" height="16" rx="1.5" fill="#FF9500"/><rect x="23" y="4" width="5" height="16" rx="1.5" fill="#FF9500"/><rect x="30" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/><rect x="37" y="14" width="5" height="6" rx="1" fill="#34C759"/></> },
                    { label: "Variation", code: "10'>5'30, 10'>4'45, 10'>5'15", svg: <><rect x="2" y="16" width="5" height="4" rx="1" fill="#B5B5BA"/><rect x="9" y="12" width="5" height="8" rx="1" fill="#34C759"/><rect x="16" y="6" width="5" height="14" rx="1.3" fill="#FF9500"/><rect x="23" y="14" width="5" height="6" rx="1" fill="#0066cc"/><rect x="30" y="4" width="5" height="16" rx="1.5" fill="#FF3B30"/><rect x="37" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/></> },
                  ].map((item, idx) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setRccCode((prev) => (prev.trim() ? `${prev}, ${item.code}` : item.code))}
                      className={`rounded-[14px] border bg-white px-2 py-2 ${idx === 2 ? "border-2 border-[#0066cc]" : "border-[#e0e0e0]"}`}
                    >
                      <svg viewBox="0 0 44 22" className="mx-auto h-5 w-11" fill="none">{item.svg}</svg>
                      <span className="mt-1 block text-[12px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Code RCC</Label>
                <RCCEditor value={rccCode} onChange={setRccCode} onParsedChange={handleParsedChange} />
              </div>
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
        </IosFixedPageHeaderShell>

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
