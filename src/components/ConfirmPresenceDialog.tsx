import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { MapPin, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SessionToConfirm {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  activity_type: string;
  participant_id: string;
  confirmed_by_gps: boolean;
  confirmed_by_creator: boolean;
}

interface ConfirmPresenceDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userLocation: { lat: number; lng: number } | null;
}

export const ConfirmPresenceDialog = ({
  open,
  onClose,
  userId,
  userLocation
}: ConfirmPresenceDialogProps) => {
  const [sessions, setSessions] = useState<SessionToConfirm[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const { validatePresence } = useGPSValidation();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMySessions();
    }
  }, [open, userId]);

  const loadMySessions = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

      const { data, error } = await supabase
        .from('session_participants')
        .select(`
          id,
          session_id,
          confirmed_by_gps,
          confirmed_by_creator,
          sessions!inner(
            id,
            title,
            scheduled_at,
            location_name,
            location_lat,
            location_lng,
            activity_type
          )
        `)
        .eq('user_id', userId)
        .gte('sessions.scheduled_at', tenMinutesAgo.toISOString())
        .lte('sessions.scheduled_at', tenMinutesLater.toISOString());

      if (error) throw error;

      const sessionsToConfirm = data?.map((p: any) => ({
        id: p.sessions.id,
        title: p.sessions.title,
        scheduled_at: p.sessions.scheduled_at,
        location_name: p.sessions.location_name,
        location_lat: p.sessions.location_lat,
        location_lng: p.sessions.location_lng,
        activity_type: p.sessions.activity_type,
        participant_id: p.id,
        confirmed_by_gps: p.confirmed_by_gps,
        confirmed_by_creator: p.confirmed_by_creator
      })) || [];

      setSessions(sessionsToConfirm);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPresence = async (session: SessionToConfirm) => {
    setValidatingId(session.id);
    try {
      const result = await validatePresence(
        session.id,
        session.location_lat,
        session.location_lng,
        session.scheduled_at,
        userId
      );

      if (result.success) {
        toast({ 
          title: "✅ Présence confirmée", 
          description: `Validation GPS réussie (${result.distance}m du point de RDV)` 
        });
        await loadMySessions();
      } else {
        toast({ 
          title: "❌ Validation impossible", 
          description: result.error, 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setValidatingId(null);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'running': return '🏃';
      case 'cycling': return '🚴';
      case 'walking': return '🚶';
      case 'swimming': return '🏊';
      case 'triathlon': return '🏊🚴🏃';
      default: return '🏃';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Confirmer ma présence
          </DialogTitle>
          <DialogDescription>
            Valide ta présence GPS pour les séances qui commencent bientôt
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">📍</div>
            <p className="text-sm text-muted-foreground">
              Aucune séance à confirmer pour le moment
            </p>
            <p className="text-xs text-muted-foreground">
              La validation GPS est disponible 10 minutes avant/après l'heure prévue
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {sessions.map(session => (
                  <div 
                    key={session.id} 
                    className="p-4 border rounded-lg bg-card space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getActivityIcon(session.activity_type)}</span>
                          <h3 className="font-semibold text-sm">{session.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.scheduled_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {session.confirmed_by_gps && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          GPS validé
                        </Badge>
                      )}
                      {session.confirmed_by_creator && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Créateur validé
                        </Badge>
                      )}
                    </div>

                    {!session.confirmed_by_gps && (
                      <Button
                        onClick={() => handleConfirmPresence(session)}
                        disabled={validatingId === session.id}
                        className="w-full"
                        size="sm"
                      >
                        {validatingId === session.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validation en cours...
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Je suis arrivé
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="text-xs text-muted-foreground text-center pt-2">
              💡 La validation GPS nécessite d'être à moins de 80m du point de départ
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
