import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MiniMapPreview } from "@/components/feed/MiniMapPreview";
import { firstMapPointFromRouteCoordinates, pickSessionCoordinate } from "@/lib/geoUtils";

const ACTION_BLUE = "#007AFF";
const IOS_BG = "#F2F2F7";
const IOS_LABEL_GRAY = "#8E8E93";
const IOS_TITLE = "#0A0F1F";
const IOS_BORDER = "#E5E5EA";

/** Plein écran — pas de `transform` sur sm (sinon Mapbox ne peint pas les tuiles). */
const RELIABILITY_CONTENT_LAYOUT =
  "!z-[200] flex max-h-[100dvh] min-h-0 w-full flex-col gap-0 overflow-hidden border-0 bg-[#F2F2F7] p-0 shadow-none sm:!z-[200]";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

const PARIS_FALLBACK = { lat: 48.8566, lng: 2.3522 };

function dayStartMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatSessionWhen(scheduledAt: string): string {
  const d = new Date(scheduledAt);
  const now = new Date();
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.round((dayStartMs(now) - dayStartMs(d)) / 86400000);
  if (diffDays === 0) return `Aujourd'hui · ${time}`;
  if (diffDays === 1) return `Hier · ${time}`;
  const datePart = d
    .toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })
    .replace(/\.$/, "");
  return `${datePart} · ${time}`;
}

function initialsFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  return t.slice(0, 2).toUpperCase();
}

function participationHonorée(
  organizerId: string,
  profileUserId: string | undefined,
  validation_status: string | null,
  confirmed_by_creator: boolean | null,
  confirmed_by_gps: boolean | null,
): boolean {
  if (!profileUserId) return false;
  if (organizerId === profileUserId) return true;
  return (
    validation_status === "validated" ||
    confirmed_by_gps === true ||
    confirmed_by_creator === true
  );
}

interface SessionMini {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  organizer_id: string;
  location_lat: number | null;
  location_lng: number | null;
  route_id: string | null;
  activity_type: string | null;
}

interface HistoryCardModel {
  sessionId: string;
  title: string;
  scheduledAt: string;
  timeLine: string;
  organizerId: string;
  organizerLabel: string;
  organizerInitials: string;
  organizerAvatarUrl: string | null;
  locationLat: number;
  locationLng: number;
  activityType: string | null;
  presenceBadge: string;
}

interface ReliabilityDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Conservé pour compatibilité des appelants */
  userName?: string;
  reliabilityRate: number;
  totalSessionsCreated: number;
  totalSessionsJoined: number;
  totalSessionsCompleted: number;
  /** Absences persistées (user_stats) ; sinon repli joint − completed */
  totalSessionsAbsent?: number | null;
  /** Utilisateur dont on affiche la fiabilité (historique + à venir) */
  reliabilitySubjectUserId?: string | null;
}

