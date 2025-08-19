import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { UserSearchDialog } from "@/components/UserSearchDialog";
import { FriendSuggestions } from "@/components/FriendSuggestions";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ShareSessionDialog } from "@/components/ShareSessionDialog";
import { 
  MessageCircle, 
  Users, 
  Send, 
  ArrowLeft, 
  Search,
  Plus,
  Paperclip,
  Check,
  CheckCheck,
  Image,
  Calendar,
  UserPlus,
  MapPin,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  updated_at: string;
  is_group: boolean;
  group_name?: string;
  group_description?: string;
  group_avatar_url?: string;
  created_by?: string;
  other_participant?: Profile;
  group_members?: Profile[];
  last_message?: Message;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  message_type?: string;
  session_id?: string | null;
  sender: Profile;
  session?: {
    id: string;
    title: string;
    activity_type: string;
    location_name: string;
    scheduled_at: string;
    max_participants: number;
    current_participants: number;
  };
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showShareSession, setShowShareSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations
  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get both direct conversations and group conversations
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Process conversations with profiles
      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          if (conv.is_group) {
            // For groups, check if user is a member
            const { data: membership } = await supabase
              .from('group_members')
              .select('*')
              .eq('conversation_id', conv.id)
              .eq('user_id', user.id)
              .single();

            if (!membership) return null; // User is not a member

            // Get group members profiles separately
            const { data: memberIds } = await supabase
              .from('group_members')
              .select('user_id')
              .eq('conversation_id', conv.id);

            const { data: memberProfiles } = await supabase
              .from('profiles')
              .select('user_id, username, display_name, avatar_url')
              .in('user_id', memberIds?.map(m => m.user_id) || []);

            return {
              ...conv,
              group_members: memberProfiles || []
            };
          } else {
            // Direct conversation
            const otherParticipantId = conv.participant_1 === user.id 
              ? conv.participant_2 
              : conv.participant_1;
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, username, display_name, avatar_url')
              .eq('user_id', otherParticipantId)
              .single();

            return {
              ...conv,
              other_participant: profile || {
                user_id: otherParticipantId,
                username: 'Utilisateur inconnu',
                display_name: 'Utilisateur inconnu',
                avatar_url: null
              }
            };
          }
        })
      );

      setConversations(conversationsWithProfiles.filter(Boolean));
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({ title: "Erreur", description: "Impossible de charger les conversations", variant: "destructive" });
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          session:sessions(id, title, activity_type, location_name, scheduled_at, max_participants, current_participants)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles separately
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .eq('user_id', message.sender_id)
            .single();

          return {
            ...message,
            sender: profile || {
              user_id: message.sender_id,
              username: 'Utilisateur inconnu',
              display_name: 'Utilisateur inconnu',
              avatar_url: null
            }
          };
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({ title: "Erreur", description: "Impossible de charger les messages", variant: "destructive" });
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .neq('sender_id', user.id); // Don't mark own messages as read
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        }]);

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      setNewMessage("");
      loadMessages(selectedConversation.id);
      loadConversations();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible d'envoyer le message", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File) => {
    if (!user || !selectedConversation) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `messages/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Send message with file attachment
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: file.type.startsWith('image/') ? 'Image partagée' : 'Fichier partagé',
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name
        }]);

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      loadMessages(selectedConversation.id);
      loadConversations();
      toast({ title: "Succès", description: "Fichier envoyé avec succès" });
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible d'envoyer le fichier", variant: "destructive" });
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Search for users to start new conversation
  const searchForUsers = async () => {
    if (!searchUsers.trim()) {
      setAvailableUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchUsers}%,display_name.ilike.%${searchUsers}%`)
        .limit(10);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
    }
  };

  // Start new conversation
  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (existingConv) {
        // Conversation exists, just select it
        const otherParticipant = availableUsers.find(u => u.user_id === otherUserId);
        if (otherParticipant) {
          setSelectedConversation({
            ...existingConv,
            other_participant: otherParticipant
          });
          loadMessages(existingConv.id);
        }
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('conversations')
          .insert([{
            participant_1: user.id,
            participant_2: otherUserId
          }])
          .select()
          .single();

        if (error) throw error;

        const otherParticipant = availableUsers.find(u => u.user_id === otherUserId);
        if (otherParticipant && data) {
          setSelectedConversation({
            ...data,
            other_participant: otherParticipant
          });
          setMessages([]);
        }
      }

      setShowNewConversation(false);
      setSearchUsers("");
      setAvailableUsers([]);
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de démarrer la conversation", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    const timeoutId = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  // Real-time updates for messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        () => {
          loadMessages(selectedConversation.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  if (showNewConversation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border bg-card/95 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewConversation(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Nouvelle conversation</h1>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users list */}
          <div className="px-4">
            {availableUsers.map((profile) => (
              <div
                key={profile.user_id}
                onClick={() => startConversation(profile.user_id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback>
                    {(profile.display_name || profile.username || "").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile.display_name || profile.username}</p>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-md mx-auto w-full flex flex-col h-screen">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {selectedConversation.is_group ? (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.group_avatar_url || ""} />
                    <AvatarFallback>
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{selectedConversation.group_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.group_members?.length || 0} membres
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.other_participant?.avatar_url || ""} />
                    <AvatarFallback>
                      {(selectedConversation.other_participant?.display_name || selectedConversation.other_participant?.username || "").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {selectedConversation.other_participant?.display_name || selectedConversation.other_participant?.username}
                    </p>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareSession(true)}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                      {!isOwnMessage && (
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.sender.avatar_url || ""} />
                            <AvatarFallback>
                              {(message.sender.display_name || message.sender.username || "").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {message.sender.display_name || message.sender.username}
                          </span>
                        </div>
                      )}
                       <div
                         className={`rounded-lg p-3 ${
                           isOwnMessage
                             ? 'bg-primary text-primary-foreground'
                             : 'bg-muted'
                         }`}
                         onClick={() => !isOwnMessage && markMessageAsRead(message.id)}
                       >
                          {/* Session sharing */}
                          {message.message_type === 'session_share' && message.session && (
                            <div className="mb-2 p-3 bg-background/50 rounded border">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{message.session.title}</span>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(message.session.scheduled_at), 'dd/MM à HH:mm')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{message.session.location_name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{message.session.current_participants}/{message.session.max_participants} participants</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* File attachment */}
                          {message.file_url && (
                            <div className="mb-2">
                              {message.file_type?.startsWith('image/') ? (
                                <img 
                                  src={message.file_url} 
                                  alt={message.file_name || "Image"}
                                  className="max-w-full h-auto rounded-lg"
                                  style={{ maxHeight: '200px' }}
                                />
                              ) : (
                                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                  <Paperclip className="h-4 w-4" />
                                  <span className="text-sm truncate">{message.file_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <p className="text-sm">{message.content}</p>
                         
                         <div className={`flex items-center justify-between mt-1 ${
                           isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                         }`}>
                           <span className="text-xs">
                             {format(new Date(message.created_at), 'HH:mm')}
                           </span>
                           
                           {/* Read status for own messages */}
                           {isOwnMessage && (
                             <div className="flex items-center">
                               {message.read_at ? (
                                 <CheckCheck className="h-3 w-3 text-blue-500" />
                               ) : (
                                 <Check className="h-3 w-3" />
                               )}
                             </div>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="px-3"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) uploadFile(file);
                  };
                  input.click();
                }}
                className="px-3"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !newMessage.trim()}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground text-sm">
              Restez en contact avec la communauté
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNewConversation(true)}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button
              onClick={() => setShowCreateGroup(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Users className="h-4 w-4 mr-1" />
              Groupe
            </Button>
          </div>
        </div>

        {/* User Search Bar */}
        <Card>
          <CardContent className="p-4">
            <Button
              onClick={() => setShowUserSearch(true)}
              variant="outline"
              className="w-full justify-start text-muted-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher des utilisateurs...
            </Button>
          </CardContent>
        </Card>

        {/* Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <MessageCircle className="h-5 w-5 text-primary mr-2" />
            <CardTitle className="text-lg">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  Aucune conversation pour le moment
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Cliquez sur "Nouveau" pour démarrer une conversation
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation);
                      loadMessages(conversation.id);
                    }}
                    className="flex items-center gap-3 p-4 hover:bg-muted cursor-pointer"
                  >
                    <Avatar className="h-12 w-12">
                      {conversation.is_group ? (
                        <>
                          <AvatarImage src={conversation.group_avatar_url || ""} />
                          <AvatarFallback>
                            <Users className="h-6 w-6" />
                          </AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage src={conversation.other_participant?.avatar_url || ""} />
                          <AvatarFallback>
                            {(conversation.other_participant?.display_name || conversation.other_participant?.username || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conversation.is_group 
                            ? conversation.group_name 
                            : (conversation.other_participant?.display_name || conversation.other_participant?.username || "Utilisateur inconnu")
                          }
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conversation.updated_at), 'dd/MM', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {conversation.is_group 
                          ? `${conversation.group_members?.length || 0} membres`
                          : `@${conversation.other_participant?.username || "utilisateur"}`
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friend suggestions */}
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-3">
            <Users className="h-5 w-5 text-primary mr-2" />
            <CardTitle className="text-lg">Suggestions d'amis</CardTitle>
          </CardHeader>
          <CardContent>
            <FriendSuggestions compact />
          </CardContent>
        </Card>

        {/* User Search Dialog */}
        <UserSearchDialog
          open={showUserSearch}
          onOpenChange={setShowUserSearch}
          onStartConversation={startConversation}
        />

        {/* Create Group Dialog */}
        <CreateGroupDialog
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(groupId) => {
            loadConversations();
            setShowCreateGroup(false);
          }}
        />

        {/* Share Session Dialog */}
        <ShareSessionDialog
          isOpen={showShareSession}
          onClose={() => setShowShareSession(false)}
          conversationId={selectedConversation?.id || ""}
          onSessionShared={() => {
            if (selectedConversation) {
              loadMessages(selectedConversation.id);
              loadConversations();
            }
          }}
        />
      </div>
    </div>
  );
};

export default Messages;