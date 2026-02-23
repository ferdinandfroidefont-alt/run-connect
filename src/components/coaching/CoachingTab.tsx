import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { CreateCoachingSessionDialog } from "./CreateCoachingSessionDialog";
import { CoachingSessionDetail } from "./CoachingSessionDetail";
import { GraduationCap, Plus, Users } from "lucide-react";

interface CoachingSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  activity_type: string;
  distance_km: number | null;
  pace_target: string | null;
  status: string;
  coach_id: string;
  club_id: string;
  participation_count?: number;
}

interface CoachingTabProps {
  clubId: string;
  isCoach: boolean;
}

export const CoachingTab = ({ clubId, isCoach }: CoachingTabProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CoachingSession | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("club_id", clubId)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      // Count participations for each session
      if (data && data.length > 0) {
        const sessionIds = data.map((s) => s.id);
        const { data: counts } = await supabase
          .from("coaching_participations")
          .select("coaching_session_id")
          .in("coaching_session_id", sessionIds);

        const countMap: Record<string, number> = {};
        counts?.forEach((c) => {
          countMap[c.coaching_session_id] = (countMap[c.coaching_session_id] || 0) + 1;
        });

        setSessions(
          data.map((s) => ({ ...s, participation_count: countMap[s.id] || 0 }))
        );
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Error loading coaching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [clubId]);

  const now = new Date();
  const upcoming = sessions.filter((s) => s.status === "planned");
  const past = sessions.filter((s) => s.status !== "planned");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Entraînements
        </h4>
        {isCoach && (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Créer
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune séance d'entraînement</p>
          {isCoach && (
            <p className="text-xs mt-1">Créez votre première séance coaching !</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Plans actifs</p>
              {upcoming.map((s) => (
                <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Terminées</p>
              {past.map((s) => (
                <SessionCard key={s.id} session={s} onClick={() => setSelectedSession(s)} isPast />
              ))}
            </div>
          )}
        </div>
      )}

      <CreateCoachingSessionDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        clubId={clubId}
        onCreated={loadSessions}
      />

      <CoachingSessionDetail
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        isCoach={isCoach}
      />
    </div>
  );
};

const SessionCard = ({
  session,
  onClick,
  isPast,
}: {
  session: CoachingSession;
  onClick: () => void;
  isPast?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
      isPast ? "opacity-60" : ""
    }`}
  >
    <div className="flex items-start gap-3">
      <ActivityIcon activityType={session.activity_type} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{session.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {session.participation_count || 0} inscrit(s)
        </div>
        <div className="flex items-center gap-3 mt-1">
          {session.distance_km && (
            <span className="text-xs text-muted-foreground">{session.distance_km} km</span>
          )}
          {session.pace_target && (
            <span className="text-xs text-muted-foreground">{session.pace_target}</span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {session.participation_count || 0}
          </span>
        </div>
      </div>
    </div>
  </button>
);
