import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  organizer_id: string;
  activity_type: string;
}

interface SessionSelectorProps {
  sessions: Session[];
  userId: string;
  onSessionSelect: (session: Session, role: 'creator' | 'participant') => void;
}

export const SessionSelector = ({ sessions, userId, onSessionSelect }: SessionSelectorProps) => {
  if (sessions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ios-card p-ios-8 text-center"
      >
        <div className="text-4xl mb-4">🔍</div>
        <h3 className="text-heading-lg mb-2">Aucune séance à confirmer</h3>
        <p className="text-muted-foreground">
          Rejoignez une séance pour confirmer votre présence
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-body-md text-muted-foreground mb-4"
      >
        Sélectionnez une séance pour confirmer la présence
      </motion.p>

      {sessions.map((session, index) => {
        const isCreator = session.organizer_id === userId;

        return (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div
              className="ios-card cursor-pointer p-ios-4 transition-colors active:bg-secondary"
              onClick={() => onSessionSelect(session, isCreator ? 'creator' : 'participant')}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{session.title}</h3>
                  <Badge variant={isCreator ? 'default' : 'secondary'}>
                    {isCreator ? '👑 Créateur' : '🏃 Participant'}
                  </Badge>
                </div>
                <Badge variant="outline" className="capitalize">
                  {session.activity_type}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(session.scheduled_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{session.location_name}</span>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
