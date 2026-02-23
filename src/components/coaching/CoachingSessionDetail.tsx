import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ActivityIcon, getActivityLabel } from "@/lib/activityIcons";
import {
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
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
}

interface Participation {
  id: string;
  user_id: string;
  status: string;
  feedback: string | null;
  athlete_note: string | null;
  completed_at: string | null;
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

export const CoachingSessionDetail = ({
  isOpen,
  onClose,
  session,
  isCoach,
}: CoachingSessionDetailProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(false);
  const [myParticipation, setMyParticipation] = useState<Participation | null>(null);
  const [athleteNote, setAthleteNote] = useState("");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

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

      // Load profiles for participants
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

  const handleJoin = async () => {
    if (!session || !user) return;
    try {
      const { error } = await supabase.from("coaching_participations").insert({
        coaching_session_id: session.id,
        user_id: user.id,
        status: "confirmed",
      });
      if (error) throw error;
      toast({ title: "Inscrit !", description: "Vous êtes inscrit à cette séance" });
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    if (!myParticipation) return;
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
      toast({ title: "Séance validée !" });
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleSendFeedback = async (participationId: string) => {
    const feedback = feedbackMap[participationId];
    if (!feedback?.trim()) return;
    try {
      const { error } = await supabase
        .from("coaching_participations")
        .update({ feedback: feedback.trim() })
        .eq("id", participationId);
      if (error) throw error;
      toast({ title: "Feedback envoyé !" });
      setFeedbackMap((prev) => ({ ...prev, [participationId]: "" }));
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    if (!myParticipation) return;
    try {
      const { error } = await supabase
        .from("coaching_participations")
        .delete()
        .eq("id", myParticipation.id);
      if (error) throw error;
      toast({ title: "Désinscrit" });
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  if (!session) return null;

  const isPast = new Date(session.scheduled_at) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {session.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(session.scheduled_at), "EEEE d MMMM à HH:mm", { locale: fr })}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ActivityIcon activityType={session.activity_type} size="sm" />
              <span>{getActivityLabel(session.activity_type)}</span>
              {session.distance_km && <span>• {session.distance_km} km</span>}
              {session.pace_target && <span>• {session.pace_target}</span>}
            </div>
            {session.description && (
              <p className="text-sm text-muted-foreground mt-2">{session.description}</p>
            )}
          </div>

          {/* Athlete actions */}
          {!isCoach && (
            <div className="space-y-3">
              {!myParticipation ? (
                <Button onClick={handleJoin} className="w-full" disabled={isPast}>
                  <Users className="h-4 w-4 mr-2" />
                  {isPast ? "Séance passée" : "Je participe"}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={myParticipation.status === "completed" ? "default" : "secondary"}>
                      {myParticipation.status === "completed" ? "✅ Fait" : "📋 Inscrit"}
                    </Badge>
                    {myParticipation.status !== "completed" && (
                      <Button size="sm" variant="ghost" onClick={handleLeave}>
                        Se désinscrire
                      </Button>
                    )}
                  </div>

                  {myParticipation.status !== "completed" && (
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
                {participations.map((p) => (
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
                          {p.status === "completed" ? "✅ Fait" : "📋 Inscrit"}
                        </Badge>
                      </div>
                      {p.athlete_note && (
                        <p className="text-xs text-muted-foreground mt-1">{p.athlete_note}</p>
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
                            onClick={() => handleSendFeedback(p.id)}
                            disabled={!feedbackMap[p.id]?.trim()}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
