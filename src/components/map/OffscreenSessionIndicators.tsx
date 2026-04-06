import { MapPin } from "lucide-react";
import { ActivityIcon } from "@/lib/activityIcons";
import { cn } from "@/lib/utils";
import type { OffscreenIndicatorItem } from "@/hooks/useOffscreenSessionIndicators";

function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "";
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

type OffscreenSessionIndicatorsProps = {
  items: OffscreenIndicatorItem[];
  onFlyToSession: (lng: number, lat: number) => void;
  className?: string;
};

/**
 * Badges discrets sur le bord de la zone carte utile quand des séances existent hors viewport.
 */
export function OffscreenSessionIndicators({
  items,
  onFlyToSession,
  className,
}: OffscreenSessionIndicatorsProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[15]", className)}
      aria-hidden={items.length === 0}
    >
      {items.map((it) => (
        <button
          key={it.sessionId}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onFlyToSession(it.lng, it.lat);
          }}
          className={cn(
            "pointer-events-auto absolute flex max-w-[min(200px,calc(100vw-6rem))] items-center gap-2 rounded-full border border-black/[0.08] bg-white/90 py-1.5 pl-2 pr-3",
            "shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18),0_1px_4px_-2px_rgba(0,0,0,0.08)]",
            "backdrop-blur-md transition-transform duration-200 active:scale-[0.97] dark:border-[#2a2a2a] dark:bg-black/82",
            "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          style={{
            left: it.x,
            top: it.y,
            transform: "translate(-50%, -50%)",
          }}
          aria-label={`Séance à ${formatDistanceKm(it.distanceKm)}`}
        >
          <ActivityIcon activityType={it.activityType} size="sm" className="shrink-0" />
          <span className="flex min-w-0 flex-col items-start text-left leading-tight">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Séance
            </span>
            <span className="text-[13px] font-semibold text-foreground">
              À {formatDistanceKm(it.distanceKm)}
            </span>
          </span>
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
        </button>
      ))}
    </div>
  );
}
