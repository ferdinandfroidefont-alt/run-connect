import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ConfirmMethod = "strava" | "manual" | "gps";

export default function SessionConfirmPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const source = useMemo(() => (searchParams.get("source") === "joined" ? "joined" : "created"), [searchParams]);
  const [method, setMethod] = useState<ConfirmMethod>("strava");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!sessionId || !user) return;
    setLoading(true);
    try {
      if (source === "joined") {
        const updatePayload: Record<string, unknown> = {
          validation_status: "validated",
        };

        if (method === "gps") {
          updatePayload.confirmed_by_gps = true;
          updatePayload.gps_validation_time = new Date().toISOString();
        }

        const { error } = await supabase
          .from("session_participants")
          .update(updatePayload)
          .eq("session_id", sessionId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("session_participants")
          .update({ confirmed_by_creator: true })
          .eq("session_id", sessionId)
          .neq("user_id", user.id)
          .is("confirmed_by_creator", null);
        if (error) throw error;
      }

      if (comment.trim()) {
        const { error: commentError } = await supabase.from("session_comments").insert({
          session_id: sessionId,
          user_id: user.id,
          content: comment.trim(),
        });
        if (commentError) throw commentError;
      }

      setDone(true);
      toast({
        title: "Séance confirmée",
        description: "La confirmation a bien été enregistrée.",
      });

      window.setTimeout(() => navigate("/my-sessions?tab=confirm"), 700);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la confirmation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
      <div className="z-50 shrink-0 border-b border-border bg-card pt-[var(--safe-area-top)]">
        <div className="flex items-center px-ios-4 py-ios-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 text-[15px] font-medium text-primary active:opacity-70"
          >
            <ChevronLeft className="h-5 w-5" />
            Retour
          </button>
          <div className="flex-1 text-center text-ios-title3 font-semibold">Confirmer la séance</div>
          <div className="w-[64px]" />
        </div>
      </div>

      <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto px-ios-4 pb-ios-6 pt-ios-3">
        {done ? (
          <div className="ios-card flex flex-col items-center gap-3 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-[17px] font-semibold text-foreground">Confirmation enregistrée</p>
          </div>
        ) : (
          <div className="space-y-ios-3">
            <div className="ios-card p-3">
              <p className="mb-2 text-[15px] font-semibold text-foreground">Méthode</p>
              <div className="space-y-2">
                {[
                  { key: "strava", label: "Confirmer via Strava" },
                  { key: "manual", label: "Confirmer manuellement (créateur)" },
                  { key: "gps", label: "Confirmer présence (GPS)" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethod(item.key as ConfirmMethod)}
                    className={`w-full rounded-ios-md border px-3 py-3 text-left text-[14px] transition-colors ${
                      method === item.key
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ios-card p-3">
              <p className="mb-2 text-[15px] font-semibold text-foreground">Commentaire global (optionnel)</p>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Ajouter un commentaire..."
                className="min-h-[110px] rounded-ios-md"
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="h-11 w-full rounded-ios-md">
              {loading ? "Validation..." : "Valider"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
