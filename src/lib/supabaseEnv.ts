/** URL et clé anon : uniquement via variables d’environnement Vite (pas de valeurs en dur dans le code). */

export function requireSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing VITE_SUPABASE_URL. Copy .env.example to .env and set your Supabase project URL.");
  }
  return url.replace(/\/$/, "");
}

export function requireSupabaseAnonKey(): string {
  /**
   * Supabase expose désormais la clé publique sous le nom "publishable key".
   * On accepte les deux variantes pour rester compatible avec les anciens et nouveaux `.env`.
   */
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env and set the public Supabase key from Supabase -> Settings -> API.");
  }
  return key;
}

/** Hôte pour URLs Storage (object/public/…). */
export function supabaseStorageHost(): string {
  return new URL(requireSupabaseUrl()).host;
}
