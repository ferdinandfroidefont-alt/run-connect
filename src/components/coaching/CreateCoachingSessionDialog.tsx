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
import { GraduationCap } from "lucide-react";
import { SessionModeSwitch } from "@/components/session-creation/SessionModeSwitch";
import { SessionBlockBuilder } from "@/components/session-creation/SessionBlockBuilder";
import { SessionBlock, SessionMode, ACTIVITY_TYPES } from "@/components/session-creation/types";

interface CreateCoachingSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onCreated: () => void;
}

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
  const [coachNotes, setCoachNotes] = useState("");
  const [activityType, setActivityType] = useState("course");
  const [distanceKm, setDistanceKm] = useState("");
  const [paceTarget, setPaceTarget] = useState("");
  const [sessionMode, setSessionMode] = useState<SessionMode>("simple");
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("coaching_sessions").insert({
        club_id: clubId,
        coach_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        coach_notes: coachNotes.trim() || null,
        scheduled_at: new Date().toISOString(), // Template date, members choose their own
        activity_type: activityType,
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        pace_target: paceTarget.trim() || null,
        session_blocks: sessionMode === "structured" && blocks.length > 0 ? blocks as any : null,
        status: "planned",
      });

      if (error) throw error;

      toast({ title: "Séance créée", description: "Le plan d'entraînement a été publié au groupe" });
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Nouveau plan d'entraînement
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

          {/* Mode Switch */}
          <div className="space-y-2">
            <Label>Structure</Label>
            <SessionModeSwitch mode={sessionMode} onChange={setSessionMode} />
          </div>

          {/* Structured blocks */}
          {sessionMode === "structured" && (
            <SessionBlockBuilder
              blocks={blocks}
              activityType={activityType}
              onBlocksChange={setBlocks}
            />
          )}

          {/* Simple mode fields */}
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

          <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            📍 Chaque membre choisira son propre lieu et horaire pour cette séance.
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim()}
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
