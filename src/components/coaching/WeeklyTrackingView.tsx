import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
}

interface AthleteRow {
  userId: string;
  displayName: string;
  days: Record<string, "completed" | "scheduled" | "sent" | "none">;
  completionRate: number;
}

export const WeeklyTrackingView = ({ clubId, onClose }: WeeklyTrackingViewProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadTracking();
  }, [clubId, currentWeek]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      // Get coaching sessions for this week
      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, scheduled_at")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString());

      if (!sessions || sessions.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);

      // Get participations
      const { data: participations } = await supabase
        .from("coaching_participations")
        .select("user_id, coaching_session_id, status")
        .in("coaching_session_id", sessionIds);

      // Get unique user IDs
      const userIds = [...new Set((participations || []).map(p => p.user_id))];
      if (userIds.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id!] = p.display_name || "Athlète"; });

      // Map session -> day
      const sessionDayMap: Record<string, string> = {};
      sessions.forEach(s => { sessionDayMap[s.id] = format(new Date(s.scheduled_at), "yyyy-MM-dd"); });

      // Build athlete rows
      const athleteMap: Record<string, AthleteRow> = {};

      (participations || []).forEach(p => {
        if (!athleteMap[p.user_id]) {
          athleteMap[p.user_id] = {
            userId: p.user_id,
            displayName: profileMap[p.user_id] || "Athlète",
            days: {},
            completionRate: 0,
          };
        }
        const dayKey = sessionDayMap[p.coaching_session_id];
        if (dayKey) {
          const current = athleteMap[p.user_id].days[dayKey];
          // Prioritize: completed > scheduled > sent
          if (p.status === "completed" || current !== "completed") {
            athleteMap[p.user_id].days[dayKey] = p.status as any;
          }
        }
      });

      // Compute completion rates
      const totalSessionDays = new Set(Object.values(sessionDayMap)).size;
      Object.values(athleteMap).forEach(a => {
        const completed = Object.values(a.days).filter(s => s === "completed").length;
        a.completionRate = totalSessionDays > 0 ? Math.round((completed / totalSessionDays) * 100) : 0;
      });

      setAthletes(Object.values(athleteMap).sort((a, b) => b.completionRate - a.completionRate));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string | undefined) => {
    switch (status) {
      case "completed": return "✅";
      case "scheduled": return "🕒";
      case "sent": return "❌";
      default: return "—";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          ← Retour
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium">
            {format(weekStart, "d MMM", { locale: fr })} — {format(weekEnd, "d MMM", { locale: fr })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
      ) : athletes.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-8">Aucune donnée cette semaine</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 pr-2 font-medium">Athlète</th>
                {DAY_LABELS.map(d => <th key={d} className="text-center py-1.5 px-1 font-medium">{d}</th>)}
                <th className="text-right py-1.5 pl-2 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map(a => (
                <tr key={a.userId} className="border-b border-muted/50">
                  <td className="py-1.5 pr-2 truncate max-w-[100px]">{a.displayName}</td>
                  {weekDays.map(day => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    return <td key={dayKey} className="text-center py-1.5 px-1">{statusIcon(a.days[dayKey])}</td>;
                  })}
                  <td className="text-right py-1.5 pl-2 font-medium">{a.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
