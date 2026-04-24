import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sous-titre d’en-tête : nombre de séances **à venir** où l’utilisateur
 * est organisateur et/ou inscrit (session_participants).
 */
export function formatPlannedSessionsLine(count: number): string {
  if (count <= 0) return "Aucune séance à venir";
  if (count === 1) return "1 séance planifiée";
  return `${count} séances planifiées`;
}

export function usePlannedSessionCount(userId: string | undefined): number | null {
  const [state, setState] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setState(null);
      return;
    }
    setState(null);
    let ignore = false;

    (async () => {
      const nowIso = new Date().toISOString();
      const { data: orgRows, error: errOrg } = await supabase
        .from("sessions")
        .select("id")
        .eq("organizer_id", userId)
        .gte("scheduled_at", nowIso);
      if (ignore) return;
      if (errOrg) {
        setState(0);
        return;
      }
      const { data: pr, error: errPart } = await supabase
        .from("session_participants")
        .select("session_id")
        .eq("user_id", userId);
      if (ignore) return;
      if (errPart) {
        setState((orgRows ?? []).length);
        return;
      }
      const partIds = [...new Set((pr ?? []).map((r) => r.session_id))];
      if (partIds.length === 0) {
        setState((orgRows ?? []).length);
        return;
      }
      const { data: partSessions, error: errSess } = await supabase
        .from("sessions")
        .select("id")
        .in("id", partIds)
        .gte("scheduled_at", nowIso);
      if (ignore) return;
      if (errSess) {
        setState((orgRows ?? []).length);
        return;
      }
      const combined = new Set<string>();
      (orgRows ?? []).forEach((r) => combined.add(r.id));
      (partSessions ?? []).forEach((r) => combined.add(r.id));
      setState(combined.size);
    })();

    return () => {
      ignore = true;
    };
  }, [userId]);

  if (!userId) return null;
  return state;
}
