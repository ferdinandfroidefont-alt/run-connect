import { useState, useEffect, useRef } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { createEmbeddedMapboxMap, setOrUpdateLineLayer } from "@/lib/mapboxEmbed";
import { buildSessionStaticMapUrl } from "@/lib/mapboxStaticImage";
import { MAPBOX_STREETS_STYLE } from "@/lib/mapboxConfig";
import { ActivityIcon } from "@/lib/activityIcons";
import { exportToGPX, shareOrDownloadGPX } from "@/lib/gpxExport";
import { useAuth } from "@/hooks/useAuth";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, User, Star, Trash2, Route, Share2, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Zap, Pencil, Flame, Snowflake, Timer, Repeat, Copy, ExternalLink, Files, CalendarPlus, Navigation, MoreHorizontal, BadgeCheck, Footprints, Mountain, Bell, Bookmark, MessageCircle, Download, Maximize2 } from "lucide-react";
import { downloadICSFile, openGoogleCalendarLink } from "@/lib/calendarExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RoutePreview } from "./RoutePreview";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { ShareSessionToConversationDialog } from "./ShareSessionToConversationDialog";
import { SessionShareScreen } from "./session-share/SessionShareScreen";
import { SessionQuestions } from "./SessionQuestions";
import { SessionLevelBadge } from "./SessionLevelBadge";
import { CreateSessionWizard } from "./session-creation/CreateSessionWizard";
import { useAdMob } from '@/hooks/useAdMob';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useNavigate } from 'react-router-dom';

