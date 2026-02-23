import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { CoachingBlocksPreview } from "./CoachingBlocksPreview";
import { ScheduleCoachingDialog } from "./ScheduleCoachingDialog";
import { GraduationCap, Calendar } from "lucide-react";

interface CoachingMessageCardProps {
  coachingSessionId: string;
  currentUserId: string;
}

export const CoachingMessageCard = ({ coachingSessionId, currentUserId }: CoachingMessageCardProps) => {
  const [session, setSession] = useState<any>(null);
  const [participation, setParticipation] = useState<any>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [coachingSessionId]);

  const loadData = async () => {
    try {
      const { data: sessionData } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("id", coachingSessionId)
        .single();
      setSession(sessionData);

      const { data: partData } = await supabase
        .from("coaching_participations")
        .select("*")
        .eq("coaching_session_id", coachingSessionId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      setParticipation(partData);
    } catch (e) {
      console.error("Error loading coaching card:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !session) return null;

  const isScheduled = participation?.status === "scheduled" || participation?.status === "completed";

  return (
    <>
      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-2 max-w-[280px]">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">Séance Coach</span>
        </div>

        <p className="font-medium text-sm">{session.title}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ActivityIcon activityType={session.activity_type} size="sm" />
          <span>{getActivityLabel(session.activity_type)}</span>
          {session.distance_km && <span>• {session.distance_km} km</span>}
        </div>

        {session.session_blocks && Array.isArray(session.session_blocks) && session.session_blocks.length > 0 && (
          <div className="mt-1">
            <CoachingBlocksPreview blocks={session.session_blocks} />
          </div>
        )}

        {!isScheduled ? (
          <Button size="sm" className="w-full mt-2" onClick={() => setShowSchedule(true)}>
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Programmer ma séance
          </Button>
        ) : (
          <Badge variant="default" className="text-xs">
            {participation?.status === "completed" ? "✅ Effectuée" : "📍 Programmée"}
          </Badge>
        )}
      </div>

      <ScheduleCoachingDialog
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        session={session}
        onScheduled={loadData}
        suggestedDate={participation?.suggested_date}
      />
    </>
  );
};
