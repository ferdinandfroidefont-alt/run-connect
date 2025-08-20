import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Users, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  location_name: string;
  scheduled_at: string;
  max_participants: number;
  current_participants: number;
  intensity: string;
  organizer_id: string;
}

interface ShareSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onSessionShared: () => void;
}

export const ShareSessionDialog = ({ isOpen, onClose, conversationId, onSessionShared }: ShareSessionDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's sessions
  const loadSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('organizer_id', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les séances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareSession = async (session: Session) => {
    if (!user || !conversationId) {
      console.error('Missing user or conversationId:', { user: !!user, conversationId });
      toast({
        title: "Erreur",
        description: "Informations manquantes pour partager la séance",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Attempting to share session:', {
        conversationId,
        sessionId: session.id,
        userId: user.id
      });

      // Verify user can send messages to this conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error fetching conversation:', convError);
        throw new Error('Impossible d\'accéder à cette conversation');
      }

      // For group conversations, check membership
      if (conversation.is_group) {
        const { data: membership, error: memberError } = await supabase
          .from('group_members')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (memberError || !membership) {
          console.error('User is not a member of this group:', memberError);
          throw new Error('Vous n\'êtes pas membre de ce club');
        }
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content: `🏃‍♂️ Séance partagée: ${session.title}`,
          message_type: 'session_share',
          session_id: session.id
        }]);

      if (error) {
        console.error('Error inserting message:', error);
        throw error;
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      toast({
        title: "Succès",
        description: "Séance partagée avec succès!"
      });

      onSessionShared();
      onClose();
    } catch (error: any) {
      console.error('Error sharing session:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de partager la séance",
        variant: "destructive"
      });
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity?.toLowerCase()) {
      case 'faible': return 'bg-green-100 text-green-800';
      case 'modérée': return 'bg-yellow-100 text-yellow-800';
      case 'élevée': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Partager une séance
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement des séances...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune séance à venir</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Créez une séance pour la partager
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="transition-all hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Title and Activity */}
                      <div>
                        <h3 className="font-semibold text-sm">{session.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {session.activity_type}
                          </Badge>
                          {session.intensity && (
                            <Badge className={`text-xs ${getIntensityColor(session.intensity)}`}>
                              {session.intensity}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(session.scheduled_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{session.location_name}</span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          {session.current_participants}
                          {session.max_participants && `/${session.max_participants}`} participants
                        </span>
                      </div>

                      {/* Description */}
                      {session.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {session.description}
                        </p>
                      )}

                       {/* Send Button - VISIBLE */}
                       <div className="pt-3 border-t border-gray-200">
                         <Button
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             console.log('🚀 Bouton ENVOYER cliqué pour session:', session.title, session.id);
                             shareSession(session);
                           }}
                           size="sm"
                           className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
                         >
                           <Send className="h-4 w-4 mr-2" />
                           ENVOYER DANS LA CONVERSATION
                         </Button>
                         <p className="text-xs text-center mt-1 text-gray-500">
                           Cliquez pour envoyer cette séance
                         </p>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};