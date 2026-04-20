export type SessionVisibilityTier = "free" | "boost" | "premium";
export type SessionVisibilityVisualState = "normal" | "boosted" | "premium";

export interface SessionVisibilityFields {
  scheduled_at: string;
  visibility_tier?: string | null;
  visibility_radius_km?: number | null;
  boost_expires_at?: string | null;
  discovery_score?: number | null;
}

export const FREE_VISIBILITY_RADIUS_KM = 5;
export const BOOST_VISIBILITY_RADIUS_KM = 25;
export const PREMIUM_VISIBILITY_RADIUS_KM = Number.POSITIVE_INFINITY;

export function coerceVisibilityTier(raw: string | null | undefined): SessionVisibilityTier {
  if (raw === "premium" || raw === "boost") return raw;
  return "free";
}

export function isBoostActive(session: SessionVisibilityFields, now = new Date()): boolean {
  const tier = coerceVisibilityTier(session.visibility_tier);
  if (tier !== "boost") return false;
  if (!session.boost_expires_at) return false;
  return new Date(session.boost_expires_at).getTime() > now.getTime();
}

export function getEffectiveVisibilityTier(
  session: SessionVisibilityFields,
  now = new Date(),
): SessionVisibilityTier {
  const tier = coerceVisibilityTier(session.visibility_tier);
  if (tier === "boost" && !isBoostActive(session, now)) return "free";
  return tier;
}

export function getEffectiveVisibilityRadiusKm(
  session: SessionVisibilityFields,
  now = new Date(),
): number {
  const tier = getEffectiveVisibilityTier(session, now);
  if (tier === "premium") return PREMIUM_VISIBILITY_RADIUS_KM;
  if (tier === "boost") return BOOST_VISIBILITY_RADIUS_KM;
  if (typeof session.visibility_radius_km === "number" && session.visibility_radius_km > 0) {
    return session.visibility_radius_km;
  }
  return FREE_VISIBILITY_RADIUS_KM;
}

export function canSessionBeDiscovered(
  session: SessionVisibilityFields,
  distanceKm: number,
  now = new Date(),
): boolean {
  const radius = getEffectiveVisibilityRadiusKm(session, now);
  if (!Number.isFinite(radius)) return true;
  return distanceKm <= radius;
}

export function getSessionVisualState(
  session: SessionVisibilityFields,
  now = new Date(),
): SessionVisibilityVisualState {
  const tier = getEffectiveVisibilityTier(session, now);
  if (tier === "boost") return "boosted";
  if (tier === "premium") return "premium";
  return "normal";
}

export function getSessionPriorityScore(
  session: SessionVisibilityFields,
  distanceKm: number,
  now = new Date(),
): number {
  const tier = getEffectiveVisibilityTier(session, now);
  const sessionTime = new Date(session.scheduled_at).getTime();
  const hoursUntil = Math.max(0, (sessionTime - now.getTime()) / 3_600_000);
  const freshnessScore = Math.max(0, 24 - hoursUntil);
  const proximityScore = Math.max(0, 50 - distanceKm);
  const storedScore = typeof session.discovery_score === "number" ? session.discovery_score : 0;
  const tierScore =
    tier === "boost" ? 1000 :
    tier === "premium" ? 300 :
    0;
  return tierScore + storedScore + freshnessScore + proximityScore;
}

export function sortSessionsByDiscovery<T extends SessionVisibilityFields & { distance_km: number }>(
  sessions: T[],
  now = new Date(),
): T[] {
  return [...sessions].sort((a, b) => {
    const scoreDelta =
      getSessionPriorityScore(b, b.distance_km, now) - getSessionPriorityScore(a, a.distance_km, now);
    if (scoreDelta !== 0) return scoreDelta;
    const distanceDelta = a.distance_km - b.distance_km;
    if (distanceDelta !== 0) return distanceDelta;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });
}

export function getVisibilityBadgeLabel(session: SessionVisibilityFields, now = new Date()): string | null {
  const state = getSessionVisualState(session, now);
  if (state === "boosted") return "Boost";
  if (state === "premium") return "Premium";
  return null;
}
