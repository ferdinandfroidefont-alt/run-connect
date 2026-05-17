/** Règles affichées sur la page Parrainage (maquette RunConnect). */
export const REFERRAL_REFERRER_DAYS_PER_FRIEND = 1;
export const REFERRAL_REFERRED_DAYS = 7;

export type ReferralTier = {
  count: number;
  reward: string;
  color: string;
  bonusDays: number;
  lifetime?: boolean;
};

export const REFERRAL_TIERS: ReferralTier[] = [
  { count: 1, reward: "1 jour Premium", color: "#34C759", bonusDays: 0 },
  { count: 3, reward: "1 semaine Premium", color: "#5AC8FA", bonusDays: 7 },
  { count: 10, reward: "1 mois Premium", color: "#5856D6", bonusDays: 30 },
  { count: 25, reward: "1 an Premium", color: "#AF52DE", bonusDays: 365 },
  { count: 50, reward: "Premium à vie 🏆", color: "#FFCC00", bonusDays: 0, lifetime: true },
];

export function getNextReferralTier(invitedCount: number): ReferralTier {
  return REFERRAL_TIERS.find((t) => t.count > invitedCount) ?? REFERRAL_TIERS[REFERRAL_TIERS.length - 1]!;
}

export function computePremiumDaysEarned(invitedCount: number): number {
  let days = invitedCount * REFERRAL_REFERRER_DAYS_PER_FRIEND;
  for (const tier of REFERRAL_TIERS) {
    if (tier.lifetime) continue;
    if (invitedCount >= tier.count && tier.bonusDays > 0) {
      days += tier.bonusDays;
    }
  }
  return days;
}

export function buildReferralShareMessage(code: string): string {
  return `Rejoins-moi sur RunConnect avec mon code ${code} : tu gagnes 1 semaine de Premium offerte à l'inscription !`;
}

export function buildReferralAuthLink(code: string): string {
  const origin = (import.meta.env.VITE_PUBLIC_APP_ORIGIN || "https://runconnect.app").replace(/\/+$/, "");
  return `${origin}/auth?ref=${encodeURIComponent(code)}`;
}
