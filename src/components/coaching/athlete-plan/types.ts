import type { SportType } from "./sportTokens";
import type { SessionBlockLite } from "./sessionBlockTypes";

export type AthleteSessionUiStatus =
  | "planned"
  | "confirmed"
  | "done"
  | "missed"
  | "conflict";

export type AthletePlanSessionModel = {
  id: string;
  title: string;
  sport: SportType;
  assignedDate: string;
  blocks: SessionBlockLite[];
  coachId: string;
  coachName: string;
  coachAvatarUrl: string | null;
  clubId: string;
  clubName: string;
  participationId: string | null;
  participationStatus: string | null;
  athleteNote: string | null;
  distanceKm: number | null;
  objective: string | null;
  coachNotes: string | null;
  locationName: string | null;
  description: string | null;
  hasConflict: boolean;
};

export type AthleteCoachBrief = {
  id: string;
  name: string;
  sport: string;
  avatarUrl: string | null;
  clubName: string | null;
};

export type AthleteWeekSummary = {
  plannedKm: number;
  completedKm: number;
  plannedSessions: number;
  confirmedSessions: number;
  activeCoaches: number;
  trendLabel: string;
  trendTone: "up" | "down" | "neutral" | "busy" | "light";
  bySport: Array<{ sport: SportType; label: string; volumeText: string }>;
};
