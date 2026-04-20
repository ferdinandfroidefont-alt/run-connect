import { useEffect, useMemo, useState } from "react";
import { differenceInMinutes, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link2, MapPin, RefreshCw, Route, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { StravaPoweredBy, StravaConnectButton } from "@/components/strava/StravaBrand";
import { haversineMeters } from "@/lib/geo";
import { useStravaActivities, type StravaActivityItem } from "@/hooks/useStravaActivities";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getIosEmptyStateSpacing } from "@/lib/iosEmptyStateLayout";

type SessionRow = {
  id: string;
  title: string;
  scheduled_at: string;
  location_lat: number | null;
  location_lng: number | null;
};

const TIME_TOLERANCE_MIN = 50;
const DIST_MATCH_M = 900;

function formatDur(sec: number) {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function sportLabel(s: string) {
  const k = s.toLowerCase();
  if (k.includes("run")) return "Course";
  if (k.includes("ride") || k.includes("bike") || k.includes("velo")) return "Vélo";
  if (k.includes("walk") || k.includes("hike")) return "Marche";
  if (k.includes("swim")) return "Natation";
  return s;
}

type Enriched = StravaActivityItem & { match?: SessionRow };

export function StravaActivitiesPanel({
  userId,
  enabled,
  onConfirmSession,
}: {
  userId: string | undefined;
  enabled: boolean;
  onConfirmSession: (sessionId: string) => void;
}) {
  const navigate = useNavigate();
  const emptyStateSx = useMemo(() => getIosEmptyStateSpacing(), []);
  const { activities, loading, refetch, stravaConnected, upstreamError } = useStravaActivities(
    enabled && !!userId
  );
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (!userId || !enabled) return;
    (async () => {
      const nowIso = new Date().toISOString();
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

      const { data: created } = await supabase
        .from("sessions")
        .select("id, title, scheduled_at, location_lat, location_lng")
        .eq("organizer_id", userId)
        .gte("scheduled_at", since)
        .lte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: false });

      const { data: parts } = await supabase
        .from("session_participants")
        .select("session_id")
        .eq("user_id", userId);
      const ids = parts?.map((p) => p.session_id) || [];
      let joined: SessionRow[] = [];
      if (ids.length) {
        const { data: js } = await supabase
          .from("sessions")
          .select("id, title, scheduled_at, location_lat, location_lng")
          .in("id", ids)
          .neq("organizer_id", userId)
          .gte("scheduled_at", since)
          .lte("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: false });
        joined = (js || []) as SessionRow[];
      }
      const map = new Map<string, SessionRow>();
      [...(created || []), ...joined].forEach((s) => map.set(s.id, s as SessionRow));
      setSessions(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        )
      );
    })();
  }, [userId, enabled]);

  const enriched: Enriched[] = useMemo(() => {
    return activities.map((a) => {
      const start = new Date(a.startDate);
      let best: { session: SessionRow; score: number } | null = null;
      for (const s of sessions) {
        const sched = new Date(s.scheduled_at);
        const min = Math.abs(differenceInMinutes(start, sched));
        if (min > TIME_TOLERANCE_MIN) continue;
        let geoOk = true;
        if (a.startLat != null && a.startLng != null && s.location_lat != null && s.location_lng != null) {
          const d = haversineMeters(a.startLat, a.startLng, Number(s.location_lat), Number(s.location_lng));
          if (d > DIST_MATCH_M) geoOk = false;
        }
        if (!geoOk) continue;
        if (!best || min < best.score) best = { session: s, score: min };
      }
      return { ...a, match: best?.session };
    });
  }, [activities, sessions]);

  if (stravaConnected === false) {
    return (
      <div className={cn(emptyStateSx.shell, "px-ios-4")}>
        <div className={emptyStateSx.iconCircle}>
          <Route className="h-10 w-10 text-[#FC4C02]" />
        </div>
        <div className={emptyStateSx.textBlock}>
          <StravaPoweredBy variant="text" label="Compatible avec Strava" />
          <p className="text-ios-subheadline text-muted-foreground max-w-sm leading-relaxed">
            Connecte Strava pour afficher tes sorties ici, au fil de ce qui apparait sur Strava, et
            reperer les seances RunConnect a confirmer (meme creneau et lieu proche du RDV).
          </p>
        </div>
        <div className="w-full max-w-xs">
          <StravaConnectButton onClick={() => navigate("/profile?tab=settings&focus=strava")} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-ios-4 pb-ios-6">
      <div className="mb-ios-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">
            Activites Strava recentes
          </p>
          <StravaPoweredBy variant="logo" />
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={loading}
          className="ios-card flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[13px] font-semibold text-primary active:opacity-80 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {upstreamError === "token_expired" && (
        <div className="mb-ios-3 rounded-ios-md border border-amber-500/40 bg-amber-500/10 px-ios-3 py-ios-2 text-[13px] text-foreground">
          Ta session Strava a expiré. Reconnecte Strava depuis les paramètres.
        </div>
      )}

      {loading && enriched.length === 0 ? (
        <div className="space-y-ios-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-card animate-pulse border border-border/60 p-ios-4">
              <div className="h-4 w-2/3 rounded bg-secondary" />
              <div className="mt-2 h-3 w-1/2 rounded bg-secondary" />
            </div>
          ))}
        </div>
      ) : enriched.length === 0 ? (
        <div className={emptyStateSx.shell}>
          <div className={emptyStateSx.iconCircle}>
            <Timer className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className={emptyStateSx.textBlock}>
            <h3 className="text-ios-title3 font-semibold text-foreground">Aucune activité</h3>
            <p className="text-ios-subheadline text-muted-foreground max-w-sm leading-relaxed">
              Aucune sortie Strava dans la période — ou l&apos;API n&apos;a pas renvoyé de données.
              Touche « Actualiser » après ton prochain enregistrement Strava.
            </p>
          </div>
        </div>
      ) : (
        <div className="ios-list-stack">
          {enriched.map((a, index) => (
            <div
              key={`${a.id}-${index}`}
              className="ios-card overflow-hidden border border-border/60"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="border-b border-border/50 px-ios-4 py-ios-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
                  {sportLabel(a.sportType)}
                </p>
                <h3 className="mt-1 text-[17px] font-semibold leading-snug text-foreground">{a.name}</h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {format(new Date(a.startDate), "EEE d MMM yyyy · HH:mm", { locale: fr })}
                </p>
              </div>
              <div className="flex flex-wrap gap-ios-3 px-ios-4 py-ios-3 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Route className="h-3.5 w-3.5 shrink-0" />
                  {(a.distanceM / 1000).toFixed(2)} km
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 shrink-0" />
                  {formatDur(a.movingTimeSec)}
                </span>
              </div>
              {a.match ? (
                <div className="space-y-ios-2 border-t border-border/50 bg-primary/[0.06] px-ios-4 py-ios-3">
                  <div className="flex items-start gap-2">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground">Séance RunConnect proche</p>
                      <p className="truncate text-[14px] text-foreground">{a.match.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {format(new Date(a.match.scheduled_at), "d MMM · HH:mm", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full rounded-[12px]" onClick={() => onConfirmSession(a.match!.id)}>
                    Confirmer la présence
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
