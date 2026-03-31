import { Button } from '@/components/ui/button';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type RouteFlyoverHudProps = {
  routeName?: string;
  isPlaying: boolean;
  progress: number;
  currentDistance: number;
  totalDistance: number;
  elevationGain: number;
  speed: 1 | 2 | 3;
  onPlayPause: () => void;
  onReset: () => void;
  onCycleSpeed: () => void;
};

function formatKm(distanceMeters: number): string {
  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
}

export function RouteFlyoverHud({
  routeName,
  isPlaying,
  progress,
  currentDistance,
  totalDistance,
  elevationGain,
  speed,
  onPlayPause,
  onReset,
  onCycleSpeed,
}: RouteFlyoverHudProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-background/55 via-background/12 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-4 mt-3 rounded-[20px] border border-border/70 bg-card/92 px-3.5 py-3 text-foreground shadow-[0_12px_32px_-18px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)]">
          {routeName && (
            <p className="truncate text-center text-[13px] font-medium tracking-[0.01em] text-foreground/90">
              {routeName}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border/50 bg-secondary/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Parcouru</p>
              <p className="mt-1 text-[17px] font-semibold leading-none tabular-nums">
                {formatKm(currentDistance)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatKm(totalDistance)} au total</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-secondary/60 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Dénivelé +</p>
              <p className="mt-1 text-[17px] font-semibold leading-none tabular-nums">{Math.round(elevationGain)} m</p>
              <p className="mt-1 text-[11px] text-muted-foreground">survol Mapbox 3D</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-36 bg-gradient-to-t from-background/65 via-background/14 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="rounded-[22px] border border-border/70 bg-card/92 px-4 py-3.5 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)]">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-11 w-11 shrink-0 rounded-full border-border bg-background/80 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onPlayPause}
              className="h-[56px] w-[56px] shrink-0 rounded-full p-0 shadow-md"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
            </Button>

            <button
              type="button"
              onClick={onCycleSpeed}
              className={cn(
                'inline-flex h-11 min-w-[72px] shrink-0 items-center justify-center rounded-full border border-border',
                'bg-secondary px-4 text-[14px] font-semibold text-foreground transition hover:bg-secondary/80',
              )}
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
