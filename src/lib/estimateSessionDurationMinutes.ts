import { resolveSessionTotals, resolveSessionBlocks } from '@/lib/sessionBlockCalculations';

export interface SessionBlockLike {
  type: 'warmup' | 'interval' | 'cooldown' | 'steady';
  duration?: string;
  durationType?: 'time' | 'distance';
  distance?: string;
  pace?: string;
  repetitions?: number;
  effortDuration?: string;
  effortType?: 'time' | 'distance';
  effortDistance?: string;
  effortPace?: string;
  recoveryDuration?: string;
  recoveryDistance?: string;
  blockRepetitions?: number;
  blockRecoveryDuration?: string;
  blockRecoveryDistance?: string;
}

export interface SessionLikeForDuration {
  session_blocks?: SessionBlockLike[] | null;
  distance_km?: number | null;
  interval_distance?: number | null;
  interval_count?: number | null;
  interval_pace?: string | null;
  pace_general?: string | null;
  routes?: { total_distance?: number } | null;
}

export function estimateSessionDurationMinutes(session: SessionLikeForDuration): number | null {
  const resolved = resolveSessionTotals(resolveSessionBlocks((session.session_blocks as SessionBlockLike[] | undefined) ?? [] as any));
  if (resolved.durationMin != null) return resolved.durationMin;

  if (session.distance_km && session.pace_general) {
    const blocks = resolveSessionBlocks([{ type: 'steady', distance: String(Math.round(session.distance_km * 1000)), pace: session.pace_general } as any]);
    return resolveSessionTotals(blocks).durationMin;
  }

  return null;
}

export const DEFAULT_SESSION_CALENDAR_DURATION_MIN = 60;

export function calendarDurationMinutes(session: SessionLikeForDuration): number {
  return estimateSessionDurationMinutes(session) ?? DEFAULT_SESSION_CALENDAR_DURATION_MIN;
}
