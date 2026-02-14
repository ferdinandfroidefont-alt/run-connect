import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Loader2, CheckCircle, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ParticipantValidationViewProps {
  session: Session;
  userId: string;
  onComplete: () => void;
}

export const ParticipantValidationView = ({ session, userId, onComplete }: ParticipantValidationViewProps) => {
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  const MAX_DISTANCE_METERS = 500;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleValidatePresence = async () => {
    setValidating(true);
    try {
      const position = await getCurrentPosition();
      if (!position) {
        toast({
          title: "Position introuvable",
          description: "Activez la géolocalisation pour confirmer votre présence",
          variant: "destructive",
        });
        return;
      }

      const dist = calculateDistance(
        position.lat,
        position.lng,
        session.location_lat,
        session.location_lng
      );

      setDistance(Math.round(dist));

      if (dist > MAX_DISTANCE_METERS) {
        toast({
          title: "Trop loin",
          description: `Vous êtes à ${Math.round(dist)}m du lieu (max ${MAX_DISTANCE_METERS}m)`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('session_participants')
        .update({
          confirmed_by_gps: true,
          gps_lat: position.lat,
          gps_lng: position.lng,
          gps_validation_time: new Date().toISOString(),
          validation_status: 'validated',
        })
        .eq('session_id', session.id)
        .eq('user_id', userId);

      if (error) throw error;

      setValidated(true);
      toast({
        title: "Présence confirmée ! 🎉",
        description: "Votre présence a été validée par GPS",
      });
    } catch (error) {
      console.error('Error validating presence:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider votre présence",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Info */}
      <div className="bg-card border border-border rounded-[10px] p-4">
        <h2 className="text-[17px] font-semibold text-foreground mb-2">{session.title}</h2>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(session.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>{session.location_name}</span>
          </div>
        </div>
      </div>

      {/* Validation Card */}
      <div className="bg-card border border-border rounded-[10px] p-6 text-center space-y-4">
        {validated ? (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-foreground">Présence validée !</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                {distance !== null && `Vous étiez à ${distance}m du lieu`}
              </p>
            </div>
            <Button onClick={onComplete} className="w-full h-11 rounded-[10px]">
              Terminer
            </Button>
          </>
        ) : (
          <>
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-foreground">Confirmer votre présence</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                Assurez-vous d'être à moins de {MAX_DISTANCE_METERS}m du lieu de la séance
              </p>
            </div>
            {distance !== null && distance > MAX_DISTANCE_METERS && (
              <Badge variant="destructive">Trop loin : {distance}m</Badge>
            )}
            <Button
              onClick={handleValidatePresence}
              disabled={validating}
              className="w-full h-11 rounded-[10px]"
            >
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validation GPS...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Valider par GPS
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
