import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';

import { supabase } from '@/integrations/supabase/client';
import { SessionSelector } from '@/components/SessionSelector';
import { CreatorValidationView } from '@/components/CreatorValidationView';
import { ParticipantValidationView } from '@/components/ParticipantValidationView';
import { cn } from '@/lib/utils';
import { ChevronLeft, Loader2, UserCheck, Users, MapPin } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  organizer_id: string;
  activity_type: string;
}

export default function ConfirmPresence() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  
  const [loading, setLoading] = useState(false);

  const [roleChoice, setRoleChoice] = useState<'creator' | 'participant' | 'tracking' | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'participant' | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number>(0);

  const roleCards = useMemo(
    () => [
      {
        role: 'creator' as const,
        title: t('confirmPresence.creator'),
        description: t('confirmPresence.creatorDescription'),
        icon: UserCheck,
        iconTone: 'bg-primary/10 text-primary',
      },
      {
        role: 'participant' as const,
        title: t('confirmPresence.participant'),
        description: t('confirmPresence.participantDescription'),
        icon: Users,
        iconTone: 'bg-blue-500/10 text-blue-500',
      },
      {
        role: 'tracking' as const,
        title: 'Suivre les participants',
        description: 'Voir en temps réel où se trouvent les autres sur la carte',
        icon: MapPin,
        iconTone: 'bg-primary/10 text-primary',
      },
    ],
    [t]
  );

  const CAROUSEL_COPIES = 7;
  const repeatedRoleCards = useMemo(
    () =>
      Array.from({ length: CAROUSEL_COPIES }, (_, copyIndex) =>
        roleCards.map((card, cardIndex) => ({
          ...card,
          key: `${copyIndex}-${card.role}`,
          cardIndex,
        }))
      ).flat(),
    [roleCards]
  );

  const recenterInfiniteCarousel = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const cycleHeight = el.scrollHeight / CAROUSEL_COPIES;
    const min = cycleHeight * 1.2;
    const max = cycleHeight * (CAROUSEL_COPIES - 1.2);
    if (el.scrollTop < min) el.scrollTop += cycleHeight * 2;
    if (el.scrollTop > max) el.scrollTop -= cycleHeight * 2;
  }, []);

  const updateFocusedCard = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const containerCenter = el.getBoundingClientRect().top + el.clientHeight / 2;
    const cards = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-role-card="true"]'));
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - containerCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = idx;
      }
    });
    setFocusedCardIndex(nearest);
  }, []);

  const handleCarouselScroll = useCallback(() => {
    recenterInfiniteCarousel();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateFocusedCard);
  }, [recenterInfiniteCarousel, updateFocusedCard]);

  useEffect(() => {
    if (sessionId && user) {
      loadSpecificSession();
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (roleChoice || loading) return;
    const el = carouselRef.current;
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollTop = el.scrollHeight / 2 - el.clientHeight / 2;
      updateFocusedCard();
    }, 0);
    return () => window.clearTimeout(id);
  }, [roleChoice, loading, updateFocusedCard]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const loadSpecificSession = async () => {
    if (!user || !sessionId) return;
    
    setLoading(true);
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      if (session) {
        setSelectedSession(session);
        const isCreator = session.organizer_id === user.id;
        setUserRole(isCreator ? 'creator' : 'participant');
        setRoleChoice(isCreator ? 'creator' : 'participant');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChoice = (role: 'creator' | 'participant' | 'tracking') => {
    setRoleChoice(role);
    if (role === 'tracking') {
      loadAllUserSessions();
    } else {
      loadSessionsByRole(role);
    }
  };

  const loadAllUserSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Load sessions where user is organizer
      const { data: createdSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('organizer_id', user.id)
        .gte('scheduled_at', twentyFourHoursAgo.toISOString());

      // Load sessions where user is participant
      const { data: participations } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', user.id);

      const participantSessionIds = participations?.map(p => p.session_id) || [];
      let participantSessions: Session[] = [];
      if (participantSessionIds.length > 0) {
        const { data } = await supabase
          .from('sessions')
          .select('*')
          .in('id', participantSessionIds)
          .neq('organizer_id', user.id)
          .gte('scheduled_at', twentyFourHoursAgo.toISOString());
        participantSessions = (data || []) as Session[];
      }

      const allSessions = [...(createdSessions || []), ...participantSessions] as Session[];
      allSessions.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionsByRole = async (role: 'creator' | 'participant') => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      if (role === 'creator') {
        const { data: createdSessions, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('organizer_id', user.id)
          .gte('scheduled_at', twentyFourHoursAgo.toISOString())
          .order('scheduled_at', { ascending: false });

        if (error) throw error;
        setSessions(createdSessions || []);
      } else {
        const { data: participations, error: participantError } = await supabase
          .from('session_participants')
          .select('session_id')
          .eq('user_id', user.id);

        if (participantError) throw participantError;

        const participantSessionIds = participations?.map(p => p.session_id) || [];
        
        if (participantSessionIds.length > 0) {
          const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .in('id', participantSessionIds)
            .neq('organizer_id', user.id)
            .gte('scheduled_at', twentyFourHoursAgo.toISOString())
            .order('scheduled_at', { ascending: false });

          if (error) throw error;
          setSessions(data || []);
        } else {
          setSessions([]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionSelect = (session: Session, role: 'creator' | 'participant') => {
    if (roleChoice === 'tracking') {
      navigate(`/session-tracking/${session.id}`);
      return;
    }
    setSelectedSession(session);
    setUserRole(role);
  };

  const handleBack = () => {
    if (selectedSession) {
      setSelectedSession(null);
      setUserRole(null);
    } else if (roleChoice) {
      setRoleChoice(null);
      setSessions([]);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="fixed-fill-with-bottom-nav bg-secondary flex min-h-0 flex-col overflow-x-hidden z-0">
      {/* iOS Header */}
      <div className="shrink-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-2.5">
          <div className="flex min-w-0 justify-start">
            <button onClick={handleBack} className="flex min-w-0 max-w-full items-center gap-1 text-primary">
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span className="truncate text-[17px]">Retour</span>
            </button>
          </div>
          <h1 className="max-w-[200px] truncate text-center text-[17px] font-semibold text-foreground">
            Présence
          </h1>
          <div className="flex min-w-0 justify-end" aria-hidden>
            <div className="h-9 w-16 shrink-0" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          !roleChoice && !loading
            ? 'overflow-hidden px-ios-4 pb-ios-4 pt-ios-2'
            : 'overflow-y-auto p-4 pb-ios-4',
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-ios-4">
            <div className="ios-card flex w-full max-w-sm flex-col items-center justify-center gap-3 border border-border p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[15px] text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : !roleChoice ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-md">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="h-[min(68vh,560px)] snap-y snap-mandatory overflow-y-auto px-0 py-[22vh] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="space-y-3">
                  {repeatedRoleCards.map((card, idx) => {
                    const Icon = card.icon;
                    const isFocused = focusedCardIndex === idx;
                    return (
                      <button
                        key={card.key}
                        data-role-card="true"
                        type="button"
                        onClick={() => handleRoleChoice(card.role)}
                        className={cn(
                          'ios-card snap-center flex min-h-[148px] w-full items-center gap-ios-3 border border-border/60 px-ios-4 py-ios-3 text-left transition-all duration-200',
                          isFocused
                            ? 'scale-[1.01] bg-card shadow-[0_12px_34px_-18px_rgba(0,0,0,0.45)]'
                            : 'scale-[0.97] bg-card/88 opacity-75'
                        )}
                      >
                        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px]', card.iconTone)}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-[17px] font-semibold leading-tight text-foreground">{card.title}</h2>
                          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{card.description}</p>
                        </div>
                        <ChevronLeft className="h-5 w-5 shrink-0 rotate-180 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : !selectedSession ? (
          // Session selection screen - iOS Style
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="ios-card p-8 text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-[17px] font-semibold text-foreground mb-1">
                  {t('confirmPresence.noSessions')}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {roleChoice === 'creator' 
                    ? t('confirmPresence.noCreatorSessions')
                    : t('confirmPresence.noParticipantSessions')}
                </p>
              </div>
            ) : (
              <div className="ios-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-[17px] font-semibold text-foreground">
                    {t('confirmPresence.selectSession')}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {roleChoice === 'creator'
                      ? t('confirmPresence.selectCreatorSession')
                      : t('confirmPresence.selectParticipantSession')}
                  </p>
                </div>
                <div className="p-3">
                  <SessionSelector
                    sessions={sessions}
                    userId={user?.id || ''}
                    onSessionSelect={handleSessionSelect}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Validation view
          <div className="space-y-4">
            {/* Track participants button */}
            <button
              onClick={() => navigate(`/session-tracking/${selectedSession.id}`)}
              className="ios-card flex w-full items-center gap-3 p-4 transition-colors active:bg-secondary"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-medium text-foreground">
                  {t('confirmPresence.trackParticipants') || 'Suivre les participants sur la carte'}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t('confirmPresence.trackParticipantsDescription') || 'Voir en temps réel où se trouvent les autres'}
                </p>
              </div>
              <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
            </button>

            {userRole === 'creator' ? (
              <CreatorValidationView
                session={selectedSession}
                onComplete={() => navigate('/')}
              />
            ) : (
              <ParticipantValidationView
                session={selectedSession}
                userId={user?.id || ''}
                onComplete={() => navigate('/')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
