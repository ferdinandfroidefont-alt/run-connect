/** Fallback si `VITE_TURNSTILE_SITE_KEY` est absent (Vercel / `.env`). */
const TURNSTILE_SITE_KEY_DEFAULT = "0x4AAAAAADOc9f2wSxkwTCUl";

const fromEnv = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const TURNSTILE_SITE_KEY =
  typeof fromEnv === "string" && fromEnv.trim() ? fromEnv.trim() : TURNSTILE_SITE_KEY_DEFAULT;
