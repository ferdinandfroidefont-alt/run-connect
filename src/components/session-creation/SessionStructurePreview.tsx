import React, { useMemo, useState } from 'react';
import type { SessionBlock, BlockType } from './types';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { buildAthleteIntensityContext } from '@/lib/athleteWorkoutContext';
import { buildWorkoutSegments, renderWorkoutMiniProfile, computeWorkoutDuration } from '@/lib/workoutVisualization';
import { blockToVisualizationInput, resolveSessionBlocks } from '@/lib/sessionBlockCalculations';

interface SessionStructurePreviewProps {
  blocks: SessionBlock[];
  className?: string;
  onDropBlock?: (type: BlockType) => void;
  isDragActive?: boolean;
}

function formatTimeLabel(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0:00';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function SessionStructurePreview({
  blocks,
  className,
  onDropBlock,
  isDragActive: isDragActiveProp,
}: SessionStructurePreviewProps) {
  const { userProfile } = useUserProfile();
  const [localDragOver, setLocalDragOver] = useState(false);
  const isDragActive = isDragActiveProp || localDragOver;

  const athleteIntensity = useMemo(
    () => buildAthleteIntensityContext({ runningRecords: userProfile?.running_records ?? null }),
    [userProfile?.running_records],
  );

  const { profile, totalDurationMin } = useMemo(() => {
    if (!blocks.length) return { profile: [], totalDurationMin: 0 };
    const resolved = resolveSessionBlocks(blocks).map(blockToVisualizationInput);
    const segments = buildWorkoutSegments(resolved, { sport: 'running', athleteIntensity });
    const prof = renderWorkoutMiniProfile(segments, { sessionSchema: true });
    const dur = computeWorkoutDuration(segments);
    return { profile: prof, totalDurationMin: dur };
  }, [athleteIntensity, blocks]);

  const timeLabels = useMemo(() => {
    if (totalDurationMin > 0) {
      const t = totalDurationMin;
      return [
        '0:00',
        formatTimeLabel(Math.round(t / 3)),
        formatTimeLabel(Math.round((t * 2) / 3)),
        formatTimeLabel(Math.round(t)),
      ];
    }
    if (blocks.length > 0) {
      return ['0:00', '?', '?', '?'];
    }
    return ['0:00', '—', '—', '—'];
  }, [totalDurationMin, blocks.length]);

  const totalWeight = profile.reduce((sum, item) => sum + item.width, 0) || 1;
  const bars = profile.map((bar) => ({
    ...bar,
    widthPercent: (bar.width / totalWeight) * 100,
    zoneLevel: Math.max(1, Math.min(6, bar.zoneBandLevel ?? Math.round((bar.height / 20) * 6))),
  }));

  const zoneLabelColors = [
    'text-[#4fa3ff]',
    'text-[#30d158]',
    'text-[#ffd60a]',
    'text-[#ff9f0a]',
    'text-[#ff453a]',
    'text-[#bf5af2]',
  ];
  const zoneBarColors = ['#4fa3ff', '#30d158', '#ffd60a', '#ff9f0a', '#ff453a', '#bf5af2'];
  const zoneBackgrounds = [
    'bg-[#4fa3ff]/[0.06]',
    'bg-[#30d158]/[0.06]',
    'bg-[#ffd60a]/[0.06]',
    'bg-[#ff9f0a]/[0.06]',
    'bg-[#ff453a]/[0.06]',
    'bg-[#bf5af2]/[0.06]',
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setLocalDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      setLocalDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
    const type = e.dataTransfer.getData('blockType') as BlockType;
    if (type && onDropBlock) onDropBlock(type);
  };

  const isEmpty = blocks.length === 0;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-border bg-card px-3 py-4 shadow-[var(--shadow-card)] transition-all duration-200',
        isDragActive && 'border-primary/50 ring-2 ring-primary/20',
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex gap-2">
        {/* Y axis — zone labels */}
        <div className="flex w-6 flex-col-reverse justify-between pb-5 pt-1 text-[10px] font-semibold">
          {[1, 2, 3, 4, 5, 6].map((zone) => (
            <span key={zone} className={zoneLabelColors[zone - 1]}>
              Z{zone}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative flex h-32 items-end gap-[3px] overflow-visible rounded-sm border-b border-l border-border bg-white/70 px-1.5 pt-2">
            {/* Zone background stripes */}
            <div className="pointer-events-none absolute inset-0 flex flex-col-reverse">
              {zoneBackgrounds.map((bgClass, idx) => (
                <div key={idx} className={cn('flex-1', bgClass)} />
              ))}
            </div>

            {isEmpty ? (
              /* Empty drop zone */
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed px-6 py-3 transition-colors duration-200',
                    isDragActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted-foreground/25 text-muted-foreground/50',
                  )}
                >
                  <span className="text-xs font-semibold">
                    {isDragActive ? 'Relâchez pour ajouter' : 'Glissez un bloc ici'}
                  </span>
                </div>
              </div>
            ) : (
              bars.map((bar, index) => {
                const barColor = zoneBarColors[bar.zoneLevel - 1] ?? zoneBarColors[0];
                return (
                  <div
                    key={`${index}-${bar.widthPercent}-${bar.zoneLevel}`}
                    className="relative z-[2] rounded-t-[4px] transition-all duration-300"
                    style={{
                      width: `${bar.widthPercent}%`,
                      height: `${Math.round((bar.zoneLevel / 6) * 100)}%`,
                      minWidth: '8px',
                      background: barColor,
                    }}
                  />
                );
              })
            )}
          </div>

          {/* X axis — dynamic time labels */}
          <div className="flex justify-between px-0.5 pt-1 text-[11px] text-muted-foreground tabular-nums">
            {timeLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
