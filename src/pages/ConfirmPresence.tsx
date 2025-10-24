import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SessionSelector } from '@/components/SessionSelector';
import { CreatorValidationView } from '@/components/CreatorValidationView';
import { ParticipantValidationView } from '@/components/ParticipantValidationView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'participant' | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user, sessionId]);

  const loadSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

      if (sessionId) {
        // Load specific session
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;

        // Check if user is creator or participant
        if (sessionData.organizer_id === user.id) {
          setUserRole('creator');
        } else {
          const { data: participantData } = await supabase
            .from('session_participants')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', user.id)
            .single();

          if (participantData) {
            setUserRole('participant');
          }
        }

        setSelectedSession(sessionData);
      } else {
        // Load sessions as creator (with unvalidated participants)
        const { data: creatorSessions } = await supabase
          .from('sessions')
          .select(`
            *,
            session_participants!inner(count)
          `)
          .eq('organizer_id', user.id)
          .gte('scheduled_at', twentyFourHoursAgo.toISOString())
          .lte('scheduled_at', now.toISOString());

        // Load sessions as participant (not yet validated by GPS)
        const { data: participantSessions } = await supabase
          .from('session_participants')
          .select(`
            *,
            sessions(*)
          `)
          .eq('user_id', user.id)
          .eq('confirmed_by_gps', false)
          .gte('sessions.scheduled_at', tenMinutesAgo.toISOString())
          .lte('sessions.scheduled_at', tenMinutesLater.toISOString());

        const allSessions = [
          ...(creatorSessions || []),
          ...(participantSessions?.map(p => p.sessions).filter(Boolean) || [])
        ];

        setSessions(allSessions as Session[]);

        // If only one session, auto-select it
        if (allSessions.length === 1) {
          const session = allSessions[0] as Session;
          setSelectedSession(session);
          setUserRole(session.organizer_id === user.id ? 'creator' : 'participant');
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
    if (selectedSession && !sessionId) {
      // Go back to session selection
      setSelectedSession(null);
      setUserRole(null);
    } else {
      // Go back to previous page
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 relative overflow-hidden">
      {/* Background glass effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen p-4 pb-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="glass-card"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-display-md text-foreground">
            Confirmer la présence
          </h1>
        </motion.div>

        {/* Main content */}
        {!selectedSession ? (
          <SessionSelector
            sessions={sessions}
            userId={user?.id || ''}
            onSessionSelect={handleSessionSelect}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
