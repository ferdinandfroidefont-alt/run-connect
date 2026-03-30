import { useEffect, useRef } from "react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { cn } from "@/lib/utils";

type PersistentHomeMapProps = {
  /** Quand l’utilisateur n’est pas sur « Accueil », la carte reste montée mais est masquée (instantané au retour). */
  visible: boolean;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
  highlightSessionId?: string;
};

/**
 * Instance de carte conservée au sein du Layout : évite de réinitialiser Google Maps
 * à chaque navigation depuis une autre page de l’app.
 */
export default function PersistentHomeMap({
  visible,
  initialLat,
  initialLng,
  initialZoom,
  highlightSessionId,
}: PersistentHomeMapProps) {
  /**
   * Pas de `content-visibility: auto` ici : sous iOS/WebKit, basculer cet attribut sur un grand sous-arbre
   * (carte + header) puis revenir sur l’accueil peut laisser un mauvais calcul de viewport / safe-area
   * (« double » bande basse type home indicator + inset CSS).
   */
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    const had = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    if (!visible || had) return;
    const t = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 0);
    const t2 = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 120);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [visible]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col",
        !visible && "invisible pointer-events-none"
      )}
      aria-hidden={!visible}
    >
      <InteractiveMap
        isActive={visible}
        initialLat={initialLat}
        initialLng={initialLng}
        initialZoom={initialZoom}
        highlightSessionId={highlightSessionId}
      />
    </div>
  );
}
