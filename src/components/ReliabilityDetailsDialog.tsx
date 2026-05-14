import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ACTION_BLUE = "#007AFF";
const IOS_BG = "#F2F2F7";
const IOS_LABEL_GRAY = "#8E8E93";
const IOS_TITLE = "#0A0F1F";
const IOS_BORDER = "#E5E5EA";

/** Cartes plein écran mobile + modal desktop (z empilé avec profil). */
const RELIABILITY_SHELL =
  "fixed inset-0 left-0 right-0 top-0 z-[126] mx-auto w-full min-w-0 max-w-full translate-x-0 translate-y-0 box-border flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none border-0 p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:z-[125] sm:mx-0 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[20px] sm:border sm:border-[#E5E5EA] sm:shadow-[0_8px_40px_rgba(0,0,0,0.12)]";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)";

const MAP_GRADIENTS = [
  "linear-gradient(135deg, #e8f5e9, #c8e6c9, #a5d6a7)",
  "linear-gradient(135deg, #c8e6c9, #a5d6a7, #81c784)",
  "linear-gradient(135deg, #e3f2fd, #bbdefb, #90caf9)",
  "linear-gradient(135deg, #fce4ec, #f8bbd0, #f48fb1)",
  "linear-gradient(135deg, #fff3e0, #ffe0b2, #ffcc80)",
  "linear-gradient(135deg, #f3e5f5, #e1bee7, #ce93d8)",
];

function gradientForSessionId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return MAP_GRADIENTS[h % MAP_GRADIENTS.length];
}

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
}

interface HistoryCardModel {
  sessionId: string;
  title: string;
  scheduledAt: string;
  timeLine: string;
  organizerId: string;
  organizerLabel: string;
  organizerInitials: string;
  mapGradient: string;
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
        const { data, error } = await supabase
          .from("session_participants")
          .select(
            "validation_status, confirmed_by_creator, confirmed_by_gps, sessions(id, title, scheduled_at, location_name, organizer_id)",
          )
          .eq("user_id", reliabilitySubjectUserId)
          .order("joined_at", { ascending: false })
          .limit(80);

        if (cancelled) return;
        if (error || !data) {
          setUpcomingCount(0);
          setHistoryCards([]);
          return;
        }

        const now = Date.now();
        type Row = {
          validation_status: string | null;
          confirmed_by_creator: boolean | null;
          confirmed_by_gps: boolean | null;
          sessions: SessionMini | SessionMini[] | null;
        };

        const normalized: Array<{
          session: SessionMini;
          validation_status: string | null;
          confirmed_by_creator: boolean | null;
          confirmed_by_gps: boolean | null;
        }> = [];

        for (const raw of data as Row[]) {
          const s = raw.sessions;
          const session = Array.isArray(s) ? s[0] : s;
          if (!session?.id) continue;
          normalized.push({
            session,
            validation_status: raw.validation_status,
            confirmed_by_creator: raw.confirmed_by_creator,
            confirmed_by_gps: raw.confirmed_by_gps,
          });
        }

        let upcoming = 0;
        const pastRows: typeof normalized = [];
        for (const r of normalized) {
          const t = new Date(r.session.scheduled_at).getTime();
          if (t > now) upcoming++;
          else pastRows.push(r);
        }

        const organizerIds = [...new Set(pastRows.map((r) => r.session.organizer_id))];
        let profileByUserId = new Map<string, { username: string | null; display_name: string | null }>();
        if (organizerIds.length > 0) {
          const { data: profRows } = await supabase
            .from("profiles")
            .select("user_id, username, display_name")
            .in("user_id", organizerIds);
          if (!cancelled && profRows) {
            profileByUserId = new Map(
              profRows.map((p) => [
                p.user_id as string,
                { username: p.username ?? null, display_name: p.display_name ?? null },
              ]),
            );
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
          return {
            sessionId: s.id,
            title: s.title || "Séance",
            scheduledAt: s.scheduled_at,
            timeLine: formatSessionWhen(s.scheduled_at),
            organizerId: s.organizer_id,
            organizerLabel: label,
            organizerInitials: initialsFromName(label),
            mapGradient: gradientForSessionId(s.id),
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
        className={cn(RELIABILITY_SHELL, "gap-0 bg-[#F2F2F7] p-0 text-[15px] antialiased sm:bg-[#F2F2F7]")}
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
                <ReliabilityHistoryActivityCard key={c.sessionId} card={c} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function ReliabilityHistoryActivityCard({ card }: { card: HistoryCardModel }) {
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

      <div className="relative mx-3.5 h-40 overflow-hidden rounded-xl" style={{ background: card.mapGradient }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div
              className="relative h-12 w-12 rounded-full border-[3px] border-white shadow-lg"
              style={{ background: "white" }}
            />
            <MapPin
              className="absolute -bottom-2 left-1/2 h-10 w-10 -translate-x-1/2"
              color={ACTION_BLUE}
              fill={ACTION_BLUE}
              strokeWidth={2}
            />
          </div>
        </div>
      </div>

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
