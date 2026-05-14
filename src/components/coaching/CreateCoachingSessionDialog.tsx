import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, Send, BookOpen, Save, MapPin, Waves, BarChart3, Triangle, Activity } from "lucide-react";
import { ACTIVITY_TYPES } from "@/components/session-creation/types";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import {
  rccToSessionBlocks,
  mergeParsedBlocksByIndex,
  type RCCResult,
  type ParsedBlock,
} from "@/lib/rccParser";
import {
  blockRpeToJson,
  normalizeBlockRpeLength,
  resolveSessionRpeForInsert,
  stripPerBlockRpeFromSessionBlocks,
} from "@/lib/sessionBlockRpe";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CreateCoachingSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: () => void;
  preselectedDate?: Date | null;
}

interface ClubMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export const CreateCoachingSessionDialog = ({
  isOpen,
  onClose,
  clubId,
  onCreated,
  preselectedDate,
}: CreateCoachingSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState("course");
  const [objective, setObjective] = useState("");
  const [rccCode, setRccCode] = useState("");
  const [parsedResult, setParsedResult] = useState<RCCResult>({ blocks: [], errors: [] });
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [blockRpe, setBlockRpe] = useState<number[]>([]);
  const [coachNotes, setCoachNotes] = useState("");
  const [locationName, setLocationName] = useState("");
  // Recipients
  const [sendMode, setSendMode] = useState<"club" | "individual">("club");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (isOpen && clubId) loadMembers();
  }, [isOpen, clubId]);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data: memberIds, error: gmError } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId)
        .neq("user_id", user?.id || "");

      if (gmError) throw gmError;

      if (!memberIds?.length) {
        setMembers([]);
        return;
      }

      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", memberIds.map(m => m.user_id));
      if (profError) throw profError;
      setMembers(profiles || []);
    } catch (e: any) {
      console.error(e);
      setMembers([]);
      toast({
        title: "Membres du club",
        description: e?.message || "Impossible de charger la liste des membres.",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleAthlete = (userId: string) => {
    setSelectedAthletes(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !rccCode.trim() || !user) return;
    setSavingTemplate(true);
    try {
      const { error } = await supabase.from("coaching_templates").insert({
        coach_id: user.id,
        name: templateName.trim(),
        rcc_code: rccCode.trim(),
        activity_type: activityType,
        objective: objective.trim() || null,
      } as any);
      if (error) throw error;
      toast({ title: "Template sauvegardé !" });
      setTemplateName("");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSubmit = async () => {
    if (!objective.trim() || !rccCode.trim() || !user) return;
    if (sendMode === "club" && members.length === 0) {
      toast({
        title: "Aucun destinataire",
        description: "Ce club n’a pas d’autres membres à notifier. Invitez des athlètes ou choisissez le mode individuel.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const targetIds = sendMode === "individual" ? Array.from(selectedAthletes) : [];
      const rawBlocks = parsedBlocks.length > 0 ? rccToSessionBlocks(parsedBlocks) : null;
      const sessionBlocks = rawBlocks ? stripPerBlockRpeFromSessionBlocks(rawBlocks) : null;
      const title = `${objective.trim()}`;
      const effectiveBlockRpe = normalizeBlockRpeLength(blockRpe, parsedBlocks.length);
      const resolvedRpe = resolveSessionRpeForInsert(null, rawBlocks, effectiveBlockRpe);

      const { data: session, error } = await supabase
        .from("coaching_sessions")
        .insert({
          club_id: clubId,
          coach_id: user.id,
          title,
          description: null,
          coach_notes: coachNotes.trim() || null,
          scheduled_at: (preselectedDate || new Date()).toISOString(),
          activity_type: activityType,
          session_blocks: sessionBlocks as any,
          status: "planned",
          send_mode: sendMode,
          target_athletes: targetIds,
          rcc_code: rccCode.trim(),
          objective: objective.trim(),
          default_location_name: locationName.trim() || null,
          rpe: resolvedRpe,
          rpe_phases: blockRpeToJson(effectiveBlockRpe),
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Create participations
      const recipientIds = sendMode === "individual" && selectedAthletes.size > 0
        ? targetIds
        : members.map(m => m.user_id);

      if (recipientIds.length > 0) {
        const { error: partError } = await supabase.from("coaching_participations").insert(
          recipientIds.map(userId => ({
            coaching_session_id: session.id,
            user_id: userId,
            status: "sent",
          }))
        );
        if (partError) throw partError;
      }

      // Notify in-app + push
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const coachName = coachProfile?.display_name || coachProfile?.username || "Coach";

      for (const athleteId of recipientIds) {
        await supabase.from("notifications").insert({
          user_id: athleteId,
          type: "coaching_session",
          title: `Nouvelle séance de ${coachName}`,
          message: title,
          data: { club_id: clubId, coaching_session_id: session.id },
        });
        sendPushNotification(athleteId, `Nouvelle séance de ${coachName}`, title, "coaching_session");
      }

      toast({ title: "Séance envoyée !", description: `${recipientIds.length} athlète(s) notifié(s)` });
      onCreated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActivityType("course");
    setObjective("");
    setRccCode("");
    setParsedResult({ blocks: [], errors: [] });
    setParsedBlocks([]);
    setBlockRpe([]);
    setCoachNotes("");
    setLocationName("");
    setSendMode("club");
    setSelectedAthletes(new Set());
    setSearchQuery("");
    setTemplateName("");
  };

  const filteredMembers = members.filter(m =>
    !searchQuery || (m.display_name || m.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleParsedChange = (result: RCCResult) => {
    setParsedResult(result);
    setParsedBlocks((prev) => {
      const merged = mergeParsedBlocksByIndex(result.blocks, prev);
      setBlockRpe((br) => normalizeBlockRpeLength(br, merged.length));
      return merged;
    });
  };

  const canSubmit =
    objective.trim().length > 0 &&
    rccCode.trim().length > 0 &&
    parsedResult.errors.length === 0 &&
    (sendMode === "club" ? members.length > 0 : selectedAthletes.size > 0);

  const dateLabel = preselectedDate
    ? format(preselectedDate, "EEE d MMM", { locale: fr })
    : format(new Date(), "EEE d MMM", { locale: fr });
  const selectedActivity = ACTIVITY_TYPES.find((type) => type.value === activityType) ?? ACTIVITY_TYPES[0];
  const mockupPalette = {
    actionBlue: "#007AFF",
    z1: "#B5B5BA",
    z2: "#0066cc",
    z3: "#34C759",
    z4: "#FFCC00",
    z5: "#FF9500",
    z6: "#FF3B30",
    separator: "rgba(60,60,67,0.18)",
  } as const;
  const schemaBars = parsedBlocks.slice(0, 6);
  const activeTile = parsedBlocks.length > 0 ? "pyramide" : "continu";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            headerWrapperClassName="shrink-0"
            header={
              <CoachingFullscreenHeader
                title="Créer une séance"
                onBack={onClose}
                rightSlot={
                  <span className="max-w-[min(120px,32vw)] truncate text-right text-xs capitalize text-muted-foreground">
                    {dateLabel}
                  </span>
                }
              />
            }
            scrollClassName="bg-secondary px-4 py-4"
            footer={
              <div className="shrink-0 border-t border-border bg-card px-4 pt-4 pb-[max(1rem,var(--safe-area-bottom))]">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canSubmit}
                  className="h-12 w-full rounded-[14px]"
                  style={{ backgroundColor: mockupPalette.actionBlue }}
                >
                  {loading ? "Envoi..." : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enregistrer la séance
                    </>
                  )}
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-full border border-[#d8d8dd] bg-white p-1">
                <button type="button" className="h-10 rounded-full bg-[#0066cc] text-[15px] font-semibold text-white">
                  Construire
                </button>
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="h-10 rounded-full text-[15px] font-semibold text-[#1d1d1f]"
                >
                  Modèles
                </button>
              </div>

              <div className="px-1">
                <Input
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  placeholder="Nom de la séance"
                  className="h-auto border-0 bg-transparent px-0 py-0 font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.7px] text-[#1d1d1f] placeholder:text-[#7a7a7a] shadow-none focus-visible:ring-0"
                />
                <p className="mt-1 text-[14px] text-[#7a7a7a]">
                  {parsedBlocks.length > 0
                    ? `${parsedBlocks.length} blocs · ~${Math.max(20, parsedBlocks.length * 8)} min`
                    : "Ajoute des blocs pour estimer la durée"}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "course", emoji: "🏃", bg: "#007AFF" },
                  { id: "velo", emoji: "🚴", bg: "#FF3B30" },
                  { id: "natation", emoji: "🏊", bg: "#5AC8FA" },
                  { id: "musculation", emoji: "💪", bg: "#FF9500" },
                ].map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => setActivityType(sport.id)}
                    className="relative flex aspect-square items-center justify-center rounded-[14px] text-[33px]"
                    style={{ backgroundColor: sport.bg }}
                  >
                    {activityType === sport.id ? (
                      <span className="pointer-events-none absolute inset-0 rounded-[14px] ring-2 ring-white ring-offset-2 ring-offset-[#0066cc]" />
                    ) : null}
                    <span aria-hidden>{sport.emoji}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2 px-1">
                <p className="text-[26px] font-semibold tracking-[-0.4px] text-[#1d1d1f]">Schéma de séance</p>
                <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-3">
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
                    <g fontFamily="SF Pro Text, system-ui, sans-serif" fontSize="10" fill="#7a7a7a">
                      <text x="40" y="216" textAnchor="middle">0:00</text>
                      <text x="120" y="216" textAnchor="middle">0:15</text>
                      <text x="200" y="216" textAnchor="middle">0:30</text>
                      <text x="280" y="216" textAnchor="middle">0:45</text>
                      <text x="360" y="216" textAnchor="end">1:00</text>
                    </g>
                  </svg>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <p className="text-[14px] font-semibold text-[#333]">Blocs</p>

                {[
                  {
                    id: "continu",
                    label: "Continu",
                    badge: "1",
                    subtitle: "Z1 · 5 km · 27 min",
                    accent: "#34C759",
                    icon: <Waves className="h-4 w-4" />,
                    insert: "5km>5'30",
                    fields: [
                      ["Allure", "5'30", "/km"],
                      ["Distance", "5", "km"],
                      ["Temps", "27", "min"],
                    ],
                  },
                  {
                    id: "intervalle",
                    label: "Intervalle",
                    badge: "2 × 2",
                    subtitle: "Z5 · 2 km @ 3'30 · récup 1 min",
                    accent: "#0066cc",
                    icon: <BarChart3 className="h-4 w-4" />,
                    insert: "2x(2km>3'30 r1')",
                    fields: [
                      ["Blocs", "1", ""],
                      ["Répétitions", "2", ""],
                      ["RPE", "8", ""],
                      ["Distance", "2", "km"],
                      ["Temps", "7", "min"],
                      ["Allure", "3'30", "/km"],
                    ],
                  },
                  {
                    id: "pyramide",
                    label: "Pyramide",
                    badge: "3 + 2 miroirs",
                    subtitle: "Symétrique · 5 paliers",
                    accent: "#FF9500",
                    icon: <Triangle className="h-4 w-4" />,
                    insert: "200>5'30, 400>5'00, 600>4'40, 400>5'00, 200>5'30",
                    fields: [
                      ["Palier 1", "200m", "5'30"],
                      ["Palier 2", "400m", "5'00"],
                      ["Palier 3", "600m", "4'40"],
                    ],
                  },
                  {
                    id: "variation",
                    label: "Variation",
                    badge: "7'00 → 4'30",
                    subtitle: "Z2 · 5 km · 30 min",
                    accent: "#0066cc",
                    icon: <Activity className="h-4 w-4" />,
                    insert: "5km de 7'00 à 4'30",
                    fields: [
                      ["Allure début", "7'00", "/km"],
                      ["Allure finale", "4'30", "/km"],
                      ["RPE", "7", ""],
                      ["Distance", "5", "km"],
                      ["Temps", "30", "min"],
                    ],
                  },
                ].map((block) => (
                  <div key={block.id} className="overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
                    <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderLeft: `3px solid ${block.accent}` }}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: block.accent }}>
                          {block.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[16px] font-semibold">{block.label}</span>
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: block.accent, backgroundColor: `${block.accent}22` }}>
                              {block.badge}
                            </span>
                          </div>
                          <p className="truncate text-[13px] text-[#7a7a7a]">{block.subtitle}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRccCode((prev) => (prev.trim() ? `${prev}, ${block.insert}` : block.insert))}
                        className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: block.accent }}
                      >
                        Ajouter
                      </button>
                    </div>
                    <div className="border-t border-[#f0f0f0] px-4 py-3">
                      <div className="grid grid-cols-3 gap-2">
                        {block.fields.map(([label, value, unit], idx) => (
                          <div key={`${block.id}-${idx}`}>
                            <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.35px] text-[#7a7a7a]">{label}</p>
                            <input
                              readOnly
                              value={value}
                              className="h-9 w-full rounded-[11px] border border-[#e0e0e0] bg-white px-2 text-center text-[14px] font-medium text-[#1d1d1f]"
                            />
                            <p className="mt-1 text-center text-[10px] text-[#7a7a7a]">{unit || "\u00A0"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="ios-card space-y-4 overflow-hidden border p-0 shadow-[var(--shadow-card)]"
                style={{ borderColor: mockupPalette.actionBlue, boxShadow: "0 8px 22px -14px rgba(0,122,255,0.45)" }}
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ backgroundColor: "rgba(0,122,255,0.06)", borderBottom: `0.5px solid ${mockupPalette.separator}` }}>
                  <div>
                    <p className="text-sm font-semibold">Éditeur du bloc actif</p>
                    <p className="text-xs text-muted-foreground">RCC + aperçu du bloc</p>
                  </div>
                  <span className="rounded-lg px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: mockupPalette.actionBlue }}>
                    Actif
                  </span>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <RCCEditor
                    value={rccCode}
                    onChange={setRccCode}
                    onParsedChange={handleParsedChange}
                  />
                  {parsedBlocks.length > 0 && (
                    <RCCBlocksPreview
                      blocks={parsedBlocks}
                      blockRpe={blockRpe}
                      onBlockRpeChange={setBlockRpe}
                    />
                  )}
                </div>
              </div>

              <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 text-xs">
                    <MapPin className="h-3 w-3 shrink-0" />
                    Lieu (optionnel)
                  </Label>
                  <Input
                    placeholder="Parc, stade, forêt..."
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    className="h-11 rounded-xl border-border bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Consignes coach (optionnel)</Label>
                  <Textarea
                    placeholder="Hydratation, échauffement spécifique..."
                    value={coachNotes}
                    onChange={e => setCoachNotes(e.target.value)}
                    rows={2}
                    className="rounded-xl border-border bg-card"
                  />
                </div>
              </div>

              <div className="ios-card space-y-1.5 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <Label className="text-xs">Nom du bloc *</Label>
                <Input
                  placeholder="Pyramide seuil, 10x400..."
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  className="h-11 rounded-[14px] border-border bg-card"
                />
              </div>

              <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-medium uppercase text-muted-foreground">Destinataires</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sendMode === "club" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSendMode("club")}
                    className="min-w-0 flex-1 text-xs"
                  >
                    <Users className="mr-1 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Tout le club ({members.length})</span>
                  </Button>
                  <Button
                    type="button"
                    variant={sendMode === "individual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSendMode("individual")}
                    className="min-w-0 flex-1 text-xs"
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5 shrink-0" />
                    Sélection
                  </Button>
                </div>

                {sendMode === "individual" && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Rechercher un athlète..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-10 rounded-xl border-border bg-card text-xs"
                    />
                    <div className="max-h-40 space-y-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                      {filteredMembers.map(m => {
                        const isSelected = selectedAthletes.has(m.user_id);
                        return (
                          <div
                            key={m.user_id}
                            className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl p-2 transition-colors ${
                              isSelected ? "border border-primary/20 bg-primary/10" : "hover:bg-muted/50"
                            }`}
                            onClick={() => toggleAthlete(m.user_id)}
                          >
                            <Checkbox checked={isSelected} />
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={m.avatar_url || ""} />
                              <AvatarFallback className="text-xs">{(m.username || "?")[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 truncate text-xs font-medium">{m.display_name || m.username}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {rccCode.trim() ? (
                <div className="ios-card flex items-end gap-2 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs">Sauver comme template</Label>
                    <Input
                      placeholder="Nom du template..."
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      className="h-10 rounded-xl border-border bg-card text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || savingTemplate}
                    className="h-10 shrink-0 rounded-xl"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code, obj) => {
          setRccCode(code);
          if (obj) setObjective(obj);
        }}
      />
    </>
  );
};
