import { useState, useEffect, useRef } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import { createEmbeddedMapboxMap, setOrUpdateLineLayer } from "@/lib/mapboxEmbed";
import { buildSessionStaticMapUrl } from "@/lib/mapboxStaticImage";
import { MAPBOX_STREETS_STYLE } from "@/lib/mapboxConfig";
import { createSessionPinButton, resolveSessionPinVariant } from "@/lib/mapSessionPin";
import mapboxgl from "mapbox-gl";
import { exportToGPX, shareOrDownloadGPX } from "@/lib/gpxExport";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveSubscriptionInfo } from "@/hooks/useEffectiveSubscription";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import { useSendNotification } from "@/hooks/useSendNotification";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Trash2, Share2, Loader2, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Download, ChevronDown } from "lucide-react";
import { downloadICSFile, openGoogleCalendarLink } from "@/lib/calendarExport";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
import type { SessionLevel } from '@/lib/sessionLevelCalculator';
import { estimateSessionDurationMinutes, DEFAULT_SESSION_CALENDAR_DURATION_MIN } from '@/lib/estimateSessionDurationMinutes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RateSessionDialog } from './RateSessionDialog';
import { useDistanceUnits } from '@/contexts/DistanceUnitsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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

export const SessionDetailsDialog = ({ session, onClose, onSessionUpdated }: SessionDetailsDialogProps) => {
  const isMobile = useIsMobile();
  const { formatKm, formatMeters } = useDistanceUnits();
  const { user } = useAuth();
  const { isPreviewMode } = useAppPreview();
  const subscriptionInfo = useEffectiveSubscriptionInfo();
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
  const [showBlocksDialog, setShowBlocksDialog] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [participantsList, setParticipantsList] = useState<Array<{ user_id: string; profile: { username: string; display_name: string; avatar_url: string | null } }>>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);


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
  const routeSectionRef = useRef<HTMLDivElement | null>(null);
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
          if (cancelled) return;
          // Add the same DOM pin used on Home (avatar + tip)
          try {
            const wrap = document.createElement('div');
            wrap.className = 'rc-session-pin rc-session-pin-pop';
            wrap.style.position = 'relative';
            wrap.style.width = '1px';
            wrap.style.height = '1px';
            wrap.style.overflow = 'visible';
            const pin = createSessionPinButton({
              avatarUrl: session.profiles?.avatar_url || '/placeholder.svg',
              ariaLabel: session.title || 'Séance',
              variant: resolveSessionPinVariant(),
            });
            wrap.appendChild(pin);
            new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
              .setLngLat([session.location_lng, session.location_lat])
              .addTo(map);
          } catch (err) {
            console.warn('[SessionDetails] pin creation failed', err);
          }
          setHeaderMapReady(true);
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

  const organizerProfile = session.profiles ?? {
    username: "",
    display_name: "",
    avatar_url: undefined as string | undefined,
  };

  const isOrganizer = user?.id === session.organizer_id;
  const isScheduled = new Date(session.scheduled_at) > new Date();
  const isFull = session.max_participants && session.current_participants >= session.max_participants;

  const handleRequestJoin = async () => {
    if (!user || !isScheduled) return;

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "Les demandes et notifications sont désactivées.",
        variant: "destructive",
      });
      return;
    }

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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "Action désactivée.",
        variant: "destructive",
      });
      return;
    }

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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "La validation GPS est désactivée.",
        variant: "destructive",
      });
      return;
    }

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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "Action désactivée.",
        variant: "destructive",
      });
      return;
    }

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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "La suppression est désactivée.",
        variant: "destructive",
      });
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

  const showElevationTile = session.routes?.total_elevation_gain != null;
  const elevGain = showElevationTile ? `${Math.round(session.routes!.total_elevation_gain)} m` : '—';

  // Pace: prefer interval pace if structured/fractionné, else general
  const rawPace = intervalBlock?.effortPace || session.interval_pace || session.pace_general || null;
  const avgPace = rawPace
    ? (session.activity_type === 'course' ? `${rawPace}/km`
      : session.activity_type === 'natation' ? `${rawPace}/100m`
      : rawPace)
    : '—';

  const estimatedDurationMin = estimateSessionDurationMinutes(session);
  const estimatedDuration = estimatedDurationMin != null ? `${estimatedDurationMin} min` : '—';
  const endTimeLabel = estimatedDurationMin != null
    ? format(new Date(new Date(session.scheduled_at).getTime() + estimatedDurationMin * 60_000), 'HH:mm', { locale: fr })
    : '—';

  const calendarDurationMin = estimatedDurationMin ?? DEFAULT_SESSION_CALENDAR_DURATION_MIN;
  const calendarEvent = {
    title: dynamicTitle,
    description: session.description || '',
    location: session.location_name,
    startDate: new Date(session.scheduled_at),
    durationMinutes: calendarDurationMin,
    organizer: organizerProfile.username || organizerProfile.display_name,
  };

  const levelBadge =
    typeof session.calculated_level === 'number' &&
    session.calculated_level >= 1 &&
    session.calculated_level <= 6 ? (
      <SessionLevelBadge level={session.calculated_level as SessionLevel} variant="full" size="sm" />
    ) : null;

  // (header & route map refs/effects are declared at the top of the component)

  const handleExportGPX = async () => {
    if (!session.routes) return;
    const coords = (session.routes.coordinates as Array<{ lat: number; lng: number; elevation?: number }>);
    const gpx = exportToGPX(session.routes.name, coords, session.description);
    await shareOrDownloadGPX(session.routes.name, gpx, { title: session.routes.name });
  };

  const openParticipants = async () => {
    setShowParticipantsDialog(true);
    if (participantsList.length > 0) return;
    setParticipantsLoading(true);
    try {
      const { data: parts } = await supabase
        .from('session_participants')
        .select('user_id')
        .eq('session_id', session.id);
      const ids = (parts || []).map(p => p.user_id);
      const allIds = Array.from(new Set([session.organizer_id, ...ids]));
      if (allIds.length === 0) { setParticipantsList([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', allIds);
      setParticipantsList((profiles || []).map(p => ({
        user_id: p.user_id!,
        profile: { username: p.username || '', display_name: p.display_name || '', avatar_url: p.avatar_url || null },
      })));
    } catch (e) {
      console.warn('[SessionDetails] participants load failed', e);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const participantsCount = session.current_participants || 0;
  const headerStaticMapUrl = buildSessionStaticMapUrl({
    routePath: [],
    pin: { lat: session.location_lat, lng: session.location_lng },
    width: 1200,
    height: 560,
  });

  return (
    <>
    <Dialog open={!!session} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        fullScreen={isMobile}
        hideCloseButton
        className={cn(
          "relative flex min-h-0 flex-col gap-0 overflow-hidden border-0 p-0 apple-grouped-bg",
          isMobile && "h-[100dvh] max-h-[100dvh] w-screen max-w-none",
          !isMobile &&
            "h-full max-h-full w-full max-w-full sm:h-auto sm:max-h-[95vh] sm:max-w-md sm:rounded-2xl",
        )}
      >
        <DialogTitle className="sr-only">{session.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Détails de la séance, horaires, lieu, organisateur et actions disponibles.
        </DialogDescription>
        <div className="flex shrink-0 items-center justify-between border-b-[0.5px] border-border apple-grouped-bg px-4 pb-2.5 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-0.5 text-[17px] font-normal tracking-[-0.2px] text-primary active:opacity-70"
            aria-label="Retour"
          >
            <svg
              width="11"
              height="18"
              viewBox="0 0 12 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M10 2L2 10l8 8" />
            </svg>
            <span>Découvrir</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSessionShare(true)}
            className="inline-flex h-9 w-9 items-center justify-center text-primary active:opacity-70"
            aria-label="Partager"
          >
            <Share2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="apple-grouped-bg px-4 pb-[120px] pt-3">
            <div className="overflow-hidden rounded-[18px] bg-card shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] dark:shadow-none">
              <div className="relative h-[180px] overflow-hidden bg-secondary">
                {headerStaticMapUrl ? (
                  <img
                    src={headerStaticMapUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                  />
                ) : null}
                <div
                  ref={headerMapRef}
                  className="absolute inset-0"
                  style={{ opacity: headerMapReady && !headerMapFailed ? 1 : 0, transition: "opacity 220ms ease" }}
                />
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowOrganizerProfile(true)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-80"
                  >
                    <Avatar className="h-9 w-9 shrink-0 rounded-full">
                      <AvatarImage src={organizerProfile.avatar_url} />
                      <AvatarFallback className="bg-primary text-[13px] font-semibold text-primary-foreground">
                        {(organizerProfile.display_name || organizerProfile.username || "?")
                          .split(/\s+/)
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-muted-foreground">Organisée par</p>
                      <p className="truncate text-[15px] font-semibold text-foreground">
                        {organizerProfile.display_name || organizerProfile.username}
                      </p>
                    </div>
                  </button>
                  {!isOrganizer ? (
                    <button
                      type="button"
                      onClick={() => setShowOrganizerProfile(true)}
                      className="apple-pill shrink-0 px-3.5 py-1.5 text-[13px] font-semibold"
                    >
                      Suivre
                    </button>
                  ) : null}
                </div>
                <h1 className="mt-3.5 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.5px] text-foreground">
                  {dynamicTitle}
                </h1>
                {session.description ? (
                  <p className="mt-2 text-[15px] leading-snug text-muted-foreground">{session.description}</p>
                ) : null}
                {levelBadge ? <div className="mt-3">{levelBadge}</div> : null}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[12px] bg-card shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] dark:shadow-none">
              <button
                type="button"
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location_name)}`;
                  window.open(url, "_blank");
                }}
                className="flex w-full items-center gap-3 border-b-[0.5px] border-border px-4 py-3 text-left active:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ff3b30] text-[20px] leading-none text-white">
                  📍
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                    {session.location_name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Point de départ</p>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" aria-hidden />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 border-b-[0.5px] border-border px-4 py-3 text-left active:bg-muted/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ff9500] text-[20px] leading-none">
                      🕡
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-semibold capitalize leading-tight tracking-[-0.3px] text-foreground">
                        {dateFmt} · {timeFmt}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">Durée estimée {estimatedDuration}</p>
                    </div>
                    <ChevronDown className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[220px]">
                  <DropdownMenuItem className="cursor-pointer" onClick={() => openGoogleCalendarLink(calendarEvent)}>
                    Ouvrir dans Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      downloadICSFile(calendarEvent);
                      toast({ title: "Calendrier", description: "Fichier .ics téléchargé" });
                    }}
                  >
                    Télécharger .ics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => {
                  if (timelineBlocks.length > 0) {
                    setShowBlocksDialog(true);
                    return;
                  }
                  if (session.routes) {
                    routeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  toast({ title: "Parcours", description: "Aucun parcours détaillé pour cette séance." });
                }}
                className="flex w-full items-center gap-3 border-b-[0.5px] border-border px-4 py-3 text-left active:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#34c759] text-[20px] leading-none">
                  📏
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                    {[
                      totalDistance !== "—" ? totalDistance : null,
                      showElevationTile && session.routes ? `D+ ${Math.round(session.routes.total_elevation_gain)} m` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Allure {avgPace}
                    {timelineBlocks.length > 0 ? " · Appuyer pour le découpage" : ""}
                  </p>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => void openParticipants()}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-[20px] leading-none text-primary-foreground">
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                    {participantsCount} participant{participantsCount !== 1 ? "s" : ""}
                    {session.max_participants != null ? ` · ${session.max_participants} places max` : ""}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Séance entre amis</p>
                </div>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground/50" aria-hidden />
              </button>
            </div>
            {session.routes && (
              <div
                ref={routeSectionRef}
                className="mt-4 overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] dark:shadow-none"
              >
                <p className="border-b-[0.5px] border-border px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Parcours
                </p>
                <div className="grid grid-cols-5">
                  <div ref={routeMapRef} className="col-span-3 h-32 bg-secondary" />
                  <div className="col-span-2 flex flex-col justify-center p-3">
                    <p className="text-[18px] font-bold leading-tight text-foreground">
                      {formatMeters(session.routes.total_distance)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      D+ {Math.round(session.routes.total_elevation_gain)} m
                    </p>
                  </div>
                </div>
                <div className="border-t border-border p-3">
                  <button
                    type="button"
                    onClick={handleExportGPX}
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-[13px] font-medium text-foreground active:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exporter GPX
                  </button>
                </div>
              </div>
            )}

            {session.image_url ? (
              <div className="mt-4 overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] dark:shadow-none">
                <p className="border-b-[0.5px] border-border px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Photo du lieu
                </p>
                <img
                  src={session.image_url}
                  alt=""
                  className="h-48 w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}

            {/* ==== ORGANIZER MGMT (kept for organizers / past sessions) ==== */}
            {isOrganizer && (
              <div className="px-5 mt-6 space-y-2">
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card h-11 text-[14px] font-medium text-foreground active:bg-secondary"
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-card h-11 text-[14px] font-medium text-destructive active:bg-destructive/5"
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

        {/*
          ==== STICKY CTA — Refonte handoff mockup 05 floating-sticky-bar ====
          Capsule flottante 64h rounded-18 sur fond parchment translucide blur 20+sat 180%,
          posée à 12px des bords. Info (subline 12 muted + line 15/600) à gauche, action pill à droite.
          Toute la logique métier (organizer / participant / requested / GPS / full / finished) est
          conservée — seul le visuel change.
        */}
        <div
          className={cn(
            "absolute left-3 right-3 z-10 flex items-center gap-3 rounded-[18px] px-4",
            "border-[0.5px] border-[rgba(60,60,67,0.18)]",
            "bg-[rgba(245,245,247,0.85)] [backdrop-filter:blur(20px)_saturate(180%)] [-webkit-backdrop-filter:blur(20px)_saturate(180%)]",
            "dark:border-[rgba(84,84,88,0.4)] dark:bg-[rgba(28,28,30,0.86)]"
          )}
          style={{
            bottom: 'max(env(safe-area-inset-bottom), 16px)',
            minHeight: 64,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          {isOrganizer ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-snug text-muted-foreground">Ta séance</div>
                <div className="truncate text-[15px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                  {dateFmt} · {timeFmt}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSessionShare(true)}
                className="apple-pill apple-pill-large shrink-0 px-5"
              >
                Partager
              </button>
            </>
          ) : isParticipant ? (
            isScheduled && !gpsValidated ? (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] leading-snug text-muted-foreground">Sur place ?</div>
                  <div className="truncate text-[15px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                    {dateFmt} · {timeFmt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGPSValidation}
                  disabled={validatingGPS}
                  className="inline-flex h-[50px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#34C759] px-5 text-[15px] font-semibold tracking-[-0.3px] text-white transition-transform duration-150 active:scale-[0.96] disabled:opacity-50"
                >
                  {validatingGPS ? <Loader2 className="h-4 w-4 animate-spin" /> : <><MapPin className="h-4 w-4" /> Je suis arrivé</>}
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] leading-snug text-muted-foreground">Tu participes</div>
                  <div className="truncate text-[15px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                    {dateFmt} · {timeFmt}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(true)}
                  className="inline-flex h-[50px] shrink-0 items-center justify-center rounded-full border border-[hsl(var(--destructive))]/40 bg-transparent px-5 text-[15px] font-medium tracking-[-0.3px] text-[hsl(var(--destructive))] transition-transform duration-150 active:scale-[0.96]"
                >
                  Quitter
                </button>
              </>
            )
          ) : hasRequested ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-snug text-muted-foreground">Demande envoyée</div>
                <div className="truncate text-[15px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                  En attente de réponse
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelRequestConfirm(true)}
                className="inline-flex h-[50px] shrink-0 items-center justify-center rounded-full border border-[hsl(var(--destructive))]/40 bg-transparent px-5 text-[15px] font-medium tracking-[-0.3px] text-[hsl(var(--destructive))] transition-transform duration-150 active:scale-[0.96]"
              >
                Annuler
              </button>
            </>
          ) : isScheduled && !isFull ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] leading-snug text-muted-foreground">Tu peux te désinscrire à tout moment</div>
                <div className="truncate text-[15px] font-semibold leading-tight tracking-[-0.3px] text-foreground">
                  {dateFmt} · {timeFmt}
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestJoin}
                disabled={loading}
                className="apple-pill apple-pill-large shrink-0 px-5 disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Rejoindre"}
              </button>
            </>
          ) : (
            <div className="flex h-[50px] w-full items-center justify-center text-[14px] font-medium text-muted-foreground">
              {isFull ? 'Séance complète' : 'Séance terminée'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

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
        organizerName={organizerProfile.username || organizerProfile.display_name}
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

      {/* ==== Blocks Detail Dialog ==== */}
      <Dialog open={showBlocksDialog} onOpenChange={setShowBlocksDialog}>
        <DialogContent className="p-0 gap-0 max-w-md sm:rounded-2xl bg-background border-0 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={() => setShowBlocksDialog(false)} className="h-9 w-9 rounded-full flex items-center justify-center active:bg-secondary" aria-label="Retour">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h2 className="text-[15px] font-semibold">Découpage de la séance</h2>
            <div className="w-9" />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {timelineBlocks.map((b, idx) => {
                const color =
                  b.type === 'warmup' ? 'bg-[#34C759]' :
                  b.type === 'cooldown' ? 'bg-[#FF9500]' :
                  b.type === 'interval' ? 'bg-primary' : 'bg-[#007AFF]';
                const label =
                  b.type === 'warmup' ? 'Échauffement' :
                  b.type === 'cooldown' ? 'Retour au calme' :
                  b.type === 'interval' ? 'Bloc principal (intervalles)' : 'Bloc constant';
                return (
                  <div key={b.id || idx} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-3 w-3 rounded-full ${color}`} />
                      <p className="text-[14px] font-semibold text-foreground">{label}</p>
                    </div>
                    {b.type === 'interval' ? (
                      <div className="space-y-1.5 text-[13px] text-foreground">
                        <p><span className="text-muted-foreground">Répétitions :</span> <strong>{b.repetitions || 1}</strong></p>
                        <p><span className="text-muted-foreground">Effort :</span> <strong>{b.effortDuration || 0}{b.effortType === 'time' ? ' s' : ' m'}</strong>{b.effortPace ? ` @ ${b.effortPace}/km` : ''}</p>
                        {b.recoveryDuration && (
                          <p><span className="text-muted-foreground">Récup :</span> <strong>{b.recoveryDuration} s</strong>{b.recoveryType ? ` (${b.recoveryType})` : ''}</p>
                        )}
                        {b.rpe ? <p><span className="text-muted-foreground">RPE effort :</span> <strong>{b.rpe}/10</strong></p> : null}
                        {b.recoveryRpe ? <p><span className="text-muted-foreground">RPE récup :</span> <strong>{b.recoveryRpe}/10</strong></p> : null}
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-[13px] text-foreground">
                        <p><span className="text-muted-foreground">Durée :</span> <strong>{b.duration || 0}{b.durationType === 'time' ? ' min' : ' m'}</strong></p>
                        {b.pace && <p><span className="text-muted-foreground">Allure :</span> <strong>{b.pace}</strong></p>}
                        {b.intensity && <p><span className="text-muted-foreground">Intensité :</span> <strong>{b.intensity}</strong></p>}
                        {b.rpe ? <p><span className="text-muted-foreground">RPE :</span> <strong>{b.rpe}/10</strong></p> : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ==== Participants List Dialog ==== */}
      <Dialog open={showParticipantsDialog} onOpenChange={setShowParticipantsDialog}>
        <DialogContent className="p-0 gap-0 max-w-md sm:rounded-2xl bg-background border-0 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={() => setShowParticipantsDialog(false)} className="h-9 w-9 rounded-full flex items-center justify-center active:bg-secondary" aria-label="Retour">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h2 className="text-[15px] font-semibold">Participants ({participantsList.length})</h2>
            <div className="w-9" />
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {participantsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : participantsList.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-8">Aucun participant pour le moment.</p>
              ) : (
                participantsList.map((p) => {
                  const isOrg = p.user_id === session.organizer_id;
                  return (
                    <button
                      key={p.user_id}
                      onClick={() => { setShowParticipantsDialog(false); setShowOrganizerProfile(false); navigate(`/profile/${p.user_id}`); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl active:bg-secondary"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[13px]">
                          {(p.profile.username || p.profile.display_name || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[14px] font-semibold text-foreground truncate">
                          {p.profile.display_name || p.profile.username || 'Utilisateur'}
                        </p>
                        {p.profile.username && (
                          <p className="text-[12px] text-muted-foreground truncate">@{p.profile.username}</p>
                        )}
                      </div>
                      {isOrg && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Orga</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
