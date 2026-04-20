import type { UserProfile } from "@/contexts/UserProfileContext";

/** Métadonnées locales — jamais persistées en base. */
export type PreviewRole = "athlete" | "coach" | "both";

export interface PreviewIdentity {
  preview_mode: true;
  is_test: true;
  created_by_admin: true;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  /** Ville affichée (cartes de partage, etc.) */
  city: string | null;
  /** Code pays ISO (ex. FR) — sélecteur profil */
  countryCode: string | null;
  favoriteSport: string | null;
  isPremium: boolean;
  role: PreviewRole;
  age: number | null;
  /** Stats factices (aperçu UI uniquement) */
  mockStats?: {
    reliability_rate?: number;
    total_sessions_joined?: number;
    total_sessions_completed?: number;
    sessions_created?: number;
  };
  followerCount?: number;
  followingCount?: number;
}

const PLACEHOLDER_AVATAR = "/placeholder.svg";

export function buildDisplayName(p: PreviewIdentity): string {
  const s = [p.firstName, p.lastName].filter((x) => x?.trim()).join(" ").trim();
  return s || p.username || "Membre";
}

/**
 * Fusionne l’identité de démo sur le profil réel chargé depuis la base.
 * Le `user_id` reste celui du compte authentifié (admin) — aucune écriture fictive en prod.
 */
export function mergePreviewIntoProfile(base: UserProfile, p: PreviewIdentity): UserProfile {
  const displayName = buildDisplayName(p);

  return {
    ...base,
    display_name: displayName,
    username: p.username || base.username,
    avatar_url: p.avatarUrl ?? base.avatar_url,
    bio: p.bio ?? base.bio,
    age: p.age ?? base.age,
    country: p.countryCode ?? base.country ?? null,
    favorite_sport: p.favoriteSport ?? base.favorite_sport ?? null,
    is_premium: p.isPremium,
    ...(p.city ? { city: p.city } : {}),
  } as UserProfile;
}

export function createEmptyPreviewIdentity(): PreviewIdentity {
  return {
    preview_mode: true,
    is_test: true,
    created_by_admin: true,
    firstName: "Alex",
    lastName: "Preview",
    username: "alex_preview",
    avatarUrl: PLACEHOLDER_AVATAR,
    bio: "Profil de démonstration — données locales.",
    city: "Lyon",
    countryCode: "FR",
    favoriteSport: "running",
    isPremium: false,
    role: "athlete",
    age: 28,
  };
}

export const PREVIEW_PRESETS: Record<string, Partial<PreviewIdentity> | (() => PreviewIdentity)> = {
  nouveau: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Sam",
    lastName: "Nouveau",
    username: "sam_nouveau",
    bio: "Je découvre RunConnect.",
    isPremium: false,
    role: "athlete",
    mockStats: { reliability_rate: 100, total_sessions_joined: 0, total_sessions_completed: 0, sessions_created: 0 },
    followerCount: 0,
    followingCount: 3,
  }),
  vide: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "",
    lastName: "",
    username: "profil_vide",
    avatarUrl: null,
    bio: "",
    city: null,
    countryCode: null,
    favoriteSport: null,
    age: null,
    mockStats: undefined,
    followerCount: 0,
    followingCount: 0,
  }),
  coureur: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Marie",
    lastName: "Durand",
    username: "marie_runs",
    bio: "Semi en préparation · sorties le week-end.",
    favoriteSport: "running",
    isPremium: false,
    role: "athlete",
    mockStats: {
      reliability_rate: 96,
      total_sessions_joined: 42,
      total_sessions_completed: 38,
      sessions_created: 5,
    },
    followerCount: 128,
    followingCount: 89,
  }),
  coach: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Thomas",
    lastName: "Coach",
    username: "thomas_coach",
    bio: "Coach running · plans personnalisés.",
    favoriteSport: "running",
    isPremium: true,
    role: "coach",
    mockStats: {
      reliability_rate: 99,
      total_sessions_joined: 12,
      total_sessions_completed: 12,
      sessions_created: 48,
    },
    followerCount: 560,
    followingCount: 120,
  }),
  athlete_coached: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Léa",
    lastName: "Club",
    username: "lea_athlete",
    bio: "Athlète suivie en club.",
    isPremium: false,
    role: "both",
    mockStats: {
      reliability_rate: 92,
      total_sessions_joined: 24,
      total_sessions_completed: 22,
      sessions_created: 0,
    },
    followerCount: 45,
    followingCount: 38,
  }),
  premium: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Premium",
    lastName: "Member",
    username: "premium_member",
    bio: "Compte Premium — aperçu interface.",
    isPremium: true,
    role: "athlete",
    mockStats: {
      reliability_rate: 98,
      total_sessions_joined: 80,
      total_sessions_completed: 76,
      sessions_created: 15,
    },
    followerCount: 210,
    followingCount: 140,
  }),
  nomLong: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Jean-Baptiste-Alexandre",
    lastName: "De La Fontaine-Montgomery",
    username: "jean_baptiste_very_long_username_test",
    bio: "Test de mise en page avec un nom très long.",
  }),
  bioLongue: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "Casey",
    lastName: "Writer",
    username: "casey_bio",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue.",
  }),
  sansPhoto: () => ({
    ...createEmptyPreviewIdentity(),
    firstName: "No",
    lastName: "Photo",
    username: "sans_avatar",
    avatarUrl: null,
    bio: "Profil sans photo de profil.",
  }),
};

export function applyPreset(presetKey: string): PreviewIdentity {
  const raw = PREVIEW_PRESETS[presetKey];
  if (!raw) return createEmptyPreviewIdentity();
  return typeof raw === "function" ? raw() : { ...createEmptyPreviewIdentity(), ...raw };
}
