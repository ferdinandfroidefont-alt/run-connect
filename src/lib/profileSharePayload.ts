import { PROFILE_SPORT_LABELS, type ProfileSportKey } from '@/lib/profileSports';
import { getCountryLabel } from '@/lib/countryLabels';

export type ProfileShareTemplateId = 'light_card' | 'organizer_focus' | 'minimal_story';

export interface ProfileSharePayload {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  /** Badge texte type pilule : Coach / Athlète / Coach • Nom du club */
  rolePillLabel: string;
  /** Libellé sport en français, sans emoji */
  sportLabel: string;
  /** Ex. « 🇫🇷 France » — jamais « FR France » */
  locationLine: string;
  sessionsCreated: number;
  sessionsJoined: number;
  followersCount: number;
  followingCount: number;
  presenceRate: number | null;
  publicUrl: string;
  publicUrlDisplay: string;
  isPremium: boolean;
  qrDataUrl: string | null;
}

export function templateDimensions(id: ProfileShareTemplateId): { w: number; h: number } {
  if (id === 'minimal_story') return { w: 1080, h: 1920 };
  return { w: 1080, h: 1080 };
}

/** Localisation pour le visuel de partage (drapeau + nom pays, cohérent FR). */
export function formatProfileShareLocation(country: string | null | undefined): string {
  if (!country?.trim()) return 'RunConnect';
  const code = country.trim().toUpperCase();
  return getCountryLabel(code) ?? country;
}

function sportLabelFromProfile(favoriteSport: string | null | undefined): string {
  if (!favoriteSport?.trim()) return 'Sport';
  const first = favoriteSport.split(',')[0].trim() as ProfileSportKey;
  if (first in PROFILE_SPORT_LABELS) return PROFILE_SPORT_LABELS[first as ProfileSportKey].label;
  return favoriteSport.split(',')[0].trim();
}

/**
 * Coach si modèles coaching ou séances coaching club ; sinon Athlète.
 * Avec club : « Coach • Nom » ou « Athlète • Nom » (jamais « Administrateur »).
 */
export function buildRolePillLabel(input: { isCoach: boolean; clubName: string | null }): string {
  const role = input.isCoach ? 'Coach' : 'Athlète';
  const club = input.clubName?.trim();
  if (club) return `${role} • ${club}`;
  return role;
}

export function buildProfileSharePayloadFromData(input: {
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  favorite_sport: string | null;
  country: string | null;
  is_premium: boolean | null;
  clubName: string | null;
  isCoach: boolean;
  sessionsCreated: number;
  sessionsJoined: number;
  followersCount: number;
  followingCount: number;
  presenceRate: number | null;
  publicUrl: string;
  qrDataUrl: string | null;
}): ProfileSharePayload {
  const displayName = input.display_name?.trim() || input.username;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || input.username.slice(0, 2).toUpperCase();

  const sportLabel = sportLabelFromProfile(input.favorite_sport);
  const locationLine = formatProfileShareLocation(input.country);

  return {
    displayName,
    username: input.username,
    avatarUrl: input.avatar_url,
    initials,
    rolePillLabel: buildRolePillLabel({ isCoach: input.isCoach, clubName: input.clubName }),
    sportLabel,
    locationLine,
    sessionsCreated: input.sessionsCreated,
    sessionsJoined: input.sessionsJoined,
    followersCount: input.followersCount,
    followingCount: input.followingCount,
    presenceRate: input.presenceRate,
    publicUrl: input.publicUrl,
    publicUrlDisplay: input.publicUrl.replace(/^https?:\/\//, ''),
    isPremium: !!input.is_premium,
    qrDataUrl: input.qrDataUrl,
  };
}
