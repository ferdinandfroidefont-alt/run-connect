import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

interface AppShellLoaderProps {
  /** Après ce délai, affiche un message connexion lente + recharger */
  slowThresholdMs?: number;
}

/**
 * Remplace l’ancien écran vide du Layout pendant auth / profil.
 */
export const AppShellLoader = ({ slowThresholdMs = 12000 }: AppShellLoaderProps) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowThresholdMs);
    return () => clearTimeout(t);
  }, [slowThresholdMs]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-6 bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-foreground">Chargement…</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Connexion à votre compte
        </p>
      </div>

      {slow && (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <WifiOff className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">Connexion lente ou instable</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Le chargement prend plus de temps que d&apos;habitude. Vérifiez le réseau ou réessayez.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Recharger
          </Button>
        </div>
      )}
    </div>
  );
};
