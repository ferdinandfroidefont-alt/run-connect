import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, User, Star, Trash2, Route, Share2, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RoutePreview } from "./RoutePreview";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "./ShareSessionToConversationDialog";
import { SessionQuestions } from "./SessionQuestions";
import { useAdMob } from '@/hooks/useAdMob';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  session_type: string;
  intensity: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  organizer_id: string;
  image_url?: string;
  distance_km?: number;
  pace_general?: string;
  pace_unit?: string;
  interval_distance?: number;
  interval_pace?: string;
  interval_pace_unit?: string;
  interval_count?: number;
  profiles: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  routes?: {
    id: string;
    name: string;
    coordinates: any[];
    total_distance: number;
    total_elevation_gain: number;
  } | null;
}

interface SessionDetailsDialogProps {
  session: Session | null;
  onClose: () => void;
  onSessionUpdated: () => void;
}

// iOS Settings style row component
const SettingsRow = ({ 
  icon: Icon, 
  iconBg, 
  label, 
  value, 
  onClick,
  showChevron = false 
}: { 
  icon: any; 
  iconBg: string; 
  label: string; 
  value?: React.ReactNode; 
  onClick?: () => void;
  showChevron?: boolean;
}) => (
  <div 
    className={`flex items-center gap-3 px-4 py-3 bg-background ${onClick ? 'cursor-pointer active:bg-secondary/50' : ''}`}
    onClick={onClick}
  >
    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className="h-4 w-4 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[15px] text-foreground">{label}</span>
    </div>
    {value && (
      <span className="text-[15px] text-muted-foreground truncate max-w-[50%] text-right">{value}</span>
    )}
    {showChevron && <ChevronRight className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />}
  </div>
);

const SettingsSeparator = () => (
  <div className="h-px bg-border ml-[60px]" />
);

