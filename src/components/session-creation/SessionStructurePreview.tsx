import { useMemo } from 'react';
import type { SessionBlock } from './types';
import { cn } from '@/lib/utils';
import { MiniWorkoutProfile } from '@/components/coaching/MiniWorkoutProfile';
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

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-border bg-card px-3 py-4 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="rounded-[18px] border border-border/70 bg-secondary/35 px-3 py-3">
        <MiniWorkoutProfile
          blocks={profile.map((bar) => ({
            ...bar,
            width: (bar.width / totalWeight) * 100,
          }))}
          variant="premiumCompact"
          className="h-10"
        />
      </div>
    </div>
  );
}
