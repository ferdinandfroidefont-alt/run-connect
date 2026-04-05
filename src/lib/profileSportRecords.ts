export const PROFILE_SPORT_RECORD_KEYS = [
  "running",
  "cycling",
  "swimming",
  "triathlon",
  "walking",
  "other",
] as const;

export type ProfileSportRecordKey = (typeof PROFILE_SPORT_RECORD_KEYS)[number];

export const PROFILE_SPORT_RECORD_LABELS: Record<ProfileSportRecordKey, string> = {
  running: "Course à pied",
  cycling: "Vélo",
  swimming: "Natation",
  triathlon: "Triathlon",
  walking: "Marche",
  other: "Autre",
};

export function isProfileSportRecordKey(v: string): v is ProfileSportRecordKey {
  return (PROFILE_SPORT_RECORD_KEYS as readonly string[]).includes(v);
}
