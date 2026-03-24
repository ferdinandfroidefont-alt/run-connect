import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Users, UserCheck, ChevronLeft, Send, BookOpen, Save, MapPin } from "lucide-react";
import { ACTIVITY_TYPES } from "@/components/session-creation/types";
import { useSendNotification } from "@/hooks/useSendNotification";
import { RCCEditor } from "./RCCEditor";
import { RCCBlocksPreview } from "./RCCBlocksPreview";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import {
  rccToSessionBlocks,
  mergeParsedBlocksByIndex,
  type RCCResult,
  type ParsedBlock,
} from "@/lib/rccParser";
import { aggregateRpeFromSessionBlocks } from "@/lib/sessionBlockRpe";
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
      const sessionBlocks =
        parsedBlocks.length > 0 ? rccToSessionBlocks(parsedBlocks) : null;
      const title = `${objective.trim()}`;
      const aggregatedRpe = aggregateRpeFromSessionBlocks(sessionBlocks);

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
          rpe: aggregatedRpe,
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
          title: `🎓 Nouvelle séance de ${coachName}`,
          message: title,
          data: { club_id: clubId, coaching_session_id: session.id },
        });
        sendPushNotification(athleteId, `🎓 Nouvelle séance de ${coachName}`, title, "coaching_session");
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
    setParsedBlocks((prev) => mergeParsedBlocksByIndex(result.blocks, prev));
  };

  const handleBlockRpe = (index: number, payload: { rpe?: number; recoveryRpe?: number }) => {
    setParsedBlocks((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], ...payload };
      return next;
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton>
          <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <GraduationCap className="h-5 w-5" />
              <span className="flex-1">Nouvelle séance</span>
              <span className="text-xs text-muted-foreground font-normal capitalize">{dateLabel}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
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
                <Label className="text-xs">Objectif *</Label>
                <Input
                  placeholder="VMA, Seuil, Footing..."
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Template button */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="text-xs">
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Templates
              </Button>
            </div>

            {/* RCC Editor */}
            <RCCEditor
              value={rccCode}
              onChange={setRccCode}
              onParsedChange={handleParsedChange}
            />
            {parsedBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Sous l’aperçu, indiquez le <span className="font-medium text-foreground">RPE cible (1–10)</span> pour
                  chaque partie (échauffement, séries, retour au calme). Sur les fractionnés, vous pouvez aussi fixer le
                  RPE de la récup entre répétitions.
                </p>
                <RCCBlocksPreview
                  blocks={parsedBlocks}
                  editableRpe
                  onRpeChange={handleBlockRpe}
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Lieu (optionnel)
              </Label>
              <Input
                placeholder="Parc, stade, forêt..."
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Coach notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Consignes coach (optionnel)</Label>
              <Textarea
                placeholder="Hydratation, échauffement spécifique..."
                value={coachNotes}
                onChange={e => setCoachNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase">Destinataires</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={sendMode === "club" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("club")}
                  className="flex-1 text-xs"
                >
                  <Users className="h-3.5 w-3.5 mr-1" />
                  Tout le club ({members.length})
                </Button>
                <Button
                  type="button"
                  variant={sendMode === "individual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("individual")}
                  className="flex-1 text-xs"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  Sélection
                </Button>
              </div>

              {sendMode === "individual" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Rechercher un athlète..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {filteredMembers.map(m => {
                      const isSelected = selectedAthletes.has(m.user_id);
                      return (
                        <div
                          key={m.user_id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleAthlete(m.user_id)}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={m.avatar_url || ""} />
                            <AvatarFallback className="text-xs">{(m.username || "?")[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium truncate">{m.display_name || m.username}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Save template */}
            {rccCode.trim() && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Sauver comme template</Label>
                  <Input
                    placeholder="Nom du template..."
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={!templateName.trim() || savingTemplate}
                  className="h-8"
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background border-t p-4">
            <Button onClick={handleSubmit} disabled={loading || !canSubmit} className="w-full">
              {loading ? "Envoi..." : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer la séance
                </>
              )}
            </Button>
          </div>
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
