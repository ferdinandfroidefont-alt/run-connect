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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-black/65 via-black/18 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="mx-4 mt-3 rounded-[24px] border border-white/12 bg-black/28 px-4 py-3 text-white shadow-[0_16px_40px_-22px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {routeName && (
            <p className="truncate text-center text-[13px] font-medium tracking-[0.01em] text-white/82">
              {routeName}
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/8 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Parcouru</p>
              <p className="mt-1 text-[17px] font-semibold leading-none tabular-nums">
                {formatKm(currentDistance)}
              </p>
              <p className="mt-1 text-[11px] text-white/55">{formatKm(totalDistance)} au total</p>
            </div>
            <div className="rounded-2xl bg-white/8 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Dénivelé +</p>
              <p className="mt-1 text-[17px] font-semibold leading-none tabular-nums">{Math.round(elevationGain)} m</p>
              <p className="mt-1 text-[11px] text-white/55">lecture immersive 3D</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44 bg-gradient-to-t from-black/80 via-black/28 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="rounded-[28px] border border-white/12 bg-black/28 px-4 py-4 shadow-[0_16px_40px_-22px_rgba(0,0,0,0.88)] backdrop-blur-2xl">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-orange-400 transition-[width] duration-150"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-11 w-11 shrink-0 rounded-full border border-white/12 bg-white/10 p-0 text-white hover:bg-white/18"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onPlayPause}
              className="h-[60px] w-[60px] shrink-0 rounded-full bg-white text-black p-0 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.95)] hover:bg-white/90"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
            </Button>

            <button
              type="button"
              onClick={onCycleSpeed}
              className={cn(
                'inline-flex h-11 min-w-[72px] shrink-0 items-center justify-center rounded-full border border-white/12',
                'bg-white/10 px-4 text-[14px] font-semibold text-white backdrop-blur-xl transition hover:bg-white/18',
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
