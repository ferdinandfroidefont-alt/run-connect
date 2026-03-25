import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { CoachingBlocksPreview } from "./CoachingBlocksPreview";
import { CreateSessionWizard } from "@/components/session-creation/CreateSessionWizard";
import type { CoachingSessionPrefill } from "@/components/session-creation/useSessionWizard";
import { GraduationCap, Calendar } from "lucide-react";
import { formatDistanceKm } from "@/lib/distanceUnits";
import { useDistanceUnit } from "@/contexts/DistanceUnitContext";

interface CoachingMessageCardProps {
  coachingSessionId: string;
  currentUserId: string;
}

export const CoachingMessageCard = ({ coachingSessionId, currentUserId }: CoachingMessageCardProps) => {
  const { distanceUnit } = useDistanceUnit();
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
      <div className="max-w-[min(280px,100%)] ios-card rounded-ios-lg border border-border bg-card p-ios-3 space-y-ios-2 shadow-sm">
        <div className="flex items-center gap-ios-2">
          <div className="h-8 w-8 rounded-ios-md bg-primary/12 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4 text-primary" />
          </div>
          <span className="text-ios-footnote font-semibold text-foreground">Séance coach</span>
        </div>

        <p className="text-ios-headline font-semibold text-foreground leading-snug">{session.title}</p>

        <div className="flex items-center flex-wrap gap-x-ios-2 gap-y-0.5 text-ios-caption1 text-muted-foreground">
          <ActivityIcon activityType={session.activity_type} size="sm" />
          <span>{getActivityLabel(session.activity_type)}</span>
          {session.distance_km ? (
            <span className="tabular-nums">
              · {formatDistanceKm(session.distance_km, distanceUnit)}
            </span>
          ) : null}
        </div>

        {session.session_blocks && Array.isArray(session.session_blocks) && session.session_blocks.length > 0 && (
          <div className="pt-ios-1 border-t border-border/60">
            <CoachingBlocksPreview blocks={session.session_blocks} />
          </div>
        )}

        {!isScheduled ? (
          <Button
            type="button"
            size="sm"
            className="w-full mt-ios-1 rounded-full h-9 text-ios-footnote font-medium touch-manipulation"
            onClick={() => setShowSchedule(true)}
          >
            <Calendar className="h-3.5 w-3.5 mr-ios-1 shrink-0" />
            Programmer ma séance
          </Button>
        ) : (
          <Badge
            variant="secondary"
            className="text-ios-caption1 font-medium rounded-full px-ios-3 py-0.5 border border-border bg-secondary"
          >
            {participation?.status === "completed" ? "Effectuée" : "Programmée"}
          </Badge>
        )}
      </div>

      <CreateSessionWizard
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        onSessionCreated={() => {}}
        map={null}
        coachingSession={session ? {
          id: session.id,
          title: session.title,
          activity_type: session.activity_type,
          description: session.description,
          distance_km: session.distance_km,
          pace_target: session.pace_target,
          session_blocks: session.session_blocks,
          club_id: session.club_id,
          coach_id: session.coach_id,
          coach_notes: session.coach_notes,
          scheduled_at: session.scheduled_at,
          suggestedDate: participation?.suggested_date,
        } as CoachingSessionPrefill : null}
        onCoachingScheduled={loadData}
      />
    </>
  );
};
