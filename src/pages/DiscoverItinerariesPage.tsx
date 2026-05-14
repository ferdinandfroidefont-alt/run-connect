import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";
import ItineraryHub from "@/pages/ItineraryHub";

export default function DiscoverItinerariesPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DiscoverChromeShell activeChip="itineraires">
        <ItineraryHub embedded />
      </DiscoverChromeShell>
    </div>
  );
}
