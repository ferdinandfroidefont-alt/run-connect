/** URL et clé anon : uniquement via variables d’environnement Vite (pas de valeurs en dur dans le code). */

export function requireSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing VITE_SUPABASE_URL. Copy .env.example to .env and set your Supabase project URL.");
  }
  return url.replace(/\/$/, "");
}

export function requireSupabaseAnonKey(): string {
  const key = (
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  if (!key) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY). Copy .env.example to .env and set the anon/publishable key from Supabase → Settings → API.",
    );
  }
  return key;
}

/** Hôte pour URLs Storage (object/public/…). */
export function supabaseStorageHost(): string {
  return new URL(requireSupabaseUrl()).host;
}
