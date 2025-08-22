import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Users } from "lucide-react";

interface Session {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  scheduled_at: string;
  location_name: string;
  organizer_id: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  } | null;
}

interface Conversation {
  id: string;
  participant_1: string | null;
  participant_2: string | null;
  is_group: boolean;
  group_name?: string;
  group_avatar_url?: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
}

interface ShareSessionToConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onSessionShared: () => void;
}

export const ShareSessionToConversationDialog = ({ 
  isOpen, 
  onClose, 
  session, 
  onSessionShared 
}: ShareSessionToConversationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get conversations where user is participant
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          if (conv.is_group) {
            // For groups, check if user is a member
            const { data: memberData } = await supabase
              .from('group_members')
              .select('id')
              .eq('conversation_id', conv.id)
              .eq('user_id', user.id)
              .single();

            if (!memberData) return null; // User is not a member
            return conv;
          } else {
            // For direct conversations, get other participant's profile
            const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
            
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, display_name, avatar_url')
              .eq('user_id', otherUserId)
              .single();

            return {
              ...conv,
              profiles: profileData || { username: 'Utilisateur', display_name: 'Utilisateur', avatar_url: null }
            };
          }
        })
      );

      setConversations(conversationsWithProfiles.filter(Boolean) as Conversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les conversations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const shareToConversation = async (conversationId: string) => {
    if (!user || !session) return;

    setSharingTo(conversationId);
    try {
      // Check if this conversation is a group/club
      const conversation = conversations.find(c => c.id === conversationId);
      const isClub = conversation?.is_group;

      // If sharing to a club and user owns the session, update session visibility
      if (isClub && session.organizer_id === user.id) {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({ 
            club_id: conversationId,
            friends_only: false // Ensure it's visible in the club
          })
          .eq('id', session.id)
          .eq('organizer_id', user.id); // Security check

        if (sessionError) {
          console.error('Error updating session visibility:', sessionError);
          toast({
            title: "Erreur",
            description: "Impossible de modifier la visibilité de la séance",
            variant: "destructive"
          });
          return;
        }
      }

      // Create message with session data
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content: `🏃‍♂️ Séance partagée: ${session.title}`,
          message_type: 'session',
          session_id: session.id
        }]);

      if (error) throw error;

      // Update conversation's updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      toast({
        title: "Séance partagée !",
        description: isClub && session.organizer_id === user.id 
          ? "La séance a été partagée et rendue visible pour le club"
          : "La séance a été envoyée dans la conversation"
      });

      onSessionShared();
      onClose();
    } catch (error: any) {
      console.error('Error sharing session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager la séance",
        variant: "destructive"
      });
    } finally {
      setSharingTo(null);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Partager "{session.title}"
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement des conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune conversation trouvée</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Créez des conversations pour partager des séances
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <Card 
                  key={conversation.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => shareToConversation(conversation.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={conversation.is_group 
                            ? conversation.group_avatar_url || "" 
                            : conversation.profiles?.avatar_url || ""} 
                        />
                        <AvatarFallback>
                          {conversation.is_group ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            (conversation.profiles?.username || conversation.profiles?.display_name)?.charAt(0)?.toUpperCase() || "U"
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {conversation.is_group 
                            ? conversation.group_name 
                            : conversation.profiles?.display_name || conversation.profiles?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conversation.is_group ? "Club" : "Conversation"}
                        </p>
                      </div>
                      {sharingTo === conversation.id ? (
                        <div className="text-xs text-muted-foreground">Envoi...</div>
                      ) : (
                        <Send className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="pt-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};