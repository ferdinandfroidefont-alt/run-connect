import { MiniMapPreview } from "@/components/feed/MiniMapPreview";
import { initials } from "@/components/feed/FeedSessionTile";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";

type DiscoverActivityMaquetteCardProps = {
  name: string;
  subtitle: string;
  title: string;
  lat: number;
  lng: number;
  sessionId: string;
  activityType: string;
  organizerAvatarUrl?: string | null;
  onComment: () => void;
  onJoin: () => void;
  joinLabel: string;
};

export function DiscoverActivityMaquetteCard({
  name,
  subtitle,
  title,
  lat,
  lng,
  sessionId,
  activityType,
  organizerAvatarUrl,
  onComment,
  onJoin,
  joinLabel,
}: DiscoverActivityMaquetteCardProps) {
  const inits = initials(name);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 p-3.5">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
          style={{ background: ACTION_BLUE }}
        >
          {inits}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-[#0A0F1F]">{name}</p>
          <p className="text-[13px] text-[#8E8E93]">{subtitle}</p>
        </div>
      </div>

      <div className="relative mx-3.5 h-40 overflow-hidden rounded-xl bg-muted">
        <MiniMapPreview
          lat={lat}
          lng={lng}
          sessionId={sessionId}
          avatarUrl={organizerAvatarUrl}
          activityType={activityType}
          interactive={false}
          showHint={false}
          zoom={14}
          className="h-full w-full"
        />
      </div>

      <div className="p-3.5">
        <p className="mb-3 text-[15px] font-bold text-[#0A0F1F]">{title}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onComment}
            className="flex-1 touch-manipulation rounded-full border border-[#E5E5EA] py-2.5 text-[15px] font-semibold text-[#0A0F1F]"
          >
            Commenter
          </button>
          <button
            type="button"
            onClick={onJoin}
            className="flex-1 touch-manipulation rounded-full py-2.5 text-[15px] font-semibold text-white"
            style={{ background: ACTION_BLUE }}
          >
            {joinLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
