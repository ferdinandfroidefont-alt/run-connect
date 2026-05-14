import type { SessionBlock } from '@/components/session-creation/types';

export type BlockMetricField =
  | 'pace'
  | 'distance'
  | 'duration'
  | 'effortPace'
  | 'effortDistance'
  | 'effortDuration'
  | 'recoveryPace'
  | 'recoveryDistance'
  | 'recoveryDuration'
  | 'blockRecoveryPace'
  | 'blockRecoveryDistance'
  | 'blockRecoveryDuration';

export interface ResolvedMetricTriplet {
  distanceM: number | null;
  durationSec: number | null;
  paceSecPerKm: number | null;
  computedField: 'distance' | 'duration' | 'pace' | null;
}

export interface ResolvedSessionTotals {
  distanceKm: number | null;
  durationMin: number | null;
  dominantZone: string | null;
  blockCount: number;
}

const DEFAULT_SIMPLE_PACE_SEC_PER_KM = 360;
const DEFAULT_RECOVERY_PACE_SEC_PER_KM = 420;

function toPositiveInt(value?: string | number | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function normalizeLegacySimpleDuration(block: SessionBlock): number | null {
  const raw = toPositiveInt(block.duration);
  if (!raw) return null;
  if (block.distance) return null;
  if (block.durationType === 'distance') return null;
  if (!block.durationType) return raw * 60;
  return raw;
}

export function parseDistanceMeters(value?: string | number | null): number | null {
  return toPositiveInt(value);
}

export function parseDurationSeconds(value?: string | number | null): number | null {
  return toPositiveInt(value);
}

export function parsePaceToSecondsPerKm(value?: string | null): number | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const timeMatch = raw.match(/(\d{1,2})[:'](\d{2})/);
  if (timeMatch) {
    const minutes = Number.parseInt(timeMatch[1], 10);
    const seconds = Number.parseInt(timeMatch[2], 10);
    const totalSec = minutes * 60 + seconds;
    if (!Number.isFinite(totalSec) || totalSec <= 0) return null;

    if (raw.includes('/mi') || raw.includes('min/mi')) return totalSec / 1.609344;
    if (raw.includes('/100')) return totalSec * 10;
    return totalSec;
  }

  const speedMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(km\/h|mi\/h)/);
  if (speedMatch) {
    const speed = Number.parseFloat(speedMatch[1].replace(',', '.'));
    if (!Number.isFinite(speed) || speed <= 0) return null;
    const kmh = speedMatch[2] === 'mi/h' ? speed * 1.609344 : speed;
    return 3600 / kmh;
  }

  const numeric = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric * 60) : null;
}

export function formatDistanceMeters(value?: number | null): string {
  if (!value || value <= 0) return '';
  return String(Math.round(value));
}

export function formatDurationSeconds(value?: number | null): string {
  if (!value || value <= 0) return '';
  return String(Math.round(value));
}

export function formatDistanceLabel(value?: string | number | null): string {
  const meters = parseDistanceMeters(value);
  if (!meters) return 'Distance';
  if (meters >= 1000) {
    const km = meters / 1000;
    return Number.isInteger(km) ? `${km} km` : `${km.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')} km`;
  }
  return `${meters} m`;
}

