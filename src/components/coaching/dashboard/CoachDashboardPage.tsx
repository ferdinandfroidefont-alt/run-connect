import { useEffect, useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfDay, endOfWeek, format, isAfter, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageCircle,
  MinusCircle,
  Send,
  Siren,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tokens visuels pour les statuts — alignés sur la palette iOS de l'app
 * (utilise les tokens sémantiques HSL définis dans index.css).
 */
const STATUS_TONE = {
  done: {
    text: "text-[hsl(var(--success,142_72%_38%))]",
    bg: "bg-[hsl(var(--success,142_72%_38%)/0.12)]",
  },
  pending: {
    text: "text-[hsl(var(--warning,38_92%_50%))]",
    bg: "bg-[hsl(var(--warning,38_92%_50%)/0.12)]",
  },
  missed: {
    text: "text-destructive",
    bg: "bg-destructive/10",
  },
  none: {
    text: "text-muted-foreground",
    bg: "bg-muted",
  },
} as const;

type StatusUi = "done" | "pending" | "missed" | "none";

type SessionEntry = {
  id: string;
  athleteId: string | null;
  athleteName: string;
  athleteAvatar: string | null;
  title: string;
  status: StatusUi;
  note: string | null;
  when: string;
  rpe: number | null;
  issue: string | null;
};

type DashboardData = {
  lateAthletesCount: number;
  lateTodayCount: number;
  weekDone: number;
  weekPlanned: number;
  trendPct: number;
  graphPoints: number[];
  todayPlanned: number;
  todayDone: number;
  todayPending: number;
  todayMissed: number;
  todayNone: number;
  todayEntries: SessionEntry[];
  watchAthletes: Array<{ id: string; name: string; avatarUrl: string | null; issue: string }>;
  activityFeed: Array<{ id: string; name: string; avatarUrl: string | null; message: string; agoLabel: string }>;
};

interface CoachDashboardPageProps {
  clubId: string;
  onOpenLateAthletes: () => void;
  onOpenMessages: () => void;
  onOpenPlanning: () => void;
  onOpenTemplates: () => void;
}

const STATUS_BADGE: Record<StatusUi, { label: string; tone: keyof typeof STATUS_TONE; icon: React.ComponentType<{ className?: string }> }> = {
  done: { label: "Fait", tone: "done", icon: CheckCircle2 },
  pending: { label: "En attente", tone: "pending", icon: Clock3 },
  missed: { label: "Non faite", tone: "missed", icon: XCircle },
  none: { label: "Aucune", tone: "none", icon: MinusCircle },
};

function toUiStatus(raw?: string | null): StatusUi {
  if (raw === "completed") return "done";
  if (raw === "missed") return "missed";
  if (raw === "pending" || raw === "sent") return "pending";
  return "none";
}

function timeAgoLabel(iso: string) {
  const diffMin = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return `il y a ${Math.floor(diffH / 24)} j`;
}

/* ───────────────────────── Sous-éléments génériques ───────────────────────── */

function SectionHeader({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-end justify-between px-ios-4 pb-ios-2 pt-ios-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-0.5 text-[13px] font-medium text-primary"
        >
          {action.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-full bg-secondary"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-muted-foreground">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg width={78} height={78} className="-rotate-90">
      <circle cx="39" cy="39" r={radius} strokeWidth="6" className="fill-none stroke-secondary" />
      <circle
        cx="39"
        cy="39"
        r={radius}
        strokeWidth="6"
        strokeLinecap="round"
        className="fill-none stroke-primary"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="rotate-90 fill-foreground text-[15px] font-bold"
      >
        {clamped}%
      </text>
    </svg>
  );
}

/* ───────────────────────── Cartes du dashboard ───────────────────────── */

export function DashboardAlertCard({
  lateAthletesCount,
  lateTodayCount,
  onClick,
}: {
  lateAthletesCount: number;
  lateTodayCount: number;
  onClick: () => void;
}) {
  if (lateAthletesCount === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-card mx-ios-4 mt-ios-4 flex w-[calc(100%-theme(spacing.ios-4)*2)] items-center gap-3 border border-destructive/20 bg-destructive/[0.06] px-ios-4 py-ios-3 text-left ios-interactive active:opacity-90"
    >
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-tight text-foreground">
          {lateAthletesCount} athlète{lateAthletesCount > 1 ? "s" : ""} en retard
        </p>
        <p className="text-[12px] text-muted-foreground">
          {lateTodayCount} séance{lateTodayCount > 1 ? "s" : ""} non faite{lateTodayCount > 1 ? "s" : ""} aujourd'hui
        </p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-[12px] font-semibold text-destructive-foreground">
        <Send className="h-3.5 w-3.5" />
        Relancer
      </span>
    </button>
  );
}

export function DashboardWeekProgress({
  done,
  planned,
  trendPct,
  points,
}: {
  done: number;
  planned: number;
  trendPct: number;
  points: number[];
}) {
  const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
  const trendColor = trendPct >= 0
    ? "text-[hsl(var(--success,142_72%_38%))]"
    : "text-destructive";
  return (
    <div className="ios-card mx-ios-4 mt-ios-3 overflow-hidden border border-border/60">
      <div className="grid grid-cols-2 divide-x divide-border/60">
        <div className="px-ios-4 py-ios-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Cette semaine
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressRing pct={pct} />
            <div className="min-w-0">
              <p className="text-[24px] font-bold leading-none text-foreground">
                {done}
                <span className="ml-1 text-[15px] font-semibold text-muted-foreground">/ {planned}</span>
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">séances faites</p>
              <p className={cn("mt-1 text-[11px] font-semibold", trendColor)}>
                {trendPct >= 0 ? "+" : ""}{trendPct}% vs S-1
              </p>
            </div>
          </div>
        </div>
        <div className="px-ios-4 py-ios-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Évolution
          </p>
          <div className="mt-3 h-[78px]">
            <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="h-full w-full">
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points.map((v, idx) => `${idx * 33},${60 - Math.min(60, Math.max(4, (v / 100) * 56))}`).join(" ")}
              />
              {points.map((v, idx) => (
                <circle
                  key={idx}
                  cx={idx * 33}
                  cy={60 - Math.min(60, Math.max(4, (v / 100) * 56))}
                  r="2.4"
                  fill="hsl(var(--primary))"
                />
              ))}
            </svg>
            <div className="mt-1 grid grid-cols-4 text-[10px] text-muted-foreground">
              <span>S-3</span>
              <span className="text-center">S-2</span>
              <span className="text-center">S-1</span>
              <span className="text-right">S</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardTodayCard({
  data,
}: {
  data: Pick<DashboardData, "todayPlanned" | "todayDone" | "todayPending" | "todayMissed" | "todayNone" | "todayEntries">;
}) {
  const miniStats = [
    { key: "done", label: "Faites", value: data.todayDone, tone: "done" as const, icon: CheckCircle2 },
    { key: "pending", label: "En attente", value: data.todayPending, tone: "pending" as const, icon: Clock3 },
    { key: "missed", label: "Non faites", value: data.todayMissed, tone: "missed" as const, icon: XCircle },
    { key: "none", label: "Aucune", value: data.todayNone, tone: "none" as const, icon: MinusCircle },
  ];
  const total = Math.max(1, data.todayPlanned);
  const donePct = (data.todayDone / total) * 100;
  const pendingPct = (data.todayPending / total) * 100;
  const missedPct = (data.todayMissed / total) * 100;

  return (
    <>
      <SectionHeader title="Aujourd'hui" />
      <div className="ios-card mx-ios-4 overflow-hidden border border-border/60">
        {/* Récap visuel */}
        <div className="flex items-center gap-4 px-ios-4 py-ios-4">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(
                hsl(var(--success, 142 72% 38%)) 0 ${donePct}%,
                hsl(var(--warning, 38 92% 50%)) ${donePct}% ${donePct + pendingPct}%,
                hsl(var(--destructive)) ${donePct + pendingPct}% ${donePct + pendingPct + missedPct}%,
                hsl(var(--muted)) ${donePct + pendingPct + missedPct}% 100%)`,
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card">
              <span className="text-[17px] font-bold text-foreground">{data.todayPlanned}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              {data.todayPlanned} séance{data.todayPlanned > 1 ? "s" : ""} prévue{data.todayPlanned > 1 ? "s" : ""}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {data.todayDone} faite{data.todayDone > 1 ? "s" : ""} · {data.todayPending} en attente
            </p>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-4 divide-x divide-border/60 border-t border-border/60">
          {miniStats.map((stat) => {
            const tone = STATUS_TONE[stat.tone];
            return (
              <div key={stat.key} className="flex flex-col items-center px-2 py-2.5">
                <stat.icon className={cn("mb-1 h-4 w-4", tone.text)} />
                <p className={cn("text-[16px] font-bold leading-none", tone.text)}>{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Liste flush des séances du jour */}
        {data.todayEntries.length > 0 && (
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {data.todayEntries.slice(0, 3).map((entry) => {
              const conf = STATUS_BADGE[entry.status];
              const Icon = conf.icon;
              const tone = STATUS_TONE[conf.tone];
              return (
                <li key={entry.id} className="flex items-center gap-3 px-ios-4 py-ios-3">
                  <Avatar name={entry.athleteName} url={entry.athleteAvatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">{entry.athleteName}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {entry.title} · {entry.when}
                    </p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold", tone.bg, tone.text)}>
                    <Icon className="h-3 w-3" />
                    {conf.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          className="flex w-full items-center justify-between border-t border-border/60 px-ios-4 py-ios-3 text-[13px] font-semibold text-primary ios-interactive active:bg-secondary/40"
        >
          Voir toutes les séances du jour
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

export function DashboardAthleteWatch({
  rows,
  onOpen,
}: {
  rows: DashboardData["watchAthletes"];
  onOpen: () => void;
}) {
  return (
    <>
      <SectionHeader
        title="Athlètes à surveiller"
        action={rows.length > 0 ? { label: "Tout voir", onClick: onOpen } : undefined}
      />
      <div className="ios-card mx-ios-4 overflow-hidden border border-border/60">
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 px-ios-4 py-ios-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-[13px] text-muted-foreground">Aucun athlète à surveiller cette semaine.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.slice(0, 4).map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-ios-4 py-ios-3">
                <Avatar name={row.name} url={row.avatarUrl} size={36} />
                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{row.name}</p>
                <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">
                  {row.issue}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function DashboardActivityFeed({
  rows,
  onOpenMessages,
}: {
  rows: DashboardData["activityFeed"];
  onOpenMessages: () => void;
}) {
  return (
    <>
      <SectionHeader
        title="Activité récente"
        action={{ label: "Messages", onClick: onOpenMessages }}
      />
      <div className="ios-card mx-ios-4 overflow-hidden border border-border/60">
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 px-ios-4 py-ios-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
            </div>
            <p className="text-[13px] text-muted-foreground">Aucune activité récente.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.slice(0, 4).map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-ios-4 py-ios-3">
                <Avatar name={row.name} url={row.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{row.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{row.message}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{row.agoLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export function DashboardStatsRow({
  athletes,
  planned,
  completionPct,
  trend,
}: {
  athletes: number;
  planned: number;
  completionPct: number;
  trend: number;
}) {
  const cards = [
    { value: String(athletes), label: "Athlètes", icon: Users },
    { value: String(planned), label: "Séances", icon: CalendarCheck2 },
    { value: `${completionPct}%`, label: "Complétion", icon: CheckCircle2 },
    { value: `${trend >= 0 ? "+" : ""}${trend}%`, label: "vs S-1", icon: TrendingUp },
  ];
  return (
    <>
      <SectionHeader title="Aperçu rapide" />
      <div className="ios-card mx-ios-4 grid grid-cols-4 divide-x divide-border/60 overflow-hidden border border-border/60">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col items-center gap-1 px-2 py-ios-3">
            <card.icon className="h-4 w-4 text-primary" />
            <p className="text-[17px] font-bold leading-none text-foreground">{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function DashboardQuickActions({
  onCreate,
  onTemplate,
  onMessage,
}: {
  onCreate: () => void;
  onTemplate: () => void;
  onMessage: () => void;
}) {
  const actions = [
    { label: "Créer une séance", icon: CalendarCheck2, onClick: onCreate },
    { label: "Ajouter un modèle", icon: BookOpen, onClick: onTemplate },
    { label: "Envoyer un message", icon: MessageCircle, onClick: onMessage },
  ];
  return (
    <>
      <SectionHeader title="Actions rapides" />
      <div className="ios-card mx-ios-4 overflow-hidden border border-border/60">
        <ul className="divide-y divide-border/60">
          {actions.map((action) => (
            <li key={action.label}>
              <button
                type="button"
                onClick={action.onClick}
                className="flex w-full items-center gap-3 px-ios-4 py-ios-3 text-left ios-interactive active:bg-secondary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <action.icon className="h-4.5 w-4.5" />
                </div>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground">{action.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
export function CoachDashboardPage({
  clubId,
  onOpenLateAthletes,
  onOpenMessages,
  onOpenPlanning,
  onOpenTemplates,
}: CoachDashboardPageProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at, target_athletes")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString());

      const sessionIds = (sessions || []).map((s) => s.id);
      const { data: participations } = sessionIds.length
        ? await supabase
            .from("coaching_participations")
            .select("coaching_session_id, user_id, status, athlete_note, athlete_rpe_felt, updated_at")
            .in("coaching_session_id", sessionIds)
        : { data: [] };

      const involvedAthleteIds = Array.from(
        new Set(
          (participations || []).map((p) => p.user_id).concat(
            (sessions || []).flatMap((s) => (Array.isArray(s.target_athletes) ? s.target_athletes : []))
          )
        )
      );
      const { data: profiles } = involvedAthleteIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", involvedAthleteIds)
        : { data: [] };

      const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));
      const sessionById = new Map((sessions || []).map((s) => [s.id, s]));
      const entries: SessionEntry[] = [];
      (participations || []).forEach((part) => {
        const session = sessionById.get(part.coaching_session_id);
        if (!session) return;
        const profile = profileById.get(part.user_id);
        entries.push({
          id: `${part.coaching_session_id}-${part.user_id}`,
          athleteId: part.user_id,
          athleteName: profile?.display_name || "Athlète",
          athleteAvatar: profile?.avatar_url || null,
          title: session.title || "Séance",
          status: toUiStatus(part.status),
          note: part.athlete_note || null,
          when: format(new Date(session.scheduled_at), "HH:mm"),
          rpe:
            Array.isArray(part.athlete_rpe_felt) && part.athlete_rpe_felt.length
              ? Math.round(Number(part.athlete_rpe_felt[0]))
              : null,
          issue: null,
        });
      });

      const todayEntries = entries.filter((entry) => {
        const session = sessionById.get(entry.id.split("-")[0]);
        if (!session) return false;
        const d = new Date(session.scheduled_at);
        return d >= todayStart && d <= todayEnd;
      });
      const weekDone = entries.filter((e) => e.status === "done").length;
      const weekPlanned = entries.length;
      const todayDone = todayEntries.filter((e) => e.status === "done").length;
      const todayPending = todayEntries.filter((e) => e.status === "pending").length;
      const todayMissed = todayEntries.filter((e) => e.status === "missed").length;
      const todayNone = Math.max(0, (sessions || []).filter((s) => {
        const d = new Date(s.scheduled_at);
        return d >= todayStart && d <= todayEnd;
      }).length - todayEntries.length);

      const lateEntries = entries.filter((e) => {
        const session = sessionById.get(e.id.split("-")[0]);
        if (!session) return false;
        return isAfter(new Date(), new Date(session.scheduled_at)) && e.status !== "done";
      });
      const lateAthleteSet = new Set(lateEntries.map((e) => e.athleteId).filter(Boolean));

      const { data: prevSessions } = await supabase
        .from("coaching_sessions")
        .select("id")
        .eq("club_id", clubId)
        .gte("scheduled_at", subWeeks(weekStart, 1).toISOString())
        .lt("scheduled_at", weekStart.toISOString());
      const prevSessionIds = (prevSessions || []).map((s) => s.id);
      const { data: prevParts } = prevSessionIds.length
        ? await supabase
            .from("coaching_participations")
            .select("status")
            .in("coaching_session_id", prevSessionIds)
        : { data: [] };
      const prevDone = (prevParts || []).filter((p) => p.status === "completed").length;
      const prevPlanned = (prevParts || []).length;
      const prevPct = prevPlanned > 0 ? Math.round((prevDone / prevPlanned) * 100) : 0;
      const currentPct = weekPlanned > 0 ? Math.round((weekDone / weekPlanned) * 100) : 0;
      const trendPct = currentPct - prevPct;

      const points: number[] = [];
      for (let i = 3; i >= 0; i--) {
        const wStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const wEnd = addDays(wStart, 7);
        const ids = (sessions || [])
          .filter((s) => {
            const d = new Date(s.scheduled_at);
            return d >= wStart && d < wEnd;
          })
          .map((s) => s.id);
        const parts = (participations || []).filter((p) => ids.includes(p.coaching_session_id));
        const done = parts.filter((p) => p.status === "completed").length;
        points.push(parts.length ? Math.round((done / parts.length) * 100) : 0);
      }

      const watchMap = new Map<string, { countMissed: number; highRpe: number }>();
      entries.forEach((entry) => {
        if (!entry.athleteId) return;
        const base = watchMap.get(entry.athleteId) || { countMissed: 0, highRpe: 0 };
        if (entry.status === "missed") base.countMissed += 1;
        if ((entry.rpe || 0) >= 8) base.highRpe += 1;
        watchMap.set(entry.athleteId, base);
      });
      const watchAthletes = Array.from(watchMap.entries())
        .map(([id, issue]) => {
          const profile = profileById.get(id);
          const issueLabel =
            issue.countMissed >= 2 ? `${issue.countMissed} séances ratées` : issue.highRpe > 0 ? "Fatigue élevée" : "Aucune séance faite";
          return { id, name: profile?.display_name || "Athlète", avatarUrl: profile?.avatar_url || null, issue: issueLabel };
        })
        .sort((a, b) => b.issue.localeCompare(a.issue));

      const activityFeed = (participations || [])
        .filter((p) => p.athlete_note && p.updated_at)
        .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
        .slice(0, 3)
        .map((item) => {
          const profile = profileById.get(item.user_id);
          return {
            id: `${item.user_id}-${item.coaching_session_id}`,
            name: profile?.display_name || "Athlète",
            avatarUrl: profile?.avatar_url || null,
            message: item.athlete_note || "Séance terminée",
            agoLabel: timeAgoLabel(item.updated_at!),
          };
        });

      if (!ignore) {
        setData({
          lateAthletesCount: lateAthleteSet.size,
          lateTodayCount: todayMissed + todayPending,
          weekDone,
          weekPlanned,
          trendPct,
          graphPoints: points,
          todayPlanned: (sessions || []).filter((s) => {
            const d = new Date(s.scheduled_at);
            return d >= todayStart && d <= todayEnd;
          }).length,
          todayDone,
          todayPending,
          todayMissed,
          todayNone,
          todayEntries,
          watchAthletes,
          activityFeed,
        });
        setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [clubId]);

  const completionPct = useMemo(() => {
    if (!data || data.weekPlanned === 0) return 0;
    return Math.round((data.weekDone / data.weekPlanned) * 100);
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-3 px-ios-4 pt-ios-4 pb-[calc(2rem+var(--safe-area-bottom))]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="ios-card h-24 animate-pulse border border-border/60 bg-secondary/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-secondary pb-[calc(2rem+var(--safe-area-bottom))]">
      <DashboardAlertCard
        lateAthletesCount={data.lateAthletesCount}
        lateTodayCount={data.lateTodayCount}
        onClick={onOpenLateAthletes}
      />
      <SectionHeader title="Cette semaine" />
      <DashboardWeekProgress
        done={data.weekDone}
        planned={data.weekPlanned}
        trendPct={data.trendPct}
        points={data.graphPoints}
      />
      <DashboardTodayCard data={data} />
      <DashboardAthleteWatch rows={data.watchAthletes} onOpen={onOpenLateAthletes} />
      <DashboardActivityFeed rows={data.activityFeed} onOpenMessages={onOpenMessages} />
      <DashboardStatsRow
        athletes={new Set(data.todayEntries.map((e) => e.athleteId).filter(Boolean)).size}
        planned={data.weekPlanned}
        completionPct={completionPct}
        trend={data.trendPct}
      />
      <DashboardQuickActions onCreate={onOpenPlanning} onTemplate={onOpenTemplates} onMessage={onOpenMessages} />
    </div>
  );
}

