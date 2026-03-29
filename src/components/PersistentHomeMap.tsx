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
  return (
    <div
      className={cn(
        "h-full w-full min-h-0 min-w-0 flex flex-col",
        !visible && "invisible pointer-events-none [content-visibility:auto]"
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
