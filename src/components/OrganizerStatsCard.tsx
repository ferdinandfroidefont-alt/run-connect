import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, TrendingUp, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

interface OrganizerStats {
  totalSessionsCreated: number;
  totalParticipants: number;
  avgParticipantsPerSession: number;
  presenceRate: number;
  upcomingSessions: number;
  completedSessions: number;
  trendPct: number;
  weeklyCreated: number[];
}

export const OrganizerStatsCard = ({ weeklyOnly = false }: { weeklyOnly?: boolean }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      // Fetch all sessions created by user
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, scheduled_at, current_participants, max_participants')
        .eq('organizer_id', user.id);

      if (error) throw error;

      const allSessions = sessions || [];
      const completed = allSessions.filter(s => s.scheduled_at < now);
      const upcoming = allSessions.filter(s => s.scheduled_at >= now);

      // Calculate total participants across all sessions
      const totalParticipants = allSessions.reduce((sum, s) => sum + (s.current_participants || 0), 0);
      const avgParticipants = allSessions.length > 0 
        ? Math.round((totalParticipants / allSessions.length) * 10) / 10
        : 0;

      // Presence rate: fetch confirmed participants for completed sessions
      let presenceRate = 0;
      if (completed.length > 0) {
        const completedIds = completed.map(s => s.id);
        const { data: participants } = await supabase
          .from('session_participants')
          .select('id, confirmed_by_gps, confirmed_by_creator')
          .in('session_id', completedIds);

        const totalP = participants?.length || 0;
        const confirmedP = participants?.filter(p => p.confirmed_by_gps || p.confirmed_by_creator).length || 0;
        presenceRate = totalP > 0 ? Math.round((confirmedP / totalP) * 100) : 0;
      }

      const nowDate = new Date();
      const currentMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
      const previousMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1);
      const previousMonthEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), 0, 23, 59, 59);

      const currentMonthCreated = allSessions.filter((session) => new Date(session.created_at) >= currentMonthStart).length;
      const previousMonthCreated = allSessions.filter((session) => {
        const createdAt = new Date(session.created_at);
        return createdAt >= previousMonthStart && createdAt <= previousMonthEnd;
      }).length;
      const trendPct =
        previousMonthCreated > 0
          ? Math.round(((currentMonthCreated - previousMonthCreated) / previousMonthCreated) * 100)
          : currentMonthCreated > 0
          ? 100
          : 0;

      const weekStarts = Array.from({ length: 6 }, (_, idx) =>
        startOfWeek(subWeeks(nowDate, 5 - idx), { weekStartsOn: 1 })
      );
      const weeklyCreated = weekStarts.map((start) => {
        const end = endOfWeek(start, { weekStartsOn: 1 });
        return allSessions.filter((session) => {
          const createdAt = new Date(session.created_at);
          return createdAt >= start && createdAt <= end;
        }).length;
      });

      setStats({
        totalSessionsCreated: allSessions.length,
        totalParticipants,
        avgParticipantsPerSession: avgParticipants,
        presenceRate,
        upcomingSessions: upcoming.length,
        completedSessions: completed.length,
        trendPct,
        weeklyCreated,
      });
    } catch (err) {
      console.error('Error fetching organizer stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void fetchStats();
  }, [user, fetchStats]);

  const analysisText = useMemo(() => {
    if (!stats) return "";
    if (stats.presenceRate < 40) {
      return "Faible participation: essayez des créneaux plus simples et relancez 24h avant.";
    }
    if (stats.upcomingSessions === 0) {
      return "Aucune séance à venir: planifiez la prochaine semaine pour garder la dynamique.";
    }
    if (stats.avgParticipantsPerSession < 2) {
      return "Participation moyenne basse: ajoutez un message d'invitation plus orienté objectif.";
    }
    return "Bonne dynamique: continuez ce rythme et améliorez encore le taux de présence.";
  }, [stats]);

  if (loading) {
    return (
      <div className="ios-card rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-2 h-16 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalSessionsCreated === 0) {
    return null;
  }

  const primaryStats = [
    {
      icon: Calendar,
      iconBg: "bg-blue-500/15 text-blue-600",
      label: "Séances créées",
      value: stats.totalSessionsCreated.toString(),
      tone: "text-blue-700 dark:text-blue-300",
    },
    {
      icon: Users,
      iconBg: "bg-emerald-500/15 text-emerald-600",
      label: "Participants totaux",
      value: stats.totalParticipants.toString(),
      tone: "text-emerald-700 dark:text-emerald-300",
    },
    {
      icon: CheckCircle,
      iconBg: "bg-violet-500/15 text-violet-600",
      label: "Taux de présence",
      value: `${stats.presenceRate}%`,
      tone: "text-violet-700 dark:text-violet-300",
    },
  ] as const;

  const secondaryStats = [
    {
      icon: TrendingUp,
      iconBg: "bg-indigo-500/12 text-indigo-600",
      label: "Moyenne / séance",
      value: stats.avgParticipantsPerSession.toString(),
    },
    {
      icon: Calendar,
      iconBg: "bg-orange-500/12 text-orange-600",
      label: "À venir",
      value: stats.upcomingSessions.toString(),
    },
    {
      icon: XCircle,
      iconBg: "bg-zinc-500/12 text-zinc-600",
      label: "Terminées",
      value: stats.completedSessions.toString(),
    },
  ] as const;

  const maxWeekly = Math.max(1, ...stats.weeklyCreated);
  if (weeklyOnly) {
    return (
      <div className="ios-card rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="rounded-2xl border border-border/50 bg-card p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">Séances créées par semaine</p>
            <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">6 dernières semaines</span>
          </div>
          <div className="grid grid-cols-6 items-end gap-2">
            {stats.weeklyCreated.map((value, idx) => {
              const h = Math.max(12, Math.round((value / maxWeekly) * 84));
              const weekDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), idx - 5);
              return (
                <div key={`${idx}-${value}`} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-semibold text-foreground">{value}</span>
                  <div className="w-7 rounded-md bg-violet-500/20" style={{ height: `${h}px` }}>
                    <div className="h-full w-full rounded-md bg-violet-500/75" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {idx === 5 ? "S" : format(weekDate, "'S-'w", { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-card rounded-2xl border border-border/60 bg-card p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
          <TrendingUp className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold leading-none text-foreground">Statistiques organisateur</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Performance globale</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-1 text-[12px] font-semibold",
            stats.trendPct >= 0 ? "bg-emerald-500/12 text-emerald-600" : "bg-red-500/12 text-red-600"
          )}
        >
          {stats.trendPct >= 0 ? "+" : ""}
          {stats.trendPct}%
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {primaryStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-border/50 bg-secondary/20 p-2.5">
              <div className={cn("mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg", item.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
              <p className={cn("text-[28px] font-bold leading-none", item.tone)}>{item.value}</p>
              <p className="mt-1 text-[12px] font-semibold leading-tight text-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {secondaryStats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-border/50 bg-card px-2.5 py-2.5">
              <div className={cn("mb-1 inline-flex h-6 w-6 items-center justify-center rounded-md", item.iconBg)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-[24px] font-bold leading-none text-foreground">{item.value}</p>
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mb-3 rounded-2xl border border-border/50 bg-card p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-foreground">Séances créées par semaine</p>
          <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">6 dernières semaines</span>
        </div>
        <div className="grid grid-cols-6 items-end gap-2">
          {stats.weeklyCreated.map((value, idx) => {
            const h = Math.max(12, Math.round((value / maxWeekly) * 84));
            const weekDate = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), idx - 5);
            return (
              <div key={`${idx}-${value}`} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-foreground">{value}</span>
                <div className="w-7 rounded-md bg-violet-500/20" style={{ height: `${h}px` }}>
                  <div className="h-full w-full rounded-md bg-violet-500/75" />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {idx === 5 ? "S" : format(weekDate, "'S-'w", { locale: fr })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/15 bg-blue-500/5 p-2.5">
        <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          Analyse
        </p>
        <p className="mt-1 text-[12px] text-foreground">{analysisText}</p>
      </div>
    </div>
  );
};
