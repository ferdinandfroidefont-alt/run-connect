import { PROFILE_SPORT_LABELS, type ProfileSportKey } from '@/lib/profileSports';
import { formatProfileShareLocationRow } from '@/lib/countryLabels';

export type ProfileShareTemplateId = 'light_card' | 'map_card';

export interface ProfileSharePayload {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  /** Ligne 1 du bloc rôle (ex. « Rôle (Coach) »). */
  roleLinePrimary: string;
  /** Ligne 2 optionnelle (ex. « Dans le club … »). */
  roleLineSecondary: string | null;
  /** Libellé sport en français, sans emoji */
  sportLabel: string;
  /** Texte ville/pays sans emoji. Le drapeau est rendu via countryCode. */
  locationLine: string;
  /** Code ISO du pays (ex: "fr") pour rendre le drapeau via image. */
  countryCode: string | null;
  /** URL Mapbox light en fond (1080×1080) ou null si pas de token */
  mapBackgroundUrl: string | null;
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

export function templateDimensions(_id: ProfileShareTemplateId): { w: number; h: number } {
  return { w: 1080, h: 1080 };
}

function sportLabelFromProfile(favoriteSport: string | null | undefined): string {
  if (!favoriteSport?.trim()) return 'Sport';
  const first = favoriteSport.split(',')[0].trim() as ProfileSportKey;
  if (first in PROFILE_SPORT_LABELS) return PROFILE_SPORT_LABELS[first as ProfileSportKey].label;
  return favoriteSport.split(',')[0].trim();
}

export function buildProfileSharePayloadFromData(input: {
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  favorite_sport: string | null;
  country: string | null;
  /** Ville optionnelle (si absente en base, rester null). */
  city: string | null;
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
  mapBackgroundUrl: string | null;
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
  const rawLocationLine = formatProfileShareLocationRow(input.city, input.country);
  // Retire le drapeau emoji (rendu séparément via <img>) et la virgule de fin éventuelle.
  const locationLine = rawLocationLine
    .replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, '')
    .replace(/,\s*$/, '')
    .trim() || 'RunConnect';
  const countryCode = input.country?.trim().toLowerCase() || null;
  const roleShort = input.isCoach ? 'Coach' : 'Athlète';
  const club = input.clubName?.trim();
  const roleLinePrimary = `Rôle (${roleShort})`;
  const roleLineSecondary = club ? `Dans le club ${club}` : null;

  return {
    displayName,
    username: input.username,
    avatarUrl: input.avatar_url,
    initials,
    roleLinePrimary,
    roleLineSecondary,
    sportLabel,
    locationLine,
    mapBackgroundUrl: input.mapBackgroundUrl,
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