export function formatDurationLabel(value?: string | number | null): string {
  const seconds = parseDurationSeconds(value);
  if (!seconds) return 'Temps';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h${String(minutes).padStart(2, '0')}`;
  if (minutes > 0 && secs > 0) return `${minutes}:${String(secs).padStart(2, '0')}`;
  if (minutes > 0) return `${minutes} min`;
  return `${secs} s`;
}

export function formatPaceLabel(value?: string | null): string {
  const secPerKm = parsePaceToSecondsPerKm(value);
  if (!secPerKm) return 'Allure';
  const minutes = Math.floor(secPerKm / 60);
  const seconds = Math.round(secPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

export function inferZoneFromPace(paceSecPerKm?: number | null): string | null {
  if (!paceSecPerKm) return null;
  if (paceSecPerKm <= 235) return 'z6';
  if (paceSecPerKm <= 255) return 'z5';
  if (paceSecPerKm <= 280) return 'z4';
  if (paceSecPerKm <= 320) return 'z3';
  if (paceSecPerKm <= 375) return 'z2';
  return 'z1';
}

export function zoneLabel(zone?: string | null): string {
  const normalized = zone?.toLowerCase();
  const map: Record<string, string> = {
    z1: 'Z1',
    z2: 'Z2',
    z3: 'Z3',
    z4: 'Z4',
    z5: 'Z5',
    z6: 'Z6',
  };
  return normalized ? map[normalized] ?? normalized.toUpperCase() : 'Zone auto';
}

export function resolveMetricTriplet(params: {
  distanceM?: number | null;
  durationSec?: number | null;
  paceSecPerKm?: number | null;
  lastEdited?: BlockMetricField | null;
}): ResolvedMetricTriplet {
  let distanceM = params.distanceM ?? null;
  let durationSec = params.durationSec ?? null;
  let paceSecPerKm = params.paceSecPerKm ?? null;
  const present = [distanceM, durationSec, paceSecPerKm].filter((value) => value != null).length;

  if (present < 2) {
    return { distanceM, durationSec, paceSecPerKm, computedField: null };
  }

  const edited = params.lastEdited ?? null;

  if (distanceM != null && durationSec != null && (paceSecPerKm == null || edited?.includes('pace'))) {
    paceSecPerKm = (durationSec / distanceM) * 1000;
    return { distanceM, durationSec, paceSecPerKm, computedField: 'pace' };
  }

  if (paceSecPerKm != null && durationSec != null && (distanceM == null || edited?.includes('distance'))) {
    distanceM = (durationSec / paceSecPerKm) * 1000;
    return { distanceM, durationSec, paceSecPerKm, computedField: 'distance' };
  }

  if (paceSecPerKm != null && distanceM != null && (durationSec == null || edited?.includes('duration'))) {
    durationSec = (distanceM / 1000) * paceSecPerKm;
    return { distanceM, durationSec, paceSecPerKm, computedField: 'duration' };
  }

  if (distanceM != null && durationSec != null && paceSecPerKm != null) {
    if (edited?.includes('pace')) paceSecPerKm = (durationSec / distanceM) * 1000;
    else if (edited?.includes('distance')) distanceM = (durationSec / paceSecPerKm) * 1000;
    else durationSec = (distanceM / 1000) * paceSecPerKm;
  }

  return { distanceM, durationSec, paceSecPerKm, computedField: null };
}

export function normalizeSessionBlock(block: SessionBlock): SessionBlock {
  if (block.type === 'interval') {
    const effortDistance = parseDistanceMeters(block.effortDistance ?? ((block.effortType ?? 'distance') === 'distance' ? block.effortDuration : null));
    const effortDuration = parseDurationSeconds(block.effortDuration);
    const recoveryDuration = parseDurationSeconds(block.recoveryDuration);
    const recoveryDistance = parseDistanceMeters(block.recoveryDistance);
    const blockRecoveryDuration = parseDurationSeconds(block.blockRecoveryDuration);
    const blockRecoveryDistance = parseDistanceMeters(block.blockRecoveryDistance);

    return {
      ...block,
      effortType: block.effortType ?? (effortDuration ? 'time' : 'distance'),
      effortDistance: formatDistanceMeters(effortDistance),
      effortDuration: block.effortType === 'time' || effortDuration ? formatDurationSeconds(effortDuration) : formatDistanceMeters(effortDistance ?? parseDistanceMeters(block.effortDuration)),
      recoveryDuration: formatDurationSeconds(recoveryDuration),
      recoveryDistance: formatDistanceMeters(recoveryDistance),
      blockRecoveryDuration: formatDurationSeconds(blockRecoveryDuration),
      blockRecoveryDistance: formatDistanceMeters(blockRecoveryDistance),
      repetitions: Math.max(1, block.repetitions ?? 1),
      blockRepetitions: Math.max(1, block.blockRepetitions ?? 1),
      recoveryType: block.recoveryType ?? 'trot',
      blockRecoveryType: block.blockRecoveryType ?? 'marche',
    };
  }

  const normalizedDistance = parseDistanceMeters(block.distance ?? (block.durationType === 'distance' ? block.duration : null));
  const normalizedDuration = normalizeLegacySimpleDuration(block);

  return {
    ...block,
    durationType: normalizedDistance ? 'distance' : 'time',
    distance: formatDistanceMeters(normalizedDistance),
    duration: formatDurationSeconds(normalizedDuration),
  };
}

export function resolveSimpleBlockMetrics(block: SessionBlock): SessionBlock {
  const normalized = normalizeSessionBlock(block);
  const resolved = resolveMetricTriplet({
    distanceM: parseDistanceMeters(normalized.distance),
    durationSec: parseDurationSeconds(normalized.duration),
    paceSecPerKm: parsePaceToSecondsPerKm(normalized.pace),
    lastEdited: normalized.lastEditedMetric,
  });

  const paceSecPerKm = resolved.paceSecPerKm;
  return {
    ...normalized,
    distance: formatDistanceMeters(resolved.distanceM),
    duration: formatDurationSeconds(resolved.durationSec),
    pace: paceSecPerKm ? formatPaceLabel(`${Math.floor(paceSecPerKm / 60)}:${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}`) : '',
    intensity: normalized.intensity || inferZoneFromPace(paceSecPerKm) || undefined,
    durationType: 'time',
  };
}

export function resolveRecoveryMetrics(params: {
  duration?: string | null;
  distance?: string | null;
  pace?: string | null;
  lastEdited?: BlockMetricField | null;
  fallbackPaceSecPerKm?: number;
}): { duration: string; distance: string; pace: string } {
  const resolved = resolveMetricTriplet({
    distanceM: parseDistanceMeters(params.distance),
    durationSec: parseDurationSeconds(params.duration),
    paceSecPerKm: parsePaceToSecondsPerKm(params.pace),
    lastEdited: params.lastEdited,
  });

  return {
    duration: formatDurationSeconds(resolved.durationSec),
    distance: formatDistanceMeters(resolved.distanceM),
    pace: resolved.paceSecPerKm ? formatPaceLabel(`${Math.floor(resolved.paceSecPerKm / 60)}:${String(Math.round(resolved.paceSecPerKm % 60)).padStart(2, '0')}`) : '',
  };
}

export function resolveIntervalEffortMetrics(block: SessionBlock): SessionBlock {
  const normalized = normalizeSessionBlock(block);
  const resolved = resolveMetricTriplet({
    distanceM: parseDistanceMeters(normalized.effortDistance),
    durationSec: parseDurationSeconds(normalized.effortDuration),
    paceSecPerKm: parsePaceToSecondsPerKm(normalized.effortPace),
    lastEdited: normalized.lastEditedMetric,
  });

  const recovery = resolveRecoveryMetrics({
    duration: normalized.recoveryDuration,
    distance: normalized.recoveryDistance,
    pace: normalized.recoveryPace,
    lastEdited: normalized.lastEditedMetric,
    fallbackPaceSecPerKm: DEFAULT_RECOVERY_PACE_SEC_PER_KM,
  });
  const seriesRecovery = resolveRecoveryMetrics({
    duration: normalized.blockRecoveryDuration,
    distance: normalized.blockRecoveryDistance,
    pace: normalized.blockRecoveryPace,
    lastEdited: normalized.lastEditedMetric,
    fallbackPaceSecPerKm: DEFAULT_RECOVERY_PACE_SEC_PER_KM,
  });

  const paceSecPerKm = resolved.paceSecPerKm;

  return {
    ...normalized,
    effortDistance: formatDistanceMeters(resolved.distanceM),
    effortDuration: formatDurationSeconds(resolved.durationSec),
    effortPace: paceSecPerKm ? formatPaceLabel(`${Math.floor(paceSecPerKm / 60)}:${String(Math.round(paceSecPerKm % 60)).padStart(2, '0')}`) : '',
    effortType: resolved.computedField === 'distance' ? 'distance' : resolved.computedField === 'duration' ? 'time' : normalized.effortType,
    effortIntensity: normalized.effortIntensity || inferZoneFromPace(paceSecPerKm) || undefined,
    recoveryDuration: recovery.duration,
    recoveryDistance: recovery.distance,
    recoveryPace: recovery.pace,
    blockRecoveryDuration: seriesRecovery.duration,
    blockRecoveryDistance: seriesRecovery.distance,
    blockRecoveryPace: seriesRecovery.pace,
    repetitions: Math.max(1, normalized.repetitions ?? 1),
    blockRepetitions: Math.max(1, normalized.blockRepetitions ?? 1),
  };
}

export function resolveStructuredBlock(block: SessionBlock): SessionBlock {
  return block.type === 'interval' ? resolveIntervalEffortMetrics(block) : resolveSimpleBlockMetrics(block);
}

export function resolveSessionBlocks(blocks: SessionBlock[]): SessionBlock[] {
  return blocks.map(resolveStructuredBlock);
}

export function resolveSessionTotals(blocks: SessionBlock[]): ResolvedSessionTotals {
  const resolvedBlocks = resolveSessionBlocks(blocks);
  let totalDistanceM = 0;
  let totalDurationSec = 0;
  const zoneWeights = new Map<string, number>();
  let visualBlockCount = 0;

  for (const block of resolvedBlocks) {
    if (block.type === 'interval') {
      const series = Math.max(1, block.blockRepetitions ?? 1);
      const reps = Math.max(1, block.repetitions ?? 1);
      const effortDistance = parseDistanceMeters(block.effortDistance);
      const effortDuration = parseDurationSeconds(block.effortDuration);
      const recoveryDistance = parseDistanceMeters(block.recoveryDistance);
      const recoveryDuration = parseDurationSeconds(block.recoveryDuration);
      const seriesRecoveryDistance = parseDistanceMeters(block.blockRecoveryDistance);
      const seriesRecoveryDuration = parseDurationSeconds(block.blockRecoveryDuration);
      const estimatedRecoveryDistance = recoveryDistance ?? ((recoveryDuration ?? 0) > 0 && block.recoveryType !== 'statique' ? Math.round((recoveryDuration ?? 0) / DEFAULT_RECOVERY_PACE_SEC_PER_KM * 1000) : 0);
      const estimatedSeriesRecoveryDistance = seriesRecoveryDistance ?? ((seriesRecoveryDuration ?? 0) > 0 && block.blockRecoveryType !== 'statique' ? Math.round((seriesRecoveryDuration ?? 0) / DEFAULT_RECOVERY_PACE_SEC_PER_KM * 1000) : 0);
      const effortZone = block.effortIntensity || inferZoneFromPace(parsePaceToSecondsPerKm(block.effortPace)) || 'z4';

      totalDistanceM += (effortDistance ?? 0) * reps * series;
      totalDurationSec += (effortDuration ?? 0) * reps * series;
      totalDistanceM += estimatedRecoveryDistance * Math.max(reps - 1, 0) * series;
      totalDurationSec += (recoveryDuration ?? 0) * Math.max(reps - 1, 0) * series;
      totalDistanceM += estimatedSeriesRecoveryDistance * Math.max(series - 1, 0);
      totalDurationSec += (seriesRecoveryDuration ?? 0) * Math.max(series - 1, 0);

      zoneWeights.set(effortZone, (zoneWeights.get(effortZone) ?? 0) + ((effortDuration ?? 0) || (effortDistance ?? 0)) * reps * series);
      visualBlockCount += reps * series + Math.max(reps - 1, 0) * series + Math.max(series - 1, 0);
      continue;
    }

    const distance = parseDistanceMeters(block.distance);
    const duration = parseDurationSeconds(block.duration);
    totalDistanceM += distance ?? 0;
    totalDurationSec += duration ?? 0;
    const zone = block.intensity || inferZoneFromPace(parsePaceToSecondsPerKm(block.pace)) || 'z2';
    zoneWeights.set(zone, (zoneWeights.get(zone) ?? 0) + ((duration ?? 0) || (distance ?? 0) || 1));
    visualBlockCount += 1;
  }

  const dominantZone = [...zoneWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    distanceKm: totalDistanceM > 0 ? Math.round(totalDistanceM) / 1000 : null,
    durationMin: totalDurationSec > 0 ? Math.round(totalDurationSec / 60) : null,
    dominantZone,
    blockCount: visualBlockCount,
  };
}

export function getBlockSummary(block: SessionBlock): string {
  const resolved = resolveStructuredBlock(block);
  if (resolved.type === 'interval') {
    const reps = Math.max(1, resolved.repetitions ?? 1);
    const series = Math.max(1, resolved.blockRepetitions ?? 1);
    const effort = formatDistanceLabel(resolved.effortDistance) !== 'Distance'
      ? formatDistanceLabel(resolved.effortDistance)
      : formatDurationLabel(resolved.effortDuration);
    const recovery = formatDurationLabel(resolved.recoveryDuration) !== 'Temps'
      ? formatDurationLabel(resolved.recoveryDuration)
      : formatDistanceLabel(resolved.recoveryDistance);
    const seriesRecovery = formatDurationLabel(resolved.blockRecoveryDuration) !== 'Temps'
      ? formatDurationLabel(resolved.blockRecoveryDuration)
      : formatDistanceLabel(resolved.blockRecoveryDistance);
    return `${series > 1 ? `${series} séries · ` : ''}${reps} reps · ${effort}${recovery !== 'Temps' && recovery !== 'Distance' ? ` · récup ${recovery}` : ''}${series > 1 && seriesRecovery !== 'Temps' && seriesRecovery !== 'Distance' ? ` · inter-séries ${seriesRecovery}` : ''}`;
  }

  const time = formatDurationLabel(resolved.duration);
  const distance = formatDistanceLabel(resolved.distance);
  const pace = formatPaceLabel(resolved.pace);
  return [time !== 'Temps' ? time : null, distance !== 'Distance' ? distance : null, pace !== 'Allure' ? pace : null].filter(Boolean).join(' · ') || 'Bloc à compléter';
}

export function blockToVisualizationInput(block: SessionBlock) {
  const resolved = resolveStructuredBlock(block);
  if (resolved.type === 'interval') {
    return {
      type: 'interval',
      repetitions: Math.max(1, resolved.repetitions ?? 1),
      blockRepetitions: Math.max(1, resolved.blockRepetitions ?? 1),
      duration: parseDurationSeconds(resolved.effortDuration) ? parseDurationSeconds(resolved.effortDuration)! / 60 : 0,
      distance: parseDistanceMeters(resolved.effortDistance) ?? 0,
      recoveryDuration: parseDurationSeconds(resolved.recoveryDuration) ?? 0,
      recoveryDistance: parseDistanceMeters(resolved.recoveryDistance) ?? 0,
      blockRecoveryDuration: parseDurationSeconds(resolved.blockRecoveryDuration) ?? 0,
      blockRecoveryDistance: parseDistanceMeters(resolved.blockRecoveryDistance) ?? 0,
      pace: resolved.effortPace,
      zone: resolved.effortIntensity,
    };
  }

  return {
    type: resolved.type,
    duration: parseDurationSeconds(resolved.duration) ? parseDurationSeconds(resolved.duration)! / 60 : 0,
    distance: parseDistanceMeters(resolved.distance) ?? 0,
    pace: resolved.pace,
    zone: resolved.intensity,
  };
}

export function normalizeBlocksForStorage(blocks: SessionBlock[]): SessionBlock[] {
  return resolveSessionBlocks(blocks).map((block) => ({
    ...block,
    lastEditedMetric: block.lastEditedMetric,
  }));
}

export function getFallbackPaceForBlock(block: SessionBlock): number {
  if (block.type === 'interval') return parsePaceToSecondsPerKm(block.effortPace) ?? DEFAULT_SIMPLE_PACE_SEC_PER_KM;
  return parsePaceToSecondsPerKm(block.pace) ?? DEFAULT_SIMPLE_PACE_SEC_PER_KM;
}

function zoneTokenToChartNumber(zone?: string | null): number {
  if (!zone || typeof zone !== 'string') return 3;
  const m = /^z?(\d)$/i.exec(zone.trim());
  if (!m) return 3;
  return Math.max(1, Math.min(6, parseInt(m[1], 10)));
}

/**
 * Répartition Z1–Z6 pour le graphique « suivi athlète » (hauteur par % de charge estimée par bloc).
 */
export function sessionBlocksToZoneChartSegments(rawBlocks: unknown): { z: number; pct: number }[] {
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return [{ z: 3, pct: 100 }];
  }
  const sanitized = rawBlocks.filter((b): b is SessionBlock => !!b && typeof b === 'object' && 'type' in b);
  if (!sanitized.length) {
    return [{ z: 3, pct: 100 }];
  }
  let blocks: SessionBlock[];
  try {
    blocks = resolveSessionBlocks(sanitized);
  } catch {
    return [{ z: 3, pct: 100 }];
  }
  const zoneWeights = new Map<number, number>();

  for (const block of blocks) {
    if (block.type === 'interval') {
      const series = Math.max(1, block.blockRepetitions ?? 1);
      const reps = Math.max(1, block.repetitions ?? 1);
      const effortDistance = parseDistanceMeters(block.effortDistance);
      const effortDuration = parseDurationSeconds(block.effortDuration);
      const effortZone = zoneTokenToChartNumber(
        block.effortIntensity || inferZoneFromPace(parsePaceToSecondsPerKm(block.effortPace)) || 'z4',
      );
      const weight =
        ((effortDuration ?? 0) || (effortDistance ?? 0) || 1) * reps * series;
      zoneWeights.set(effortZone, (zoneWeights.get(effortZone) ?? 0) + weight);
      continue;
    }
    const distance = parseDistanceMeters(block.distance);
    const duration = parseDurationSeconds(block.duration);
    const zone = zoneTokenToChartNumber(
      block.intensity || inferZoneFromPace(parsePaceToSecondsPerKm(block.pace)) || 'z2',
    );
    const weight = (duration ?? 0) || (distance ?? 0) || 1;
    zoneWeights.set(zone, (zoneWeights.get(zone) ?? 0) + weight);
  }

  const total = [...zoneWeights.values()].reduce((s, w) => s + w, 0);
  if (total <= 0) return [{ z: 3, pct: 100 }];

  const entries = [...zoneWeights.entries()].sort((a, b) => a[0] - b[0]);
  const rawPcts = entries.map(([, w]) => (w / total) * 100);
  const floored = rawPcts.map((x) => Math.floor(x));
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const byFrac = rawPcts
    .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const pct = [...floored];
  for (let k = 0; k < remainder; k++) {
    pct[byFrac[k % byFrac.length].idx] += 1;
  }
  return entries.map(([z], idx) => ({ z, pct: pct[idx] }));
}
