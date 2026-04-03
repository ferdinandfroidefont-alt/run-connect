/**
 * Auth helpers for Edge Functions — préférer ces helpers aux vérifications ad hoc.
 */
import type { SupabaseClient, User } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCronSecret } from "./cors.ts";

export type AuthSuccess = { user: User };

/**
 * Exige un JWT utilisateur valide (Authorization: Bearer …).
 * Utiliser avec un client créé via SUPABASE_SERVICE_ROLE_KEY pour valider le token.
 */
export async function requireUserJwt(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<AuthSuccess | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "No authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { user };
}

/** Cron / tâches planifiées : en-tête x-cron-secret doit égaler CRON_SECRET. */
export function requireCron(req: Request): boolean {
  return verifyCronSecret(req);
}
