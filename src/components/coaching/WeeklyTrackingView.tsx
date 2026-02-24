import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { IOSListGroup } from "@/components/ui/ios-list-item";
import { ChevronLeft, ChevronRight, Search, MessageSquare } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

interface WeeklyTrackingViewProps {
  clubId: string;
  onClose: () => void;
}

interface SessionInfo {
  id: string;
  title: string;
  scheduled_at: string;
}

interface ParticipationInfo {
  coaching_session_id: string;
  user_id: string;
  status: string;
  athlete_note: string | null;
  completed_at: string | null;
}

interface AthleteData {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  days: Record<string, { status: string; note: string | null; sessionTitle: string }>;
  completedCount: number;
  totalCount: number;
}

export const WeeklyTrackingView = ({ clubId, onClose }: WeeklyTrackingViewProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [athletes, setAthletes] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => { loadTracking(); }, [clubId, currentWeek]);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const { data: sessions } = await supabase
        .from("coaching_sessions")
        .select("id, title, scheduled_at")
        .eq("club_id", clubId)
        .gte("scheduled_at", weekStart.toISOString())
        .lte("scheduled_at", weekEnd.toISOString());

      if (!sessions || sessions.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map(s => s.id);
      const sessionMap: Record<string, SessionInfo> = {};
      sessions.forEach(s => { sessionMap[s.id] = s; });

      const { data: participations } = await supabase
        .from("coaching_participations")
        .select("coaching_session_id, user_id, status, athlete_note, completed_at")
        .in("coaching_session_id", sessionIds);

      const userIds = [...new Set((participations || []).map(p => p.user_id))];
      if (userIds.length === 0) {
        setAthletes([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar: string | null }> = {};
      (profiles || []).forEach(p => {
        profileMap[p.user_id!] = { name: p.display_name || "Athlète", avatar: p.avatar_url };
      });

      // Build athlete data
      const athleteMap: Record<string, AthleteData> = {};

      (participations || []).forEach(p => {
        if (!athleteMap[p.user_id]) {
          const profile = profileMap[p.user_id];
          athleteMap[p.user_id] = {
            userId: p.user_id,
            displayName: profile?.name || "Athlète",
            avatarUrl: profile?.avatar || null,
            days: {},
            completedCount: 0,
            totalCount: 0,
          };
        }

        const session = sessionMap[p.coaching_session_id];
        if (!session) return;

        const dayKey = format(new Date(session.scheduled_at), "yyyy-MM-dd");
        athleteMap[p.user_id].days[dayKey] = {
          status: p.status,
          note: p.athlete_note,
          sessionTitle: session.title,
        };
        athleteMap[p.user_id].totalCount++;
        if (p.status === "completed") athleteMap[p.user_id].completedCount++;
      });

      setAthletes(Object.values(athleteMap).sort((a, b) => b.completedCount - a.completedCount));
    } catch (e) {
      console.error("Error loading tracking:", e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter(a => a.displayName.toLowerCase().includes(q));
  }, [athletes, search]);

  const weekLabel = `${format(weekStart, "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM", { locale: fr })}`;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un athlète..."
          className="pl-9 bg-secondary border-0 rounded-[10px] h-9 text-[15px]"
        />
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-primary" />
        </button>
        <span className="text-[15px] font-medium text-foreground min-w-[140px] text-center">
          {weekLabel}
        </span>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 px-1">
        {weekDays.map((day, i) => (
          <div key={i} className="text-center">
            <span className="text-[11px] text-muted-foreground font-medium">{DAY_SHORT[i]}</span>
            <p className="text-[13px] font-medium text-foreground">{format(day, "d")}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-[10px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted-foreground">
            {search ? "Aucun athlète trouvé" : "Aucune donnée cette semaine"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(athlete => {
            const pct = athlete.totalCount > 0 ? Math.round((athlete.completedCount / athlete.totalCount) * 100) : 0;
            const isExpanded = expandedAthlete === athlete.userId;
            const hasNotes = Object.values(athlete.days).some(d => d.note);

            return (
              <IOSListGroup key={athlete.userId}>
                {/* Athlete header */}
                <div
                  className="px-4 py-3 bg-card cursor-pointer"
                  onClick={() => setExpandedAthlete(isExpanded ? null : athlete.userId)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {athlete.avatarUrl ? (
                        <img src={athlete.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[13px] font-semibold text-muted-foreground">
                          {athlete.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-medium text-foreground truncate">{athlete.displayName}</p>
                        <div className="flex items-center gap-1.5">
                          {hasNotes && <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                          <span className="text-[13px] font-semibold text-primary">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly calendar dots */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((day, i) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayData = athlete.days[dayKey];
                      const status = dayData?.status;

                      let dotClass = "bg-muted"; // no session
                      if (status === "completed") dotClass = "bg-green-500";
                      else if (status === "scheduled" || status === "sent") dotClass = "bg-orange-400";

                      return (
                        <div key={i} className="flex justify-center">
                          <div className={`h-3 w-3 rounded-full ${dotClass}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>

                {/* Expanded: session details + notes */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {weekDays.map((day, i) => {
                      const dayKey = format(day, "yyyy-MM-dd");
                      const dayData = athlete.days[dayKey];
                      if (!dayData) return null;

                      const isCompleted = dayData.status === "completed";
                      const dayLabel = format(day, "EEE d", { locale: fr });

                      return (
                        <div key={dayKey} className="px-4 py-2.5 bg-card relative">
                          <div className="flex items-start gap-2">
                            <span className="text-[14px]">{isCompleted ? "✅" : "⬜"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] text-foreground">
                                <span className="text-muted-foreground">{dayLabel}</span>
                                {" — "}
                                <span className={isCompleted ? "text-foreground" : "text-muted-foreground"}>
                                  {dayData.sessionTitle}
                                </span>
                              </p>
                              {dayData.note && (
                                <p className="text-[13px] text-muted-foreground italic mt-0.5">
                                  💬 "{dayData.note}"
                                </p>
                              )}
                              {!dayData.note && isCompleted && (
                                <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                                  Pas de commentaire
                                </p>
                              )}
                            </div>
                          </div>
                          {i < 6 && <div className="absolute bottom-0 left-[52px] right-0 h-px bg-border" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </IOSListGroup>
            );
          })}
        </div>
      )}
    </div>
  );
};
