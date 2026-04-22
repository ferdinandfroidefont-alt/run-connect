import type { SessionFormData } from '@/components/session-creation/types';
import { parsePaceToSecondsPerKm, resolveSessionBlocks, resolveSessionTotals } from '@/lib/sessionBlockCalculations';

export type SessionLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface LevelConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
}

export const LEVEL_CONFIG: Record<SessionLevel, LevelConfig> = {
  1: { label: 'Débutant', color: '#22c55e', bgClass: 'bg-green-500', textClass: 'text-green-500' },
  2: { label: 'Loisir', color: '#16a34a', bgClass: 'bg-green-600', textClass: 'text-green-600' },
  3: { label: 'Intermédiaire', color: '#eab308', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' },
  4: { label: 'Avancé', color: '#f97316', bgClass: 'bg-orange-500', textClass: 'text-orange-500' },
  5: { label: 'Performance', color: '#ef4444', bgClass: 'bg-red-500', textClass: 'text-red-500' },
  6: { label: 'Élite', color: '#8b5cf6', bgClass: 'bg-violet-500', textClass: 'text-violet-500' },
};

export const ENDURANCE_SPORTS = ['course', 'trail', 'velo', 'vtt', 'gravel', 'natation', 'marche', 'randonnee'];

export function isEnduranceSport(activityType: string): boolean {
  return ENDURANCE_SPORTS.includes(activityType);
}

export function parsePaceToMinPerKm(pace: string): number | null {
  const sec = parsePaceToSecondsPerKm(pace);
  return sec ? sec / 60 : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreFromPace(secPerKm: number | null): number {
  if (!secPerKm) return 8;
  if (secPerKm <= 180) return 100;
  if (secPerKm <= 210) return 85;
  if (secPerKm <= 230) return 72;
  if (secPerKm <= 250) return 60;
  if (secPerKm <= 270) return 48;
  if (secPerKm <= 300) return 36;
  if (secPerKm <= 330) return 24;
  if (secPerKm <= 360) return 16;
  return 8;
}

function scoreFromVolume(durationMin: number, distanceKm: number): number {
  if (durationMin >= 140 || distanceKm >= 24) return 40;
  if (durationMin >= 110 || distanceKm >= 18) return 34;
  if (durationMin >= 85 || distanceKm >= 14) return 28;
  if (durationMin >= 60 || distanceKm >= 10) return 22;
  if (durationMin >= 40 || distanceKm >= 6) return 14;
  return 8;
}

function levelFromScore(score: number): SessionLevel {
  if (score >= 78) return 6;
  if (score >= 64) return 5;
  if (score >= 50) return 4;
  if (score >= 34) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function calculateSessionLevel(formData: Partial<SessionFormData>): SessionLevel | null {
  if (!formData.activity_type || !isEnduranceSport(formData.activity_type)) return null;

  const resolvedBlocks = resolveSessionBlocks(formData.blocks ?? []);
  const totals = resolveSessionTotals(resolvedBlocks);

  let bestPaceSec = parsePaceToSecondsPerKm(formData.pace_general || '');
  resolvedBlocks.forEach((block) => {
    const candidate = block.type === 'interval'
      ? parsePaceToSecondsPerKm(block.effortPace || '')
      : parsePaceToSecondsPerKm(block.pace || '');
    if (candidate && (!bestPaceSec || candidate < bestPaceSec)) bestPaceSec = candidate;
  });

  const paceScore = scoreFromPace(bestPaceSec);
  const volumeScore = scoreFromVolume(totals.durationMin ?? 0, totals.distanceKm ?? 0);
  const zoneBoost = totals.dominantZone === 'z6' ? 12 : totals.dominantZone === 'z5' ? 9 : totals.dominantZone === 'z4' ? 6 : totals.dominantZone === 'z3' ? 3 : 0;
  const weightedScore = clamp(Math.round(paceScore * 0.62 + volumeScore * 0.3 + zoneBoost), 0, 100);

  return levelFromScore(weightedScore);
}
