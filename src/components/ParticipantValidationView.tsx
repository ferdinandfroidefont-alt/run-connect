import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Loader2, Navigation, Trophy } from 'lucide-react';
import { useGPSValidation } from '@/hooks/useGPSValidation';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantValidationViewProps {
  session: {
    id: string;
    title: string;
    location_lat: number;
    location_lng: number;
    scheduled_at: string;
  };
  userId: string;
  onComplete: () => void;
}

export const ParticipantValidationView = ({ session, userId, onComplete }: ParticipantValidationViewProps) => {
  const { validatePresence, validating } = useGPSValidation();
  const { toast } = useToast();
  const [distance, setDistance] = useState<number | null>(null);
  const [alreadyValidated, setAlreadyValidated] = useState(false);
  const [validatedByGPS, setValidatedByGPS] = useState(false);
  const [validatedByCreator, setValidatedByCreator] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    checkValidationStatus();
    calculateDistance();
  }, []);

  const checkValidationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('confirmed_by_gps, confirmed_by_creator')
        .eq('session_id', session.id)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setValidatedByGPS(data.confirmed_by_gps);
        setValidatedByCreator(data.confirmed_by_creator);
        setAlreadyValidated(data.confirmed_by_gps || data.confirmed_by_creator);
      }
    } catch (error) {
      console.error('Error checking validation status:', error);
    }
  };

  const calculateDistance = async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        const R = 6371e3; // Earth radius in meters
        const φ1 = (userLat * Math.PI) / 180;
        const φ2 = (session.location_lat * Math.PI) / 180;
        const Δφ = ((session.location_lat - userLat) * Math.PI) / 180;
        const Δλ = ((session.location_lng - userLng) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = Math.round(R * c);

        setDistance(dist);
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  };

  const handleValidate = async () => {
    const result = await validatePresence(
      session.id,
      session.location_lat,
      session.location_lng,
      session.scheduled_at,
      userId
    );

    if (result.success) {
      const earnedPoints = 10 + (validatedByCreator ? 15 : 0); // 10 GPS + 10 creator + 5 bonus
      setPoints(earnedPoints);
      setShowSuccess(true);
      
      toast({
        title: "✅ Présence confirmée par GPS",
        description: `+${earnedPoints} points gagnés !`
      });

      setTimeout(() => {
        onComplete();
      }, 2000);
    } else {
      toast({
        title: "❌ Validation impossible",
        description: result.error,
        variant: "destructive"
      });
    }
  };

  if (alreadyValidated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 text-center"
      >
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-heading-xl mb-2">Présence déjà confirmée</h3>
        <p className="text-body-md text-muted-foreground mb-4">
          Votre présence à "{session.title}" a déjà été validée
        </p>
        
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {validatedByGPS && (
            <Badge variant="secondary">
              <MapPin className="h-3 w-3 mr-1" />
              GPS validé
            </Badge>
          )}
          {validatedByCreator && (
            <Badge variant="default">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Validé par le créateur
            </Badge>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="glass-card p-6 text-center">
        <div className="text-5xl mb-4">📍</div>
        <h2 className="text-heading-xl mb-2">Confirmez votre présence sur place</h2>
        <p className="text-body-md text-muted-foreground">
          Activez la localisation pour valider votre participation à "{session.title}"
        </p>
      </div>

      {/* Distance indicator */}
      {distance !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-body-lg">
            <Navigation className={`h-5 w-5 ${distance <= 80 ? 'text-green-500' : 'text-orange-500'}`} />
            <span>Vous êtes à <strong>{distance}m</strong> du point de départ</span>
          </div>
          {distance > 80 && (
            <p className="text-sm text-muted-foreground mt-2">
              Rapprochez-vous à moins de 80m pour valider
            </p>
          )}
        </motion.div>
      )}

      {/* Validation button */}
      <Button
        onClick={handleValidate}
        disabled={validating}
        className="w-full h-16 text-lg"
        size="lg"
      >
        {validating ? (
          <>
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Vérification GPS en cours...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-6 w-6" />
            Je suis arrivé sur le lieu
          </>
        )}
      </Button>

      {/* Info box */}
      <div className="glass-card p-4 space-y-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Rayon de validation : 80 mètres
        </p>
        <p className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Créneau horaire : ±10 minutes
        </p>
        <p className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Points GPS : +10 pts
        </p>
        {validatedByCreator && (
          <p className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Bonus double validation : +15 pts supplémentaires
          </p>
        )}
      </div>

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 360, 0]
              }}
              transition={{ duration: 0.6 }}
              className="text-8xl mb-4"
            >
              ✅
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-green-500"
            >
              +{points} points !
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
