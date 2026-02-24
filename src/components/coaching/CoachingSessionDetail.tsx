import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSendNotification } from "@/hooks/useSendNotification";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import { ScheduleCoachingDialog } from "./ScheduleCoachingDialog";
import { CoachingBlocksPreview } from "./CoachingBlocksPreview";
import {
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  MapPin,
  Send,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  session_blocks?: any;
  coach_notes?: string | null;
}

interface Participation {
  id: string;
  user_id: string;
  status: string;
  feedback: string | null;
  athlete_note: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
  location_name: string | null;
  suggested_date: string | null;
  custom_pace: string | null;
  custom_notes: string | null;
  profile?: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface CoachingSessionDetailProps {
  isOpen: boolean;
  onClose: () => void;
  session: CoachingSession | null;
  isCoach: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  sent: { label: "Envoyée", emoji: "📨", color: "secondary" },
  confirmed: { label: "Inscrit", emoji: "📋", color: "secondary" },
  scheduled: { label: "Programmée", emoji: "📍", color: "outline" },
  completed: { label: "Effectuée", emoji: "✅", color: "default" },
  missed: { label: "Non effectuée", emoji: "❌", color: "destructive" },
};

export const CoachingSessionDetail = ({
  isOpen,
  onClose,
  session,
  isCoach,
}: CoachingSessionDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPushNotification } = useSendNotification();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(false);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [athleteNote, setAthleteNote] = useState("");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    if (isOpen && session) {
      loadParticipations();
    }
  }, [isOpen, session]);

  const loadParticipations = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coaching_participations")
        .select("*")
        .eq("coaching_session_id", session.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        const enriched = data.map((p) => ({
          ...p,
          profile: profiles?.find((pr) => pr.user_id === p.user_id),
        }));
        setParticipations(enriched);

        const mine = enriched.find((p) => p.user_id === user?.id);
        setMyParticipation(mine || null);
        if (mine?.athlete_note) setAthleteNote(mine.athlete_note);
      } else {
        setParticipations([]);
        setMyParticipation(null);
      }
    } catch (error) {
      console.error("Error loading participations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!myParticipation || !session) return;
    try {
      const { error } = await supabase
        .from("coaching_participations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          athlete_note: athleteNote.trim() || null,
        })
        .eq("id", myParticipation.id);
      if (error) throw error;

      // Notify coach
      const { data: athleteProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", user?.id || "")
        .single();
      const athleteName = athleteProfile?.display_name || athleteProfile?.username || "Un athlète";
      sendPushNotification(
        session.coach_id,
        `✅ ${athleteName} a terminé`,
        session.title,
        "coaching_completed"
      );

      toast({ title: "Séance validée !" });
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleSendFeedback = async (participationId: string, athleteUserId: string) => {
    const feedback = feedbackMap[participationId];
    if (!feedback?.trim()) return;
    try {
      const { error } = await supabase
        .from("coaching_participations")
        .update({ feedback: feedback.trim() })
        .eq("id", participationId);
      if (error) throw error;

      // Notify athlete
      sendPushNotification(
        athleteUserId,
        "💬 Nouveau feedback de votre coach",
        session?.title || "",
        "coaching_feedback"
      );

      toast({ title: "Feedback envoyé !" });
      setFeedbackMap((prev) => ({ ...prev, [participationId]: "" }));
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (!session) return null;

  const completedCount = participations.filter((p) => p.status === "completed").length;
  const scheduledCount = participations.filter((p) => p.status === "scheduled").length;
  const sentCount = participations.filter((p) => p.status === "sent" || p.status === "confirmed").length;
  const missedCount = participations.filter((p) => p.status === "missed").length;
  const completionRate = participations.length > 0 ? Math.round((completedCount / participations.length) * 100) : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton>
          <DialogHeader className="sticky top-0 bg-background z-10 border-b p-4">
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <GraduationCap className="h-5 w-5" />
              <span className="truncate">{session.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Session Info */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <ActivityIcon activityType={session.activity_type} size="sm" />
                <span>{getActivityLabel(session.activity_type)}</span>
                {session.distance_km && <span>• {session.distance_km} km</span>}
                {session.pace_target && <span>• {session.pace_target}</span>}
              </div>
              {session.description && (
                <p className="text-sm text-muted-foreground">{session.description}</p>
              )}
              {session.coach_notes && (
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 mt-2">
                  <p className="text-xs font-medium text-primary mb-0.5">📝 Notes du coach</p>
                  <p className="text-xs">{session.coach_notes}</p>
                </div>
              )}
            </div>

            {/* Structured blocks preview */}
            {session.session_blocks && Array.isArray(session.session_blocks) && session.session_blocks.length > 0 && (
              <CoachingBlocksPreview blocks={session.session_blocks} />
            )}

            {/* Athlete actions */}
            {!isCoach && (
              <div className="space-y-3">
                {!myParticipation || myParticipation.status === "sent" ? (
                  <div className="space-y-2">
                    {myParticipation?.suggested_date && (
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">Le coach suggère :</span>
                          {format(new Date(myParticipation.suggested_date), "EEE d MMM à HH:mm", { locale: fr })}
                        </p>
                      </div>
                    )}
                    <Button onClick={() => setShowSchedule(true)} className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Programmer ma séance
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={myParticipation.status === "completed" ? "default" : "secondary"}>
                        {STATUS_CONFIG[myParticipation.status]?.emoji} {STATUS_CONFIG[myParticipation.status]?.label}
                      </Badge>
                    </div>

                    {myParticipation.scheduled_at && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(myParticipation.scheduled_at), "EEE d MMM à HH:mm", { locale: fr })}
                        {myParticipation.location_name && (
                          <>
                            <MapPin className="h-3 w-3 ml-2" />
                            {myParticipation.location_name}
                          </>
                        )}
                      </div>
                    )}

                    {myParticipation.custom_pace && (
                      <p className="text-xs text-muted-foreground">🏃 Mon allure : {myParticipation.custom_pace}</p>
                    )}

                    {myParticipation.status === "scheduled" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Comment ça s'est passé ? (optionnel)"
                          value={athleteNote}
                          onChange={(e) => setAthleteNote(e.target.value)}
                          rows={2}
                        />
                        <Button size="sm" onClick={handleComplete}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Marquer comme fait
                        </Button>
                      </div>
                    )}

                    {myParticipation.feedback && (
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs font-medium text-primary mb-1">Feedback du coach</p>
                        <p className="text-sm">{myParticipation.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Coach view: completion rate */}
            {isCoach && participations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Taux de complétion</span>
                  <span className="text-muted-foreground">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>📨 {sentCount} envoyée(s)</span>
                  <span>📍 {scheduledCount} programmée(s)</span>
                  <span>✅ {completedCount} fait(s)</span>
                  {missedCount > 0 && <span>❌ {missedCount} manquée(s)</span>}
                </div>
              </div>
            )}

            {/* Participants list */}
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({participations.length})
              </h4>
              {participations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun inscrit pour le moment</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {participations.map((p) => {
                    const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.sent;
                    return (
                      <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={p.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            {(p.profile?.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {p.profile?.display_name || p.profile?.username}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {statusConf.emoji}
                            </Badge>
                          </div>
                          {p.suggested_date && isCoach && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              💡 Suggéré : {format(new Date(p.suggested_date), "d MMM HH:mm", { locale: fr })}
                            </p>
                          )}
                          {p.scheduled_at && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(p.scheduled_at), "d MMM HH:mm", { locale: fr })}
                              {p.location_name && ` • ${p.location_name}`}
                            </p>
                          )}
                          {p.custom_pace && (
                            <p className="text-xs text-muted-foreground">🏃 {p.custom_pace}</p>
                          )}
                          {p.athlete_note && (
                            <p className="text-xs text-muted-foreground mt-1">{p.athlete_note}</p>
                          )}
                          {p.custom_notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{p.custom_notes}</p>
                          )}
                          {p.feedback && (
                            <div className="mt-1 p-1.5 rounded bg-primary/10 text-xs">
                              <span className="font-medium text-primary">Coach: </span>
                              {p.feedback}
                            </div>
                          )}

                          {/* Coach feedback input */}
                          {isCoach && !p.feedback && (
                            <div className="flex gap-1 mt-2">
                              <Textarea
                                placeholder="Feedback..."
                                value={feedbackMap[p.id] || ""}
                                onChange={(e) =>
                                  setFeedbackMap((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                                rows={1}
                                className="text-xs min-h-[32px]"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendFeedback(p.id, p.user_id)}
                                disabled={!feedbackMap[p.id]?.trim()}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </DialogContent>
      </Dialog>

      <ScheduleCoachingDialog
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        session={session}
        onScheduled={loadParticipations}
        suggestedDate={myParticipation?.suggested_date}
      />
    </>
  );
};
