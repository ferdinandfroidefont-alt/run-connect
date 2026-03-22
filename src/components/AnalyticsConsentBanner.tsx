import { useCallback, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAnalyticsConsent,
  isAnalyticsFeatureEnabledInBuild,
  setAnalyticsConsent,
} from "@/lib/analyticsConsent";

/**
 * Bandeau premier niveau : uniquement si `VITE_ANALYTICS_ENABLED=true` et choix pas encore fait.
 */
export function AnalyticsConsentBanner() {
  const navigate = useNavigate();
  const titleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(false);

  const sync = useCallback(() => {
    if (!isAnalyticsFeatureEnabledInBuild()) {
      setOpen(false);
      return;
    }
    setOpen(getAnalyticsConsent() === "unset");
  }, []);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    window.addEventListener("runconnect-analytics-consent-changed", onChange);
    return () => window.removeEventListener("runconnect-analytics-consent-changed", onChange);
  }, [sync]);

  if (!open) return null;

  return (
    <>
      {/* Voile léger : ne bloque pas le scroll mais indique une action en attente */}
      <div
        className="pointer-events-none fixed inset-0 z-[84] bg-background/20 backdrop-blur-[1px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[85] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="pointer-events-auto ios-card max-w-lg w-full rounded-2xl border border-border bg-card/98 backdrop-blur-md p-4 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex gap-3 mb-3">
            <div
              className="h-10 w-10 shrink-0 rounded-xl bg-[#AF52DE]/15 flex items-center justify-center"
              aria-hidden
            >
              <BarChart3 className="h-5 w-5 text-[#AF52DE]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-foreground leading-tight">
                Mesure d&apos;audience
              </h2>
              <p id={descId} className="text-sm text-muted-foreground leading-snug mt-1">
                Nous pouvons enregistrer des statistiques agrégées (pages vues, événements) pour améliorer l&apos;app.
                Aucune donnée n&apos;est envoyée tant que vous n&apos;avez pas accepté.{" "}
                <button
                  type="button"
                  className="text-primary font-medium underline underline-offset-2"
                  onClick={() => navigate("/privacy")}
                >
                  Politique de confidentialité
                </button>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto sm:min-w-[7rem]"
              onClick={() => setAnalyticsConsent(false)}
            >
              Refuser
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto sm:min-w-[7rem]"
              onClick={() => setAnalyticsConsent(true)}
            >
              Accepter
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3 leading-tight">
            Vous pourrez modifier ce choix dans Paramètres → Confidentialité.
          </p>
        </div>
      </div>
    </>
  );
}
