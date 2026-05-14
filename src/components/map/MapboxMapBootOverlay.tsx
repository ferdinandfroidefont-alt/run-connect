import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetworkQuality } from "@/lib/networkQuality";

/** Corps de l’overlay de chargement Mapbox (sans conteneur positionné). */
export function MapboxBootLoadingBody({
  networkQuality,
  isOffline,
  isSlowBoot,
  onRetry,
  className,
}: {
  networkQuality: NetworkQuality;
  isOffline: boolean;
  isSlowBoot: boolean;
  onRetry: () => void;
  /** Ex. carte miniature : typo plus petite. */
  className?: string;
}) {
  const message = isOffline
    ? "Pas de connexion"
    : isSlowBoot
      ? "Connexion lente — la carte met du temps à charger"
      : networkQuality === "slow"
        ? "Chargement de la carte… (réseau lent)"
        : "Chargement de la carte…";

  return (
    <div
      className={cn(
        "pointer-events-auto flex max-w-[280px] flex-col items-center gap-3 px-6 text-center",
        className,
      )}
    >
      {isOffline ? (
        <WifiOff className="h-7 w-7 text-amber-500" strokeWidth={1.75} aria-hidden />
      ) : isSlowBoot ? (
        <RefreshCw className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} aria-hidden />
      ) : (
        <Loader2 className="h-7 w-7 animate-spin text-primary" strokeWidth={1.75} aria-hidden />
      )}
      <p className="text-[13px] font-medium leading-snug text-foreground/85">{message}</p>
      {(isSlowBoot || isOffline) && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm",
            "transition-transform duration-150 active:scale-[0.97]",
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          Réessayer
        </button>
      )}
    </div>
  );
}

/** Message d’erreur Mapbox avec CTA Réessayer (et bouton Retour optionnel — ex. RouteCreation). */
export function MapboxBootErrorBody({
  message,
  onRetry,
  backLabel,
  onBack,
  compact,
}: {
  message: string;
  onRetry: () => void;
  backLabel?: string;
  onBack?: () => void;
  compact?: boolean;
}) {
  const textClass = compact ? "text-[12px]" : "text-[13px]";

  return (
    <div
      className={cn(
        "flex max-w-sm flex-col items-center gap-ios-4 text-center",
        compact ? "gap-2 px-2" : "px-4",
      )}
    >
      <p className={cn("font-medium leading-snug text-foreground/90", textClass)}>{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onBack && backLabel ? (
          <button
            type="button"
            onClick={onBack}
            className={cn(
              "inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm",
              "transition-transform duration-150 active:scale-[0.97]",
            )}
          >
            {backLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm",
            "transition-transform duration-150 active:scale-[0.97]",
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
          Réessayer
        </button>
      </div>
    </div>
  );
}
