import { PROFILE_SPORT_LABELS, type ProfileSportKey } from '@/lib/profileSports';
import { getCountryLabel } from '@/lib/countryLabels';

export type ProfileShareTemplateId = 'light_card' | 'organizer_focus' | 'minimal_story';

export interface ProfileSharePayload {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  roleLabel: string;
  sportLabel: string;
  locationLine: string;
  clubLine: string | null;
  sessionsCreated: number;
  sessionsJoined: number;
  modelsCount: number;
  routesPublished: number;
  participationsReceived: number;
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

function sportLabelFromProfile(favoriteSport: string | null | undefined): string {
  if (!favoriteSport?.trim()) return 'Sport';
  const key = favoriteSport.trim() as ProfileSportKey;
  if (key in PROFILE_SPORT_LABELS) return PROFILE_SPORT_LABELS[key].label;
  return favoriteSport;
}

export function buildRoleLabel(input: {
  isAdmin: boolean;
  sessionsCreated: number;
  modelsCount: number;
}): string {
  if (input.isAdmin) return 'Administrateur';
  const parts: string[] = [];
  if (input.modelsCount > 0) parts.push('Coach');
  if (input.sessionsCreated > 0) parts.push('Organisateur');
  if (parts.length === 0) return 'Membre RunConnect';
  return [...new Set(parts)].join(' • ');
}

export function buildProfileSharePayloadFromData(input: {
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  favorite_sport: string | null;
  country: string | null;
  is_premium: boolean | null;
  is_admin: boolean | null;
  clubName: string | null;
  sessionsCreated: number;
  sessionsJoined: number;
  modelsCount: number;
  routesPublished: number;
  participationsReceived: number;
  presenceRate: number | null;
  publicUrl: string;
  qrDataUrl: string | null;
}): ProfileSharePayload {
  const displayName = input.display_name?.trim() || input.username;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || input.username.slice(0, 2).toUpperCase();

  const sportLabel = sportLabelFromProfile(input.favorite_sport);
  const locationLine = input.country
    ? getCountryLabel(input.country) ?? input.country
    : 'RunConnect';

  return {
    displayName,
    username: input.username,
    avatarUrl: input.avatar_url,
    initials,
    roleLabel: buildRoleLabel({
      isAdmin: !!input.is_admin,
      sessionsCreated: input.sessionsCreated,
      modelsCount: input.modelsCount,
    }),
    sportLabel,
    locationLine,
    clubLine: input.clubName,
    sessionsCreated: input.sessionsCreated,
    sessionsJoined: input.sessionsJoined,
    modelsCount: input.modelsCount,
    routesPublished: input.routesPublished,
    participationsReceived: input.participationsReceived,
    presenceRate: input.presenceRate,
    publicUrl: input.publicUrl,
    publicUrlDisplay: input.publicUrl.replace(/^https?:\/\//, ''),
    isPremium: !!input.is_premium,
    qrDataUrl: input.qrDataUrl,
  };
}
