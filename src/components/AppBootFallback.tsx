import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppBootFallbackProps = {
  /** Phase affichée dans les logs / accessibilité */
  phase?: 'auth' | 'profile';
  /** Après ce délai, propose un rafraîchissement (connexion très lente) */
  showSlowHintAfterMs?: number;
};

/**
 * Écran de chargement au démarrage / session : jamais un écran vide.
 */
export function AppBootFallback({ phase = 'auth', showSlowHintAfterMs = 8000 }: AppBootFallbackProps) {
  const [slow, setSlow] = useState(false);

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
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center ios-app-canvas px-5 safe-area-top safe-area-bottom"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-boot-phase={phase}
    >
      <div
        className="glass-card w-full max-w-[min(100%,20rem)] rounded-[1.35rem] border border-border/60 px-7 py-9 text-center shadow-sm"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        </div>
        <p className="text-ios-headline text-foreground">
          {phase === 'profile' ? 'Chargement de votre profil…' : 'Connexion…'}
        </p>
        <p className="text-ios-footnote text-muted-foreground mt-2 max-w-[18rem] mx-auto leading-relaxed">
          Un instant, nous vérifions votre session.
        </p>
        {slow && (
          <div className="mt-8 flex flex-col items-center gap-3 border-t border-border/50 pt-7">
            <p className="text-ios-footnote text-muted-foreground max-w-[17rem] leading-relaxed">
              Connexion lente ou instable. Vous pouvez réessayer ou continuer d’attendre.
            </p>
            <Button type="button" variant="outline" size="sm" className="gap-2 rounded-ios-lg" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
