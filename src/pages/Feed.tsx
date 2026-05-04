import { FeedActivitiesMaquette } from "@/components/feed/FeedActivitiesMaquette";

export default function Feed() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary">
      <FeedActivitiesMaquette />
    </div>
  );
}