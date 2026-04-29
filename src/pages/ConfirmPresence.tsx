import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

import { supabase } from '@/integrations/supabase/client';
import { SessionSelector } from '@/components/SessionSelector';
import { CreatorValidationView } from '@/components/CreatorValidationView';
import { ParticipantValidationView } from '@/components/ParticipantValidationView';
import { cn } from '@/lib/utils';
import { IosPageHeaderBar } from '@/components/layout/IosPageHeaderBar';
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

export type ConfirmPresenceProps = {
  embedded?: boolean;
  onEmbeddedBack?: () => void;
  forcedSessionId?: string | null;
  onForcedSessionConsumed?: () => void;
};

export default function ConfirmPresence({
  embedded = false,
  onEmbeddedBack,
  forcedSessionId = null,
  onForcedSessionConsumed,
}: ConfirmPresenceProps = {}) {
  const { sessionId: sessionIdFromRoute } = useParams<{ sessionId?: string }>();
  const sessionId = forcedSessionId || sessionIdFromRoute;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [roleChoice, setRoleChoice] = useState<'creator' | 'participant' | 'tracking' | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'participant' | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const roleCards = useMemo(
    () => [
      {
        role: 'creator' as const,
        title: t('confirmPresence.creator'),
        description: t('confirmPresence.creatorDescription'),
        icon: UserCheck,
        iconBg: 'bg-[#FF3B30]',
      },
      {
        role: 'participant' as const,
        title: t('confirmPresence.participant'),
        description: t('confirmPresence.participantDescription'),
        icon: Users,
        iconBg: 'bg-[#007AFF]',
      },
      {
        role: 'tracking' as const,
        title: 'Suivre les participants',
        description: 'Voir en temps réel où se trouvent les autres sur la carte',
        icon: MapPin,
        iconBg: 'bg-[#FF9500]',
      },
    ],
    [t]
  );

  useEffect(() => {
    if (sessionId && user) {
      loadSpecificSession();
    }
  }, [user, sessionId]);

  const loadSpecificSession = async () => {
    if (!user || !sessionId) return;
    const openedViaForced = !!forcedSessionId;
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
        if (embedded && openedViaForced) {
          onForcedSessionConsumed?.();
        }
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
      const { data: createdSessions } = await supabase
        .from('sessions')
        .select('*')
        .eq('organizer_id', user.id)
        .gte('scheduled_at', twentyFourHoursAgo.toISOString());
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
      if (embedded) {
        onEmbeddedBack?.();
      } else {
        navigate(-1);
      }
    }
  };

  return (
    <div
      className={
        embedded
          ? "z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-secondary"
          : "fixed-fill-with-bottom-nav z-0 flex min-h-0 min-w-0 flex-col overflow-x-hidden bg-secondary"
      }
    >
      {!embedded && (
        <div className="shrink-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            left={
              <button onClick={handleBack} className="flex min-w-0 max-w-full items-center gap-1 text-primary">
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="truncate text-[17px]">Retour</span>
              </button>
            }
            title="Présence"
          />
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-ios-4',
          embedded && 'pt-ios-2',
        )}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'none' }}
      >
        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-ios-4">
            <div className="ios-card flex w-full max-w-sm flex-col items-center justify-center gap-3 border border-border p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-[15px] text-muted-foreground">Chargement...</p>
            </div>
          </div>
        ) : !roleChoice ? (
          /* ─── Role picker — clean stacked cards ─── */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8">
            <div className="w-full max-w-md space-y-2">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="mb-6 text-center"
              >
                <h1 className="text-[22px] font-bold text-foreground">Confirmer la présence</h1>
                <p className="mt-1 text-[15px] text-muted-foreground">Quel est votre rôle pour cette séance ?</p>
              </motion.div>

              {/* Cards */}
              {roleCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <motion.button
                    key={card.role}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.08 * (idx + 1) }}
                    type="button"
                    onClick={() => handleRoleChoice(card.role)}
                    className="group flex w-full items-center gap-4 rounded-[14px] bg-card border border-border/60 px-4 py-4 text-left transition-all duration-150 active:scale-[0.98] active:bg-secondary"
                  >
                    <div className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]',
                      card.iconBg
                    )}>
                      <Icon className="h-[22px] w-[22px] text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[17px] font-semibold leading-tight text-foreground">{card.title}</h2>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{card.description}</p>
                    </div>
                    <ChevronLeft className="h-5 w-5 shrink-0 rotate-180 text-muted-foreground/50 transition-transform group-active:translate-x-0.5" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : !selectedSession ? (
          <div className="min-h-0 min-w-0 flex-1 space-y-4 pb-3 pt-0">
            {embedded && (
              <button
                type="button"
                onClick={handleBack}
                className="-ml-1 flex w-fit items-center gap-0.5 text-[15px] font-medium text-primary active:opacity-70"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                Retour
              </button>
            )}
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
          <div className="min-h-0 min-w-0 flex-1 space-y-4 pb-3 pt-0">
            {embedded && (
              <button
                type="button"
                onClick={handleBack}
                className="-ml-1 flex w-fit items-center gap-0.5 text-[15px] font-medium text-primary active:opacity-70"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" />
                Retour
              </button>
            )}
            <button
              onClick={() => navigate(`/session-tracking/${selectedSession.id}`)}
              className="ios-card flex w-full min-w-0 max-w-full items-center gap-3 p-4 transition-colors active:bg-secondary"
            >
              <div className="ios-list-row-icon shrink-0 bg-[#FF9500]">
                <MapPin className="h-[18px] w-[18px] text-white" />
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