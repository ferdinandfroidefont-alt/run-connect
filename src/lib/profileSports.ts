/** Clés alignées sur l’onboarding (ProfileSetupDialog) et le formulaire profil. */
export const PROFILE_SPORT_KEYS = [
  'running',
  'cycling',
  'swimming',
  'triathlon',
  'walking',
  'trail',
] as const;

export type ProfileSportKey = (typeof PROFILE_SPORT_KEYS)[number];

const KNOWN = new Set<string>(PROFILE_SPORT_KEYS);

/** Libellés FR pour l’affichage (cohérents avec la page profil). */
export const PROFILE_SPORT_LABELS: Record<ProfileSportKey, { emoji: string; label: string }> = {
  running: { emoji: '🏃', label: 'Course à pied' },
  cycling: { emoji: '🚴', label: 'Cyclisme' },
  swimming: { emoji: '🏊', label: 'Natation' },
  triathlon: { emoji: '🏅', label: 'Triathlon' },
  walking: { emoji: '🚶', label: 'Marche' },
  trail: { emoji: '🏔️', label: 'Trail' },
};

export function parseProfileSports(value: string | null | undefined): ProfileSportKey[] {
  if (!value?.trim()) return [];
  const parts = value.split(',').map((s) => s.trim());
  const out: ProfileSportKey[] = [];
  for (const p of parts) {
    if (KNOWN.has(p) && !out.includes(p as ProfileSportKey)) {
      out.push(p as ProfileSportKey);
    }
  }
  return out;
}

export function serializeProfileSports(keys: ProfileSportKey[]): string | null {
  const sorted = [...keys].sort();
  return sorted.length ? sorted.join(',') : null;
}
