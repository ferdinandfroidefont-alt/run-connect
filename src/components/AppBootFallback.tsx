import { useEffect, useState, type CSSProperties } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  RUCONNECT_SPLASH_BLUE,
  RUCONNECT_SPLASH_ICON_URL,
} from '@/lib/ruconnectSplashChrome';
import { useRuconnectSplashScreenChrome } from '@/hooks/useRuconnectSplashScreenChrome';

type AppBootFallbackProps = {
  /** Phase affichée dans les logs / accessibilité */
  phase?: 'auth' | 'profile';
  /** Après ce délai, propose un rafraîchissement (connexion très lente) */
  showSlowHintAfterMs?: number;
};

/**
 * Écran d’attente auth / profil : même identité visuelle que le splash (bleu icône, barres iOS teintées).
 */
export function AppBootFallback({ phase = 'auth', showSlowHintAfterMs = 8000 }: AppBootFallbackProps) {
  const [slow, setSlow] = useState(false);

  useRuconnectSplashScreenChrome(true);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), showSlowHintAfterMs);
    return () => clearTimeout(t);
  }, [showSlowHintAfterMs]);

  const logoBoxStyle: CSSProperties = {
    // Objectif ~35-45% de la hauteur écran, bornes iPhone
    width: 'clamp(10rem, min(72vw, 40dvh), 19rem)',
    height: 'clamp(10rem, min(72vw, 40dvh), 19rem)',
    maxWidth: 'min(84vw, 19rem)',
    maxHeight: 'min(84vw, 19rem)',
  };

  const titleStyle: CSSProperties = {
    fontSize: 'clamp(1.1875rem, min(4.75vw, 3.65dvh), 1.8125rem)',
    marginTop: 'clamp(0.25rem, min(1.2dvh, 0.6rem), 0.6rem)',
    letterSpacing: '-0.02em',
  };

  const handleRetry = () => {
    try {
      void supabase.auth.refreshSession();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <div
      className="flex min-h-[100dvh] w-full min-w-0 flex-col items-center justify-center px-5"
      style={{
        backgroundColor: RUCONNECT_SPLASH_BLUE,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-boot-phase={phase}
    >
      <div className="flex w-full max-w-[min(100%,22rem)] flex-col items-center text-center">
        <div
          className="mb-ios-6 flex flex-col items-center"
          style={{
              // Ajustement "centrage optique" (logo + texte)
              transform: 'translateY(calc(-1 * min(2.4dvh, 1.1rem)))',
          }}
        >
          <img
            src={RUCONNECT_SPLASH_ICON_URL}
            alt=""
            draggable={false}
            className="block shrink-0 select-none object-contain"
            style={logoBoxStyle}
          />
          <p className="font-semibold text-white" style={titleStyle}>
            RunConnect
          </p>
        </div>

        <div className="flex flex-col items-center gap-ios-2">
          <Loader2 className="h-8 w-8 animate-spin text-white/90" aria-hidden />
          <p className="text-ios-subheadline text-white/90">
            {phase === 'profile' ? 'Chargement de votre profil…' : 'Connexion…'}
          </p>
          <p className="max-w-[18rem] text-ios-footnote leading-relaxed text-white/70">
            Un instant, nous vérifions votre session.
          </p>
        </div>

        {slow && (
          <div className="mt-ios-8 flex flex-col items-center gap-ios-3 border-t border-white/20 pt-ios-7">
            <p className="max-w-[17rem] text-ios-footnote leading-relaxed text-white/75">
              Connexion lente ou instable. Vous pouvez réessayer ou continuer d’attendre.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 rounded-ios-lg bg-white/95 text-foreground hover:bg-white"
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
