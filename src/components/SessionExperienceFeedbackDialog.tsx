import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, CircleHelp, MapPin, Link2 } from "lucide-react";

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

function isPresenceConfirmed(row: {
  confirmed_by_gps: boolean | null;
  confirmed_by_creator: boolean | null;
}): boolean {
  return row.confirmed_by_gps === true || row.confirmed_by_creator === true;
}

export function SessionExperienceFeedbackDialog({
  open,
  session,
  onDismiss,
  onSubmitted,
}: SessionExperienceFeedbackDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wentWell, setWentWell] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  const [presenceLoading, setPresenceLoading] = useState(true);
  const [presenceConfirmed, setPresenceConfirmed] = useState<boolean | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  const reset = () => {
    setWentWell(null);
    setComment("");
    setPresenceConfirmed(null);
    setPresenceLoading(true);
  };

  useEffect(() => {
    if (!open || !session) {
      return;
    }

    let cancelled = false;
    (async () => {
      setPresenceLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) {
          if (!cancelled) setPresenceConfirmed(null);
          return;
        }

        const { data: row, error } = await supabase
          .from("session_participants")
          .select("confirmed_by_gps, confirmed_by_creator")
          .eq("session_id", session.sessionId)
          .eq("user_id", uid)
          .maybeSingle();

        if (cancelled) return;
        if (error || !row) {
          setPresenceConfirmed(null);
        } else {
          setPresenceConfirmed(isPresenceConfirmed(row));
        }
      } catch {
        if (!cancelled) setPresenceConfirmed(null);
      } finally {
        if (!cancelled) setPresenceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, session?.sessionId]);

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

  const handleReminderOrganizer = async () => {
    if (!session) return;
    setReminderLoading(true);
    try {
      const { error } = await supabase.rpc("request_session_presence_reminder", {
        p_session_id: session.sessionId,
      });

      if (error) {
        if (error.message?.includes("already_sent") || error.code === "P0001") {
          toast({
            title: "Rappel déjà envoyé",
            description: "Tu as déjà demandé un rappel pour cette séance.",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Rappel envoyé",
        description: "L’organisateur a reçu une notification.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Envoi impossible", description: msg, variant: "destructive" });
    } finally {
      setReminderLoading(false);
    }
  };

  const openHelp = () => {
    navigate("/confirm-presence/help");
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
      <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-y-auto overflow-x-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="text-[17px] font-semibold leading-snug">
            Votre séance
          </DialogTitle>
          <DialogDescription className="text-[15px] text-muted-foreground">
            {session?.title ? (
              <span className="line-clamp-2 font-medium text-foreground/90">{session.title}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b border-border/60 px-5 py-4">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Présence
            </p>
            <button
              type="button"
              onClick={openHelp}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
              aria-label="Comment confirmer ma présence ?"
            >
              <CircleHelp className="h-5 w-5" />
            </button>
          </div>

          {presenceLoading ? (
            <div className="flex items-center gap-2 py-2 text-[14px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Vérification…
            </div>
          ) : presenceConfirmed === true ? (
            <div className="flex items-start gap-3 rounded-xl border border-[#34C759]/40 bg-[#34C759]/10 px-3 py-2.5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#34C759]" aria-hidden />
              <p className="text-[14px] font-medium leading-snug text-[#1a7f3a]">
                Présence confirmée
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                <p className="text-[14px] font-medium leading-snug text-foreground">
                  Pas encore confirmée
                </p>
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Pour faire reconnaître ta sortie : associe ta séance <strong className="text-foreground">Strava</strong>{" "}
                dans <strong className="text-foreground">Mes séances</strong>, ou demande à l&apos;organisateur de
                confirmer ta présence depuis sa liste de participants.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 flex-1 gap-1.5 text-[13px]"
                  onClick={() => navigate("/my-sessions")}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Mes séances / Strava
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 flex-1 gap-1.5 text-[13px]"
                  onClick={() => navigate("/confirm-presence")}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Confirmer (GPS)
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full border border-border text-[13px]"
                onClick={handleReminderOrganizer}
                disabled={reminderLoading}
              >
                {reminderLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Rappeler l’organisateur"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-[14px] text-muted-foreground">
            Tout s&apos;est bien passé côté organisation et déroulement ?
          </p>
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