import { ScrollArea } from "@/components/ui/scroll-area";
import { LEVEL_CONFIG, type SessionLevel } from '@/lib/sessionLevelCalculator';
import { RateSessionDialog } from './RateSessionDialog';
import { OrganizerRatingBadge } from './OrganizerRatingBadge';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
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
  const { unit, formatKm, formatMeters, formatSpeed } = useDistanceUnits();
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
  const [showSessionShare, setShowSessionShare] = useState(false);
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

  // Map refs (declared before early return to satisfy hooks rules)
  const headerMapRef = useRef<HTMLDivElement | null>(null);
  const headerMapInstance = useRef<MapboxMap | null>(null);
  const routeMapRef = useRef<HTMLDivElement | null>(null);
  const routeMapInstance = useRef<MapboxMap | null>(null);
  const [headerMapReady, setHeaderMapReady] = useState(false);
  const [headerMapFailed, setHeaderMapFailed] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let rafId: number | null = null;
    let attempts = 0;

    setHeaderMapReady(false);
    setHeaderMapFailed(false);

    const init = async (container: HTMLDivElement) => {
      try {
        const map = await createEmbeddedMapboxMap(container, {
          interactive: false,
          center: { lat: session.location_lat, lng: session.location_lng },
          zoom: 14,
          style: MAPBOX_STREETS_STYLE,
        });
        if (cancelled) { map.remove(); return; }
        headerMapInstance.current = map;
        const doResize = () => { try { map.resize(); } catch {} };
        map.once('load', () => {
          doResize();
          if (!cancelled) setHeaderMapReady(true);
        });
        map.once('error', () => {
          if (!cancelled) setHeaderMapFailed(true);
        });
        requestAnimationFrame(doResize);
        setTimeout(doResize, 120);
        setTimeout(doResize, 400);
        setTimeout(doResize, 800);
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(doResize);
          ro.observe(container);
        }
      } catch (e) {
        console.warn('[SessionDetails] header map error', e);
        if (!cancelled) setHeaderMapFailed(true);
      }
    };

    const tryInit = () => {
      if (cancelled || headerMapInstance.current) return;
      const el = headerMapRef.current;
      if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
        init(el);
      } else if (attempts++ < 60) {
        rafId = requestAnimationFrame(tryInit);
      } else {
        setHeaderMapFailed(true);
      }
    };
    tryInit();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      ro?.disconnect();
      headerMapInstance.current?.remove();
      headerMapInstance.current = null;
      setHeaderMapReady(false);
    };
  }, [session?.id, session?.location_lat, session?.location_lng]);

  useEffect(() => {
    if (!session?.routes) return;
    let cancelled = false;
    let rafId: number | null = null;
    let attempts = 0;

    const init = async (container: HTMLDivElement) => {
      try {
        const coords = (session.routes!.coordinates as Array<{ lat: number; lng: number }>).map(c => ({ lat: c.lat, lng: c.lng }));
        if (!coords.length) return;
        const center = coords[Math.floor(coords.length / 2)];
        const map = await createEmbeddedMapboxMap(container, {
          interactive: false,
          center,
          zoom: 13,
        });
        if (cancelled) { map.remove(); return; }
        routeMapInstance.current = map;
        const doResize = () => { try { map.resize(); } catch {} };
        map.once('load', () => {
          doResize();
          setOrUpdateLineLayer(map, 'route-src', 'route-line', coords, { color: 'hsl(var(--primary))', width: 4 });
        });
        setTimeout(doResize, 200);
      } catch (e) {
        console.warn('[SessionDetails] route map error', e);
      }
    };

    const tryInit = () => {
      if (cancelled || routeMapInstance.current) return;
      const el = routeMapRef.current;
      if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
        init(el);
      } else if (attempts++ < 60) {
        rafId = requestAnimationFrame(tryInit);
      }
    };
    tryInit();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      routeMapInstance.current?.remove();
      routeMapInstance.current = null;
    };
  }, [session?.routes?.id]);

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

  // Build dynamic title from blocks (e.g. "6 × 1000m allure 3'00/km")
  const buildSessionTitle = (): string => {
    const blocks = session.session_blocks as SessionBlock[] | undefined;
    if (blocks?.length) {
      const interval = blocks.find(b => b.type === 'interval');
      if (interval) {
        const reps = interval.repetitions || 1;
        const eff = interval.effortDuration || '0';
        const unit = interval.effortType === 'time' ? 's' : 'm';
        const pace = interval.effortPace ? ` allure ${interval.effortPace}/km` : '';
        return `${reps} × ${eff}${unit}${pace}`;
      }
    }
    if (session.session_type === 'fractionne' && session.interval_count && session.interval_distance) {
      const dist = session.interval_distance < 1
        ? `${Math.round(session.interval_distance * 1000)}m`
        : formatKm(session.interval_distance);
      const pace = session.interval_pace ? ` allure ${session.interval_pace}/km` : '';
      return `${session.interval_count} × ${dist}${pace}`;
    }
    return session.title;
  };

  const sessionTypeBadge = getSessionTypeLabel(session.session_type).toUpperCase();
  const dynamicTitle = buildSessionTitle();
  const dateFmt = format(new Date(session.scheduled_at), "EEEE d MMMM yyyy", { locale: fr });
  const timeFmt = format(new Date(session.scheduled_at), "HH:mm", { locale: fr });

  // Compute timeline blocks
  const timelineBlocks = (session.session_blocks as SessionBlock[] | undefined) || [];

  // Stats card values — fall back across structured blocks / interval mode / route
  const blocksAll = (session.session_blocks as SessionBlock[] | undefined) || [];
  const intervalBlock = blocksAll.find(b => b.type === 'interval');

  // Derive distance: structured > session.distance_km > route
  let derivedDistanceKm: number | null = session.distance_km ?? null;
  if (!derivedDistanceKm && intervalBlock?.effortType === 'distance' && intervalBlock.effortDuration) {
    const m = parseFloat(String(intervalBlock.effortDuration).replace(',', '.'));
    if (!isNaN(m) && intervalBlock.repetitions) derivedDistanceKm = (m * intervalBlock.repetitions) / 1000;
  }
  if (!derivedDistanceKm && session.interval_distance && session.interval_count) {
    derivedDistanceKm = session.interval_distance * session.interval_count;
  }
  const totalDistance = derivedDistanceKm
    ? formatKm(derivedDistanceKm)
    : (session.routes?.total_distance ? formatMeters(session.routes.total_distance) : '—');

  const elevGain = session.routes?.total_elevation_gain ? `${Math.round(session.routes.total_elevation_gain)} m` : '—';

  // Pace: prefer interval pace if structured/fractionné, else general
  const rawPace = intervalBlock?.effortPace || session.interval_pace || session.pace_general || null;
  const avgPace = rawPace
    ? (session.activity_type === 'course' ? `${rawPace}/km`
      : session.activity_type === 'natation' ? `${rawPace}/100m`
      : rawPace)
    : '—';

  // Duration estimate (min): if structured, sum block durations; else distance × pace
  const estimatedDuration = (() => {
    if (blocksAll.length) {
      let totalSec = 0;
      blocksAll.forEach(b => {
        if (b.type === 'interval') {
          const reps = b.repetitions || 1;
          // effort
          if (b.effortType === 'time') {
            totalSec += reps * (parseFloat(String(b.effortDuration || '0').replace(',', '.')) || 0);
          } else if (b.effortPace) {
            const pm = String(b.effortPace).match(/(\d+)[':](\d+)/);
            const dist = parseFloat(String(b.effortDuration || '0').replace(',', '.')) / 1000;
            if (pm) totalSec += reps * (parseInt(pm[1]) * 60 + parseInt(pm[2])) * dist;
          }
          // recovery
          if (b.recoveryDuration) {
            totalSec += (reps - 1) * (parseFloat(String(b.recoveryDuration).replace(',', '.')) || 0);
          }
        } else {
          if (b.durationType === 'time') {
            totalSec += (parseFloat(String(b.duration || '0').replace(',', '.')) || 0) * 60;
          } else if (b.pace) {
            const pm = String(b.pace).match(/(\d+)[':](\d+)/);
            const dist = parseFloat(String(b.duration || '0').replace(',', '.')) / 1000;
            if (pm) totalSec += (parseInt(pm[1]) * 60 + parseInt(pm[2])) * dist;
          }
        }
      });
      if (totalSec > 0) return `${Math.round(totalSec / 60)} min`;
    }
    if (derivedDistanceKm && rawPace) {
      const m = String(rawPace).match(/(\d+)[':](\d+)/);
      if (m) {
        const sec = parseInt(m[1]) * 60 + parseInt(m[2]);
        return `${Math.round((sec * derivedDistanceKm) / 60)} min`;
      }
    }
    return '—';
  })();

  const calendarEvent = {
    title: session.title,
    description: session.description || '',
    location: session.location_name,
    startDate: new Date(session.scheduled_at),
    durationMinutes: 60,
    organizer: session.profiles.username || session.profiles.display_name,
  };

  // (header & route map refs/effects are declared at the top of the component)

  const handleExportGPX = async () => {
    if (!session.routes) return;
    const coords = (session.routes.coordinates as Array<{ lat: number; lng: number; elevation?: number }>);
    const gpx = exportToGPX(session.routes.name, coords, session.description);
    await shareOrDownloadGPX(session.routes.name, gpx, { title: session.routes.name });
  };

  const participantsCount = session.current_participants || 0;

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-full h-full max-w-full max-h-full sm:max-w-md sm:h-auto sm:max-h-[95vh] sm:rounded-2xl bg-white border-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 bg-white">
          <div className="pb-[140px]">
            {/* ==== HEADER MAP ==== */}
            <div className="relative w-full h-[280px] bg-secondary">
              <div ref={headerMapRef} className="absolute inset-0" />
              {/* Centered pin (avatar + tip) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative -translate-y-3 flex flex-col items-center">
                  {/* Avatar circle */}
                  <div className="relative h-[72px] w-[72px] rounded-full bg-primary p-[3px] shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-1 ring-black/5">
                    <Avatar className="h-full w-full ring-2 ring-white">
                      <AvatarImage src={session.profiles.avatar_url} className="object-cover" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[22px] font-semibold">
                        {(session.profiles.username || session.profiles.display_name)?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Activity badge */}
                    <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-black/5 flex items-center justify-center">
                      <ActivityIcon activityType={session.activity_type} size="sm" className="!h-6 !w-6 !rounded-full" />
                    </div>
                  </div>
                  {/* Tip glued to circle */}
                  <div
                    className="-mt-[6px] h-3 w-3 bg-primary rotate-45 shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
                    aria-hidden
                  />
                  {/* Ground shadow */}
                  <div className="mt-1 h-1.5 w-8 rounded-full bg-black/20 blur-sm" aria-hidden />
                </div>
              </div>
              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
              {/* Top buttons */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
                <button
                  onClick={onClose}
                  className="h-11 w-11 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSessionShare(true)}
                    className="h-11 w-11 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Partager"
                  >
                    <Share2 className="h-5 w-5 text-foreground" />
                  </button>
                  <button
                    onClick={() => isOrganizer ? setShowEditDialog(true) : setShowOrganizerProfile(true)}
                    className="h-11 w-11 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition-transform"
                    aria-label="Plus"
                  >
                    <MoreHorizontal className="h-5 w-5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {/* ==== TITLE BLOCK ==== */}
            <div className="px-5 pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-[#FF9500]">
                SÉANCE {sessionTypeBadge}
              </p>
              <h1 className="mt-1 text-[28px] leading-tight font-bold text-foreground tracking-tight">
                {dynamicTitle}
              </h1>
            </div>

            {/* ==== ORGANIZER + PARTICIPANTS ==== */}
            <div className="px-5 py-3 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowOrganizerProfile(true)}
                className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70"
              >
                <Avatar className="h-11 w-11">
                  <AvatarImage src={session.profiles.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(session.profiles.username || session.profiles.display_name)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-[15px] font-semibold text-foreground truncate">
                      {session.profiles.username || session.profiles.display_name}
                    </p>
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <p className="text-[13px] text-muted-foreground">Voir le profil ›</p>
                </div>
              </button>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(4, Math.max(1, participantsCount)) }).map((_, i) => (
                    <Avatar key={i} className="h-7 w-7 ring-2 ring-white">
                      <AvatarFallback className="bg-secondary text-[10px] text-muted-foreground">
                        {i === 0 ? (session.profiles.username || '?').charAt(0).toUpperCase() : '·'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-[12px] text-muted-foreground">{participantsCount} part.</span>
              </div>
            </div>

            {/* ==== DATE + LIEU CARD ==== */}
            <div className="mx-4 mt-2 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-[11px] uppercase tracking-wide">Date</span>
                  </div>
                  <p className="text-[14px] font-semibold text-foreground capitalize leading-tight">{dateFmt}</p>
                  <p className="text-[13px] text-muted-foreground">{timeFmt}</p>
                  <button
                    onClick={() => { openGoogleCalendarLink(calendarEvent); }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-foreground active:bg-secondary"
                  >
                    <CalendarPlus className="h-3.5 w-3.5 text-[#4285F4]" />
                    Google Calendar
                  </button>
                </div>
                {/* Lieu */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-[11px] uppercase tracking-wide">Lieu</span>
                  </div>
                  <p className="text-[14px] font-semibold text-foreground leading-tight line-clamp-2">{session.location_name}</p>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location_name)}`;
                      window.open(url, '_blank');
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-medium text-foreground active:bg-secondary"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[#34A853]" />
                    Google Maps
                  </button>
                </div>
              </div>
            </div>

            {/* ==== DÉTAILS DE LA SÉANCE ==== */}
            <div className="px-5 mt-6">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Détails de la séance
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Timeline */}
                <div className="relative">
                  {timelineBlocks.length > 0 ? (
                    <div className="relative pl-1">
                      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                      <div className="space-y-3">
                        {timelineBlocks.map((b, idx) => {
                          const color =
                            b.type === 'warmup' ? 'bg-[#34C759]' :
                            b.type === 'cooldown' ? 'bg-[#FF9500]' :
                            b.type === 'interval' ? 'bg-primary' : 'bg-[#007AFF]';
                          const label =
                            b.type === 'warmup' ? 'Échauffement' :
                            b.type === 'cooldown' ? 'Retour au calme' :
                            b.type === 'interval' ? 'Bloc principal' : 'Bloc constant';
                          const detail =
                            b.type === 'interval'
                              ? `${b.repetitions || 1}×${b.effortDuration || 0}${b.effortType === 'time' ? 's' : 'm'}`
                              : `${b.duration || 0}${b.durationType === 'time' ? ' min' : ' m'}`;
                          return (
                            <div key={b.id || idx} className="relative flex items-start gap-3">
                              <div className={`mt-1 h-3.5 w-3.5 rounded-full ${color} ring-2 ring-white flex-shrink-0`} />
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground leading-tight">{label}</p>
                                <p className="text-[12px] text-muted-foreground">{detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border p-3 text-[12px] text-muted-foreground">
                      Séance simple, pas de découpage.
                    </div>
                  )}
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Footprints, label: 'Distance', value: totalDistance },
                    { icon: Clock, label: 'Durée', value: estimatedDuration },
                    { icon: Zap, label: 'Allure', value: avgPace },
                    { icon: Mountain, label: 'D+', value: elevGain },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl border border-border bg-white p-2.5 shadow-sm">
                      <s.icon className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                      <p className="text-[13px] font-bold text-foreground truncate">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ==== PARCOURS ==== */}
            {session.routes && (
              <div className="px-5 mt-6">
                <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Parcours
                </p>
                <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                  <div className="grid grid-cols-5">
                    <div ref={routeMapRef} className="col-span-3 h-32 bg-secondary" />
                    <div className="col-span-2 p-3 flex flex-col justify-center">
                      <p className="text-[18px] font-bold text-foreground leading-tight">
                        {formatMeters(session.routes.total_distance)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">1 boucle</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        D+ {Math.round(session.routes.total_elevation_gain)} m
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(isOrganizer || isParticipant) && isScheduled && (
                    <button
                      onClick={() => navigate(`/training/${session.id}`)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground h-11 text-[14px] font-semibold active:opacity-90"
                    >
                      <Navigation className="h-4 w-4" />
                      Mode entraînement
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/training/${session.id}`)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white h-10 text-[13px] font-medium text-foreground active:bg-secondary"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Plein écran
                  </button>
                  <button
                    onClick={handleExportGPX}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white h-10 text-[13px] font-medium text-foreground active:bg-secondary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exporter GPX
                  </button>
                </div>
              </div>
            )}

            {/* ==== DESCRIPTION ==== */}
            {session.description && (
              <div className="px-5 mt-6">
                <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Description
                </p>
                <p className="text-[14px] text-foreground leading-relaxed">{session.description}</p>
              </div>
            )}

            {/* ==== FOOTER 4 ACTIONS ==== */}
            <div className="px-5 mt-6">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: User, label: 'Profil', onClick: () => setShowOrganizerProfile(true) },
                  { icon: Bell, label: 'Rappel', onClick: () => { downloadICSFile(calendarEvent); toast({ title: '.ics téléchargé' }); } },
                  { icon: Share2, label: 'Partager', onClick: () => setShowSessionShare(true) },
                  { icon: CalendarPlus, label: 'Planning', onClick: () => openGoogleCalendarLink(calendarEvent) },
                ].map((a, i) => (
                  <button
                    key={i}
                    onClick={a.onClick}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white py-3 active:bg-secondary"
                  >
                    <a.icon className="h-4 w-4 text-foreground" />
                    <span className="text-[11px] text-muted-foreground">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ==== ORGANIZER MGMT (kept for organizers / past sessions) ==== */}
            {isOrganizer && (
              <div className="px-5 mt-6 space-y-2">
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-white h-11 text-[14px] font-medium text-foreground active:bg-secondary"
                >
                  <Pencil className="h-4 w-4" /> Modifier la séance
                </button>
                {!isScheduled && (
                  <button
                    onClick={() => navigate(`/confirm-presence/${session.id}`)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#34C759] text-white h-11 text-[14px] font-semibold active:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Valider les participants
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-white h-11 text-[14px] font-medium text-destructive active:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" /> Supprimer la séance
                </button>
              </div>
            )}

            {/* ==== Questions ==== */}
            <div className="mt-6 px-4">
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

        {/* ==== STICKY CTA ==== */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-white/95 backdrop-blur-md border-t border-border px-4 pt-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          {isOrganizer ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSessionShare(true)}
                className="flex-1 h-14 rounded-2xl text-[15px] font-bold"
              >
                PARTAGER LA SÉANCE
              </Button>
            </div>
          ) : isParticipant ? (
            <div className="flex gap-2">
              {isScheduled && !gpsValidated ? (
                <Button
                  onClick={handleGPSValidation}
                  disabled={validatingGPS}
                  className="flex-1 h-14 rounded-2xl text-[15px] font-bold bg-[#34C759] hover:bg-[#34C759]/90"
                >
                  {validatingGPS ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MapPin className="h-5 w-5 mr-1" /> JE SUIS ARRIVÉ</>}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowLeaveConfirm(true)}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl text-[15px] font-semibold border-destructive/40 text-destructive"
                >
                  Quitter la séance
                </Button>
              )}
            </div>
          ) : hasRequested ? (
            <Button
              onClick={() => setShowCancelRequestConfirm(true)}
              variant="outline"
              className="w-full h-14 rounded-2xl text-[15px] font-semibold"
            >
              Annuler ma demande
            </Button>
          ) : isScheduled && !isFull ? (
            <div className="flex gap-2">
              <button
                onClick={handleRequestJoin}
                disabled={loading}
                className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground active:opacity-90 disabled:opacity-50 flex flex-col items-center justify-center"
              >
                <span className="text-[15px] font-bold tracking-wide">
                  {loading ? 'ENVOI…' : 'REJOINDRE LA SÉANCE'}
                </span>
                <span className="text-[10px] text-primary-foreground/80">
                  Tu seras visible des autres participants
                </span>
              </button>
              <button
                onClick={() => navigate(`/messages?user=${session.organizer_id}`)}
                className="h-14 w-14 rounded-2xl border border-border bg-white flex items-center justify-center active:bg-secondary"
                aria-label="Message"
              >
                <MessageCircle className="h-5 w-5 text-foreground" />
              </button>
            </div>
          ) : (
            <div className="w-full h-14 rounded-2xl bg-secondary flex items-center justify-center text-[14px] text-muted-foreground font-medium">
              {isFull ? 'Séance complète' : 'Séance terminée'}
            </div>
          )}
        </div>
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

      <SessionShareScreen
        open={showSessionShare}
        onClose={() => setShowSessionShare(false)}
        session={session}
        onOpenConversationShare={() => {
          setShowSessionShare(false);
          setShowShareDialog(true);
        }}
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
