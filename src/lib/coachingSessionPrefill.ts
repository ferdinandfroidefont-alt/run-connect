/** Utilitaires pour préremplir le wizard « Créer une séance » depuis une coaching_session. */

export function datetimeLocalTomorrowMorning(hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function toDatetimeLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function inferSessionTypeFromCoachData(activityType: string, blocks: unknown[]): string {
  if (Array.isArray(blocks) && blocks.some((b: { type?: string }) => b?.type === 'interval')) {
    return 'fractionne';
  }
  if (['trail', 'velo', 'vtt', 'gravel'].includes(activityType)) {
    return 'sortie_longue';
  }
  return 'footing';
}
