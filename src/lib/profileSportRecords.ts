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

export const SPORT_DISTANCES: Record<ProfileSportRecordKey, string[]> = {
  running: ["5 km", "10 km", "Semi-marathon", "Marathon", "100 m", "200 m", "400 m", "800 m", "1500 m", "3000 m", "5000 m", "10 000 m", "Trail court", "Trail long", "Ultra-trail"],
  cycling: ["Contre-la-montre", "Course en ligne", "50 km", "100 km", "150 km", "200 km", "Gravel", "VTT XC"],
  swimming: ["50 m", "100 m", "200 m", "400 m", "800 m", "1500 m", "Eau libre 5 km", "Eau libre 10 km"],
  triathlon: ["Sprint", "Olympique (M)", "Half Ironman (70.3)", "Ironman", "Super Sprint", "Swimrun"],
  walking: ["5 km", "10 km", "20 km", "50 km", "100 km"],
  other: [],
};

export function isProfileSportRecordKey(v: string): v is ProfileSportRecordKey {
  return (PROFILE_SPORT_RECORD_KEYS as readonly string[]).includes(v);
}
