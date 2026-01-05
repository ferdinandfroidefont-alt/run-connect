import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, ChevronLeft, ChevronRight, Share2, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAppContext } from "@/contexts/AppContext";

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

const SettingsSeparator = () => (
  <div className="h-px bg-border ml-[60px]" />
);

export const ShareSessionToConversationDialog = ({ 
  isOpen, 
  onClose, 
  session, 
  onSessionShared 
}: ShareSessionToConversationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { setHideBottomNav } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);

  // Hide bottom nav when dialog opens
  useEffect(() => {
    if (isOpen) {
      setHideBottomNav(true);
    }
    return () => setHideBottomNav(false);
  }, [isOpen, setHideBottomNav]);

  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          if (conv.is_group) {
            const { data: memberData } = await supabase
              .from('group_members')
              .select('id')
              .eq('conversation_id', conv.id)
              .eq('user_id', user.id)
              .single();

            if (!memberData) return null;
            return conv;
          } else {
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

  const getShareMessage = () => {
    if (!session) return '';
    const date = format(new Date(session.scheduled_at), "EEEE d MMMM 'à' HH:mm", { locale: fr });
    return `🏃 Rejoins-moi pour "${session.title}" !

📅 ${date}
📍 ${session.location_name}

Télécharge RunConnect pour participer : https://run-connect.lovable.app`;
  };

  const handleNativeShare = async () => {
    const shareMessage = getShareMessage();
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: session?.title || 'Séance RunConnect',
          text: shareMessage,
        });
        toast({
          title: "Partagé !",
          description: "La séance a été partagée"
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareMessage);
        toast({
          title: "✅ Lien copié !",
          description: "Collez-le dans n'importe quelle application"
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareMessage);
          toast({
            title: "✅ Lien copié !",
            description: "Collez-le dans n'importe quelle application"
          });
        } catch {
          toast({
            title: "Erreur",
            description: "Impossible de partager",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleCopyLink = async () => {
    const shareMessage = getShareMessage();
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast({
        title: "✅ Copié !",
        description: "Le message a été copié dans le presse-papiers"
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier",
        variant: "destructive"
      });
    }
  };

  const shareToConversation = async (conversationId: string) => {
    if (!user || !session) return;

    setSharingTo(conversationId);
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      const isClub = conversation?.is_group;

      if (isClub && session.organizer_id === user.id) {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update({ 
            club_id: conversationId,
            friends_only: false
          })
          .eq('id', session.id)
          .eq('organizer_id', user.id);

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
      <DialogContent className="p-0 gap-0 max-w-full h-full sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:rounded-xl bg-secondary border-0">
        {/* iOS Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center justify-between h-[56px] px-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-primary"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px]">Retour</span>
            </button>
            <h1 className="absolute left-1/2 transform -translate-x-1/2 text-[17px] font-semibold text-foreground">
              Partager
            </h1>
            <div className="w-16" />
          </div>
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-56px)] sm:h-auto sm:max-h-[calc(90vh-56px)]">
          <div className="pb-8">
            {/* Session Preview */}
            <div className="bg-background mt-6 mx-4 rounded-xl overflow-hidden p-4">
              <p className="text-[13px] text-muted-foreground mb-1">Séance à partager</p>
              <h2 className="text-[17px] font-semibold text-foreground">{session.title}</h2>
              <p className="text-[15px] text-muted-foreground mt-1">
                {format(new Date(session.scheduled_at), "d MMM yyyy, HH:mm", { locale: fr })}
              </p>
            </div>

            {/* Share Actions */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">Partage rapide</p>
              <div className="bg-background rounded-xl overflow-hidden">
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
                    <Share2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] text-foreground">Partager via...</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                </button>
                <SettingsSeparator />
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#8E8E93] flex items-center justify-center">
                    <Copy className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] text-foreground">Copier le lien</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 ml-auto" />
                </button>
              </div>
            </div>

            {/* Conversations */}
            <div className="mt-6 mx-4">
              <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 mb-2">
                Envoyer dans une conversation
              </p>
              <div className="bg-background rounded-xl overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-[15px] text-muted-foreground">Aucune conversation</p>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Créez des conversations pour partager
                    </p>
                  </div>
                ) : (
                  conversations.map((conversation, index) => (
                    <div key={conversation.id}>
                      {index > 0 && <SettingsSeparator />}
                      <button
                        onClick={() => shareToConversation(conversation.id)}
                        disabled={sharingTo === conversation.id}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary/50 disabled:opacity-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={conversation.is_group 
                              ? conversation.group_avatar_url || "" 
                              : conversation.profiles?.avatar_url || ""} 
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conversation.is_group ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              (conversation.profiles?.username || conversation.profiles?.display_name)?.charAt(0)?.toUpperCase() || "U"
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[15px] font-medium text-foreground truncate">
                            {conversation.is_group 
                              ? conversation.group_name 
                              : conversation.profiles?.display_name || conversation.profiles?.username}
                          </p>
                          <p className="text-[13px] text-muted-foreground">
                            {conversation.is_group ? "Club" : "Conversation"}
                          </p>
                        </div>
                        {sharingTo === conversation.id ? (
                          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Cancel Button */}
            <div className="mt-6 mx-4">
              <div className="bg-background rounded-xl overflow-hidden">
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center py-3 active:bg-secondary/50"
                >
                  <span className="text-[17px] text-primary font-medium">Annuler</span>
                </button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
