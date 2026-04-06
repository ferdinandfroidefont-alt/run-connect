/** Poids total = 100 — utilisé pour le bandeau « profil complet ». */
const WEIGHTS = {
  avatar: 18,
  display_name: 14,
  bio: 20,
  country: 14,
  age: 8,
  favorite_sport: 12,
  cover: 14,
} as const;

export type ProfileCompletenessHint =
  | "avatar"
  | "display_name"
  | "bio"
  | "country"
  | "age"
  | "favorite_sport"
  | "cover";

export type ProfileCompletenessInput = {
  avatar_url?: string | null;
  display_name?: string | null;
  bio?: string | null;
  country?: string | null;
  age?: number | null;
  favorite_sport?: string | null;
  cover_image_url?: string | null;
};

export function getProfileCompleteness(profile: ProfileCompletenessInput | null): {
  percent: number;
  missingHints: ProfileCompletenessHint[];
} {
  if (!profile) {
    return { percent: 0, missingHints: ["avatar", "display_name", "bio"] };
  }

  let score = 0;
  const missing: ProfileCompletenessHint[] = [];

  const add = (hint: ProfileCompletenessHint, ok: boolean) => {
    const w = WEIGHTS[hint];
    if (ok) {
      score += w;
    } else {
      missing.push(hint);
    }
  };

  add("avatar", !!(profile.avatar_url && String(profile.avatar_url).trim()));
  add("display_name", !!(profile.display_name && profile.display_name.trim()));
  add("bio", !!(profile.bio && profile.bio.trim().length >= 8));
  add("country", !!(profile.country && profile.country.trim()));
  add("age", profile.age != null && profile.age > 0 && profile.age < 130);
  add("favorite_sport", !!(profile.favorite_sport && profile.favorite_sport.trim()));
  add("cover", !!(profile.cover_image_url && profile.cover_image_url.trim()));

  return {
    percent: Math.min(100, Math.round(score)),
    missingHints: missing,
  };
}
