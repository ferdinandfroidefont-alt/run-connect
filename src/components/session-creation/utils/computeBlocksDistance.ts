import type { SessionBlock } from '../types';

/**
 * Parse "mm:ss" pace string to seconds per km.
 * Returns null if invalid.
 */
function parsePaceToSecPerKm(pace?: string): number | null {
  if (!pace) return null;
  const m = pace.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const sec = Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
  return sec > 0 ? sec : null;
}

/** Recovery pace defaults (sec/km) when not explicitly set. */
const RECOVERY_DEFAULT_PACE: Record<'trot' | 'marche' | 'statique', number | null> = {
  trot: 7 * 60,        // 7:00/km — easy jog
  marche: 12 * 60,     // 12:00/km — walking ~5 km/h
  statique: null,      // no movement → no distance added
};

/**
 * Compute a precise distance (in km) from the list of session blocks.
 * - warmup / cooldown / steady: duration (min) ÷ pace (min/km)
 * - interval: blockReps × series × effortDistance(m) + recoveries
 *   - recovery between series: (blockReps × (series - 1)) × recoveryDuration(s) at recovery pace
 *   - recovery between blocks: (blockReps - 1) × blockRecoveryDuration(s) at blockRecoveryType pace
 */
export function computeBlocksDistanceKm(blocks: SessionBlock[]): number | null {
  if (!blocks || blocks.length === 0) return null;
  let totalMeters = 0;
  let hasAnyContribution = false;

  for (const b of blocks) {
    if (b.type === 'interval') {
      const blockReps = Math.max(1, b.blockRepetitions ?? 1);
      const series = Math.max(0, b.repetitions ?? 0);
      const effortDist = Math.max(0, Number.parseFloat(b.effortDuration ?? '0') || 0); // in meters
      if (series > 0 && effortDist > 0) {
        totalMeters += blockReps * series * effortDist;
        hasAnyContribution = true;
      }

      // Recovery between series (covers all blocks)
      const recSec = Math.max(0, Number.parseInt(b.recoveryDuration ?? '0', 10) || 0);
      const recPaceSec = RECOVERY_DEFAULT_PACE[b.recoveryType ?? 'trot'];
      if (recSec > 0 && recPaceSec && series > 1) {
        const recCount = blockReps * (series - 1);
        const meters = (recSec / recPaceSec) * 1000 * recCount;
        totalMeters += meters;
      }

      // Recovery between blocks
      const blockRecSec = Math.max(0, Number.parseInt(b.blockRecoveryDuration ?? '0', 10) || 0);
      const blockRecPaceSec = RECOVERY_DEFAULT_PACE[b.blockRecoveryType ?? 'marche'];
      if (blockRecSec > 0 && blockRecPaceSec && blockReps > 1) {
        const meters = (blockRecSec / blockRecPaceSec) * 1000 * (blockReps - 1);
        totalMeters += meters;
      }
    } else {
      // warmup / cooldown / steady
      const durMin = Math.max(0, Number.parseFloat(b.duration ?? '0') || 0);
      const paceSecPerKm = parsePaceToSecPerKm(b.pace);
      if (durMin > 0 && paceSecPerKm) {
        const km = (durMin * 60) / paceSecPerKm;
        totalMeters += km * 1000;
        hasAnyContribution = true;
      }
    }
  }

  if (!hasAnyContribution) return null;
  return Math.round(totalMeters) / 1000;
}

/** Format the distance for display in the form input (1 decimal). */
export function formatDistanceForInput(km: number | null): string {
  if (km == null) return '';
  return (Math.round(km * 10) / 10).toFixed(1);
}
