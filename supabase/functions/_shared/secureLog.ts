/**
 * Journalisation Edge Functions — limiter PII, secrets et détails exploitables dans les agrégats (Datadog, Supabase logs).
 */

const SENSITIVE_KEY = /email|token|secret|password|phone|authorization|bearer|apikey|api_key|refresh_token|access_token|idtoken|push_token|private_key|client_secret|donor/i;

/** Référence opaque utilisateur (UUID) pour corrélation sans exposer l’identifiant complet. */
export function logUserRef(id: string | undefined | null): string {
  if (!id || typeof id !== "string") return "—";
  const s = id.trim();
  if (s.length < 8) return "—";
  return `${s.slice(0, 8)}…`;
}

/** Identifiants Stripe (cus_*, sub_*, price_*) : préfixe + longueur uniquement. */
export function logStripeRef(id: string | undefined | null): string {
  if (!id || typeof id !== "string") return "—";
  const s = id.trim();
  if (s.length < 6) return "—";
  return `${s.slice(0, 10)}…(len=${s.length})`;
}

function sanitizeScalar(v: unknown): string | number | boolean {
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "string") return v.length > 100 ? `${v.slice(0, 100)}…` : v;
  if (v === null || v === undefined) return String(v);
  return "[non-scalar]";
}

/** Objet plat : clés sensibles masquées, user_id tronqué. */
export function sanitizeLogRecord(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = typeof v === "string" && v.length ? `[redacted len=${v.length}]` : "[redacted]";
      continue;
    }
    if (k === "userId" || k === "user_id") {
      out[k] = typeof v === "string" ? logUserRef(v) : sanitizeScalar(v) as string | number | boolean;
      continue;
    }
    if (k === "customerId" || k === "subscriptionId" || k === "sessionId" || k === "priceId") {
      out[k] = typeof v === "string" ? logStripeRef(v) : sanitizeScalar(v) as string | number | boolean;
      continue;
    }
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    } else {
      out[k] = "[omitted]";
    }
  }
  return out;
}

/** Parcours limité en profondeur (métadonnées Stripe, etc.). */
export function deepSanitize(val: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]";
  if (val === null || val === undefined) return val;
  if (typeof val === "string") return val.length > 80 ? `${val.slice(0, 80)}…` : val;
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (Array.isArray(val)) return val.slice(0, 8).map((x) => deepSanitize(x, depth + 1));

  if (typeof val === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        o[k] = "[redacted]";
      } else if (k === "user_id" || k === "userId") {
        o[k] = typeof v === "string" ? logUserRef(v) : deepSanitize(v, depth + 1);
      } else if (k === "url" && typeof v === "string" && v.length > 20) {
        o[k] = `[url len=${v.length}]`;
      } else {
        o[k] = deepSanitize(v, depth + 1);
      }
    }
    return o;
  }
  return String(val);
}

export function logStructured(tag: string, message: string, details?: unknown): void {
  if (details === undefined) console.log(`[${tag}] ${message}`);
  else console.log(`[${tag}] ${message} ${JSON.stringify(deepSanitize(details))}`);
}

export function logStructuredError(tag: string, message: string, details?: unknown): void {
  if (details === undefined) console.error(`[${tag}] ${message}`);
  else console.error(`[${tag}] ${message} ${JSON.stringify(deepSanitize(details))}`);
}

/** Erreur HTTP amont : jamais logger le corps brut (peut contenir secrets). */
export function logHttpUpstream(tag: string, status: number, context?: string): void {
  console.error(`[${tag}] upstream status=${status}${context ? ` ${context}` : ""}`);
}

/** Erreur Postgres / Supabase : code stable uniquement. */
export function logDbError(tag: string, err: { code?: string } | null | undefined): void {
  console.error(`[${tag}] db code=${err?.code ?? "unknown"}`);
}

/** Exception : pas de stack ni message brut dans les logs par défaut. */
export function logException(tag: string, err: unknown): void {
  const name = err instanceof Error ? err.name : "non-Error";
  console.error(`[${tag}] exception type=${name}`);
}

/** Corps JSON erreur FCM / OAuth Google — pas de dump complet. */
export function summarizeGoogleApiError(body: unknown): string {
  if (!body || typeof body !== "object") return "none";
  const b = body as {
    error?: string;
    error_description?: string;
    message?: string;
  };
  const parts = [b.error, b.error_description, b.message].filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  return parts.join("|").slice(0, 120) || "error_response";
}

export function summarizeFcmErrorBody(body: unknown): string {
  if (!body || typeof body !== "object") return "none";
  const b = body as { error?: { status?: string; message?: string; code?: number } };
  const st = b.error?.status;
  const msg = b.error?.message;
  const bits = [
    typeof st === "string" ? st : "",
    typeof msg === "string" ? msg.slice(0, 80) : "",
  ].filter(Boolean);
  return bits.join("|").slice(0, 120) || "fcm_error";
}

/** Origine CORS refusée : éviter URLs complètes arbitraires en prod. */
export function logBlockedOrigin(origin: string): void {
  const len = origin.length;
  const prefix = origin.slice(0, 24);
  console.warn(`[CORS] blocked origin len=${len} prefix=${prefix}${len > 24 ? "…" : ""}`);
}
