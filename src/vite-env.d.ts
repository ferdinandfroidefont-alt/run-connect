/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du projet Supabase (obligatoire au runtime — voir supabaseEnv). */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé anon Supabase (obligatoire au runtime). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Email support affiché dans les pages légales (optionnel). */
  readonly VITE_PUBLIC_SUPPORT_EMAIL?: string;
  /** Raison sociale (mentions légales). */
  readonly VITE_PUBLIC_LEGAL_ENTITY_NAME?: string;
  /** Adresse siège : lignes séparées par `|` */
  readonly VITE_PUBLIC_LEGAL_ADDRESS?: string;
  readonly VITE_PUBLIC_LEGAL_SIRET?: string;
  readonly VITE_PUBLIC_LEGAL_RCS?: string;
  readonly VITE_PUBLIC_LEGAL_DIRECTOR?: string;
  /** Hébergeur (texte libre, peut contenir des retours ligne). */
  readonly VITE_PUBLIC_LEGAL_HOSTING?: string;
}
