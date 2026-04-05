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
import { CreateSessionWizard } from "@/components/session-creation/CreateSessionWizard";
import type { CoachingSessionPrefill } from "@/components/session-creation/useSessionWizard";
import { CoachingBlocksPreview } from "./CoachingBlocksPreview";
import { RpePhaseStrip } from "./RpePhaseStrip";
import {
  athleteRpeFeltToJson,
  normalizeSessionRpePhases,
  parseAthleteRpeFelt,
  parseSessionRpePhases,
  rpeChipColor,
  rpePhasesFromCoachingRow,
  type SessionRpePhases,
} from "@/lib/sessionBlockRpe";
import {
  Calendar,
  Users,
  CheckCircle2,
  MapPin,
  Send,
  Clock,
  ChevronLeft,
  Loader2,
  MessageSquare,
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
  rpe?: number | null;
  rpe_phases?: unknown;
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
  athlete_rpe_felt?: unknown;
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

interface SessionCommentRow {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: { display_name: string | null; username: string | null };
}

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
  const [batchFeedback, setBatchFeedback] = useState("");
  const [sendingBatch, setSendingBatch] = useState(false);
  const [sessionComments, setSessionComments] = useState<SessionCommentRow[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [feltRpeMy, setFeltRpeMy] = useState<SessionRpePhases>(() => ({
    warmup: 5,
    main: 5,
    cooldown: 5,
  }));

  useEffect(() => {
    if (isOpen && session) {
      setFeedbackMap({});
      setBatchFeedback("");
      setCommentDraft("");
      setFeltRpeMy(rpePhasesFromCoachingRow(session));
      setMyParticipation(null);
      loadParticipations();
    }
  }, [isOpen, session?.id]);

  useEffect(() => {
    if (!session || !isOpen || !myParticipation) return;
    const felt = parseAthleteRpeFelt(myParticipation.athlete_rpe_felt);
    if (felt && Object.keys(felt).length > 0) {
      setFeltRpeMy(normalizeSessionRpePhases(felt));
    } else {
      setFeltRpeMy(rpePhasesFromCoachingRow(session));
    }
  }, [session?.id, isOpen, myParticipation?.id, myParticipation?.athlete_rpe_felt]);

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
        const { data: profiles, error: profError } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);
        if (profError) throw profError;

        const enriched = data.map((p) => ({
          ...p,
          profile: profiles?.find((pr) => pr.user_id === p.user_id),
        }));
        setParticipations(enriched);

        const mine = enriched.find((p) => p.user_id === user?.id);
        setMyParticipation(mine || null);
        setAthleteNote(mine?.athlete_note?.trim() ? mine.athlete_note : "");
      } else {
        setParticipations([]);
        setMyParticipation(null);
        setAthleteNote("");
      }

      const { data: cRows } = await (supabase
        .from("coaching_session_comments") as any)
        .select("id, user_id, message, created_at")
        .eq("coaching_session_id", session.id)
        .order("created_at", { ascending: true });
      if (cRows?.length) {
        const cUserIds = [...new Set(cRows.map((c) => c.user_id))];
        const { data: cProfiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", cUserIds);
        setSessionComments(
          cRows.map((c) => ({
            ...c,
            profile: cProfiles?.find((pr) => pr.user_id === c.user_id),
          })),
        );
      } else {
        setSessionComments([]);
      }
    } catch (error: any) {
      console.error("Error loading participations:", error);
      toast({
        title: "Chargement impossible",
        description: error?.message || "Réessayez dans un instant.",
        variant: "destructive",
      });
      setParticipations([]);
      setMyParticipation(null);
      setAthleteNote("");
      setSessionComments([]);
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
          athlete_rpe_felt: athleteRpeFeltToJson(feltRpeMy),
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

  const handlePostComment = async () => {
    if (!session || !user || !commentDraft.trim()) return;
    setSendingComment(true);
    try {
      const { error } = await supabase.from("coaching_session_comments").insert({
        coaching_session_id: session.id,
        user_id: user.id,
        message: commentDraft.trim(),
      });
      if (error) throw error;
      setCommentDraft("");
      toast({ title: "Message envoyé" });
      loadParticipations();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Réessayez", variant: "destructive" });
    } finally {
      setSendingComment(false);
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

  const withoutFeedback = participations.filter(p => !p.feedback);

  const handleBatchFeedback = async () => {
    if (!batchFeedback.trim() || withoutFeedback.length === 0 || !session) return;
    setSendingBatch(true);
    try {
      const updates = await Promise.all(
        withoutFeedback.map(p =>
          supabase
            .from("coaching_participations")
            .update({ feedback: batchFeedback.trim() })
            .eq("id", p.id)
        )
      );
      const failed = updates.find((r) => r.error);
      if (failed?.error) throw failed.error;
      await Promise.all(
        withoutFeedback.map(p =>
          sendPushNotification(
            p.user_id,
            "💬 Feedback de votre coach",
            session.title,
            "coaching_feedback"
          )
        )
      );
      toast({ title: `Feedback envoyé à ${withoutFeedback.length} athlète(s)` });
      setBatchFeedback("");
      loadParticipations();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSendingBatch(false);
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
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card pt-[max(0.25rem,var(--safe-area-top))] px-ios-4 py-ios-3">
            <DialogTitle className="grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-2 text-ios-headline font-semibold text-foreground">
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 -ml-ios-1 shrink-0 rounded-full touch-manipulation" aria-label="Retour">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-0 truncate text-center">{session.title}</span>
              <div className="h-9 w-9 shrink-0" aria-hidden />
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-ios-4 py-ios-4 space-y-ios-4">
            {/* En-tête séance — style iOS groupé */}
            <div className="ios-card rounded-ios-lg border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-ios-4 bg-secondary/25 dark:bg-secondary/40 border-b border-border/60">
                <div className="flex items-center gap-ios-3 mb-ios-2">
                  <div className="h-12 w-12 rounded-ios-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                    <ActivityIcon activityType={session.activity_type} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ios-caption2 font-semibold text-muted-foreground uppercase tracking-wide">
                      {format(new Date(session.scheduled_at), "EEEE d MMMM", { locale: fr })}
                    </p>
                    <p className="text-ios-title3 text-foreground leading-tight truncate mt-0.5">{session.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-ios-2 text-ios-footnote text-muted-foreground flex-wrap">
                  <ActivityIcon activityType={session.activity_type} size="sm" />
                  <span>{getActivityLabel(session.activity_type)}</span>
                  {session.distance_km ? <span className="tabular-nums">· {session.distance_km} km</span> : null}
                  {session.pace_target ? <span>· {session.pace_target}</span> : null}
                </div>
              </div>
              {session.description ? (
                <p className="text-ios-footnote text-muted-foreground px-ios-4 py-ios-3 border-b border-border/60 leading-relaxed">
                  {session.description}
                </p>
              ) : null}
              {session.coach_notes && (
                <div className="p-ios-3 m-ios-3 rounded-ios-lg bg-primary/8 border border-primary/15">
                  <p className="text-ios-caption2 font-semibold text-primary mb-ios-1">Notes du coach</p>
                  <p className="text-ios-footnote text-foreground leading-relaxed">{session.coach_notes}</p>
                </div>
              )}
            </div>

            {/* Structured blocks preview */}
            {session.session_blocks && Array.isArray(session.session_blocks) && session.session_blocks.length > 0 && (
              <CoachingBlocksPreview blocks={session.session_blocks} />
            )}

            <div className="ios-card rounded-ios-lg border border-border p-ios-4 space-y-ios-3 shadow-sm">
              <h4 className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-ios-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                Fil de la séance
              </h4>
              <div className="max-h-44 overflow-y-auto space-y-ios-2 pr-0.5">
                {sessionComments.length === 0 ? (
                  <p className="text-ios-caption1 text-muted-foreground">Aucun message pour l’instant</p>
                ) : (
                  sessionComments.map((c) => (
                    <div key={c.id} className="rounded-ios-md bg-secondary/50 px-ios-3 py-ios-2 border border-border/50">
                      <p className="text-ios-caption2 text-muted-foreground">
                        {(c.profile?.display_name || c.profile?.username || "Membre") +
                          " · " +
                          format(new Date(c.created_at), "d MMM HH:mm", { locale: fr })}
                      </p>
                      <p className="text-ios-footnote text-foreground mt-0.5 leading-snug">{c.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-ios-2 items-end">
                <Textarea
                  placeholder="Message coach / athlète…"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={2}
                  className="rounded-ios-lg text-ios-footnote border-border bg-background flex-1 min-h-[72px]"
                />
                <Button
                  type="button"
                  size="icon"
                  className="shrink-0 rounded-full h-10 w-10"
                  disabled={!commentDraft.trim() || sendingComment}
                  onClick={() => void handlePostComment()}
                  aria-label="Envoyer"
                >
                  {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Athlete actions */}
            {!isCoach && (
              <div className="space-y-ios-3">
                {!myParticipation || myParticipation.status === "sent" ? (
                  <div className="space-y-ios-2">
                    {myParticipation?.suggested_date && (
                      <div className="p-ios-3 rounded-ios-lg bg-secondary border border-border">
                        <p className="text-ios-footnote text-foreground flex items-center gap-ios-2 flex-wrap">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">Le coach suggère :</span>
                          <span className="text-muted-foreground">
                            {format(new Date(myParticipation.suggested_date), "EEE d MMM à HH:mm", { locale: fr })}
                          </span>
                        </p>
                      </div>
                    )}
                    <Button type="button" onClick={() => setShowSchedule(true)} className="w-full rounded-full h-11 text-ios-footnote font-semibold touch-manipulation">
                      <Calendar className="h-4 w-4 mr-ios-2 shrink-0" />
                      Programmer ma séance
                    </Button>
                  </div>
                ) : (
                  <div className="ios-card rounded-ios-lg border border-border p-ios-3 space-y-ios-2 shadow-sm">
                    <div className="flex items-center gap-ios-2">
                      <Badge variant={myParticipation.status === "completed" ? "default" : "secondary"} className="rounded-full text-ios-caption1 font-medium">
                        {STATUS_CONFIG[myParticipation.status]?.label}
                      </Badge>
                    </div>

                    {myParticipation.scheduled_at && (
                      <div className="text-ios-footnote text-muted-foreground flex items-center gap-ios-1 flex-wrap">
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
                      <p className="text-ios-footnote text-muted-foreground">Allure : {myParticipation.custom_pace}</p>
                    )}

                    {myParticipation.status === "scheduled" && (
                      <div className="space-y-ios-2 pt-ios-1 border-t border-border/60">
                        <p className="text-ios-caption2 font-medium text-muted-foreground">RPE ressenti</p>
                        <RpePhaseStrip value={feltRpeMy} onChange={setFeltRpeMy} />
                        <Textarea
                          placeholder="Comment ça s'est passé ? (optionnel)"
                          value={athleteNote}
                          onChange={(e) => setAthleteNote(e.target.value)}
                          rows={2}
                          className="rounded-ios-lg text-ios-footnote border-border bg-background"
                        />
                        <Button type="button" size="sm" onClick={handleComplete} className="rounded-full w-full sm:w-auto">
                          <CheckCircle2 className="h-4 w-4 mr-ios-1 shrink-0" />
                          Marquer comme fait
                        </Button>
                      </div>
                    )}

                    {myParticipation.feedback && (
                      <div className="p-ios-3 rounded-ios-lg bg-primary/8 border border-primary/15">
                        <p className="text-ios-footnote font-semibold text-primary mb-ios-1">Feedback du coach</p>
                        <p className="text-ios-subheadline text-foreground leading-relaxed">{myParticipation.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Coach view: completion rate */}
            {isCoach && participations.length > 0 && (
              <div className="ios-card rounded-ios-lg border border-border p-ios-4 space-y-ios-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ios-headline font-semibold text-foreground">Taux de complétion</span>
                  <span className="text-ios-title3 font-bold text-foreground tabular-nums">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2 rounded-full" />
                <div className="flex flex-wrap gap-x-ios-4 gap-y-ios-1 text-ios-caption1 text-muted-foreground">
                  <span>{sentCount} envoyée{sentCount > 1 ? "s" : ""}</span>
                  <span>{scheduledCount} programmée{scheduledCount > 1 ? "s" : ""}</span>
                  <span>{completedCount} effectuée{completedCount > 1 ? "s" : ""}</span>
                  {missedCount > 0 ? <span className="text-destructive">{missedCount} manquée{missedCount > 1 ? "s" : ""}</span> : null}
                </div>
              </div>
            )}

            {/* Batch feedback */}
            {isCoach && withoutFeedback.length > 0 && (
              <div className="ios-card rounded-ios-lg border border-border p-ios-4 space-y-ios-2 shadow-sm">
                <p className="text-ios-headline font-semibold text-foreground">Feedback global</p>
                <Textarea
                  placeholder="Écrire un feedback pour tous les athlètes sans retour..."
                  value={batchFeedback}
                  onChange={(e) => setBatchFeedback(e.target.value)}
                  rows={2}
                  className="text-ios-footnote rounded-ios-lg bg-secondary/50 border border-border/60"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBatchFeedback}
                  disabled={!batchFeedback.trim() || sendingBatch}
                  className="w-full rounded-full"
                >
                  {sendingBatch ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer à {withoutFeedback.length} athlète{withoutFeedback.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}

            {/* Participants list */}
            <div>
              <h4 className="text-ios-footnote font-semibold text-muted-foreground uppercase tracking-wide mb-ios-2 flex items-center gap-ios-2">
                <Users className="h-4 w-4 shrink-0" />
                Participants ({participations.length})
              </h4>
              {participations.length === 0 ? (
                <p className="text-ios-footnote text-muted-foreground">Aucun inscrit pour le moment</p>
              ) : (
                <div className="space-y-ios-2 max-h-52 overflow-y-auto pr-0.5">
                  {participations.map((p) => {
                    const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.sent;
                    return (
                      <div key={p.id} className="flex items-start gap-ios-3 p-ios-3 rounded-ios-lg bg-secondary/40 border border-border/60">
                        <Avatar className="h-9 w-9 ring-2 ring-background">
                          <AvatarImage src={p.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            {(p.profile?.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-ios-2 flex-wrap">
                            <span className="text-ios-footnote font-semibold text-foreground truncate">
                              {p.profile?.display_name || p.profile?.username}
                            </span>
                            <Badge variant="outline" className="text-ios-caption2 rounded-full px-ios-2 py-0 font-normal border-border">
                              {statusConf.label}
                            </Badge>
                          </div>
                          {p.suggested_date && isCoach && (
                            <p className="text-ios-caption1 mt-0.5">
                              Suggéré : {format(new Date(p.suggested_date), "d MMM HH:mm", { locale: fr })}
                            </p>
                          )}
                          {p.scheduled_at && (
                            <p className="text-ios-caption1 mt-0.5">
                              {format(new Date(p.scheduled_at), "d MMM HH:mm", { locale: fr })}
                              {p.location_name && ` · ${p.location_name}`}
                            </p>
                          )}
                          {p.custom_pace && (
                            <p className="text-ios-caption1">{p.custom_pace}</p>
                          )}
                          {p.athlete_note && (
                            <p className="text-ios-caption1 mt-ios-1 leading-snug">{p.athlete_note}</p>
                          )}
                          {isCoach &&
                            p.status === "completed" &&
                            (() => {
                              const planned = parseSessionRpePhases(session.rpe_phases);
                              const pk = (["warmup", "main", "cooldown"] as const).filter(
                                (k) => planned && typeof planned[k] === "number",
                              );
                              const felt = parseAthleteRpeFelt(p.athlete_rpe_felt);
                              const fk = felt
                                ? (["warmup", "main", "cooldown"] as const).filter((k) => typeof felt[k] === "number")
                                : [];
                              const legacy =
                                typeof session.rpe === "number" && session.rpe >= 1 && session.rpe <= 10
                                  ? session.rpe
                                  : null;
                              if (pk.length === 0 && legacy == null && fk.length === 0) return null;
                              return (
                                <div className="mt-ios-1 flex flex-wrap gap-x-3 gap-y-1 text-ios-caption1">
                                  {(pk.length > 0 || legacy != null) && (
                                    <span className="flex flex-wrap items-center gap-1">
                                      <span className="text-muted-foreground">Prévu</span>
                                      {pk.length > 0
                                        ? pk.map((k) => {
                                            const n = planned![k] as number;
                                            return (
                                              <span
                                                key={k}
                                                className="font-bold text-white rounded px-1 py-0.5 tabular-nums"
                                                style={{ backgroundColor: rpeChipColor(n) }}
                                              >
                                                {n}
                                              </span>
                                            );
                                          })
                                        : legacy != null && (
                                            <span
                                              className="font-bold text-white rounded px-1 py-0.5 tabular-nums"
                                              style={{ backgroundColor: rpeChipColor(legacy) }}
                                            >
                                              {legacy}
                                            </span>
                                          )}
                                    </span>
                                  )}
                                  {fk.length > 0 && (
                                    <span className="flex flex-wrap items-center gap-1">
                                      <span className="text-muted-foreground">Ressenti</span>
                                      {fk.map((k) => {
                                        const n = felt![k] as number;
                                        return (
                                          <span
                                            key={k}
                                            className="font-bold text-white rounded px-1 py-0.5 tabular-nums"
                                            style={{ backgroundColor: rpeChipColor(n) }}
                                          >
                                            {n}
                                          </span>
                                        );
                                      })}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          {p.custom_notes && (
                            <p className="text-ios-caption1 mt-ios-1 italic leading-snug">{p.custom_notes}</p>
                          )}
                          {p.feedback && (
                            <div className="mt-ios-2 p-ios-2 rounded-ios-md bg-primary/8 border border-primary/15 text-ios-caption1 leading-snug">
                              <span className="font-semibold text-primary">Coach · </span>
                              {p.feedback}
                            </div>
                          )}

                          {/* Coach feedback input */}
                          {isCoach && !p.feedback && (
                            <div className="flex gap-ios-1 mt-ios-2">
                              <Textarea
                                placeholder="Feedback…"
                                value={feedbackMap[p.id] || ""}
                                onChange={(e) =>
                                  setFeedbackMap((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                                rows={1}
                                className="text-ios-caption1 min-h-[36px] rounded-ios-md border-border"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="shrink-0 rounded-full h-9 w-9"
                                onClick={() => handleSendFeedback(p.id, p.user_id)}
                                disabled={!feedbackMap[p.id]?.trim()}
                              >
                                <Send className="h-4 w-4" />
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
          suggestedDate: myParticipation?.suggested_date,
        } as CoachingSessionPrefill : null}
        onCoachingScheduled={loadParticipations}
      />
    </>
  );
};
