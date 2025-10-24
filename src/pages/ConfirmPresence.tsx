import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SessionSelector } from '@/components/SessionSelector';
import { CreatorValidationView } from '@/components/CreatorValidationView';
import { ParticipantValidationView } from '@/components/ParticipantValidationView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, UserCheck, Users } from 'lucide-react';
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
  
  const [loading, setLoading] = useState(false);
  const [roleChoice, setRoleChoice] = useState<'creator' | 'participant' | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'participant' | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    // If sessionId is provided in URL, load it directly
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
        // Load sessions created by user in last 24h
        const { data: createdSessions, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('organizer_id', user.id)
          .gte('scheduled_at', twentyFourHoursAgo.toISOString())
          .order('scheduled_at', { ascending: false });

        if (error) throw error;
        setSessions(createdSessions || []);
      } else {
        // Load sessions where user is a participant
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
          {(roleChoice || selectedSession) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="glass-card"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-display-md text-foreground">
            Confirmer la présence
          </h1>
        </motion.div>

        {loading ? (
          <div className="glass-card p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !roleChoice ? (
          // Role selection screen
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8"
          >
            <p className="text-center text-muted-foreground mb-12 text-lg">
              Choisissez votre rôle pour cette séance
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleChoice('creator')}
                className="glass-card p-8 flex flex-col items-center gap-4 hover:bg-primary/5 transition-all cursor-pointer border-2 border-transparent hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20"
              >
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <UserCheck className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Je suis créateur</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Validez les participants présents à votre séance
                </p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRoleChoice('participant')}
                className="glass-card p-8 flex flex-col items-center gap-4 hover:bg-primary/5 transition-all cursor-pointer border-2 border-transparent hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20"
              >
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center">
                  <Users className="h-10 w-10 text-accent" />
                </div>
                <h2 className="text-xl font-bold">Je participe</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Confirmez votre présence sur le lieu de la séance
                </p>
              </motion.button>
            </div>
          </motion.div>
        ) : !selectedSession ? (
          // Session selection screen
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {sessions.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <p className="text-xl font-semibold mb-2">Aucune séance récente</p>
                <p className="text-muted-foreground">
                  {roleChoice === 'creator' 
                    ? "Vous n'avez créé aucune séance récente"
                    : "Vous ne participez à aucune séance récente"}
                </p>
              </div>
            ) : (
              <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-2">
                  {roleChoice === 'creator' 
                    ? "Sélectionnez votre séance"
                    : "Sélectionnez la séance"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {roleChoice === 'creator'
                    ? "Choisissez la séance dont vous êtes le créateur"
                    : "Choisissez la séance à laquelle vous participez"}
                </p>
                <SessionSelector
                  sessions={sessions}
                  userId={user?.id || ''}
                  onSessionSelect={handleSessionSelect}
                />
              </div>
            )}
          </motion.div>
        ) : (
          // Validation view
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
