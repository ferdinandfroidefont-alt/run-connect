import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[85] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
      role="dialog"
      aria-label="Consentement mesure d’audience"
    >
      <div className="pointer-events-auto ios-card max-w-lg w-full rounded-2xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-lg">
        <p className="text-sm text-foreground leading-snug mb-3">
          Nous utilisons des outils de mesure d’audience (anonymisés lorsque possible) pour améliorer RunConnect.{" "}
          <button
            type="button"
            className="text-primary font-medium underline underline-offset-2"
            onClick={() => navigate("/privacy")}
          >
            Politique de confidentialité
          </button>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setAnalyticsConsent(false)}>
            Refuser
          </Button>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => setAnalyticsConsent(true)}>
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
