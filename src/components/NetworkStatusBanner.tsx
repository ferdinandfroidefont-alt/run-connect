import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Bandeau discret quand pas de réseau (sport en extérieur, tunnel, etc.).
 * Calque `fixed` + safe-area **uniquement** hors ligne : si on les garde quand online
 * (via un wrapper dans App), le padding haut crée une bande vide qui persiste partout.
 */
export function NetworkStatusBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[78] pt-[env(safe-area-inset-top,0px)]">
      <div
        className="pointer-events-auto shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-ios-4 py-ios-2 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="flex items-center justify-center gap-ios-2 text-ios-footnote font-medium text-amber-950 dark:text-amber-100">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          Pas de connexion — certaines actions seront indisponibles jusqu’au retour du réseau.
        </p>
      </div>
    </div>
  );
}
