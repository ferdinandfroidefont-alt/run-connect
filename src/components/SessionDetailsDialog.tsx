import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, User, Star, Trash2, Route, Share2, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Zap, Pencil, Flame, Snowflake, Timer, Repeat, Copy, ExternalLink, Files, CalendarPlus, Navigation } from "lucide-react";
import { downloadICSFile, openGoogleCalendarLink } from "@/lib/calendarExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RoutePreview } from "./RoutePreview";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "./ShareSessionToConversationDialog";
import { SessionQuestions } from "./SessionQuestions";
import { SessionLevelBadge } from "./SessionLevelBadge";
import { CreateSessionWizard } from "./session-creation/CreateSessionWizard";
import { useAdMob } from '@/hooks/useAdMob';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useNavigate } from 'react-router-dom';
import { useDistanceUnit } from "@/contexts/DistanceUnitContext";
import {
  distanceUnitSuffix,
  formatDistanceKm,
  formatDistanceMeters,
} from "@/lib/distanceUnits";

import { ScrollArea } from "@/components/ui/scroll-area";
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import { RateSessionDialog } from './RateSessionDialog';
import { OrganizerRatingBadge } from './OrganizerRatingBadge';
interface SessionBlock {
  id: string;
  type: 'warmup' | 'interval' | 'cooldown' | 'steady';
  duration?: string;
  durationType?: 'time' | 'distance';
  intensity?: string;
  pace?: string;
  repetitions?: number;
  effortDuration?: string;
  effortType?: 'time' | 'distance';
  effortIntensity?: string;
  effortPace?: string;
  recoveryDuration?: string;
  recoveryType?: 'trot' | 'marche' | 'statique';
  rpe?: number;
  recoveryRpe?: number;
}

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
  calculated_level?: number;
  session_mode?: 'simple' | 'structured';
  session_blocks?: SessionBlock[];
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
  const { distanceUnit } = useDistanceUnit();
  const { user, subscriptionInfo } = useAuth();
  const { showAdAfterJoiningSession } = useAdMob(subscriptionInfo?.subscribed || false);
  const { toast } = useToast();
  const { validatePresence, validating: validatingGPS } = useGPSValidation();
  const { sendPushNotification } = useSendNotification();
  
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showOrganizerProfile, setShowOrganizerProfile] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [gpsValidated, setGpsValidated] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showCancelRequestConfirm, setShowCancelRequestConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSessionData, setDuplicateSessionData] = useState<any>(null);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [hasRated, setHasRated] = useState(false);


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

      // Check if user already rated this session
      const { data: ratingData } = await supabase
        .from('session_ratings' as any)
        .select('id')
        .eq('session_id', session.id)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      setHasRated(!!ratingData);

      // Auto-show rating dialog for past sessions the user participated in but hasn't rated
      const sessionDate = new Date(session.scheduled_at);
      const twoHoursAfter = new Date(sessionDate.getTime() + 2 * 60 * 60 * 1000);
      const isPastSession = new Date() > twoHoursAfter;
      
      if (isPastSession && participantData?.confirmed_by_gps && !ratingData && user.id !== session.organizer_id) {
        setTimeout(() => setShowRateDialog(true), 500);
      }
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
      setShowCancelRequestConfirm(false);
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
      setShowLeaveConfirm(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!user || !isOrganizer) return;

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
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-full h-full max-w-full max-h-full sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:rounded-xl bg-secondary border-0">
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

        <ScrollArea className="flex-1 h-[calc(100vh-56px)] sm:h-auto sm:max-h-[calc(90vh-56px)] bg-pattern">
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
                {/* Level Row */}
                <SettingsRow
                  icon={Zap}
                  iconBg={LEVEL_CONFIG[(session.calculated_level || 3) as SessionLevel]?.bgClass || "bg-yellow-500"}
                  label="Niveau"
                  value={
                    <div className="flex items-center gap-2">
                      <SessionLevelBadge 
                        level={(session.calculated_level || 3) as SessionLevel} 
                        variant="full"
                        size="sm"
                        showTooltip={false}
                      />
                    </div>
                  }
                />
                <SettingsSeparator />
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
                      value={formatDistanceKm(session.distance_km, distanceUnit)}
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
                          ? `${session.pace_general}/${distanceUnitSuffix(distanceUnit)}`
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

            {/* Fractionné Info (mode simple) */}
            {session.session_type === 'fractionne' && !session.session_blocks?.length && (session.interval_distance || session.interval_pace || session.interval_count) && (
              <div className="mt-6 mx-4">
                <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Fractionné</p>
                <div className="bg-background rounded-xl overflow-hidden">
                  {session.interval_count && session.interval_distance && (
                    <SettingsRow
                      icon={Repeat}
                      iconBg="bg-[#FF9500]"
                      label="Séries"
                      value={`${session.interval_count} × ${
                        session.interval_distance < 1
                          ? `${Math.round(session.interval_distance * 1000)} m`
                          : formatDistanceKm(session.interval_distance, distanceUnit)
                      }`}
                    />
                  )}
                  {session.interval_pace && (
                    <>
                      <SettingsSeparator />
                      <SettingsRow
                        icon={Timer}
                        iconBg="bg-[#FF3B30]"
                        label="Allure"
                        value={
                          session.activity_type === 'course'
                            ? `${session.interval_pace}/${distanceUnitSuffix(distanceUnit)}`
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

            {/* Structured Blocks (mode structuré) */}
            {session.session_blocks && session.session_blocks.length > 0 && (
              <div className="mt-6 mx-4">
                <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Programmation</p>
                <div className="bg-background rounded-xl overflow-hidden divide-y divide-border">
                  {(session.session_blocks as SessionBlock[]).map((block, index) => {
                    const getBlockIcon = () => {
                      switch (block.type) {
                        case 'warmup': return Flame;
                        case 'cooldown': return Snowflake;
                        case 'interval': return Repeat;
                        default: return Timer;
                      }
                    };
                    const getBlockColor = () => {
                      switch (block.type) {
                        case 'warmup': return 'bg-[#34C759]';
                        case 'cooldown': return 'bg-[#5856D6]';
                        case 'interval': return 'bg-[#FF9500]';
                        default: return 'bg-[#007AFF]';
                      }
                    };
                    const getBlockLabel = () => {
                      switch (block.type) {
                        case 'warmup': return 'Échauffement';
                        case 'cooldown': return 'Retour au calme';
                        case 'interval': return 'Séries';
                        default: return 'Bloc constant';
                      }
                    };
                    const getBlockValue = () => {
                      const rpeParts: string[] = [];
                      if (typeof block.rpe === 'number' && block.rpe >= 1 && block.rpe <= 10) {
                        rpeParts.push(`RPE ${block.rpe}`);
                      }
                      if (block.type === 'interval' && typeof block.recoveryRpe === 'number' && block.recoveryRpe >= 1 && block.recoveryRpe <= 10) {
                        rpeParts.push(`récup RPE ${block.recoveryRpe}`);
                      }
                      const rpeSuffix = rpeParts.length ? ` · ${rpeParts.join(' · ')}` : '';

                      if (block.type === 'interval') {
                        const reps = block.repetitions || 1;
                        const effort = block.effortDuration || '0';
                        const effortUnit = block.effortType === 'time' ? 's' : 'm';
                        const pace = block.effortPace
                          ? ` à ${block.effortPace}/${distanceUnitSuffix(distanceUnit)}`
                          : '';
                        const recovery = block.recoveryDuration ? ` r${block.recoveryDuration}s ${block.recoveryType || ''}` : '';
                        return `${reps}×${effort}${effortUnit}${pace}${recovery}${rpeSuffix}`;
                      } else {
                        const duration = block.duration || '0';
                        const unit = block.durationType === 'time' ? 'min' : 'm';
                        const pace = block.pace
                          ? ` à ${block.pace}/${distanceUnitSuffix(distanceUnit)}`
                          : '';
                        return `${duration}${unit}${pace}${rpeSuffix}`;
                      }
                    };

                    const Icon = getBlockIcon();
                    return (
                      <SettingsRow
                        key={block.id || index}
                        icon={Icon}
                        iconBg={getBlockColor()}
                        label={getBlockLabel()}
                        value={getBlockValue()}
                      />
                    );
                  })}
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
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(session.location_name);
                            toast({ title: 'Adresse copiée !' });
                          }}
                          className="text-[13px] text-primary hover:underline flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copier
                        </button>
                        <button
                          onClick={() => {
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location_name)}`;
                            window.open(mapsUrl, '_blank');
                          }}
                          className="text-[13px] text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Google Maps
                        </button>
                      </div>
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
                      <span>
                        {formatDistanceMeters(session.routes.total_distance, distanceUnit)}
                      </span>
                      <span>D+ {Math.round(session.routes.total_elevation_gain)}m</span>
                    </div>
                  </div>
                </div>

                {/* Training Mode Button */}
                {(isOrganizer || isParticipant) && isScheduled && (
                  <div className="mt-3">
                    <button
                      onClick={() => navigate(`/training/${session.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 rounded-xl active:bg-primary/20 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <Navigation className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="text-[15px] font-medium text-primary">Mode Entraînement</span>
                      <ChevronRight className="h-5 w-5 text-primary/50 ml-auto" />
                    </button>
                  </div>
                )}
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
                {/* Export Calendar */}
                <button
                  onClick={() => {
                    const event = {
                      title: session.title,
                      description: session.description || '',
                      location: session.location_name,
                      startDate: new Date(session.scheduled_at),
                      durationMinutes: 60,
                      organizer: session.profiles.username || session.profiles.display_name,
                    };
                    downloadICSFile(event);
                    toast({ title: 'Fichier .ics téléchargé !' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FF9500] flex items-center justify-center">
                    <CalendarPlus className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] text-foreground">Exporter vers le calendrier</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                </button>

                <SettingsSeparator />

                {/* Google Calendar */}
                <button
                  onClick={() => {
                    const event = {
                      title: session.title,
                      description: session.description || '',
                      location: session.location_name,
                      startDate: new Date(session.scheduled_at),
                      durationMinutes: 60,
                      organizer: session.profiles.username || session.profiles.display_name,
                    };
                    openGoogleCalendarLink(event);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#4285F4] flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] text-foreground">Google Calendar</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                </button>

                <SettingsSeparator />

                {/* Share */}
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
                    <button
                      onClick={() => setShowEditDialog(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
                        <Pencil className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[15px] text-foreground">Modifier la séance</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                    </button>
                    <SettingsSeparator />
                    <button
                      onClick={() => {
                        // Prepare duplicate data: copy all fields except id, reset date to tomorrow same time
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        const originalDate = new Date(session.scheduled_at);
                        tomorrow.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
                        
                        const duplicateData = {
                          ...session,
                          title: `${session.title} (copie)`,
                          scheduled_at: tomorrow.toISOString(),
                          // Reset participant counts for new session
                          current_participants: 0,
                        };
                        // Remove id so wizard creates a new session
                        delete duplicateData.id;
                        delete duplicateData.profiles;
                        delete duplicateData.routes;
                        
                        setDuplicateSessionData(duplicateData);
                        setShowDuplicateDialog(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#5856D6] flex items-center justify-center">
                        <Files className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-[15px] text-foreground">Dupliquer la séance</span>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                    </button>
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
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="text-[15px] text-destructive">
                      Supprimer la séance
                    </span>
                  </button>
                </div>
              ) : isParticipant ? (
                <div className="bg-background rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <span className="text-[15px] text-destructive">
                      Quitter la séance
                    </span>
                  </button>
                </div>
              ) : hasRequested ? (
                <div className="bg-background rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowCancelRequestConfirm(true)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                  >
                    <span className="text-[15px] text-destructive">
                      Annuler ma demande
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

      {/* Rate Session Dialog */}
      <RateSessionDialog
        open={showRateDialog}
        onOpenChange={setShowRateDialog}
        sessionId={session.id}
        organizerId={session.organizer_id}
        organizerName={session.profiles.username || session.profiles.display_name}
        userId={user?.id || ''}
        onRated={() => setHasRated(true)}
      />

      <ShareSessionToConversationDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        session={session}
        onSessionShared={() => {
          setShowShareDialog(false);
        }}
      />

      {/* Delete Confirmation Dialog - iOS Style */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Supprimer la séance
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Confirmation Dialog - iOS Style */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Quitter la séance
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Êtes-vous sûr de vouloir quitter cette séance ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
              Annuler
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={handleLeaveSession}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Traitement..." : "Quitter"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Request Confirmation Dialog - iOS Style */}
      <AlertDialog open={showCancelRequestConfirm} onOpenChange={setShowCancelRequestConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[280px] p-0 gap-0">
          <AlertDialogHeader className="p-6 pb-4">
            <AlertDialogTitle className="text-center text-[17px] font-semibold">
              Annuler la demande
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px] text-muted-foreground">
              Êtes-vous sûr de vouloir annuler votre demande de participation ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="border-t border-border">
            <AlertDialogCancel className="w-full h-[44px] border-0 rounded-none text-primary text-[17px] font-normal hover:bg-secondary/50">
              Non, garder
            </AlertDialogCancel>
          </div>
          <div className="border-t border-border">
            <AlertDialogAction
              onClick={handleCancelRequest}
              disabled={loading}
              className="w-full h-[44px] border-0 rounded-none bg-transparent hover:bg-secondary/50 text-destructive text-[17px] font-semibold"
            >
              {loading ? "Annulation..." : "Oui, annuler"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Session Wizard */}
      <CreateSessionWizard
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSessionCreated={() => {
          setShowEditDialog(false);
          onSessionUpdated();
        }}
        map={null}
        editSession={session}
        isEditMode={true}
      />

      {/* Duplicate Session Wizard */}
      <CreateSessionWizard
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setDuplicateSessionData(null);
        }}
        onSessionCreated={() => {
          setShowDuplicateDialog(false);
          setDuplicateSessionData(null);
          onSessionUpdated();
          onClose();
        }}
        map={null}
        editSession={duplicateSessionData}
        isEditMode={false}
      />
    </Dialog>
  );
};
