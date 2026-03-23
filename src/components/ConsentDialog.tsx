import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConsentDialogProps {
  userId: string;
  onComplete: () => void;
}

export const ConsentDialog = ({ userId, onComplete }: ConsentDialogProps) => {
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canContinue = rgpdAccepted && securityAccepted;

  const handleAccept = async () => {
    if (!canContinue) return;

    setIsSubmitting(true);
    try {
      localStorage.setItem(`consent_${userId}`, "true");

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({
          rgpd_accepted: true,
          security_rules_accepted: true,
        })
        .eq("user_id", userId)
        .select("rgpd_accepted, security_rules_accepted")
        .single();

      if (error) throw error;

      if (!updatedProfile?.rgpd_accepted || !updatedProfile?.security_rules_accepted) {
        throw new Error("Consentement non enregistré correctement.");
      }

      toast({
        title: "Bienvenue sur RunConnect",
        description: "Vos choix sont enregistrés. Bonne découverte !",
      });

      onComplete();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      console.error("[Consent] Erreur sauvegarde:", error);
      localStorage.removeItem(`consent_${userId}`);
      toast({
        title: "Erreur",
        description: message || "Impossible d'enregistrer. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        fullScreen
        hideCloseButton
        className="flex max-h-[100dvh] flex-col gap-0 overflow-hidden border-0 bg-secondary p-0 shadow-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* En-tête iOS — même langage visuel que le reste de l’app */}
          <div className="shrink-0 border-b border-border bg-gradient-to-b from-card via-card to-secondary/40 pt-[env(safe-area-inset-top,0px)]">
            <div className="flex h-14 items-center justify-center px-4">
              <h1 className="text-center text-[17px] font-semibold tracking-tight text-foreground">
                Avant de commencer
              </h1>
            </div>
            <div className="px-4 pb-5">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 flex h-[72px] w-[72px] items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-[20px] bg-primary/15 blur-xl"
                    aria-hidden
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 shadow-lg shadow-primary/30 ring-1 ring-primary/20">
                    <Sparkles className="h-8 w-8 text-primary-foreground" aria-hidden />
                  </div>
                </div>
                <p className="max-w-[280px] text-ios-subheadline text-muted-foreground">
                  Dernière étape obligatoire : transparence sur vos données et règles de la communauté RunConnect.
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 px-4 py-4 pb-8">
              {/* RGPD */}
              <div className="space-y-2">
                <h2 className="px-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                  Données personnelles (RGPD)
                </h2>
                <div className="ios-card overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex gap-3">
                      <div className="ios-list-row-icon shrink-0 bg-[#5856D6]">
                        <FileText className="h-[18px] w-[18px] text-white" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                        <p>
                          En utilisant RunConnect, vous acceptez le{" "}
                          <strong className="text-foreground">traitement</strong> de vos données pour le fonctionnement
                          du service (profil, séances, messages, géolocalisation lorsque vous l’activez).
                        </p>
                        <p>
                          <strong className="text-foreground">Pas de revente à des tiers.</strong> Vous pouvez accéder,
                          rectifier ou supprimer vos données depuis l’app.
                        </p>
                        <p>
                          Hébergement sécurisé (infrastructure conforme, traitement encadré). Pour toute question :{" "}
                          <a
                            href="mailto:ferdinand.froidefont@gmail.com"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            ferdinand.froidefont@gmail.com
                          </a>
                          .
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                          <Link
                            to="/privacy"
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-primary"
                          >
                            Politique de confidentialité <ExternalLink className="h-3 w-3 opacity-70" />
                          </Link>
                          <Link to="/legal" className="inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                            Mentions légales <ExternalLink className="h-3 w-3 opacity-70" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                  <label
                    htmlFor="consent-rgpd"
                    className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 active:bg-secondary/60"
                  >
                    <span className="text-[15px] font-medium leading-snug text-foreground">
                      J’accepte le traitement de mes données personnelles
                    </span>
                    <Checkbox
                      id="consent-rgpd"
                      checked={rgpdAccepted}
                      onCheckedChange={(c) => setRgpdAccepted(c === true)}
                      className="shrink-0"
                    />
                  </label>
                </div>
              </div>

              {/* Sécurité */}
              <div className="space-y-2">
                <h2 className="px-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                  Règles de la communauté
                </h2>
                <div className="ios-card overflow-hidden">
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex gap-3">
                      <div className="ios-list-row-icon shrink-0 bg-[#34C759]">
                        <Shield className="h-[18px] w-[18px] text-white" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                        <p>RunConnect est un espace sportif : respect, authenticité et sécurité des membres.</p>
                        <ul className="list-inside list-disc space-y-1 pl-0.5">
                          <li>Usage lié au sport et aux sorties encadrées par l’app</li>
                          <li>Pas de contenu illégal, harcelant ou dangereux</li>
                          <li>Pas de diffusion de données personnelles d’autres personnes sans accord</li>
                        </ul>
                        <p className="text-destructive font-medium">
                          Tout comportement abusif peut entraîner la suspension du compte.
                        </p>
                        <Link
                          to="/terms"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary"
                        >
                          Conditions d’utilisation <ExternalLink className="h-3 w-3 opacity-70" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  <label
                    htmlFor="consent-security"
                    className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 active:bg-secondary/60"
                  >
                    <span className="text-[15px] font-medium leading-snug text-foreground">
                      J’accepte les règles de sécurité et d’utilisation
                    </span>
                    <Checkbox
                      id="consent-security"
                      checked={securityAccepted}
                      onCheckedChange={(c) => setSecurityAccepted(c === true)}
                      className="shrink-0"
                    />
                  </label>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Button
              type="button"
              onClick={handleAccept}
              disabled={!canContinue || isSubmitting}
              className="h-12 w-full rounded-ios-md text-[17px] font-semibold shadow-md shadow-primary/20"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enregistrement…
                </>
              ) : canContinue ? (
                "Continuer vers RunConnect"
              ) : (
                "Cochez les deux cases pour continuer"
              )}
            </Button>
            <p className="mt-3 text-center text-[11px] leading-snug text-muted-foreground">
              Sans ces acceptations, l’application ne peut pas être utilisée conformément à la loi.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
