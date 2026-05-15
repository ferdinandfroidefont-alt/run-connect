/**
 * Styles partagés — recherche Messages / maquette RunConnect (18).jsx
 * (cartes résultats profils · clubs · Strava)
 */

import type { CSSProperties } from "react";

export const MESSAGE_SEARCH_MAQUETTE_BLUE = "#007AFF";

const AVATAR_GRADIENT_PALETTE = [
  "linear-gradient(135deg, #FF9500, #FF3B30)",
  "linear-gradient(135deg, #AF52DE, #5856D6)",
  "linear-gradient(135deg, #FF2D55, #FF9500)",
  "linear-gradient(135deg, #FFCC00, #FF9500)",
  "linear-gradient(135deg, #5856D6, #AF52DE)",
  "linear-gradient(135deg, #34C759, #30D158)",
  "linear-gradient(135deg, #FF3B30, #FF2D55)",
  "linear-gradient(135deg, #00C7BE, #5AC8FA)",
];

/** Dégradé d’avatar pour une initiale (même logique que la maquette). */
export function gradientForSearchLetter(letter: string | undefined): string {
  const normalized = (letter || "?").trim();
  const code = normalized ? normalized.toUpperCase().charCodeAt(0) : 63;
  return AVATAR_GRADIENT_PALETTE[code % AVATAR_GRADIENT_PALETTE.length];
}

export const messageSearchResultCardStyle: CSSProperties = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
};
