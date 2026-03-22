import { Loader2 } from 'lucide-react';

/** Chargement des pages en lazy — léger pour ne pas bloquer l’UI */
export function RoutePageFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-ios-3 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-ios-footnote">Chargement…</p>
    </div>
  );
}
