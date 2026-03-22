import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Bandeau discret quand pas de réseau (sport en extérieur, tunnel, etc.).
 * Une seule ligne — pas de double barre système.
 */
export function NetworkStatusBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      className="shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-ios-4 py-ios-2 text-center"
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center justify-center gap-ios-2 text-ios-footnote font-medium text-amber-950 dark:text-amber-100">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        Pas de connexion — certaines actions seront indisponibles jusqu’au retour du réseau.
      </p>
    </div>
  );
}
