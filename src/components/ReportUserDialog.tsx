import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUsername: string;
}

const reportReasons = [
  { value: "harassment", label: "Harcèlement" },
  { value: "fake_profile", label: "Faux profil" },
  { value: "inappropriate_content", label: "Contenu inapproprié" },
  { value: "spam", label: "Spam" },
  { value: "dangerous_behavior", label: "Comportement dangereux" },
  { value: "other", label: "Autre" }
];

export const ReportUserDialog = ({ isOpen, onClose, reportedUserId, reportedUsername }: ReportUserDialogProps) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une raison et décrire le problème",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('report-user', {
        body: {
          reportedUserId,
          reportedUsername,
          reason,
          description: description.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Votre signalement a été transmis à notre équipe de modération"
      });

      // Reset form and close dialog
      setReason("");
      setDescription("");
      onClose();
    } catch (error: any) {
      console.error('Error sending report:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le signalement. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md" stackNested>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Signaler @{reportedUsername}
          </DialogTitle>
          <DialogDescription>
            Votre signalement sera examiné par notre équipe de modération. Les signalements abusifs peuvent entraîner des sanctions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Raison du signalement
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une raison" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Description détaillée
            </label>
            <Textarea
              placeholder="Décrivez le problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 caractères
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !reason || !description.trim()}>
            {loading ? "Envoi..." : "Envoyer le signalement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};