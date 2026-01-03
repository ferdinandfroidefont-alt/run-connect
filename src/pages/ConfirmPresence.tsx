import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { SessionSelector } from '@/components/SessionSelector';
import { CreatorValidationView } from '@/components/CreatorValidationView';
import { ParticipantValidationView } from '@/components/ParticipantValidationView';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, UserCheck, Users } from 'lucide-react';

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
  const [roleChoice, setRoleChoice] = useState<'creator' | 'participant' | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'participant' | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (sessionId && user) {
      loadSpecificSession();
    }
  }, [user, sessionId]);

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

  const handleRoleChoice = (role: 'creator' | 'participant') => {
    setRoleChoice(role);
    loadSessionsByRole(role);
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
    <div className="min-h-screen bg-secondary">
      {/* iOS Header */}
      
      {/* iOS Header */}
      <div className="bg-card border-b border-border shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[17px]">Retour</span>
          </button>
          <h1 className="text-[17px] font-semibold text-foreground">
            {t('confirmPresence.title')}
          </h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {loading ? (
          <div className="bg-card border border-border rounded-[10px] p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[15px] text-muted-foreground">Chargement...</p>
          </div>
        ) : !roleChoice ? (
          // Role selection screen - iOS Style
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-[15px] px-4 py-4">
              {t('confirmPresence.selectRole')}
            </p>
            
            <div className="space-y-3">
              {/* Creator Card */}
              <button
                onClick={() => handleRoleChoice('creator')}
                className="w-full bg-card border border-border rounded-[10px] p-5 flex items-center gap-4 active:bg-secondary transition-colors"
              >
                <div className="h-14 w-14 rounded-[10px] bg-primary/10 flex items-center justify-center">
                  <UserCheck className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-[17px] font-semibold text-foreground">
                    {t('confirmPresence.creator')}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {t('confirmPresence.creatorDescription')}
                  </p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
              </button>

              {/* Participant Card */}
              <button
                onClick={() => handleRoleChoice('participant')}
                className="w-full bg-card border border-border rounded-[10px] p-5 flex items-center gap-4 active:bg-secondary transition-colors"
              >
                <div className="h-14 w-14 rounded-[10px] bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-7 w-7 text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-[17px] font-semibold text-foreground">
                    {t('confirmPresence.participant')}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {t('confirmPresence.participantDescription')}
                  </p>
                </div>
                <ChevronLeft className="h-5 w-5 text-muted-foreground rotate-180" />
              </button>
            </div>
          </div>
        ) : !selectedSession ? (
          // Session selection screen - iOS Style
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="bg-card border border-border rounded-[10px] p-8 text-center">
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
              <div className="bg-card border border-border rounded-[10px] overflow-hidden">
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
          <div>
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
