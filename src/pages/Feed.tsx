import { FeedActivitiesMaquette } from "@/components/feed/FeedActivitiesMaquette";
import { DiscoverChromeShell } from "@/components/discover/DiscoverChromeShell";

export default function Feed() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <DiscoverChromeShell activeChip="feed">
        <FeedActivitiesMaquette embeddedInDiscoverChrome />
      </DiscoverChromeShell>
    </div>
  );
}
