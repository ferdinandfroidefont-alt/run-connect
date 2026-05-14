import type { DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";

export const ATHLETE_PLAN_SPORT_STROKE: Record<
  NonNullable<DaySessionSummary["sport"]>,
  string
> = {
  running: "#0a84ff",
  cycling: "#ff9500",
  swimming: "#5ac8fa",
  strength: "#af52de",
  rest: "rgba(60,60,67,0.3)",
};

export const ATHLETE_PLAN_SPORT_SHORT: Record<NonNullable<DaySessionSummary["sport"]>, string> = {
  running: "Course",
  cycling: "Vélo",
  swimming: "Natation",
  strength: "Renfo",
  rest: "Repos",
};

type GlyphSport = Exclude<DaySessionSummary["sport"], undefined>;

export function AthletePlanSportGlyph({
  sport,
  size = 14,
  stroke,
}: {
  sport: GlyphSport;
  size?: number;
  stroke?: string;
}) {
  const c = stroke ?? ATHLETE_PLAN_SPORT_STROKE[sport] ?? ATHLETE_PLAN_SPORT_STROKE.rest;
  const sw = 1.8;
  if (sport === "running") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="10" cy="3" r="1.4" stroke={c} strokeWidth={sw} />
        <path
          d="M5 14l2-4 2.5 2 1.5 3M3 9l2.5-3.5L8 6.5l1.5 2.5L13 9"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (sport === "cycling") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="3.5" cy="11" r="2.2" stroke={c} strokeWidth={sw} />
        <circle cx="12.5" cy="11" r="2.2" stroke={c} strokeWidth={sw} />
        <path d="M3.5 11l3-5h4l2 5M6.5 6h2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  if (sport === "swimming") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M1 11c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0M1 7.5c1.5-1 2.5-1 4 0s2.5 1 4 0 2.5-1 4 0"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
        />
        <circle cx="11" cy="4" r="1.3" stroke={c} strokeWidth={sw} />
      </svg>
    );
  }
  if (sport === "strength") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M2 8h12M3.5 5v6M5 4v8M11 4v8M12.5 5v6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11 9.5A4.5 4.5 0 016.5 5a4.5 4.5 0 014.4-4.5C8.7 1.6 7 4 7 6.7a5.3 5.3 0 005.3 5.3c1.6 0 3-.7 4-1.8a4.5 4.5 0 01-5.3-.7z"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
