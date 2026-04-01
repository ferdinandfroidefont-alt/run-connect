import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, Clock, MapPin, Route, Timer, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { ActivityPolylineMap } from "@/components/sessions/ActivityPolylineMap";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

function formatDuration(totalSec: number | null) {
  if (totalSec == null || totalSec <= 0) return "—";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function formatPaceMinKm(minPerKm: number | null) {
  if (minPerKm == null || !Number.isFinite(minPerKm) || minPerKm <= 0) return "—";
  const m = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - m) * 60);
  return `${m}'${sec.toString().padStart(2, "0")}" /km`;
}

function formatDistanceKm(distanceM: number | null, fallbackKm: number | null) {
  if (distanceM != null && distanceM > 30) return `${(distanceM / 1000).toFixed(2)} km`;
  if (fallbackKm != null && fallbackKm > 0) return `${Number(fallbackKm).toFixed(2)} km`;
  if (distanceM != null && distanceM > 0) return `${(distanceM / 1000).toFixed(2)} km`;
  return "—";
}

export type CompletedActivityItem = {
  session: {
    id: string;
    title: string;
    scheduled_at: string;
    location_name: string;
    location_lat: number;
    location_lng: number;
    activity_type: string;
    distance_km?: number | null;
  };
  trackCoords: [number, number][];
  distanceM: number | null;
  durationSec: number | null;
  paceMinPerKm: number | null;
  speedKmh: number | null;
  role: "organizer" | "participant";
  organizer?: { username: string; avatar_url: string | null } | null;
};

type CompletedActivityCardProps = {
  item: CompletedActivityItem;
  index?: number;
  variant: "mine" | "public";
};

export function CompletedActivityCard({ item, index = 0, variant }: CompletedActivityCardProps) {
  const navigate = useNavigate();
  const { session, trackCoords, distanceM, durationSec, paceMinPerKm, speedKmh, role, organizer } = item;
  const scheduled = new Date(session.scheduled_at);
  const label = getActivityLabel(session.activity_type);
  const cycling = session.activity_type === "cycling" || session.activity_type === "mtb";

  const openMap = () => {
    const params = new URLSearchParams({
      lat: String(session.location_lat),
      lng: String(session.location_lng),
      zoom: "14",
      sessionId: session.id,
    });
    navigate(`/?${params.toString()}`);
  };

  return (
    <div
      className="ios-card ios-list-stack animate-fade-in overflow-hidden border border-border/60"
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3 border-b border-border/50 px-4 py-3">
        {variant === "public" && organizer ? (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={organizer.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="bg-secondary text-[14px] font-medium">
              {organizer.username?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
        ) : (
          <ActivityIcon activityType={session.activity_type} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-primary">{label}</span>
            {variant === "mine" && (
              <Badge variant={role === "organizer" ? "default" : "secondary"} className="text-[10px] font-semibold">
                {role === "organizer" ? "Organisée" : "Rejointe"}
              </Badge>
            )}
            {variant === "public" && organizer ? (
              <span className="truncate text-[13px] text-muted-foreground">@{organizer.username}</span>
            ) : null}
          </div>
          <h3 className="text-[17px] font-semibold leading-snug text-foreground">{session.title}</h3>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{session.location_name}</span>
          </span>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 rounded-[10px] px-3 py-2.5",
            "bg-secondary/80"
          )}
        >
          <Calendar className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[15px] text-foreground">{format(scheduled, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(scheduled, "HH:mm", { locale: fr })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-ios-md bg-card px-2 py-2 shadow-sm ring-1 ring-border/60">
            <div className="mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Route className="h-3.5 w-3.5" />
            </div>
            <p className="text-[15px] font-bold tabular-nums text-foreground">{formatDistanceKm(distanceM, session.distance_km)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Distance</p>
          </div>
          <div className="rounded-ios-md bg-card px-2 py-2 shadow-sm ring-1 ring-border/60">
            <div className="mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Timer className="h-3.5 w-3.5" />
            </div>
            <p className="text-[15px] font-bold tabular-nums text-foreground">{formatDuration(durationSec)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Durée</p>
          </div>
          <div className="rounded-ios-md bg-card px-2 py-2 shadow-sm ring-1 ring-border/60">
            <div className="mx-auto mb-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Gauge className="h-3.5 w-3.5" />
            </div>
            <p className="text-[15px] font-bold tabular-nums text-foreground">
              {cycling
                ? speedKmh != null && Number.isFinite(speedKmh)
                  ? `${speedKmh.toFixed(1)} km/h`
                  : "—"
                : formatPaceMinKm(paceMinPerKm)}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">{cycling ? "Moyenne" : "Rythme"}</p>
          </div>
        </div>

        <ActivityPolylineMap
          coords={trackCoords}
          fallbackLat={Number(session.location_lat)}
          fallbackLng={Number(session.location_lng)}
          onOpenFullMap={openMap}
        />
      </div>
    </div>
  );
}