export const SessionDetailsDialog = ({ session, onClose, onSessionUpdated }: SessionDetailsDialogProps) => {
  const { user, subscriptionInfo } = useAuth();
  const { showAdAfterJoiningSession } = useAdMob(subscriptionInfo?.subscribed || false);
  const { toast } = useToast();
  const { validatePresence, validating: validatingGPS } = useGPSValidation();
  const { sendPushNotification } = useSendNotification();
  const { setHideBottomNav } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showOrganizerProfile, setShowOrganizerProfile] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [gpsValidated, setGpsValidated] = useState(false);

  // Hide bottom nav when dialog opens
  useEffect(() => {
    if (session) {
      setHideBottomNav(true);
    }
    return () => setHideBottomNav(false);
  }, [session, setHideBottomNav]);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user || !session) return;

      const { data: requestData } = await supabase
        .from('session_requests')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      setHasRequested(!!requestData);

      const { data: participantData } = await supabase
        .from('session_participants')
        .select('id, confirmed_by_gps')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsParticipant(!!participantData);
      setGpsValidated(participantData?.confirmed_by_gps || false);
    };

    checkUserStatus();
  }, [user, session]);

  if (!session) return null;

  const isOrganizer = user?.id === session.organizer_id;
  const isScheduled = new Date(session.scheduled_at) > new Date();
  const isFull = session.max_participants && session.current_participants >= session.max_participants;

  const getActivityLabel = (activityType: string) => {
    const labels: Record<string, string> = {
      'course': 'Course',
      'velo': 'Vélo',
      'marche': 'Marche',
      'natation': 'Natation'
    };
    return labels[activityType] || activityType;
  };

  const getSessionTypeLabel = (sessionType: string) => {
    const labels: Record<string, string> = {
      'footing': 'Footing',
      'sortie_longue': 'Sortie longue',
      'fractionne': 'Fractionné',
      'competition': 'Compétition',
      'recuperation': 'Récupération'
    };
    return labels[sessionType] || sessionType;
  };

  const handleRequestJoin = async () => {
    if (!user || !isScheduled) return;

    setLoading(true);
    try {
      const { data: existingRequest } = await supabase
        .from('session_requests')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .single();

      if (existingRequest) {
        toast({ title: "Vous avez déjà fait une demande pour cette séance" });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();

      const { error: requestError } = await supabase
        .from('session_requests')
        .insert([{
          session_id: session.id,
          user_id: user.id,
          requester_name: profile?.username || profile?.display_name || 'Utilisateur',
          requester_avatar: profile?.avatar_url
        }]);

      if (requestError) throw requestError;

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([{
          user_id: session.organizer_id,
          title: 'Nouvelle demande de participation',
          message: `${profile?.username || profile?.display_name || 'Quelqu\'un'} souhaite rejoindre votre séance "${session.title}"`,
          type: 'session_request',
          data: {
            session_id: session.id,
            request_user_id: user.id,
            session_title: session.title,
            requester_name: profile?.username || profile?.display_name || 'Utilisateur',
            requester_avatar: profile?.avatar_url
          }
        }]);

      if (notificationError) throw notificationError;

      await sendPushNotification(
        session.organizer_id,
        'Nouvelle demande de participation',
        `${profile?.username || profile?.display_name || 'Quelqu\'un'} souhaite rejoindre votre séance "${session.title}"`,
        'session_request',
        {
          session_id: session.id,
          request_user_id: user.id,
          session_title: session.title,
          requester_name: profile?.username || profile?.display_name || 'Utilisateur',
          requester_avatar: profile?.avatar_url
        }
      );

      setHasRequested(true);
      toast({ title: "Demande envoyée !", description: "Le créateur va recevoir votre demande" });
      showAdAfterJoiningSession();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('session_requests')
        .delete()
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setHasRequested(false);
      toast({ title: "Demande annulée", description: "Votre demande de participation a été annulée" });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGPSValidation = async () => {
    if (!user || !session) return;

    const result = await validatePresence(
      session.id,
      session.location_lat,
      session.location_lng,
      session.scheduled_at,
      user.id
    );

    if (result.success) {
      setGpsValidated(true);
      toast({ 
        title: "✅ GPS validé", 
        description: `Présence confirmée (${result.distance}m du point de RDV)` 
      });
      onSessionUpdated();
    } else {
      toast({ 
        title: "❌ Validation GPS impossible", 
        description: result.error, 
        variant: "destructive" 
      });
    }
  };

  const handleLeaveSession = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error: leaveError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', session.id)
        .eq('user_id', user.id);

      if (leaveError) throw leaveError;

      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          current_participants: Math.max(0, session.current_participants - 1)
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setIsParticipant(false);
      toast({ title: "Vous avez quitté la séance" });
      onSessionUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!user || !isOrganizer) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette séance ?")) {
      return;
    }

    setLoading(true);
    try {
      const { error: participantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', session.id);

      if (participantsError) throw participantsError;

      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', session.id);

      if (sessionError) throw sessionError;

      toast({ title: "Séance supprimée avec succès" });
      onSessionUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 fixed inset-0 max-w-full h-full sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:inset-auto sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:rounded-xl bg-secondary border-0 rounded-none sm:rounded-xl">
        {/* iOS Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between h-[56px] px-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px]">Retour</span>
            </button>
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-[17px] font-semibold text-foreground">
              Détails
            </h1>
            <div className="w-16" />
          </div>
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-56px)] sm:h-auto sm:max-h-[calc(90vh-56px)]">
          <div className="pb-8">
            {/* Session Header Card */}
            <div className="bg-background mt-6 mx-4 rounded-xl overflow-hidden">
              {session.image_url && (
                <img 
                  src={session.image_url} 
                  alt={session.title}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <h2 className="text-[20px] font-semibold text-foreground mb-2">{session.title}</h2>
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setShowOrganizerProfile(true)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.profiles.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(session.profiles.username || session.profiles.display_name)?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[15px] text-muted-foreground">
                    Organisé par {session.profiles.username || session.profiles.display_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Activity Type Section */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Informations</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <SettingsRow
                  icon={Star}
                  iconBg="bg-[#FF9500]"
                  label="Activité"
                  value={getActivityLabel(session.activity_type)}
                />
                <SettingsSeparator />
                <SettingsRow
                  icon={Route}
                  iconBg="bg-[#5856D6]"
                  label="Type de séance"
                  value={getSessionTypeLabel(session.session_type)}
                />
                <SettingsSeparator />
                <SettingsRow
                  icon={Calendar}
                  iconBg="bg-[#FF3B30]"
                  label="Date"
                  value={format(new Date(session.scheduled_at), "d MMM yyyy, HH:mm", { locale: fr })}
                />
                {session.distance_km && (
                  <>
                    <SettingsSeparator />
                    <SettingsRow
                      icon={Route}
                      iconBg="bg-[#34C759]"
                      label="Distance"
                      value={`${session.distance_km} km`}
                    />
                  </>
                )}
                {session.pace_general && (session.session_type === 'footing' || session.session_type === 'sortie_longue') && (
                  <>
                    <SettingsSeparator />
                    <SettingsRow
                      icon={Clock}
                      iconBg="bg-[#007AFF]"
                      label="Allure"
                      value={
                        session.activity_type === 'course' 
                          ? `${session.pace_general}/km`
                          : session.activity_type === 'natation'
                            ? `${session.pace_general}/100m`
                            : session.activity_type === 'velo' && session.pace_unit === 'power'
                              ? `${session.pace_general} W`
                              : `${session.pace_general} km/h`
                      }
                    />
                  </>
                )}
              </div>
            </div>

            {/* Fractionné Info */}
            {session.session_type === 'fractionne' && (session.interval_distance || session.interval_pace || session.interval_count) && (
              <div className="mt-6 mx-4">
                <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Fractionné</p>
                <div className="bg-background rounded-xl overflow-hidden">
                  {session.interval_count && session.interval_distance && (
                    <SettingsRow
                      icon={Route}
                      iconBg="bg-[#FF9500]"
                      label="Séries"
                      value={`${session.interval_count} × ${session.interval_distance} km`}
                    />
                  )}
                  {session.interval_pace && (
                    <>
                      <SettingsSeparator />
                      <SettingsRow
                        icon={Clock}
                        iconBg="bg-[#FF3B30]"
                        label="Allure"
                        value={
                          session.activity_type === 'course'
                            ? `${session.interval_pace}/km`
                            : session.activity_type === 'natation'
                              ? `${session.interval_pace}/100m`
                              : session.activity_type === 'velo' && session.interval_pace_unit === 'power'
                                ? `${session.interval_pace} W`
                                : `${session.interval_pace} km/h`
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Location Section */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Lieu</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#FF3B30] flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-foreground">{session.location_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Section */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Participants</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-[15px] text-foreground">
                      {session.current_participants} participant{session.current_participants > 1 ? 's' : ''}
                      {session.max_participants && ` / ${session.max_participants}`}
                    </span>
                  </div>
                  {isFull && (
                    <Badge variant="destructive" className="text-xs">Complet</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {session.description && (
              <div className="mt-6 mx-4">
                <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Description</p>
                <div className="bg-background rounded-xl overflow-hidden p-4">
                  <p className="text-[15px] text-foreground">{session.description}</p>
                </div>
              </div>
            )}

            {/* Route Preview */}
            {session.routes && (
              <div className="mt-6 mx-4">
                <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Itinéraire</p>
                <div className="bg-background rounded-xl overflow-hidden">
                  <div className="p-4">
                    <p className="text-[15px] font-medium text-foreground mb-3">{session.routes.name}</p>
                    <div className="rounded-lg overflow-hidden bg-secondary">
                      <RoutePreview 
                        coordinates={session.routes.coordinates}
                        activityType={session.activity_type}
                      />
                    </div>
                    <div className="flex gap-4 mt-3 text-[13px] text-muted-foreground">
                      <span>{(session.routes.total_distance / 1000).toFixed(1)} km</span>
                      <span>D+ {Math.round(session.routes.total_elevation_gain)}m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Organisateur</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <div 
                  className="flex items-center gap-3 p-4 cursor-pointer active:bg-secondary/50"
                  onClick={() => setShowOrganizerProfile(true)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.profiles.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(session.profiles.username || session.profiles.display_name)?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-foreground">
                      {session.profiles.username || session.profiles.display_name}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Actions</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#34C759] flex items-center justify-center">
                    <Share2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] text-foreground">Partager la séance</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                </button>

                {isOrganizer ? (
                  <>
                    <SettingsSeparator />
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[15px] text-primary font-medium">Votre séance</span>
                    </div>
                    {!isScheduled && (
                      <>
                        <SettingsSeparator />
                        <button
                          onClick={() => navigate(`/confirm-presence/${session.id}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#34C759] flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-[15px] text-foreground">Valider les participants</span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                        </button>
                      </>
                    )}
                  </>
                ) : isParticipant ? (
                  <>
                    {isScheduled && !gpsValidated && (
                      <>
                        <SettingsSeparator />
                        <button
                          onClick={handleGPSValidation}
                          disabled={validatingGPS}
                          className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#34C759] flex items-center justify-center">
                            {validatingGPS ? (
                              <Loader2 className="h-4 w-4 text-white animate-spin" />
                            ) : (
                              <MapPin className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <span className="text-[15px] text-foreground">
                            {validatingGPS ? 'Validation GPS...' : 'Je suis arrivé (GPS)'}
                          </span>
                        </button>
                      </>
                    )}
                    {gpsValidated && (
                      <>
                        <SettingsSeparator />
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#34C759] flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-[15px] text-[#34C759] font-medium">GPS validé - Présence confirmée</span>
                        </div>
                      </>
                    )}
                  </>
                ) : hasRequested ? (
                  <>
                    <SettingsSeparator />
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FF9500] flex items-center justify-center">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[15px] text-[#FF9500] font-medium">Demande en attente</span>
                    </div>
                  </>
                ) : !isScheduled ? (
                  <>
                    <SettingsSeparator />
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8E8E93] flex items-center justify-center">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[15px] text-muted-foreground">Séance terminée</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-6 mx-4">
              {isOrganizer ? (
                <div className="bg-background rounded-xl overflow-hidden">
                  <button
                    onClick={handleDeleteSession}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="text-[15px] text-destructive">
                      {loading ? "Suppression..." : "Supprimer la séance"}
                    </span>
                  </button>
                </div>
              ) : isParticipant ? (
                <div className="bg-background rounded-xl overflow-hidden">
                  <button
                    onClick={handleLeaveSession}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <span className="text-[15px] text-destructive">
                      {loading ? "Traitement..." : "Quitter la séance"}
                    </span>
                  </button>
                </div>
              ) : hasRequested ? (
                <div className="bg-background rounded-xl overflow-hidden">
                  <button
                    onClick={handleCancelRequest}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <span className="text-[15px] text-destructive">
                      {loading ? "Annulation..." : "Annuler ma demande"}
                    </span>
                  </button>
                </div>
              ) : isScheduled && !isFull ? (
                <Button
                  onClick={handleRequestJoin}
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-[17px] font-medium"
                >
                  {loading ? "Envoi..." : "Demander à rejoindre"}
                </Button>
              ) : null}
            </div>

            {/* Questions Section */}
            <div className="mt-6 mx-4 pb-4">
              <SessionQuestions 
                sessionId={session.id}
                sessionTitle={session.title}
                organizerId={session.organizer_id}
                activityType={session.activity_type}
                locationName={session.location_name}
                scheduledAt={session.scheduled_at}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      <ProfilePreviewDialog
        userId={showOrganizerProfile ? session.organizer_id : null}
        onClose={() => setShowOrganizerProfile(false)}
      />

      <ShareSessionToConversationDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        session={session}
        onSessionShared={() => {
          setShowShareDialog(false);
        }}
      />
    </Dialog>
  );
};
