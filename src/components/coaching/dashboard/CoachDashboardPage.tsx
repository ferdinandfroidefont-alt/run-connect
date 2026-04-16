import { useEffect, useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfDay, endOfWeek, format, isAfter, startOfDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  MessageCircle,
  MinusCircle,
  Send,
  Siren,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const STATUS_BADGE: Record<StatusUi, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  done: { label: "Fait", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  pending: { label: "En attente", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: Clock3 },
  missed: { label: "Non faite", className: "bg-red-500/15 text-red-700 dark:text-red-300", icon: XCircle },
  none: { label: "Aucune", className: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300", icon: MinusCircle },
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

function ProgressRing({ pct }: { pct: number }) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg width={86} height={86} className="-rotate-90">
      <circle cx="43" cy="43" r={radius} strokeWidth="8" className="fill-none stroke-secondary" />
      <circle
        cx="43"
        cy="43"
        r={radius}
        strokeWidth="8"
        strokeLinecap="round"
        className="fill-none stroke-primary"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-foreground text-[16px] font-bold">
        {clamped}%
      </text>
    </svg>
  );
}

export function DashboardAlertCard({
  lateAthletesCount,
  lateTodayCount,
  onClick,
}: {
  lateAthletesCount: number;
  lateTodayCount: number;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-red-500/30 bg-red-500/[0.06] px-ios-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
          <AlertCircle className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[18px] font-bold leading-tight text-foreground">{lateAthletesCount} athlètes en retard</p>
          <p className="text-[12px] text-muted-foreground">{lateTodayCount} séances non faites aujourd'hui</p>
        </div>
        <Button type="button" className="h-8 rounded-full bg-red-500 px-3 text-[11px] font-semibold text-white hover:bg-red-600" onClick={onClick}>
          <Send className="mr-1 h-3.5 w-3.5" />
          Relancer maintenant
        </Button>
      </div>
    </div>
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
  return (
    <div className="grid grid-cols-2 gap-px border-b border-border bg-border/50">
      <div className="bg-card px-ios-3 py-3">
        <p className="text-[13px] font-semibold text-foreground">Cette semaine</p>
        <div className="mt-2 flex items-center gap-2">
          <ProgressRing pct={pct} />
          <div>
            <p className="text-[32px] font-black leading-none text-foreground">
              {done} <span className="text-[20px] font-semibold text-foreground/70">/ {planned}</span>
            </p>
            <p className="text-[13px] text-muted-foreground">séances réalisées</p>
            <p className={cn("mt-0.5 text-[12px] font-semibold", trendPct >= 0 ? "text-emerald-500" : "text-red-500")}>
              {trendPct >= 0 ? "+" : ""}
              {trendPct}% vs semaine dernière
            </p>
          </div>
        </div>
      </div>
      <div className="bg-card px-ios-3 py-3">
        <p className="text-[13px] font-semibold text-foreground">Évolution hebdomadaire</p>
        <div className="mt-3 h-[105px]">
          <svg viewBox="0 0 100 60" className="h-full w-full">
            <polyline
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.4"
              points={points.map((v, idx) => `${idx * 33},${60 - Math.min(60, Math.max(0, (v / 100) * 60))}`).join(" ")}
            />
            {points.map((v, idx) => (
              <circle key={idx} cx={idx * 33} cy={60 - Math.min(60, Math.max(0, (v / 100) * 60))} r="2.8" fill="hsl(var(--primary))" />
            ))}
          </svg>
          <div className="mt-0.5 grid grid-cols-4 text-[10px] text-muted-foreground">
            <span>S-3</span>
            <span className="text-center">S-2</span>
            <span className="text-center">S-1</span>
            <span className="text-right">S</span>
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
    { key: "done", label: "faites", value: data.todayDone, className: "text-emerald-600", icon: CheckCircle2 },
    { key: "pending", label: "en attente", value: data.todayPending, className: "text-amber-500", icon: Clock3 },
    { key: "missed", label: "non faite", value: data.todayMissed, className: "text-red-500", icon: XCircle },
    { key: "none", label: "aucune", value: data.todayNone, className: "text-zinc-500", icon: MinusCircle },
  ] as const;
  const total = Math.max(1, data.todayPlanned);
  const donePct = Math.round((data.todayDone / total) * 100);
  const pendingPct = Math.round((data.todayPending / total) * 100);
  const missedPct = Math.round((data.todayMissed / total) * 100);
  const nonePct = Math.max(0, 100 - donePct - pendingPct - missedPct);

  return (
    <div className="border-b border-border bg-card px-ios-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <CalendarCheck2 className="h-4.5 w-4.5 text-primary" />
        <p className="text-[18px] font-bold leading-none text-foreground">Aujourd'hui</p>
      </div>
      <div className="mb-3 grid grid-cols-[86px_repeat(4,minmax(0,1fr))] gap-1.5">
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-2 text-center">
          <div
            className="mx-auto h-12 w-12 rounded-full"
            style={{
              background: `conic-gradient(
                #22c55e 0 ${donePct}%,
                #f59e0b ${donePct}% ${donePct + pendingPct}%,
                #ef4444 ${donePct + pendingPct}% ${donePct + pendingPct + missedPct}%,
                #9ca3af ${donePct + pendingPct + missedPct}% 100%)`,
            }}
          >
            <div className="m-[6px] flex h-[36px] w-[36px] items-center justify-center rounded-full bg-card text-[11px] font-bold text-foreground">
              {data.todayPlanned}
            </div>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">séances prévues</p>
        </div>
        {miniStats.map((stat) => (
          <div key={stat.key} className="rounded-xl border border-border/50 bg-secondary/30 px-2 py-2 text-center">
            <stat.icon className={cn("mx-auto mb-1 h-4 w-4", stat.className)} />
            <p className={cn("text-[17px] font-bold leading-none", stat.className)}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {data.todayEntries.slice(0, 3).map((entry) => {
          const conf = STATUS_BADGE[entry.status];
          const Icon = conf.icon;
          return (
            <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-2.5 py-2">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-secondary">
                {entry.athleteAvatar ? (
                  <img src={entry.athleteAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
                    {entry.athleteName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{entry.athleteName}</p>
                <p className="truncate text-[12px] text-muted-foreground">{entry.title}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold", conf.className)}>
                <Icon className="h-3 w-3" />
                {conf.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{entry.when}</span>
            </div>
          );
        })}
      </div>
      <button type="button" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
        Voir toutes les séances du jour <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
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
    <div className="h-full border border-border/50 bg-card px-ios-3 py-3">
      <p className="text-[17px] font-bold text-foreground">Athlètes à surveiller</p>
      <div className="mt-2 space-y-1.5">
        {rows.slice(0, 3).map((row) => (
          <div key={row.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-2.5 py-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-secondary">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
                  {row.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{row.name}</p>
            <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-600">{row.issue}</span>
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary" onClick={onOpen}>
        Voir tous les athlètes <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
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
    <div className="h-full border border-border/50 bg-card px-ios-3 py-3">
      <p className="text-[17px] font-bold text-foreground">Activité récente</p>
      <div className="mt-2 space-y-1.5">
        {rows.slice(0, 3).map((row) => (
          <div key={row.id} className="flex items-center gap-2 rounded-xl border border-border/50 px-2.5 py-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-secondary">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
                  {row.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{row.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{row.message}</p>
            </div>
            <span className="text-[10px] text-muted-foreground">{row.agoLabel}</span>
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-primary" onClick={onOpenMessages}>
        Ouvrir les messages <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
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
    { value: String(athletes), label: "Athlètes actifs", tone: "text-primary", icon: Zap },
    { value: String(planned), label: "Séances prévues", tone: "text-emerald-500", icon: CalendarCheck2 },
    { value: `${completionPct}%`, label: "Taux complétion", tone: "text-amber-500", icon: CheckCircle2 },
    { value: `${trend >= 0 ? "+" : ""}${trend}%`, label: "vs semaine dernière", tone: trend >= 0 ? "text-violet-500" : "text-red-500", icon: TrendingUp },
  ] as const;
  return (
    <div className="border-b border-border bg-card px-ios-4 py-3">
      <p className="mb-2 text-[17px] font-bold text-foreground">Aperçu rapide</p>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-border/50 bg-border/40">
        {cards.map((card) => (
          <div key={card.label} className="bg-card px-2 py-2">
            <card.icon className={cn("mb-1 h-4 w-4", card.tone)} />
            <p className={cn("text-[18px] font-black leading-none", card.tone)}>{card.value}</p>
            <p className="text-[10px] text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
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
  return (
    <div className="border-b border-border bg-card px-ios-4 py-3">
      <p className="mb-2 text-[17px] font-bold text-foreground">Actions rapides</p>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" className="h-10 justify-start rounded-lg text-[12px] font-semibold" onClick={onCreate}>
          <CalendarCheck2 className="mr-2 h-4.5 w-4.5" />
          Créer une séance
        </Button>
        <Button type="button" variant="secondary" className="h-10 justify-start rounded-lg bg-emerald-500/10 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300" onClick={onTemplate}>
          <BookOpen className="mr-2 h-4.5 w-4.5" />
          Ajouter un modèle
        </Button>
        <Button type="button" variant="secondary" className="h-10 justify-start rounded-lg bg-violet-500/10 text-[12px] font-semibold text-violet-700 hover:bg-violet-500/15 dark:text-violet-300" onClick={onMessage}>
          <MessageCircle className="mr-2 h-4.5 w-4.5" />
          Envoyer un message
        </Button>
      </div>
    </div>
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
      <div className="-mx-ios-4 space-y-px border-y border-border bg-border/30">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="-mx-ios-4 space-y-0">
      <DashboardAlertCard
        lateAthletesCount={data.lateAthletesCount}
        lateTodayCount={data.lateTodayCount}
        onClick={onOpenLateAthletes}
      />
      <DashboardWeekProgress done={data.weekDone} planned={data.weekPlanned} trendPct={data.trendPct} points={data.graphPoints} />
      <DashboardTodayCard data={data} />
      <div className="grid grid-cols-2 gap-px border-b border-border bg-border/50">
        <DashboardAthleteWatch rows={data.watchAthletes} onOpen={onOpenLateAthletes} />
        <DashboardActivityFeed rows={data.activityFeed} onOpenMessages={onOpenMessages} />
      </div>
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

