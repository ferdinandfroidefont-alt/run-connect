import { useMemo } from 'react';
import type { SessionBlock } from './types';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { buildAthleteIntensityContext } from '@/lib/athleteWorkoutContext';
import { buildWorkoutSegments, renderWorkoutMiniProfile } from '@/lib/workoutVisualization';
import { blockToVisualizationInput, resolveSessionBlocks } from '@/lib/sessionBlockCalculations';

interface SessionStructurePreviewProps {
  blocks: SessionBlock[];
  className?: string;
}

const PLACEHOLDER_BARS = [
  { width: 1.2, height: 9, color: 'hsl(var(--muted))', opacity: 0.5 },
  { width: 2.3, height: 12, color: 'hsl(var(--muted))', opacity: 0.7 },
  { width: 1.6, height: 15, color: 'hsl(var(--muted))', opacity: 0.55 },
  { width: 2.8, height: 17, color: 'hsl(var(--muted))', opacity: 0.8 },
  { width: 1.8, height: 13, color: 'hsl(var(--muted))', opacity: 0.6 },
  { width: 1.1, height: 10, color: 'hsl(var(--muted))', opacity: 0.45 },
];

function buildPreviewBars(blocks: SessionBlock[]) {
  if (!blocks.length) return PLACEHOLDER_BARS;
  const resolved = resolveSessionBlocks(blocks).map(blockToVisualizationInput);
  return renderWorkoutMiniProfile(buildWorkoutSegments(resolved, { sport: 'running' }));
}

export function SessionStructurePreview({ blocks, className }: SessionStructurePreviewProps) {
  const { userProfile } = useUserProfile();
  const athleteIntensity = useMemo(
    () => buildAthleteIntensityContext({ runningRecords: userProfile?.running_records ?? null }),
    [userProfile?.running_records]
  );
  const profile = useMemo(() => {
    if (!blocks.length) return PLACEHOLDER_BARS;
    const resolved = resolveSessionBlocks(blocks).map(blockToVisualizationInput);
    return renderWorkoutMiniProfile(
      buildWorkoutSegments(resolved, { sport: 'running', athleteIntensity })
    );
  }, [athleteIntensity, blocks]);
  const totalWeight = profile.reduce((sum, item) => sum + item.width, 0) || 1;
  const bars = profile.map((bar) => ({
    ...bar,
    widthPercent: (bar.width / totalWeight) * 100,
    zoneLevel: Math.max(1, Math.min(6, bar.zoneBandLevel ?? Math.round((bar.height / 20) * 6))),
  }));
  const selectedBarIndex = bars.reduce((bestIdx, bar, idx, arr) =>
    bar.zoneLevel > arr[bestIdx].zoneLevel ? idx : bestIdx, 0
  );
  const zoneBackgrounds = [
    'bg-[#4fa3ff]/[0.06]',
    'bg-[#30d158]/[0.06]',
    'bg-[#ffd60a]/[0.06]',
    'bg-[#ff9f0a]/[0.06]',
    'bg-[#ff453a]/[0.06]',
    'bg-[#bf5af2]/[0.06]',
  ];
  const zoneLabelColors = ['text-[#4fa3ff]', 'text-[#30d158]', 'text-[#ffd60a]', 'text-[#ff9f0a]', 'text-[#ff453a]', 'text-[#bf5af2]'];
  const zoneBarColors = ['#4fa3ff', '#30d158', '#ffd60a', '#ff9f0a', '#ff453a', '#bf5af2'];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-border bg-card px-3 py-4 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex gap-2">
        <div className="flex w-6 flex-col-reverse justify-between pb-5 pt-1 text-[10px] font-semibold">
          {[1, 2, 3, 4, 5, 6].map((zone) => (
            <span key={zone} className={zoneLabelColors[zone - 1]}>
              Z{zone}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex h-32 items-end gap-[3px] overflow-visible rounded-sm border-b border-l border-border bg-white/70 px-1.5 pt-2">
            <div className="pointer-events-none absolute inset-0 flex flex-col-reverse">
              {zoneBackgrounds.map((bgClass, idx) => (
                <div key={idx} className={cn('flex-1', bgClass)} />
              ))}
            </div>

            {bars.map((bar, index) => {
              const isSelected = index === selectedBarIndex;
              const barColor = zoneBarColors[bar.zoneLevel - 1] ?? zoneBarColors[0];
              return (
                <div
                  key={`${index}-${bar.widthPercent}-${bar.zoneLevel}`}
                  className={cn(
                    'relative z-[2] rounded-t-[4px]',
                    isSelected && 'brightness-105 shadow-[0_-4px_10px_rgba(255,69,58,0.35)]'
                  )}
                  style={{
                    width: `${bar.widthPercent}%`,
                    height: `${Math.round((bar.zoneLevel / 6) * 100)}%`,
                    minWidth: '8px',
                    background: barColor,
                  }}
                >
                  {isSelected && (
                    <div className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-[#1c1c1e] px-2 py-1">
                      <div className="text-[10px] font-semibold text-white">Zone {bar.zoneLevel} · 2 min</div>
                      <div className="mt-0.5 text-[9px] text-white/55">VO2max · 106% FTP</div>
                      <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-x-transparent border-t-[#1c1c1e]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between px-0.5 pt-1 text-[11px] text-muted-foreground tabular-nums">
            <span>0:00</span>
            <span>0:15</span>
            <span>0:30</span>
            <span>1:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
