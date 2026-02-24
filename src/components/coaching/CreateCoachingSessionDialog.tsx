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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Users, UserCheck, ChevronRight, ChevronLeft, Calendar } from "lucide-react";
import { SessionModeSwitch } from "@/components/session-creation/SessionModeSwitch";
import { SessionBlockBuilder } from "@/components/session-creation/SessionBlockBuilder";
import { SessionBlock, SessionMode, ACTIVITY_TYPES } from "@/components/session-creation/types";
import { useSendNotification } from "@/hooks/useSendNotification";

interface CreateCoachingSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: () => void;
}

interface ClubMember {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface AthleteSelection {
  userId: string;
  suggestedDate: string;
}

export const CreateCoachingSessionDialog = ({
  isOpen,
  onClose,
  clubId,
  onCreated,
}: CreateCoachingSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Template
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [activityType, setActivityType] = useState("course");
  const [distanceKm, setDistanceKm] = useState("");
  const [paceTarget, setPaceTarget] = useState("");
  const [sessionMode, setSessionMode] = useState<SessionMode>("simple");
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);

  // Step 2: Recipients
  const [sendMode, setSendMode] = useState<"club" | "individual">("club");
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<Map<string, string>>(new Map()); // userId -> suggestedDate
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (isOpen && clubId) {
      loadMembers();
    }
  }, [isOpen, clubId]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data: memberIds } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", clubId)
        .neq("user_id", user?.id || "");

      if (memberIds && memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", memberIds.map((m) => m.user_id));
        setMembers(profiles || []);
      }
    } catch (e) {
      console.error("Error loading members:", e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleAthlete = (userId: string) => {
    const next = new Map(selectedAthletes);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.set(userId, "");
    }
    setSelectedAthletes(next);
  };

  const setSuggestedDate = (userId: string, date: string) => {
    const next = new Map(selectedAthletes);
    next.set(userId, date);
    setSelectedAthletes(next);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const targetIds = sendMode === "individual" ? Array.from(selectedAthletes.keys()) : [];

      const { data: session, error } = await supabase
        .from("coaching_sessions")
        .insert({
          club_id: clubId,
          coach_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          coach_notes: coachNotes.trim() || null,
          scheduled_at: new Date().toISOString(),
          activity_type: activityType,
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          pace_target: paceTarget.trim() || null,
          session_blocks: sessionMode === "structured" && blocks.length > 0 ? blocks as any : null,
          status: "planned",
          send_mode: sendMode,
          target_athletes: targetIds,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Create participations
      if (sendMode === "individual" && selectedAthletes.size > 0) {
        const participations = Array.from(selectedAthletes.entries()).map(([userId, suggestedDate]) => ({
          coaching_session_id: session.id,
          user_id: userId,
          status: "sent",
          suggested_date: suggestedDate ? new Date(suggestedDate).toISOString() : null,
        }));
        await supabase.from("coaching_participations").insert(participations);
      } else {
        // Club mode: create participations for all members
        const participations = members.map((m) => ({
          coaching_session_id: session.id,
          user_id: m.user_id,
          status: "sent",
        }));
        if (participations.length > 0) {
          await supabase.from("coaching_participations").insert(participations);
        }
      }

      // Send notifications
      const { data: coachProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user.id)
        .single();
      const coachName = coachProfile?.display_name || coachProfile?.username || "Coach";

      const notifyIds = sendMode === "individual" ? targetIds : members.map((m) => m.user_id);
      for (const athleteId of notifyIds) {
        sendPushNotification(
          athleteId,
          `🎓 Nouvelle séance de ${coachName}`,
          title.trim(),
          "coaching_session"
        );
      }

      toast({ title: "Séance envoyée !", description: `${notifyIds.length} athlète(s) notifié(s)` });
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
    setCoachNotes("");
    setActivityType("course");
    setDistanceKm("");
    setPaceTarget("");
    setSessionMode("simple");
    setBlocks([]);
    setSendMode("club");
    setSelectedAthletes(new Map());
    setStep(1);
  };

  const canProceedStep1 = title.trim().length > 0;
  const canProceedStep2 = sendMode === "club" || selectedAthletes.size > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent fullScreen hideCloseButton>
        <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <GraduationCap className="h-5 w-5" />
            {step === 1 ? "Plan d'entraînement" : step === 2 ? "Destinataires" : "Résumé"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step indicators */}
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Template */}
        {step === 1 && (
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
              <Label>Description</Label>
              <Textarea
                placeholder="Objectif de la séance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes du coach</Label>
              <Textarea
                placeholder="Consignes spécifiques, conseils..."
                value={coachNotes}
                onChange={(e) => setCoachNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Type d'activité</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Structure</Label>
              <SessionModeSwitch mode={sessionMode} onChange={setSessionMode} />
            </div>

            {sessionMode === "structured" && (
              <SessionBlockBuilder
                blocks={blocks}
                activityType={activityType}
                onBlocksChange={setBlocks}
              />
            )}

            {sessionMode === "simple" && (
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
            )}

            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full">
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 2: Recipients */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={sendMode === "club" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendMode("club")}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-1" />
                Tout le club
              </Button>
              <Button
                variant={sendMode === "individual" ? "default" : "outline"}
                size="sm"
                onClick={() => setSendMode("individual")}
                className="flex-1"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Sélection
              </Button>
            </div>

            {sendMode === "club" && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                📨 La séance sera envoyée à tous les {members.length} membre(s) du club.
              </div>
            )}

            {sendMode === "individual" && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {loadingMembers ? (
                  <div className="h-20 bg-muted rounded-lg animate-pulse" />
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun membre</p>
                ) : (
                  members.map((m) => {
                    const isSelected = selectedAthletes.has(m.user_id);
                    return (
                      <div key={m.user_id} className="space-y-1">
                        <div
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleAthlete(m.user_id)}
                        >
                          <Checkbox checked={isSelected} />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={m.avatar_url || ""} />
                            <AvatarFallback>{(m.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate flex-1">
                            {m.display_name || m.username}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="ml-12 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="datetime-local"
                              className="h-8 text-xs"
                              placeholder="Date suggérée (optionnel)"
                              value={selectedAthletes.get(m.user_id) || ""}
                              onChange={(e) => setSuggestedDate(m.user_id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1">
                Suivant <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="font-medium text-sm">{title}</p>
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs">{activityType}</Badge>
                {distanceKm && <Badge variant="outline" className="text-xs">{distanceKm} km</Badge>}
                {paceTarget && <Badge variant="outline" className="text-xs">{paceTarget}</Badge>}
                {sessionMode === "structured" && blocks.length > 0 && (
                  <Badge variant="outline" className="text-xs">{blocks.length} bloc(s)</Badge>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Destinataires</p>
              {sendMode === "club" ? (
                <p className="text-sm">📨 Tout le club ({members.length} membres)</p>
              ) : (
                <div className="space-y-1">
                  {Array.from(selectedAthletes.entries()).map(([userId, date]) => {
                    const member = members.find((m) => m.user_id === userId);
                    return (
                      <div key={userId} className="flex items-center gap-2 text-sm">
                        <span>• {member?.display_name || member?.username}</span>
                        {date && (
                          <span className="text-xs text-muted-foreground">
                            ({new Date(date).toLocaleDateString("fr-FR")})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "Envoi..." : "Publier"}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
