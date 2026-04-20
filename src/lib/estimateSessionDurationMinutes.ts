/**
 * Estime la durée d'une séance (minutes) à partir des blocs, distance et allures.
 * Logique alignée sur l'affichage détail séance.
 */

export interface SessionBlockLike {
  type: 'warmup' | 'interval' | 'cooldown' | 'steady';
  duration?: string;
  durationType?: 'time' | 'distance';
  pace?: string;
  repetitions?: number;
  effortDuration?: string;
  effortType?: 'time' | 'distance';
  effortPace?: string;
  recoveryDuration?: string;
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

function parseKmFromSession(session: SessionLikeForDuration): number | null {
  const blocks = session.session_blocks ?? [];
  const intervalBlock = blocks.find((b) => b.type === 'interval');

  let derived: number | null = session.distance_km ?? null;

  if (
    !derived &&
    intervalBlock?.effortType === 'distance' &&
    intervalBlock.effortDuration
  ) {
    const m = parseFloat(String(intervalBlock.effortDuration).replace(',', '.'));
    if (!isNaN(m) && intervalBlock.repetitions) derived = (m * intervalBlock.repetitions) / 1000;
  }
  if (!derived && session.interval_distance != null && session.interval_count != null) {
    derived = session.interval_distance * session.interval_count;
  }
  if (!derived && session.routes?.total_distance) {
    derived = session.routes.total_distance / 1000;
  }
  return derived;
}

export function estimateSessionDurationMinutes(session: SessionLikeForDuration): number | null {
  const blocksAll = session.session_blocks ?? [];
  const intervalBlock = blocksAll.find((b) => b.type === 'interval');
  const derivedDistanceKm = parseKmFromSession(session);

  const rawPace =
    intervalBlock?.effortPace || session.interval_pace || session.pace_general || null;

  if (blocksAll.length) {
    let totalSec = 0;
    blocksAll.forEach((b) => {
      if (b.type === 'interval') {
        const reps = b.repetitions || 1;
        if (b.effortType === 'time') {
          totalSec +=
            reps * (parseFloat(String(b.effortDuration || '0').replace(',', '.')) || 0);
        } else if (b.effortPace) {
          const pm = String(b.effortPace).match(/(\d+)[':](\d+)/);
          const dist = parseFloat(String(b.effortDuration || '0').replace(',', '.')) / 1000;
          if (pm) totalSec += reps * (parseInt(pm[1], 10) * 60 + parseInt(pm[2], 10)) * dist;
        }
        if (b.recoveryDuration) {
          totalSec += (reps - 1) * (parseFloat(String(b.recoveryDuration).replace(',', '.')) || 0);
        }
      } else {
        if (b.durationType === 'time') {
          totalSec += (parseFloat(String(b.duration || '0').replace(',', '.')) || 0) * 60;
        } else if (b.pace) {
          const pm = String(b.pace).match(/(\d+)[':](\d+)/);
          const dist = parseFloat(String(b.duration || '0').replace(',', '.')) / 1000;
          if (pm) {
            totalSec +=
              (parseInt(pm[1], 10) * 60 + parseInt(pm[2], 10)) * dist;
          }
        }
      }
    });
    if (totalSec > 0) return Math.round(totalSec / 60);
  }

  if (derivedDistanceKm && rawPace) {
    const m = String(rawPace).match(/(\d+)[':](\d+)/);
    if (m) {
      const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      return Math.round((sec * derivedDistanceKm) / 60);
    }
  }

  return null;
}

/** Durée par défaut pour agenda / ICS quand aucune estimation n'est possible */
export const DEFAULT_SESSION_CALENDAR_DURATION_MIN = 60;

export function calendarDurationMinutes(session: SessionLikeForDuration): number {
  return estimateSessionDurationMinutes(session) ?? DEFAULT_SESSION_CALENDAR_DURATION_MIN;
}
