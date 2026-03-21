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
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background px-6 safe-area-top safe-area-bottom"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-boot-phase={phase}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" aria-hidden />
      <p className="text-sm font-medium text-foreground text-center">
        {phase === 'profile' ? 'Chargement de votre profil…' : 'Connexion…'}
      </p>
      <p className="text-xs text-muted-foreground text-center mt-2 max-w-xs">
        Un instant, nous vérifions votre session.
      </p>
      {slow && (
        <div className="mt-8 flex flex-col items-center gap-3 max-w-xs text-center">
          <p className="text-xs text-muted-foreground">
            Connexion lente ou instable. Vous pouvez réessayer ou continuer d’attendre.
          </p>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
