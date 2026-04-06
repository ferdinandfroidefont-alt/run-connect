import { useEffect, useState, type CSSProperties } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { RUCONNECT_SPLASH_ICON_URL } from "@/lib/ruconnectSplashChrome";
import { useLanguage } from "@/contexts/LanguageContext";

type AppBootFallbackProps = {
  phase?: "auth" | "profile";
  showSlowHintAfterMs?: number;
};

/**
 * Après le splash bleu : fond **thème** (pas de 2e plein écran bleu), barre de progression + texte i18n.
 */
export function AppBootFallback({ phase = "auth", showSlowHintAfterMs = 8000 }: AppBootFallbackProps) {
  const [slow, setSlow] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), showSlowHintAfterMs);
    return () => clearTimeout(timer);
  }, [showSlowHintAfterMs]);

  const progressValue = phase === "auth" ? 45 : 92;

  const logoBoxStyle: CSSProperties = {
    width: "clamp(5.5rem, min(28vw, 16dvh), 7.5rem)",
    height: "clamp(5.5rem, min(28vw, 16dvh), 7.5rem)",
  };

  const handleRetry = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <div
      className="flex min-h-[100dvh] w-full min-w-0 flex-col items-center justify-center bg-background px-5"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-boot-phase={phase}
    >
      <div className="ios-card flex w-full max-w-[min(100%,22rem)] flex-col items-center border border-border/60 bg-card px-5 py-8 text-center shadow-[var(--shadow-card)]">
        <div
          className="mb-4 flex flex-col items-center"
          style={{
            transform: "translateY(calc(-1 * min(1.2dvh, 0.5rem)))",
          }}
        >
          <img
            src={RUCONNECT_SPLASH_ICON_URL}
            alt=""
            draggable={false}
            className="block shrink-0 select-none object-contain opacity-95"
            style={logoBoxStyle}
          />
          <p className="mt-2 text-ios-subheadline font-semibold text-foreground">RunConnect</p>
        </div>

        <div className="mb-3 w-full max-w-[16rem]">
          <Progress value={progressValue} className="h-1.5" />
          <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <span className={phase === "auth" ? "text-primary" : "text-muted-foreground"}>
              {t("loading.bootStep1")}
            </span>
            <span className={phase === "profile" ? "text-primary" : "text-muted-foreground"}>
              {t("loading.bootStep2")}
            </span>
          </div>
        </div>

        <p className="text-ios-subheadline text-foreground">
          {phase === "profile" ? t("loading.bootProfile") : t("loading.bootAuth")}
        </p>
        <p className="mt-2 max-w-[18rem] text-ios-footnote leading-relaxed text-muted-foreground">
          {t("loading.bootHint")}
        </p>

        {slow && (
          <div className="mt-8 flex w-full flex-col items-center gap-3 border-t border-border/60 pt-7">
            <p className="max-w-[17rem] text-ios-footnote leading-relaxed text-muted-foreground">
              {t("loading.bootSlow")}
            </p>
            <p className="max-w-[17rem] text-[12px] leading-relaxed text-muted-foreground/90">
              {t("loading.bootSlowDetail")}
            </p>
            <Button type="button" variant="secondary" size="sm" className="gap-2 rounded-ios-lg" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              {t("loading.bootRetry")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
