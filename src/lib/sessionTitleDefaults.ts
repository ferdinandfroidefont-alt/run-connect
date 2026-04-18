import { ACTIVITY_TYPES } from '@/components/session-creation/types';

/**
 * Titre affiché / persisté : conserve le titre saisi, sinon génère à partir du sport et du lieu.
 */
export function resolveSessionTitle(params: {
  title: string;
  activity_type: string;
  locationName: string;
}): string {
  const t = params.title?.trim();
  if (t) return t;

  const activity = ACTIVITY_TYPES.find((a) => a.value === params.activity_type);
  const locationShort = params.locationName.split(',')[0]?.trim() || '';
  const activityLabel = activity?.label?.replace(/^[^\s]+\s/, '');
  return `${activityLabel || 'Séance'}${locationShort ? ` à ${locationShort}` : ''}`;
}
