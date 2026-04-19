import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { markPrivacyGateCompleted } from "@/lib/arrivalFlowStorage";
import {
  setAnalyticsConsent,
  getAnalyticsConsent,
  isAnalyticsFeatureEnabledInBuild,
} from "@/lib/analyticsConsent";
import { cn } from "@/lib/utils";

export function WelcomePrivacyScreen() {
  const navigate = useNavigate();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(() => getAnalyticsConsent() === "granted");

  const finishGate = (accepted: boolean) => {
    if (accepted) {
      setAnalyticsConsent(true);
    } else {
      setAnalyticsConsent(false);
    }
    markPrivacyGateCompleted();
    navigate("/auth", { replace: true });
  };

  const handleCustomizeSave = () => {
    setAnalyticsConsent(analyticsOptIn);
    markPrivacyGateCompleted();
    setPrefsOpen(false);
    navigate("/auth", { replace: true });
  };

  return (
    <div
      className="flex min-h-full flex-col bg-background"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1.25rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)",
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className={cn(
                "mb-6 flex h-16 w-16 items-center justify-center rounded-[20px]",
                "border border-border/60 bg-card shadow-[0_12px_40px_-16px_hsl(0_0%_0%_/0.25)]"
              )}
            >
              <Shield className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="text-balance text-[28px] font-bold tracking-tight text-foreground">
              Nous respectons votre vie privée
            </h1>
            <p className="mt-4 text-balance text-[15px] leading-relaxed text-muted-foreground">
              Nous utilisons certaines données pour faire fonctionner RunConnect correctement, améliorer l’expérience et
              vous proposer des fonctionnalités utiles. Vous gardez le contrôle de vos préférences.
            </p>
          </div>
        </div>

        <div className="shrink-0 space-y-3 pb-2">
          <Button
            type="button"
            className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold shadow-[0_8px_24px_hsl(var(--primary)/0.22)]"
            onClick={() => finishGate(true)}
          >
            Accepter et continuer
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-[52px] w-full rounded-[14px] text-[16px] font-semibold"
            onClick={() => finishGate(false)}
          >
            Refuser
          </Button>
          <button
            type="button"
            className="w-full py-3 text-center text-[15px] font-medium text-primary active:opacity-70"
            onClick={() => {
              setAnalyticsOptIn(getAnalyticsConsent() === "granted");
              setPrefsOpen(true);
            }}
          >
            Personnaliser les préférences
          </button>
        </div>
      </div>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-[min(100%,420px)] rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px]">
              <Sparkles className="h-5 w-5 text-primary" />
              Préférences
            </DialogTitle>
            <DialogDescription className="text-left text-[14px] leading-relaxed">
              Ajustez ce qui vous convient. Vous pourrez modifier ces choix à tout moment dans les réglages de
              l’application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isAnalyticsFeatureEnabledInBuild() ? (
              <div className="flex items-start justify-between gap-4 rounded-[12px] border border-border/70 bg-secondary/30 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">Mesure d’audience anonyme</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Aide à comprendre comment l’app est utilisée, sans publicité intrusive.
                  </p>
                </div>
                <Switch checked={analyticsOptIn} onCheckedChange={setAnalyticsOptIn} className="shrink-0" />
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                L’analytics optionnelle n’est pas activée dans ce build. Les autres réglages restent disponibles dans
                l’app (confidentialité).
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button type="button" className="h-11 rounded-[12px] font-semibold" onClick={handleCustomizeSave}>
              Enregistrer et continuer
            </Button>
            <Button type="button" variant="ghost" className="rounded-[12px]" onClick={() => setPrefsOpen(false)}>
              Retour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
