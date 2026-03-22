import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const handleRetry = () => {
    try {
      void import('@/integrations/supabase/client').then(({ supabase }) => {
        void supabase.auth.refreshSession();
      });
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
      <div className="flex max-w-[min(100%,20rem)] flex-col items-center text-center">
        <img
          src={RUCONNECT_SPLASH_ICON_URL}
          alt=""
          draggable={false}
          className="mb-ios-4 select-none object-contain"
          style={{
            width: 'min(38vw, 176px)',
            height: 'min(38vw, 176px)',
            minWidth: '104px',
            minHeight: '104px',
          }}
        />
        <p
          className="mb-ios-5 font-semibold tracking-tight text-white"
          style={{ fontSize: 'clamp(1.25rem, 4.5vw, 1.6rem)' }}
        >
          Ruconnect
        </p>

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
