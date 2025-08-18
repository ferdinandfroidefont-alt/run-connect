import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, User, Star } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  profiles: {
    username: string;
    display_name: string;
  };
}

interface SessionDetailsDialogProps {
  session: Session | null;
  onClose: () => void;
  onSessionUpdated: () => void;
}

export const SessionDetailsDialog = ({ session, onClose, onSessionUpdated }: SessionDetailsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const isOrganizer = user?.id === session.organizer_id;
  const isScheduled = new Date(session.scheduled_at) > new Date();
  const isFull = session.max_participants && session.current_participants >= session.max_participants;

  const getActivityColor = (activityType: string) => {
    const colors: Record<string, string> = {
      'course': 'bg-red-500',
      'velo': 'bg-blue-500',
      'marche': 'bg-green-500',
      'natation': 'bg-cyan-500'
    };
    return colors[activityType] || 'bg-gray-500';
  };

  const getIntensityColor = (intensity: string) => {
    const colors: Record<string, string> = {
      'facile': 'bg-green-100 text-green-800',
      'modere': 'bg-yellow-100 text-yellow-800',
      'intense': 'bg-red-100 text-red-800'
    };
    return colors[intensity] || 'bg-gray-100 text-gray-800';
  };

  const handleJoinSession = async () => {
    if (!user || !isScheduled || isFull) return;

    setLoading(true);
    try {
      // Check if already participating
      const { data: existingParticipation } = await supabase
        .from('session_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .single();

      if (existingParticipation) {
        toast({ title: "Vous participez déjà à cette séance" });
        return;
      }

      // Join session
      const { error: joinError } = await supabase
        .from('session_participants')
        .insert([{
          session_id: session.id,
          user_id: user.id
        }]);

      if (joinError) throw joinError;

      // Update session participant count
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          current_participants: session.current_participants + 1
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      toast({ title: "Vous avez rejoint la séance !" });
      onSessionUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Leave session
      const { error: leaveError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', session.id)
        .eq('user_id', user.id);

      if (leaveError) throw leaveError;

      // Update session participant count
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          current_participants: Math.max(0, session.current_participants - 1)
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      toast({ title: "Vous avez quitté la séance" });
      onSessionUpdated();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getActivityColor(session.activity_type)}`} />
            {session.title}
          </DialogTitle>
          <DialogDescription>
            Organisé par {session.profiles.display_name || session.profiles.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Activity and Session Type */}
          <div className="flex gap-2">
            <Badge variant="secondary">
              {session.activity_type.charAt(0).toUpperCase() + session.activity_type.slice(1)}
            </Badge>
            <Badge variant="outline">
              {session.session_type.replace('_', ' ')}
            </Badge>
            <Badge className={getIntensityColor(session.intensity)}>
              {session.intensity.charAt(0).toUpperCase() + session.intensity.slice(1)}
            </Badge>
          </div>

          {/* Date and Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">Date et heure</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(session.scheduled_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">Lieu de rendez-vous</span>
              </div>
              <p className="text-sm text-muted-foreground">{session.location_name}</p>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">Participants</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {session.current_participants} participant{session.current_participants > 1 ? 's' : ''}
                  {session.max_participants && ` / ${session.max_participants} max`}
                </span>
                {isFull && (
                  <Badge variant="destructive">Complet</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {session.description && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-primary" />
                  <span className="font-medium">Description</span>
                </div>
                <p className="text-sm text-muted-foreground">{session.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Organizer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">Organisateur</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {session.profiles.display_name || session.profiles.username}
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isOrganizer ? (
              <Badge variant="secondary" className="flex-1 justify-center py-2">
                Votre séance
              </Badge>
            ) : isScheduled ? (
              <>
                <Button
                  onClick={handleJoinSession}
                  disabled={loading || isFull}
                  className="flex-1"
                >
                  {loading ? "..." : isFull ? "Complet" : "Participer"}
                </Button>
                <Button
                  onClick={handleLeaveSession}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? "..." : "Ne plus participer"}
                </Button>
              </>
            ) : (
              <Badge variant="destructive" className="flex-1 justify-center py-2">
                Séance terminée
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};