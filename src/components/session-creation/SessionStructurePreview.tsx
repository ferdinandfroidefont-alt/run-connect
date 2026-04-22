import { useMemo } from 'react';
import type { SessionBlock } from './types';
import { cn } from '@/lib/utils';
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
  const profile = useMemo(() => buildPreviewBars(blocks), [blocks]);
  const totalWeight = profile.reduce((sum, item) => sum + item.width, 0) || 1;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[24px] border border-border bg-card px-3 py-4 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex h-16 items-end gap-1 rounded-[18px] bg-secondary px-2 py-2">
        {profile.map((bar, index) => (
          <span
            key={`${index}-${bar.width}-${bar.height}`}
            className="min-w-[4px] shrink-0 rounded-full"
            style={{
              flexBasis: `${(bar.width / totalWeight) * 100}%`,
              height: `${bar.height}px`,
              backgroundColor: bar.color,
              opacity: bar.opacity ?? 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
