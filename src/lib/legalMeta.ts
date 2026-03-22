/**
 * Métadonnées légales affichées dans l’app (CGU, confidentialité).
 * À faire valider par un juriste avant mise sur les stores.
 *
 * Email support : préférer `VITE_PUBLIC_SUPPORT_EMAIL` dans `.env` (pas de secret).
 */
export const LEGAL_LAST_UPDATED_LABEL = "mars 2026";

export function getSupportEmail(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL as string | undefined;
  return (fromEnv && fromEnv.trim()) || "ferdinand.froidefont@gmail.com";
}

export function getSupportMailtoHref(): string {
  return `mailto:${getSupportEmail()}`;
}

/** Raison sociale affichée dans les mentions légales. */
export function getLegalEntityName(): string {
  const v = (import.meta.env.VITE_PUBLIC_LEGAL_ENTITY_NAME as string | undefined)?.trim();
  return v || "RunConnect SAS";
}

/**
 * Adresse du siège : dans `.env`, lignes séparées par `|`
 * ex. `12 rue Exemple|75001 Paris|France`
 */
export function getLegalAddressLines(): string[] {
  const raw = (import.meta.env.VITE_PUBLIC_LEGAL_ADDRESS as string | undefined)?.trim();
  if (!raw) return [];
  return raw.split("|").map((s) => s.trim()).filter(Boolean);
}

export function getLegalSiretOrSiren(): string | null {
  const v = (import.meta.env.VITE_PUBLIC_LEGAL_SIRET as string | undefined)?.trim();
  return v || null;
}

export function getLegalRcs(): string | null {
  const v = (import.meta.env.VITE_PUBLIC_LEGAL_RCS as string | undefined)?.trim();
  return v || null;
}

/** Directeur de la publication (nom ou dénomination). */
export function getLegalPublicationDirector(): string | null {
  const v = (import.meta.env.VITE_PUBLIC_LEGAL_DIRECTOR as string | undefined)?.trim();
  return v || null;
}

/** Hébergeur du site / API (texte libre). */
export function getLegalHostingNotice(): string | null {
  const v = (import.meta.env.VITE_PUBLIC_LEGAL_HOSTING as string | undefined)?.trim();
  return v || null;
}