export const ReliabilityDetailsDialog = ({
  open,
  onOpenChange,
  reliabilityRate,
  totalSessionsJoined,
  totalSessionsCompleted,
  totalSessionsAbsent = null,
  reliabilitySubjectUserId = null,
}: ReliabilityDetailsDialogProps) => {
  const { user } = useAuth();
  const viewingSelf =
    reliabilitySubjectUserId != null &&
    user?.id != null &&
    reliabilitySubjectUserId === user.id;

  const rate = Math.min(100, Math.max(0, Number(reliabilityRate) || 0));
  const missedStat = useMemo(() => {
    if (totalSessionsAbsent != null && !Number.isNaN(Number(totalSessionsAbsent))) {
      return Math.max(0, Number(totalSessionsAbsent));
    }
    return Math.max(0, totalSessionsJoined - totalSessionsCompleted);
  }, [totalSessionsAbsent, totalSessionsJoined, totalSessionsCompleted]);

  const pastSessionsBasis = Math.max(0, totalSessionsCompleted + missedStat);

  const rateColor =
    rate >= 80 ? "#34C759" : rate >= 50 ? "#FF9500" : "#FF3B30";

  const [upcomingCount, setUpcomingCount] = useState(0);
  const [historyCards, setHistoryCards] = useState<HistoryCardModel[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  /** Après ouverture du dialog + layout stable (Mapbox refuse transform / taille 0). */
  const [mapsMountReady, setMapsMountReady] = useState(false);

  useEffect(() => {
    if (!open || historyLoading) {
      setMapsMountReady(false);
      return;
    }
    let cancelled = false;
    const arm = () => {
      if (!cancelled) setMapsMountReady(true);
    };
    const t = window.setTimeout(arm, 150);
    requestAnimationFrame(() => requestAnimationFrame(arm));
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      setMapsMountReady(false);
    };
  }, [open, historyLoading, historyCards.length]);

  useEffect(() => {
    if (!open || !reliabilitySubjectUserId) {
      setUpcomingCount(0);
      setHistoryCards([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setHistoryLoading(true);
      try {
        const now = Date.now();

        const [{ data: participationData, error: partError }, { data: organizedData, error: orgError }] =
          await Promise.all([
            supabase
              .from("session_participants")
              .select(
                "validation_status, confirmed_by_creator, confirmed_by_gps, sessions(id, title, scheduled_at, location_name, organizer_id, location_lat, location_lng, route_id, activity_type)",
              )
              .eq("user_id", reliabilitySubjectUserId)
              .order("joined_at", { ascending: false })
              .limit(500),
            supabase
              .from("sessions")
              .select(
                "id, title, scheduled_at, location_name, organizer_id, location_lat, location_lng, route_id, activity_type",
              )
              .eq("organizer_id", reliabilitySubjectUserId)
              .order("scheduled_at", { ascending: false })
              .limit(500),
          ]);

        if (cancelled) return;
        if (partError && orgError) {
          setUpcomingCount(0);
          setHistoryCards([]);
          return;
        }

        type ParticipationRow = {
          validation_status: string | null;
          confirmed_by_creator: boolean | null;
          confirmed_by_gps: boolean | null;
          sessions: SessionMini | SessionMini[] | null;
        };

        type NormalizedRow = {
          session: SessionMini;
          validation_status: string | null;
          confirmed_by_creator: boolean | null;
          confirmed_by_gps: boolean | null;
        };

        const bySessionId = new Map<string, NormalizedRow>();

        for (const raw of (participationData || []) as ParticipationRow[]) {
          const s = raw.sessions;
          const session = Array.isArray(s) ? s[0] : s;
          if (!session?.id) continue;
          bySessionId.set(session.id, {
            session,
            validation_status: raw.validation_status,
            confirmed_by_creator: raw.confirmed_by_creator,
            confirmed_by_gps: raw.confirmed_by_gps,
          });
        }

        for (const session of (organizedData || []) as SessionMini[]) {
          if (!session?.id || bySessionId.has(session.id)) continue;
          bySessionId.set(session.id, {
            session,
            validation_status: null,
            confirmed_by_creator: null,
            confirmed_by_gps: null,
          });
        }

        const normalized = [...bySessionId.values()];

        let upcoming = 0;
        const pastRows: NormalizedRow[] = [];
        for (const r of normalized) {
          const t = new Date(r.session.scheduled_at).getTime();
          if (t > now) upcoming++;
          else pastRows.push(r);
        }

        const organizerIds = [...new Set(pastRows.map((r) => r.session.organizer_id))];
        let profileByUserId = new Map<
          string,
          { username: string | null; display_name: string | null; avatar_url: string | null }
        >();
        if (organizerIds.length > 0) {
          const { data: profRows } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .in("user_id", organizerIds);
          if (!cancelled && profRows) {
            profileByUserId = new Map(
              profRows.map((p) => [
                p.user_id as string,
                {
                  username: p.username ?? null,
                  display_name: p.display_name ?? null,
                  avatar_url: p.avatar_url ?? null,
                },
              ]),
            );
          }
        }

        const routeIds = [
          ...new Set(pastRows.map((r) => r.session.route_id).filter(Boolean)),
        ] as string[];
        const routeAnchorById = new Map<string, { lat: number; lng: number }>();
        if (routeIds.length > 0) {
          const { data: routes } = await supabase.from("routes").select("id, coordinates").in("id", routeIds);
          if (!cancelled) {
            for (const route of routes || []) {
              const pt = firstMapPointFromRouteCoordinates(route.coordinates);
              if (pt) routeAnchorById.set(route.id, pt);
            }
          }
        }

        if (cancelled) return;

        const cards: HistoryCardModel[] = pastRows.map((r) => {
          const s = r.session;
          const honorée = participationHonorée(
            s.organizer_id,
            reliabilitySubjectUserId,
            r.validation_status,
            r.confirmed_by_creator,
            r.confirmed_by_gps,
          );
          const prof = profileByUserId.get(s.organizer_id);
          const label =
            (prof?.display_name && prof.display_name.trim()) ||
            (prof?.username && prof.username.trim()) ||
            "Organisateur";
          const anchor = s.route_id ? routeAnchorById.get(s.route_id) : undefined;
          return {
            sessionId: s.id,
            title: s.title || "Séance",
            scheduledAt: s.scheduled_at,
            timeLine: formatSessionWhen(s.scheduled_at),
            organizerId: s.organizer_id,
            organizerLabel: label,
            organizerInitials: initialsFromName(label),
            organizerAvatarUrl: prof?.avatar_url ?? null,
            locationLat: pickSessionCoordinate(s.location_lat, anchor?.lat ?? PARIS_FALLBACK.lat),
            locationLng: pickSessionCoordinate(s.location_lng, anchor?.lng ?? PARIS_FALLBACK.lng),
            activityType: s.activity_type,
            presenceBadge: honorée ? "✓ Présent" : "✗ Absent",
          };
        });

        cards.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

        setUpcomingCount(upcoming);
        setHistoryCards(cards);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, reliabilitySubjectUserId]);

  const subtitlePast =
    pastSessionsBasis === 0
      ? viewingSelf
        ? "Rejoins des séances pour suivre ton indicateur."
        : "Aucune séance terminée prise en compte pour l’instant."
      : viewingSelf
        ? `Basé sur tes ${pastSessionsBasis} dernière${pastSessionsBasis > 1 ? "s" : ""} séance${pastSessionsBasis > 1 ? "s" : ""} programmée${pastSessionsBasis > 1 ? "s" : ""}`
        : `Basé sur ses ${pastSessionsBasis} dernière${pastSessionsBasis > 1 ? "s" : ""} séance${pastSessionsBasis > 1 ? "s" : ""} programmée${pastSessionsBasis > 1 ? "s" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        fullScreen
        noZoom
        stackNested
        overlayClassName="z-[199]"
        className={cn(RELIABILITY_CONTENT_LAYOUT, "text-[15px] antialiased")}
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
      >
        <div
          className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]"
          style={{ background: "#FFFFFF", borderBottom: `1px solid ${IOS_BORDER}` }}
        >
          <div className="h-9 w-9 shrink-0" aria-hidden />
          <h1
            className="min-w-0 flex-1 text-center"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: IOS_TITLE,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Fiabilité
          </h1>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:bg-black/[0.04]"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" color={IOS_LABEL_GRAY} strokeWidth={2.4} />
          </button>
        </div>

        <div
          className="ios-scroll-region min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-5 pb-[max(24px,env(safe-area-inset-bottom,0px))] pt-5"
          style={{ background: IOS_BG }}
        >
          {/* Carte principale taux */}
          <div
            className="p-5 text-center"
            style={{
              background: "#FFFFFF",
              borderRadius: 18,
              boxShadow: CARD_SHADOW,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: IOS_LABEL_GRAY,
                letterSpacing: "0.12em",
                margin: 0,
              }}
            >
              TAUX DE FIABILITÉ
            </p>
            <p
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: rateColor,
                letterSpacing: "-0.04em",
                margin: 0,
                marginTop: 8,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              {Math.round(rate)}%
            </p>
            <p style={{ fontSize: 14, color: IOS_LABEL_GRAY, marginTop: 8, marginBottom: 0, lineHeight: 1.4 }}>
              {subtitlePast}
            </p>
          </div>

          {/* Mini-stats */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div
              className="px-2 py-3.5 text-center"
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                boxShadow: CARD_SHADOW,
              }}
            >
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#34C759",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {totalSessionsCompleted}
              </p>
              <p style={{ fontSize: 12, color: IOS_LABEL_GRAY, marginTop: 6, marginBottom: 0, fontWeight: 600 }}>
                Honorées
              </p>
            </div>
            <div
              className="px-2 py-3.5 text-center"
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                boxShadow: CARD_SHADOW,
              }}
            >
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#FF3B30",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {missedStat}
              </p>
              <p style={{ fontSize: 12, color: IOS_LABEL_GRAY, marginTop: 6, marginBottom: 0, fontWeight: 600 }}>
                Manquées
              </p>
            </div>
            <div
              className="px-2 py-3.5 text-center"
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                boxShadow: CARD_SHADOW,
              }}
            >
              <p
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: ACTION_BLUE,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                {upcomingCount}
              </p>
              <p style={{ fontSize: 12, color: IOS_LABEL_GRAY, marginTop: 6, marginBottom: 0, fontWeight: 600 }}>
                À venir
              </p>
            </div>
          </div>

          {/* Historique */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: IOS_LABEL_GRAY,
              letterSpacing: "0.12em",
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            HISTORIQUE
          </p>

          {historyLoading ? (
            <p className="py-10 text-center" style={{ fontSize: 15, color: IOS_LABEL_GRAY }}>
              Chargement…
            </p>
          ) : historyCards.length === 0 ? (
            <p className="py-10 text-center" style={{ fontSize: 15, color: IOS_LABEL_GRAY }}>
              Aucune séance passée
            </p>
          ) : (
            <div className="space-y-4 pb-2">
              {historyCards.map((c) => (
                <ReliabilityHistoryActivityCard key={c.sessionId} card={c} mapsMountReady={mapsMountReady} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function ReliabilityHistoryMap({
  card,
  mapsMountReady,
}: {
  card: HistoryCardModel;
  mapsMountReady: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showMap = mapsMountReady && inView;

  return (
    <div
      ref={containerRef}
      className="relative mx-3.5 h-40 min-h-[10rem] overflow-hidden rounded-xl border border-[#E5E5EA] bg-muted"
    >
      {showMap ? (
        <MiniMapPreview
          lat={card.locationLat}
          lng={card.locationLng}
          sessionId={card.sessionId}
          avatarUrl={card.organizerAvatarUrl}
          activityType={card.activityType ?? undefined}
          interactive={false}
          showHint={false}
          waitForLayout
          className="h-full w-full"
        />
      ) : (
        <div className="h-full w-full bg-muted" aria-hidden />
      )}
    </div>
  );
}

function ReliabilityHistoryActivityCard({
  card,
  mapsMountReady,
}: {
  card: HistoryCardModel;
  mapsMountReady: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 p-3.5">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
          style={{ background: ACTION_BLUE }}
        >
          {card.organizerInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold" style={{ color: IOS_TITLE }}>
            {card.organizerLabel}
          </p>
          <p className="text-[13px]" style={{ color: IOS_LABEL_GRAY }}>
            programme · {card.timeLine}
          </p>
        </div>
        <span
          className="shrink-0 font-extrabold"
          style={{
            background: "#E5F0FF",
            color: ACTION_BLUE,
            fontSize: 12,
            fontWeight: 800,
            padding: "5px 10px",
            borderRadius: 9999,
            letterSpacing: "-0.01em",
          }}
        >
          {card.presenceBadge}
        </span>
      </div>

      <ReliabilityHistoryMap card={card} mapsMountReady={mapsMountReady} />

      <div className="p-3.5">
        <p className="mb-3 text-[15px] font-bold" style={{ color: IOS_TITLE }}>
          {card.title}
        </p>
        <div className="pointer-events-none flex gap-2">
          <button
            type="button"
            tabIndex={-1}
            className="flex-1 rounded-full border border-[#E5E5EA] py-2.5 text-[15px] font-semibold text-[#0A0F1F] active:bg-[#F8F8F8]"
          >
            Commenter
          </button>
          <button
            type="button"
            tabIndex={-1}
            className="flex-1 rounded-full py-2.5 text-[15px] font-semibold text-white active:scale-[0.98] transition-transform"
            style={{ background: ACTION_BLUE }}
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}
