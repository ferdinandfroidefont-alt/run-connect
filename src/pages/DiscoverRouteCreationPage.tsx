import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";
import { RouteCreation } from "@/pages/RouteCreation";

/**
 * Création / édition d’itinéraire dans le flux Découvrir : même en-tête et pastilles (Carte, Feed, Live, Itinéraires) que la maquette.
 */
export default function DiscoverRouteCreationPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DiscoverChromeShell activeChip="itineraires">
        <RouteCreation embedDiscover />
      </DiscoverChromeShell>
    </div>
  );
}
