import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Calendar, TrendingUp, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrganizerStats {
  totalSessionsCreated: number;
  totalParticipants: number;
  avgParticipantsPerSession: number;
  presenceRate: number;
  upcomingSessions: number;
  completedSessions: number;
}

export const OrganizerStatsCard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
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

      setStats({
        totalSessionsCreated: allSessions.length,
        totalParticipants,
        avgParticipantsPerSession: avgParticipants,
        presenceRate,
        upcomingSessions: upcoming.length,
        completedSessions: completed.length,
      });
    } catch (err) {
      console.error('Error fetching organizer stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full overflow-hidden border-t border-border/60 bg-card">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 px-ios-4 py-3">
            <div className="h-[30px] w-[30px] rounded-[7px] bg-secondary animate-pulse" />
            <div className="flex-1 h-5 bg-secondary rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || stats.totalSessionsCreated === 0) {
    return null;
  }

  const statItems = [
    {
      icon: Calendar,
      iconBg: "bg-blue-500",
      label: "Séances créées",
      value: stats.totalSessionsCreated.toString(),
    },
    {
      icon: Users,
      iconBg: "bg-green-500",
      label: "Participants totaux",
      value: stats.totalParticipants.toString(),
    },
    {
      icon: TrendingUp,
      iconBg: "bg-purple-500",
      label: "Moyenne / séance",
      value: stats.avgParticipantsPerSession.toString(),
    },
    {
      icon: CheckCircle,
      iconBg: "bg-emerald-500",
      label: "Taux de présence",
      value: `${stats.presenceRate}%`,
    },
    {
      icon: Calendar,
      iconBg: "bg-orange-500",
      label: "À venir",
      value: stats.upcomingSessions.toString(),
    },
    {
      icon: XCircle,
      iconBg: "bg-gray-500",
      label: "Terminées",
      value: stats.completedSessions.toString(),
    },
  ];

  return (
    <div className="w-full overflow-hidden border-t border-border/60 bg-card shadow-[var(--shadow-card)]">
      {/* Header - clickable */}
      <div
        className="flex cursor-pointer items-center gap-3 px-ios-4 py-3 transition-colors active:bg-secondary"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-indigo-500 flex items-center justify-center">
          <TrendingUp className="h-[18px] w-[18px] text-white" />
        </div>
        <span className="text-[17px] font-semibold text-foreground flex-1">Statistiques organisateur</span>
        <ChevronRight className={cn("h-5 w-5 text-muted-foreground transition-transform duration-200", expanded && "rotate-90")} />
      </div>

      {/* Stats - collapsible */}
      {expanded && (
        <>
          {statItems.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === statItems.length - 1;
            return (
              <div key={index}>
                <div className="flex items-center gap-3 px-ios-4 py-3">
                  <div className={cn("h-[30px] w-[30px] rounded-[7px] flex items-center justify-center", item.iconBg)}>
                    <Icon className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[17px] text-foreground">{item.label}</span>
                    <span className="text-[17px] font-semibold text-foreground">{item.value}</span>
                  </div>
                </div>
                {!isLast && <div className="h-px bg-border ml-[54px]" />}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
