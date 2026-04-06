import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export interface SessionFeedbackTarget {
  sessionId: string;
  title: string;
  scheduledAt: string;
}

interface SessionExperienceFeedbackDialogProps {
  open: boolean;
  session: SessionFeedbackTarget | null;
  onDismiss: () => void;
  onSubmitted: () => void;
}

export function SessionExperienceFeedbackDialog({
  open,
  session,
  onDismiss,
  onSubmitted,
}: SessionExperienceFeedbackDialogProps) {
  const { toast } = useToast();
  const [wentWell, setWentWell] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const reset = () => {
    setWentWell(null);
    setComment("");
  };

  const handleLater = () => {
    onDismiss();
  };

  const handleSubmit = async () => {
    if (wentWell === null || !session) {
      toast({ title: "Indiquez si tout s'est bien passé", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Non connecté");

      const { error } = await supabase.from("session_participant_feedback").insert({
        session_id: session.sessionId,
        participant_user_id: uid,
        went_well: wentWell,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      submittedRef.current = true;
      toast({ title: "Merci pour votre retour" });
      try {
        localStorage.removeItem(`session_experience_feedback_skipped_${session.sessionId}`);
      } catch {
        /* ignore */
      }
      reset();
      onSubmitted();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Envoi impossible", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open && !!session}
      onOpenChange={(v) => {
        if (!v) {
          if (!submittedRef.current) {
            onDismiss();
          }
          submittedRef.current = false;
          reset();
        }
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-[17px] font-semibold leading-snug">
            Votre séance
          </DialogTitle>
          <DialogDescription className="text-[15px] text-muted-foreground">
            {session?.title ? (
              <span className="line-clamp-2 font-medium text-foreground/90">{session.title}</span>
            ) : null}
            <span className="mt-2 block">
              Tout s&apos;est bien passé côté organisation et déroulement ?
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWentWell(true)}
              className={`rounded-xl border py-3 text-[15px] font-semibold transition-colors ${
                wentWell === true
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-foreground active:bg-secondary"
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setWentWell(false)}
              className={`rounded-xl border py-3 text-[15px] font-semibold transition-colors ${
                wentWell === false
                  ? "border-destructive/60 bg-destructive/10 text-destructive"
                  : "border-border bg-secondary/40 text-foreground active:bg-secondary"
              }`}
            >
              Pas vraiment
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
              Commentaire (facultatif)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 400))}
              placeholder="Précisions, remerciements…"
              rows={3}
              className="resize-none rounded-xl text-[15px]"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{comment.length}/400</p>
          </div>
        </div>

        <div className="flex flex-col gap-0 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-none text-[17px] font-normal text-muted-foreground"
            onClick={handleLater}
            disabled={loading}
          >
            Plus tard
          </Button>
          <Button
            type="button"
            className="h-12 rounded-none rounded-b-2xl text-[17px] font-semibold"
            onClick={handleSubmit}
            disabled={loading || wentWell === null}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Envoyer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
