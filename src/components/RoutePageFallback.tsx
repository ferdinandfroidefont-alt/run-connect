import { Loader2 } from "lucide-react";
import { RUCONNECT_SPLASH_ICON_URL } from "@/lib/ruconnectSplashChrome";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  /** Route lazy vs préparation onboarding sur l’accueil */
  variant?: "route" | "index";
};

/**
 * Chargement des pages lazy ou état transitoire — même famille visuelle que le boot (carte légère, pas écran bleu).
 */
export function RoutePageFallback({ variant = "route" }: Props) {
  const { t } = useLanguage();
  const label = variant === "index" ? t("loading.indexPreparing") : t("loading.route");

  return (
    <div
      className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-5 py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ios-card flex max-w-[min(100%,20rem)] flex-col items-center gap-4 border border-border/60 bg-card px-8 py-7 shadow-[var(--shadow-card)]">
        <img
          src={RUCONNECT_SPLASH_ICON_URL}
          alt=""
          className="h-12 w-12 shrink-0 object-contain opacity-90"
          draggable={false}
        />
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <p className="text-center text-ios-footnote text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
