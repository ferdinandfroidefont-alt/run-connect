import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, Send, BookOpen, Save, GripHorizontal, Plus, Copy, Trash2, ChevronsLeftRight, Minus, MoveLeft, MoveRight } from "lucide-react";
import { ACTIVITY_TYPES } from "@/components/session-creation/types";
import { useSendNotification } from "@/hooks/useSendNotification";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import {
  parseRCC,
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
import { buildWorkoutSegments, computeWorkoutDistance, computeWorkoutDuration } from "@/lib/workoutVisualization";

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

type BuilderTab = "build" | "models";
type BuilderKind = "warmup" | "steady" | "recovery" | "interval" | "tempo" | "cooldown" | "progressive" | "rest";

type TemplateRow = {
  id: string;
  name: string;
  rcc_code: string;
  activity_type: string | null;
  objective: string | null;
};

const BLOCK_LIBRARY: Array<{ kind: BuilderKind; label: string; color: string }> = [
  { kind: "warmup", label: "Échauffement", color: "#9CA3AF" },
  { kind: "steady", label: "Endurance", color: "#60A5FA" },
  { kind: "recovery", label: "Récupération", color: "#22C55E" },
  { kind: "interval", label: "Fractionné", color: "#F97316" },
  { kind: "tempo", label: "Seuil / tempo", color: "#8B5CF6" },
  { kind: "cooldown", label: "Retour au calme", color: "#9CA3AF" },
  { kind: "progressive", label: "Rampe", color: "#8B5CF6" },
  { kind: "rest", label: "Repos", color: "#94A3B8" },
];

function paceToRcc(pace?: string): string {
  if (!pace) return "5'30";
  const [m, s] = pace.split(":");
  return `${m || "5"}'${String(Number.parseInt(s || "0", 10)).padStart(2, "0")}`;
}

function blockToRcc(block: ParsedBlock): string {
  if (block.type === "interval") {
    const reps = Math.max(1, block.repetitions || 1);
    const effort = block.distance ? `${Math.max(100, block.distance)}` : `${Math.max(1, block.duration || 3)}'`;
    const pace = paceToRcc(block.pace);
    const rec =
      reps > 1 && (block.recoveryDuration || 0) > 0
        ? ` r${Math.floor((block.recoveryDuration || 0) / 60)}'${String((block.recoveryDuration || 0) % 60).padStart(2, "0")}>${block.recoveryType || "trot"}`
        : "";
    return `${reps}x${effort}>${pace}${rec}`;
  }
  if (block.duration) {
    return `${Math.max(1, block.duration)}'${block.pace ? `>${paceToRcc(block.pace)}` : ""}`;
  }
  return "10'";
}

function defaultBlock(kind: BuilderKind): ParsedBlock {
  switch (kind) {
    case "warmup":
      return { type: "warmup", raw: "15'>6'00", duration: 15, pace: "6:00" };
    case "recovery":
      return { type: "recovery", raw: "10'>6'30", duration: 10, pace: "6:30" };
    case "interval":
      return {
        type: "interval",
        raw: "5x400>4'00 r1'00>trot",
        distance: 400,
        repetitions: 5,
        pace: "4:00",
        recoveryDuration: 60,
        recoveryType: "trot",
      };
    case "tempo":
      return { type: "steady", raw: "20'>4'30", duration: 20, pace: "4:30" };
    case "cooldown":
      return { type: "cooldown", raw: "10'>6'00", duration: 10, pace: "6:00" };
    case "progressive":
      return { type: "steady", raw: "30'>5'15", duration: 30, pace: "5:15" };
    case "rest":
      return { type: "recovery", raw: "20'>6'45", duration: 20, pace: "6:45" };
    default:
      return { type: "steady", raw: "30'>5'30", duration: 30, pace: "5:30" };
  }
}

function colorForBlock(block: ParsedBlock): string {
  if (block.type === "interval") return "#F97316";
  if (block.type === "recovery") return "#22C55E";
  if (block.type === "warmup" || block.type === "cooldown") return "#9CA3AF";
  const sec = block.pace ? Number.parseInt(block.pace.split(":")[0], 10) * 60 + Number.parseInt(block.pace.split(":")[1] || "0", 10) : 999;
  if (sec <= 285) return "#8B5CF6";
  return "#60A5FA";
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
  const [builderTab, setBuilderTab] = useState<BuilderTab>("build");
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>([]);
  const [loadingTemplateRows, setLoadingTemplateRows] = useState(false);

  useEffect(() => {
    if (isOpen && clubId) loadMembers();
  }, [isOpen, clubId]);

  useEffect(() => {
    if (isOpen && user?.id) void loadTemplateRows();
  }, [isOpen, user?.id]);

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

  const loadTemplateRows = async () => {
    if (!user?.id) return;
    setLoadingTemplateRows(true);
    try {
      const { data, error } = await supabase
        .from("coaching_templates")
        .select("id, name, rcc_code, activity_type, objective")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      setTemplateRows((data || []) as unknown as TemplateRow[]);
    } catch {
      setTemplateRows([]);
    } finally {
      setLoadingTemplateRows(false);
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
    setBuilderTab("build");
    setSelectedBlockIndex(null);
    setDragIndex(null);
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

  const applyBlocks = (next: ParsedBlock[]) => {
    const code = next.map(blockToRcc).join(", ");
    const parsed = parseRCC(code);
    const merged = mergeParsedBlocksByIndex(parsed.blocks, next);
    setRccCode(code);
    setParsedResult(parsed);
    setParsedBlocks(merged);
    setBlockRpe((prev) => normalizeBlockRpeLength(prev, merged.length));
    if (merged.length === 0) setSelectedBlockIndex(null);
    else if (selectedBlockIndex == null) setSelectedBlockIndex(0);
    else if (selectedBlockIndex > merged.length - 1) setSelectedBlockIndex(merged.length - 1);
  };

  const selectedBlock = selectedBlockIndex != null ? parsedBlocks[selectedBlockIndex] : null;
  const summarySegments = useMemo(() => buildWorkoutSegments(parsedBlocks), [parsedBlocks]);
  const summaryDuration = useMemo(() => computeWorkoutDuration(summarySegments), [summarySegments]);
  const summaryDistance = useMemo(() => computeWorkoutDistance(summarySegments), [summarySegments]);
  const summaryLoad = useMemo(
    () => Math.round(parsedBlocks.reduce((acc, b, idx) => acc + ((b.duration || 0) * (blockRpe[idx] || 5)), 0) / 3),
    [parsedBlocks, blockRpe]
  );
  const summaryIntensity = useMemo(() => {
    if (!blockRpe.length) return 0;
    return Math.round(blockRpe.reduce((a, b) => a + b, 0) / blockRpe.length);
  }, [blockRpe]);

  const canSubmit =
    objective.trim().length > 0 &&
    rccCode.trim().length > 0 &&
    parsedResult.errors.length === 0 &&
    (sendMode === "club" ? members.length > 0 : selectedAthletes.size > 0);

  const dateLabel = preselectedDate
    ? format(preselectedDate, "EEE d MMM", { locale: fr })
    : format(new Date(), "EEE d MMM", { locale: fr });

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
                  <Button onClick={handleSubmit} disabled={loading || !canSubmit} size="sm" className="h-8 rounded-lg px-3">
                    {loading ? "..." : "Enregistrer"}
                  </Button>
                }
              />
            }
            scrollClassName="bg-secondary px-4 py-4"
          >
            <div className="space-y-4">
              <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <div className="flex rounded-xl border border-border/70 bg-card p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderTab("build");
                      setSelectedBlockIndex(null);
                    }}
                    className={`h-9 flex-1 rounded-lg text-sm font-semibold ${builderTab === "build" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Construire
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBuilderTab("models");
                      setSelectedBlockIndex(null);
                    }}
                    className={`h-9 flex-1 rounded-lg text-sm font-semibold ${builderTab === "models" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    Modèles
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Sport</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Date</p>
                    <p className="text-sm font-semibold capitalize text-foreground">{dateLabel}</p>
                  </div>
                </div>
              </div>

              {builderTab === "build" ? (
                <>
                  <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                    <Label className="text-xs">Nom de la séance</Label>
                    <Input
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Ex: 10 x 400 m récupération 1 min"
                      className="h-11 rounded-xl border-border bg-card"
                    />
                  </div>

                  <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Structure de la séance</p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <GripHorizontal className="h-3.5 w-3.5" />
                        Glisser pour réorganiser
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" className="h-8 rounded-lg text-xs" onClick={() => applyBlocks([...parsedBlocks, defaultBlock("steady")])}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Bloc
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs"
                        disabled={!selectedBlock || selectedBlock.type !== "interval"}
                        onClick={() => {
                          if (!selectedBlock || selectedBlockIndex == null || selectedBlock.type !== "interval") return;
                          const next = [...parsedBlocks];
                          next[selectedBlockIndex] = { ...selectedBlock, repetitions: Math.max(1, (selectedBlock.repetitions || 1) + 1) };
                          applyBlocks(next);
                        }}
                      >
                        + Répétition
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs"
                        disabled={!selectedBlock || selectedBlock.type !== "interval" || (selectedBlock.repetitions || 1) <= 1}
                        onClick={() => {
                          if (!selectedBlock || selectedBlockIndex == null || selectedBlock.type !== "interval") return;
                          const next = [...parsedBlocks];
                          next[selectedBlockIndex] = { ...selectedBlock, repetitions: Math.max(1, (selectedBlock.repetitions || 1) - 1) };
                          applyBlocks(next);
                        }}
                      >
                        - Répétition
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs"
                        disabled={selectedBlockIndex == null}
                        onClick={() => {
                          if (selectedBlockIndex == null) return;
                          const copy = { ...parsedBlocks[selectedBlockIndex] };
                          const next = [...parsedBlocks];
                          next.splice(selectedBlockIndex + 1, 0, copy);
                          applyBlocks(next);
                          setSelectedBlockIndex(selectedBlockIndex + 1);
                        }}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" /> Dupliquer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs"
                        disabled={selectedBlockIndex == null}
                        onClick={() => {
                          if (selectedBlockIndex == null) return;
                          const next = parsedBlocks.filter((_, idx) => idx !== selectedBlockIndex);
                          applyBlocks(next);
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Supprimer
                      </Button>
                    </div>

                    <div
                      className="space-y-2 rounded-xl border border-border/70 bg-card/60 p-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const kind = e.dataTransfer.getData("application/x-runconnect-block-kind") as BuilderKind;
                        if (!kind) return;
                        applyBlocks([...parsedBlocks, defaultBlock(kind)]);
                      }}
                    >
                      {parsedBlocks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                          Ajoute un bloc pour commencer la timeline.
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                          {parsedBlocks.map((block, index) => {
                            const width = Math.max(12, block.distance ? Math.round(block.distance / 80) : Math.round((block.duration || 10) * 2.2));
                            const height = Math.max(10, 10 + (blockRpe[index] || 5) * 2);
                            const isActive = selectedBlockIndex === index;
                            return (
                              <button
                                key={`${block.raw}-${index}`}
                                type="button"
                                draggable
                                onDragStart={() => setDragIndex(index)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (dragIndex == null || dragIndex === index) return;
                                  const next = [...parsedBlocks];
                                  const [moved] = next.splice(dragIndex, 1);
                                  next.splice(index, 0, moved);
                                  applyBlocks(next);
                                  setSelectedBlockIndex(index);
                                  setDragIndex(null);
                                }}
                                onClick={() => setSelectedBlockIndex(index)}
                                className={`shrink-0 rounded-xl border p-2 transition ${isActive ? "border-primary bg-primary/10" : "border-border/70 bg-card"}`}
                                style={{ minWidth: 72 }}
                              >
                                <div className="flex items-end gap-1">
                                  <span
                                    className="rounded-md"
                                    style={{ width: `${width}px`, height: `${height}px`, backgroundColor: colorForBlock(block) }}
                                  />
                                </div>
                                <p className="mt-2 text-left text-[11px] font-medium text-foreground">
                                  {block.type === "interval" ? `${block.repetitions || 1}x ${block.distance || block.duration || 0}` : `${block.duration || 0} min`}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedBlock ? (
                      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Édition bloc</p>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-md"
                              disabled={selectedBlockIndex == null || selectedBlockIndex <= 0}
                              onClick={() => {
                                if (selectedBlockIndex == null || selectedBlockIndex <= 0) return;
                                const next = [...parsedBlocks];
                                [next[selectedBlockIndex - 1], next[selectedBlockIndex]] = [next[selectedBlockIndex], next[selectedBlockIndex - 1]];
                                applyBlocks(next);
                                setSelectedBlockIndex(selectedBlockIndex - 1);
                              }}
                            >
                              <MoveLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-md"
                              disabled={selectedBlockIndex == null || selectedBlockIndex >= parsedBlocks.length - 1}
                              onClick={() => {
                                if (selectedBlockIndex == null || selectedBlockIndex >= parsedBlocks.length - 1) return;
                                const next = [...parsedBlocks];
                                [next[selectedBlockIndex], next[selectedBlockIndex + 1]] = [next[selectedBlockIndex + 1], next[selectedBlockIndex]];
                                applyBlocks(next);
                                setSelectedBlockIndex(selectedBlockIndex + 1);
                              }}
                            >
                              <MoveRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Type</Label>
                            <Select
                              value={selectedBlock.type}
                              onValueChange={(v) => {
                                if (selectedBlockIndex == null) return;
                                const next = [...parsedBlocks];
                                next[selectedBlockIndex] = { ...selectedBlock, type: v as ParsedBlock["type"] };
                                applyBlocks(next);
                              }}
                            >
                              <SelectTrigger className="h-9 rounded-lg bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="warmup">Échauffement</SelectItem>
                                <SelectItem value="steady">Endurance</SelectItem>
                                <SelectItem value="recovery">Récupération</SelectItem>
                                <SelectItem value="interval">Fractionné</SelectItem>
                                <SelectItem value="cooldown">Retour au calme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Allure</Label>
                            <Input
                              value={selectedBlock.pace || ""}
                              onChange={(e) => {
                                if (selectedBlockIndex == null) return;
                                const next = [...parsedBlocks];
                                next[selectedBlockIndex] = { ...selectedBlock, pace: e.target.value || undefined };
                                applyBlocks(next);
                              }}
                              placeholder="5:00"
                              className="h-9 rounded-lg bg-card"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Durée (min)</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-md"
                                onClick={() => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, duration: Math.max(1, (selectedBlock.duration || 10) - 1) };
                                  applyBlocks(next);
                                }}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                value={String(selectedBlock.duration || 0)}
                                onChange={(e) => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, duration: Math.max(0, Number.parseInt(e.target.value || "0", 10)) || 0 };
                                  applyBlocks(next);
                                }}
                                className="h-8 rounded-md bg-card text-center"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-md"
                                onClick={() => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, duration: (selectedBlock.duration || 0) + 1 };
                                  applyBlocks(next);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Distance (m)</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-md"
                                onClick={() => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, distance: Math.max(0, (selectedBlock.distance || 0) - 100) };
                                  applyBlocks(next);
                                }}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <Input
                                value={String(selectedBlock.distance || 0)}
                                onChange={(e) => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, distance: Math.max(0, Number.parseInt(e.target.value || "0", 10)) || 0 };
                                  applyBlocks(next);
                                }}
                                className="h-8 rounded-md bg-card text-center"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-md"
                                onClick={() => {
                                  if (selectedBlockIndex == null) return;
                                  const next = [...parsedBlocks];
                                  next[selectedBlockIndex] = { ...selectedBlock, distance: (selectedBlock.distance || 0) + 100 };
                                  applyBlocks(next);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {selectedBlock.type === "interval" ? (
                            <>
                              <div className="space-y-1">
                                <Label className="text-[11px]">Répétitions</Label>
                                <div className="flex items-center gap-1">
                                  <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-md" onClick={() => {
                                    if (selectedBlockIndex == null) return;
                                    const next = [...parsedBlocks];
                                    next[selectedBlockIndex] = { ...selectedBlock, repetitions: Math.max(1, (selectedBlock.repetitions || 1) - 1) };
                                    applyBlocks(next);
                                  }}><Minus className="h-3.5 w-3.5" /></Button>
                                  <Input value={String(selectedBlock.repetitions || 1)} readOnly className="h-8 rounded-md bg-card text-center" />
                                  <Button type="button" size="icon" variant="secondary" className="h-8 w-8 rounded-md" onClick={() => {
                                    if (selectedBlockIndex == null) return;
                                    const next = [...parsedBlocks];
                                    next[selectedBlockIndex] = { ...selectedBlock, repetitions: (selectedBlock.repetitions || 1) + 1 };
                                    applyBlocks(next);
                                  }}><Plus className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">Récup (sec)</Label>
                                <Input
                                  value={String(selectedBlock.recoveryDuration || 0)}
                                  onChange={(e) => {
                                    if (selectedBlockIndex == null) return;
                                    const next = [...parsedBlocks];
                                    next[selectedBlockIndex] = { ...selectedBlock, recoveryDuration: Math.max(0, Number.parseInt(e.target.value || "0", 10)) || 0 };
                                    applyBlocks(next);
                                  }}
                                  className="h-9 rounded-lg bg-card"
                                />
                              </div>
                            </>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[2, 4, 6, 8].map((rpeValue) => (
                            <button
                              key={rpeValue}
                              type="button"
                              onClick={() => {
                                if (selectedBlockIndex == null) return;
                                const next = [...blockRpe];
                                next[selectedBlockIndex] = rpeValue;
                                setBlockRpe(normalizeBlockRpeLength(next, parsedBlocks.length));
                              }}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${((blockRpe[selectedBlockIndex ?? 0] || 5) === rpeValue) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                            >
                              Intensité {rpeValue}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {BLOCK_LIBRARY.map((item) => (
                          <button
                            key={item.kind}
                            type="button"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("application/x-runconnect-block-kind", item.kind)}
                            onClick={() => applyBlocks([...parsedBlocks, defaultBlock(item.kind)])}
                            className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-left"
                          >
                            <span className="h-3 w-8 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs font-medium text-foreground">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ios-card rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Résumé automatique</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {summaryDuration} min • {summaryDistance.toFixed(1).replace(".", ",")} km • {summaryLoad} pts
                    </p>
                    <p className="text-xs text-muted-foreground">Intensité moyenne: {summaryIntensity}/10</p>
                  </div>
                </>
              ) : (
                <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modèles</p>
                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => setShowTemplates(true)}>
                      <BookOpen className="mr-1 h-3.5 w-3.5" /> Ouvrir bibliothèque
                    </Button>
                  </div>
                  {loadingTemplateRows ? (
                    <p className="text-sm text-muted-foreground">Chargement des modèles…</p>
                  ) : templateRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun modèle sauvegardé.</p>
                  ) : (
                    <div className="space-y-2">
                      {templateRows.map((tpl) => {
                        const parsed = parseRCC(tpl.rcc_code);
                        const segs = buildWorkoutSegments(parsed.blocks);
                        const dist = computeWorkoutDistance(segs);
                        const dur = computeWorkoutDuration(segs);
                        return (
                          <button
                            type="button"
                            key={tpl.id}
                            className="w-full rounded-xl border border-border/70 bg-card p-3 text-left"
                            onClick={() => {
                              setRccCode(tpl.rcc_code);
                              setObjective(tpl.objective || tpl.name);
                              if (tpl.activity_type) setActivityType(tpl.activity_type);
                              handleParsedChange(parseRCC(tpl.rcc_code));
                              setBuilderTab("build");
                            }}
                          >
                            <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
                            <div className="mt-2 flex gap-1">
                              {parsed.blocks.slice(0, 8).map((b, i) => (
                                <span key={`${tpl.id}-${i}`} className="rounded-md" style={{ width: `${Math.max(12, (b.duration || 6) * 2)}px`, height: `${b.type === "interval" ? 24 : 14}px`, backgroundColor: colorForBlock(b) }} />
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{dur} min • {dist.toFixed(1).replace(".", ",")} km</p>
                            <p className="mt-1 text-xs font-medium text-primary">Ajouter au planning</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="ios-card space-y-4 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lieu (optionnel)</Label>
                  <Input
                    placeholder="Parc, stade, forêt..."
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    className="h-11 rounded-xl border-border bg-card"
                  />
                </div>
              </div>

              <div className="ios-card space-y-3 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                <p className="text-xs font-medium uppercase text-muted-foreground">Destinataires</p>
                <div className="flex gap-2">
                  <Button type="button" variant={sendMode === "club" ? "default" : "outline"} size="sm" onClick={() => setSendMode("club")} className="min-w-0 flex-1 text-xs">
                    <Users className="mr-1 h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Tout le club ({members.length})</span>
                  </Button>
                  <Button type="button" variant={sendMode === "individual" ? "default" : "outline"} size="sm" onClick={() => setSendMode("individual")} className="min-w-0 flex-1 text-xs">
                    <UserCheck className="mr-1 h-3.5 w-3.5 shrink-0" /> Sélection
                  </Button>
                </div>
                {sendMode === "individual" ? (
                  <div className="space-y-2">
                    <Input placeholder="Rechercher un athlète..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-10 rounded-xl border-border bg-card text-xs" />
                    <div className="max-h-40 space-y-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                      {filteredMembers.map(m => {
                        const isSelected = selectedAthletes.has(m.user_id);
                        return (
                          <div
                            key={m.user_id}
                            className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl p-2 transition-colors ${isSelected ? "border border-primary/20 bg-primary/10" : "hover:bg-muted/50"}`}
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
                ) : null}
              </div>

              {rccCode.trim() ? (
                <div className="ios-card flex items-end gap-2 border border-border/60 p-4 shadow-[var(--shadow-card)]">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs">Sauver comme modèle</Label>
                    <Input placeholder="Nom du modèle..." value={templateName} onChange={e => setTemplateName(e.target.value)} className="h-10 rounded-xl border-border bg-card text-xs" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate} className="h-10 shrink-0 rounded-xl">
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
          handleParsedChange(parseRCC(code));
          setBuilderTab("build");
        }}
      />
    </>
  );
};
