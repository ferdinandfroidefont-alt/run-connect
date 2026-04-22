import type { SessionBlock } from '../types';
import { resolveSessionTotals } from '@/lib/sessionBlockCalculations';

export function computeBlocksDistanceKm(blocks: SessionBlock[]): number | null {
  return resolveSessionTotals(blocks).distanceKm;
}

export function formatDistanceForInput(km: number | null): string {
  if (km == null) return '';
  return (Math.round(km * 10) / 10).toFixed(1);
}
