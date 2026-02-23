import { useState, useEffect, useRef, useTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { useSendNotification } from "@/hooks/useSendNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "@/components/OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ClubInfoDialog } from "@/components/ClubInfoDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateClubDialogPremium } from "@/components/CreateClubDialogPremium";
import { NewConversationView } from "@/components/NewConversationView";
import { EditClubDialog } from "@/components/EditClubDialog";
import { ContactsDialog } from "@/components/ContactsDialog";
import { AvatarViewer } from "@/components/AvatarViewer";
import { SwipeableConversationItem } from "@/components/SwipeableConversationItem";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useCamera } from "@/hooks/useCamera";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
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
  Clock,
  Settings,
  MoreVertical,
  Crown,
  Trash2,
  User,
  Phone,
  Mic,
  Square,
  X,
  Smile,
  BarChart3,
  Camera,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSectionHeader, shouldShowSectionHeader } from "../components/MessageTimestamp";

import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageReactions, useMessageReactionPicker } from "@/components/MessageReactions";
import { ReplyPreview, ReplyBubble } from "@/components/MessageReply";
import { CreatePollDialog } from "@/components/CreatePollDialog";
import { PollCard } from "@/components/PollCard";
import { MessageLongPressMenu } from "@/components/MessageLongPressMenu";
import { CoachAccessDialog } from "@/components/coaching/CoachAccessDialog";
import { CreateCoachingSessionDialog } from "@/components/coaching/CreateCoachingSessionDialog";

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
  club_code?: string;
  created_by?: string;
  other_participant?: Profile;
  group_members?: Profile[];
  last_message?: any; // Simplified type for sorting purposes
  unread_count?: number;
  last_message_date?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  deleted_at?: string | null;
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
    location_lat: number;
    location_lng: number;
    scheduled_at: string;
    max_participants: number;
    current_participants: number;
  };
  reactions?: Array<{
    id: string;
    emoji: string;
    user_id: string;
  }>;
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    content: string;
    sender: Profile;
  } | null;
}

const Messages = () => {
  const { user, subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { setHideBottomNav } = useAppContext();
  const { sendPushNotification } = useSendNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [groupInfoData, setGroupInfoData] = useState<any>(null);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [selectedAvatarData, setSelectedAvatarData] = useState<{ url: string | null; username: string } | null>(null);
  const [visibleTimestamps, setVisibleTimestamps] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<{[userId: string]: {username: string, lastSeen: number}}>({});
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const { selectFromGallery, takePicture, loading: cameraLoading } = useCamera();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const { activeMessageId: reactionPickerMessageId, togglePicker: toggleReactionPicker, closePicker: closeReactionPicker } = useMessageReactionPicker();
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  // Long press & multi-select states
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCoachAccess, setShowCoachAccess] = useState(false);
  const [showCoachCreate, setShowCoachCreate] = useState(false);
  const [coachClubId, setCoachClubId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [longPressMessage, setLongPressMessage] = useState<Message | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Conversation settings states
  const [isMuted, setIsMuted] = useState(false);
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('pinnedConversations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const isLoading = loading || cameraLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Small delay to ensure messages are loaded
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedConversation]);

  // Show/hide bottom navigation based on conversation state
  useEffect(() => {
    // Couleur secondary mode clair : hsl(210 40% 98%) ≈ #F5F7FA
    const secondaryColor = '#F5F7FA';
    const defaultColor = '#F5F5F5';
    
    if (selectedConversation) {
      setHideBottomNav(true);
      document.documentElement.style.backgroundColor = secondaryColor;
      document.body.style.backgroundColor = secondaryColor;
    } else {
      setHideBottomNav(false);
      document.documentElement.style.backgroundColor = defaultColor;
      document.body.style.backgroundColor = defaultColor;
    }
    return () => {
      document.documentElement.style.backgroundColor = defaultColor;
      document.body.style.backgroundColor = defaultColor;
    };
  }, [selectedConversation, setHideBottomNav]);

  // Avatar viewer
  const handleAvatarClick = (avatarUrl: string | null, username: string) => {
    console.log('Avatar cliqué ! UserID:', username);
    setSelectedAvatarData({ url: avatarUrl, username });
    setShowAvatarViewer(true);
  };

  // Load conversations
  const loadConversations = async () => {
    if (!user) return;

    const startTime = performance.now();
    console.log('📊 [PERF] Starting loadConversations...');

    try {
      // Get both direct conversations and club conversations
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id},is_group.eq.true`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log(`📊 [PERF] Loaded ${conversationsData?.length || 0} conversations in ${(performance.now() - startTime).toFixed(0)}ms`);

      // Process conversations with profiles, unread counts, and last message
      const conversationsWithProfiles = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          // Count unread messages for this conversation
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          console.log(`🔍 Conversation ${conv.id}: ${unreadCount} messages non lus (excluant les messages de l'utilisateur)`);

          // Get the last message for this conversation
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (conv.is_group) {
            // For clubs, check if user is a member
            const { data: membership } = await supabase
              .from('group_members')
              .select('*')
              .eq('conversation_id', conv.id)
              .eq('user_id', user.id)
              .single();

            if (!membership) return null; // User is not a member

            // Get club members profiles separately
            const { data: memberIds } = await supabase
              .from('group_members')
              .select('user_id')
              .eq('conversation_id', conv.id);

            const { data: memberProfiles } = await supabase.rpc('get_safe_public_profiles', {
              profile_user_ids: memberIds?.map(m => m.user_id) || []
            });

            return {
              ...conv,
              group_members: memberProfiles || [],
              unread_count: unreadCount || 0,
              last_message: lastMessageData,
              last_message_date: lastMessageData?.created_at || conv.updated_at
            };
          } else {
            // Direct conversation
            const otherParticipantId = conv.participant_1 === user.id 
              ? conv.participant_2 
              : conv.participant_1;
            
            const { data: profileArray } = await supabase.rpc('get_safe_public_profile', {
              profile_user_id: otherParticipantId
            });
            
            const profile = profileArray && profileArray.length > 0 ? profileArray[0] : null;

            return {
              ...conv,
              other_participant: profile || {
                user_id: otherParticipantId,
                username: 'Utilisateur inconnu',
                display_name: 'Utilisateur inconnu',
                avatar_url: null
              },
              unread_count: unreadCount || 0,
              last_message: lastMessageData,
              last_message_date: lastMessageData?.created_at || conv.updated_at
            };
          }
        })
      );

      // Sort conversations by most recent activity (messages or conversation updates)
      // Filter out conversations without any messages (except groups/clubs which should always show)
      const sortedConversations = conversationsWithProfiles
        .filter(Boolean)
        .filter((conv) => conv.is_group || conv.last_message) // Keep groups, hide DMs without messages
        .sort((a, b) => {
          // Use the most recent between last message date and conversation updated_at
          const aDate = a.last_message_date && new Date(a.last_message_date) > new Date(a.updated_at) 
            ? a.last_message_date 
            : a.updated_at;
          const bDate = b.last_message_date && new Date(b.last_message_date) > new Date(b.updated_at) 
            ? b.last_message_date 
            : b.updated_at;
          
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

      setConversations(sortedConversations);
      
      const endTime = performance.now();
      console.log(`📊 [PERF] Finished loadConversations in ${(endTime - startTime).toFixed(0)}ms total`);
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
          session:sessions(id, title, activity_type, location_name, location_lat, location_lng, scheduled_at, max_participants, current_participants)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles and reactions separately
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .eq('user_id', message.sender_id)
            .single();

          // Load reactions for this message
          const { data: reactions } = await supabase
            .from('message_reactions')
            .select('id, emoji, user_id')
            .eq('message_id', message.id);

          // Load reply-to message if exists
          let replyToData = null;
          if (message.reply_to_id) {
            const { data: replyMsg } = await supabase
              .from('messages')
              .select('id, content, sender_id')
              .eq('id', message.reply_to_id)
              .single();
            
            if (replyMsg) {
              const { data: replySenderProfile } = await supabase
                .from('profiles')
                .select('user_id, username, display_name, avatar_url')
                .eq('user_id', replyMsg.sender_id)
                .single();
              
              replyToData = {
                id: replyMsg.id,
                content: replyMsg.content,
                sender: replySenderProfile || { user_id: replyMsg.sender_id, username: 'Inconnu', display_name: 'Inconnu', avatar_url: null }
              };
            }
          }

          return {
            ...message,
            sender: profile || {
              user_id: message.sender_id,
              username: 'Utilisateur inconnu',
              display_name: 'Utilisateur inconnu',
              avatar_url: null
            },
            reactions: reactions || [],
            reply_to: replyToData
          };
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({ title: "Erreur", description: "Impossible de charger les messages", variant: "destructive" });
    }
  };

  const markAllMessagesAsRead = async () => {
    if (!user || !selectedConversation) return;
    
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', selectedConversation.id)
        .neq('sender_id', user.id)
        .is('read_at', null);
        
      // Refresh messages to show updated read status
      loadMessages(selectedConversation.id);
      loadConversations(); // Update unread counts
    } catch (error: any) {
      console.error('Error marking all messages as read:', error);
    }
  };

  // Mark messages as read when opening a conversation
  const markMessagesAsReadOnOpen = async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .select('id');

      if (error) {
        console.error('Error marking messages as read:', error);
      } else {
        const markedCount = data?.length || 0;
        console.log(`📖 Marked ${markedCount} messages as read for conversation ${conversationId}`);
        
        // Update conversations list to reflect new unread counts
        loadConversations();
        
        // Force update of unread count in bottom navigation
        window.dispatchEvent(new CustomEvent('messages-read', { 
          detail: { conversationId, markedCount }
        }));
      }
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSessionClick = (session: any) => {
    // Redirect to map with session location
    const params = new URLSearchParams({
      lat: session.location_lat.toString(),
      lng: session.location_lng.toString(),
      zoom: '15',
      sessionId: session.id
    });
    navigate(`/?${params.toString()}`);
  };

  // Long press handlers
  const handleLongPressStart = (conversation: Conversation) => {
    const timer = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedConversations(new Set([conversation.id]));
    }, 1000); // 1000ms for long press (doubled from 500ms)
    setLongPressTimer(timer);
  };

  // Pin/unpin conversation
  const togglePinConversation = (conversationId: string) => {
    setPinnedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      localStorage.setItem('pinnedConversations', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Filter and sort conversations
  const filteredAndSortedConversations = [...conversations]
    .filter(conv => {
      if (!conversationSearch.trim()) return true;
      const query = conversationSearch.toLowerCase();
      if (conv.is_group) {
        return conv.group_name?.toLowerCase().includes(query);
      }
      return (
        conv.other_participant?.username?.toLowerCase().includes(query) ||
        conv.other_participant?.display_name?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aPinned = pinnedConversations.has(a.id);
      const bPinned = pinnedConversations.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      
      // Exit selection mode if no conversations selected
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedConversations(new Set());
  };

  const confirmBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const bulkDeleteConversations = async () => {
    if (!user) return;

    try {
      setShowBulkDeleteDialog(false);

      for (const convId of selectedConversations) {
        const conv = conversations.find(c => c.id === convId);
        if (!conv) continue;

        if (conv.is_group) {
          // For groups, just leave
          await supabase
            .from('group_members')
            .delete()
            .eq('conversation_id', convId)
            .eq('user_id', user.id);
        } else {
          // For direct conversations, delete messages and conversation
          await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', convId);
          
          await supabase
            .from('conversations')
            .delete()
            .eq('id', convId);
        }
      }

      toast({
        title: "Supprimé",
        description: `${selectedConversations.size} conversation(s) supprimée(s)`
      });

      exitSelectionMode();
      loadConversations();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les conversations",
        variant: "destructive"
      });
    }
  };

  // Delete conversation
  const confirmDeleteConversation = (conversation?: Conversation) => {
    if (conversation) {
      setConversationToDelete(conversation);
    }
    setShowDeleteDialog(true);
  };

  const deleteConversation = async () => {
    const convToDelete = conversationToDelete || selectedConversation;
    if (!convToDelete || !user) return;

    try {
      setShowDeleteDialog(false);
      setConversationToDelete(null);

      if (convToDelete.is_group) {
        // For groups, only the creator can delete the entire group
        if (convToDelete.created_by === user.id) {
          // Delete all group members first
          await supabase
            .from('group_members')
            .delete()
            .eq('conversation_id', convToDelete.id);
          
          // Delete all messages
          await supabase
            .from('messages')
            .delete()
            .eq('conversation_id', convToDelete.id);
          
          // Delete the conversation
          const { error } = await supabase
            .from('conversations')
            .delete()
            .eq('id', convToDelete.id);
          
          if (error) throw error;
          
          toast({
            title: "Club supprimé",
            description: "Le club a été supprimé avec succès"
          });
        } else {
          // For non-creators, just leave the group
          const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('conversation_id', convToDelete.id)
            .eq('user_id', user.id);
          
          if (error) throw error;
          
          toast({
            title: "Club quitté",
            description: "Vous avez quitté le club"
          });
        }
      } else {
        // For direct conversations, delete all messages and the conversation
        await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', convToDelete.id);
        
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', convToDelete.id);
        
        if (error) throw error;
        
        toast({
          title: "Conversation supprimée",
          description: "La conversation a été supprimée avec succès"
        });
      }

      // Remove conversation from local state immediately
      setConversations(prev => prev.filter(c => c.id !== convToDelete.id));
      
      // Go back to conversations list
      setSelectedConversation(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la conversation",
        variant: "destructive"
      });
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const currentReplyTo = replyTo;
    
    // ✅ FIX: Clear input immediately for responsive UX
    setNewMessage("");
    setReplyTo(null);

    setLoading(true);
    try {
      const insertData: any = {
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: messageContent
        };
      if (currentReplyTo) {
        insertData.reply_to_id = currentReplyTo.id;
      }
      const { data: newMessageData, error } = await supabase
        .from('messages')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      // ✅ FIX: Fire-and-forget push notifications - don't block message sending
      if (selectedConversation.is_group) {
        const members = selectedConversation.group_members || [];
        for (const member of members) {
          if (member.user_id !== user.id) {
            sendPushNotification(
              member.user_id,
              selectedConversation.group_name || 'Message de groupe',
              messageContent.substring(0, 100),
              'message',
              {
                sender_name: user.email?.split('@')[0] || 'Quelqu\'un',
                message_preview: messageContent,
                conversation_id: selectedConversation.id,
                group_name: selectedConversation.group_name
              }
            ).catch(err => console.warn('Push notification failed:', err));
          }
        }
      } else {
        const recipientId = selectedConversation.participant_1 === user.id
          ? selectedConversation.participant_2
          : selectedConversation.participant_1;
        
        sendPushNotification(
          recipientId,
          'Nouveau message',
          messageContent.substring(0, 100),
          'message',
          {
            sender_name: user.email?.split('@')[0] || 'Quelqu\'un',
            message_preview: messageContent,
            conversation_id: selectedConversation.id
          }
        ).catch(err => console.warn('Push notification failed:', err));
      }

      // Reload messages from DB (realtime should also fire)
      loadMessages(selectedConversation.id);
      loadConversations();
    } catch (error: any) {
      // ✅ FIX: Restore message content on error so user can retry
      setNewMessage(messageContent);
      setReplyTo(currentReplyTo);
      toast({ title: "Erreur", description: "Impossible d'envoyer le message", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Compression d'image
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = document.createElement('img') as HTMLImageElement;
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            } else {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              console.log(`📸 Compression: ${file.size} → ${compressedFile.size} bytes`);
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', 0.85);
        };
      };
      reader.onerror = reject;
    });
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File) => {
    if (!user || !selectedConversation) return;

    console.log('Starting file upload:', file.name, file.type);

    // Vérifier la taille (max 50 MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 50 MB",
        variant: "destructive"
      });
      return;
    }

    // Compresser si c'est une image > 1 MB
    let fileToUpload = file;
    if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
      try {
        setUploadProgress('Compression de l\'image...');
        fileToUpload = await compressImage(file);
      } catch (error) {
        console.log('⚠️ Compression échouée, upload original');
      }
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      setLoading(true);
      setUploadProgress(`Upload de ${fileToUpload.name}...`);
      
      // Upload to message-files bucket
      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      setUploadProgress('Envoi du message...');

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      console.log('File uploaded successfully, public URL:', publicUrl);

      // Send message with file attachment
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: file.type.startsWith('image/') ? 'Image partagée' : 'Fichier partagé',
          file_url: publicUrl,
          file_type: file.type,
          file_name: file.name,
          message_type: 'file'
        }]);

      if (error) {
        console.error('Message insert error:', error);
        throw error;
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      loadMessages(selectedConversation.id);
      loadConversations();
      toast({ title: "Succès", description: "Fichier envoyé avec succès" });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible d'envoyer le fichier", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  // Quick camera for conversation list (Instagram-style)
  const handleQuickCameraForConversation = async (conversation: Conversation) => {
    if (!user) return;
    
    try {
      const photo = await takePicture();
      if (!photo) return;

      setLoading(true);
      setUploadProgress('Compression...');

      let fileToUpload = photo;
      if (photo.size > 1024 * 1024) {
        try {
          fileToUpload = await compressImage(photo);
        } catch { /* use original */ }
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      setUploadProgress('Envoi...');
      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          content: '📸 Photo',
          file_url: publicUrl,
          file_type: 'image/jpeg',
          file_name: fileToUpload.name,
          message_type: 'image'
        }]);

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversation.id);

      loadConversations();
      toast({ title: "📸", description: "Photo envoyée !" });
    } catch (error: any) {
      console.error('Quick camera error:', error);
      toast({ title: "Erreur", description: "Impossible d'envoyer la photo", variant: "destructive" });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

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

  // Upload voice message
  const uploadVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!user || !selectedConversation) return;

    console.log('🎤 Upload message vocal:', audioBlob.size, 'bytes, durée:', duration, 's');

    const fileName = `voice-${Date.now()}-${Math.random().toString(36).substring(2)}.webm`;
    const filePath = `${user.id}/${fileName}`;

    try {
      setLoading(true);
      
      // Upload to message-files bucket
      const { error: uploadError } = await supabase.storage
        .from('message-files')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || 'audio/webm'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-files')
        .getPublicUrl(filePath);

      console.log('🎤 Message vocal uploadé:', publicUrl);

      // Send message with voice attachment
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: `Message vocal (${duration}s)`,
          file_url: publicUrl,
          file_type: 'audio/webm',
          file_name: fileName,
          message_type: 'voice'
        }]);

      if (error) {
        console.error('Message insert error:', error);
        throw error;
      }

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      loadMessages(selectedConversation.id);
      loadConversations();
      toast({ title: "Succès", description: "Message vocal envoyé" });
    } catch (error: any) {
      console.error('🎤 Upload failed:', error);
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible d'envoyer le message vocal", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete message (mark as deleted)
  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Security check

      if (error) throw error;

      // Update message in local state
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, deleted_at: new Date().toISOString() }
          : m
      ));
      
      toast({ title: "Succès", description: "Message supprimé" });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de supprimer le message", 
        variant: "destructive" 
      });
    }
  };

  // Handle voice recording
  const handleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording
      const result = await stopRecording();
      if (result) {
        await uploadVoiceMessage(result.audioBlob, result.duration);
      }
    } else {
      // Start recording
      const success = await startRecording();
      if (!success) {
        toast({
          title: "Erreur",
          description: "Impossible d'accéder au microphone. Vérifiez les permissions.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedConversation || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing event via Supabase realtime
    const channel = supabase.channel(`typing-${selectedConversation.id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Utilisateur',
        timestamp: Date.now()
      }
    });

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: {
          user_id: user.id
        }
      });
    }, 3000);
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    handleTyping();
  };

  // Check if message contains only emojis
  const isOnlyEmojis = (text: string) => {
    const emojiRegex = /^[\p{Emoji}\s]+$/u;
    return emojiRegex.test(text.trim());
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Clean up typing users periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          if (now - updated[userId].lastSeen > 5000) {
            delete updated[userId];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Search for users to start new conversation (friends only)
  const searchForUsers = async () => {
    if (!searchUsers.trim()) {
      setAvailableUsers([]);
      return;
    }

    try {
      // First, get users who match the search query
      const { data: searchResults, error: searchError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchUsers}%,display_name.ilike.%${searchUsers}%`)
        .limit(20); // Get more results to filter

      if (searchError) throw searchError;

      if (!searchResults || searchResults.length === 0) {
        setAvailableUsers([]);
        return;
      }

      // Filter to only include friends using the are_users_friends function
      const friendsPromises = searchResults.map(async (profile) => {
        const { data: isFriend } = await supabase.rpc('are_users_friends', {
          user1_id: user?.id,
          user2_id: profile.user_id
        });
        
        return isFriend ? profile : null;
      });

      const friendsResults = await Promise.all(friendsPromises);
      const friends = friendsResults.filter((profile): profile is Profile => profile !== null);

      setAvailableUsers(friends.slice(0, 10)); // Limit to 10 results
    } catch (error: any) {
      console.error('Error searching friends:', error);
      setAvailableUsers([]);
    }
  };

  // Start new conversation
  const startConversation = async (otherUserId: string) => {
    if (!user) return;

    try {
      // IMPORTANT: Check if users are mutual friends before allowing conversation
      const { data: areFriends } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: otherUserId
      });

      if (!areFriends) {
        toast({ 
          title: "Impossible d'envoyer un message", 
          description: "Vous devez être amis pour envoyer un message. Attendez que votre demande de suivi soit acceptée.", 
          variant: "destructive" 
        });
        return;
      }

      // First, get the other user's profile (needed for conversation display)
      let otherParticipant = availableUsers.find(u => u.user_id === otherUserId);
      
      // If not in availableUsers, fetch directly from Supabase
      if (!otherParticipant) {
        const { data: profileData } = await supabase.rpc('get_safe_public_profiles', {
          profile_user_ids: [otherUserId]
        });
        
        if (profileData && profileData.length > 0) {
          otherParticipant = profileData[0];
        }
      }

      if (!otherParticipant) {
        toast({ title: "Erreur", description: "Utilisateur introuvable", variant: "destructive" });
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
        .single();

      if (existingConv) {
        // Conversation exists, just select it
        setSelectedConversation({
          ...existingConv,
          other_participant: otherParticipant
        });
        loadMessages(existingConv.id);
        // Marquer les messages comme lus automatiquement
        markMessagesAsReadOnOpen(existingConv.id);
        setTimeout(() => {
          markAllMessagesAsRead();
        }, 100);
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

        if (data) {
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

  // Real-time updates for conversations list
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time channel for conversations list');

    // Listen to changes in conversations table
    const conversationsChannel = supabase
      .channel('user-conversations-list')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🆕 New conversation created:', payload.new);
          loadConversations(); // Reload to get the new conversation
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('✏️ Conversation updated:', payload.new);
          loadConversations(); // Reload to get updated conversation
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations'
        },
        (payload) => {
          console.log('🗑️ Conversation deleted:', payload.old);
          // Remove conversation from local state immediately
          setConversations(prev => prev.filter(c => c.id !== payload.old.id));
          // If the deleted conversation was selected, deselect it
          if (selectedConversation?.id === payload.old.id) {
            setSelectedConversation(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Conversations channel status:', status);
      });

    // Listen to new messages in any conversation to update last message preview
    const allMessagesChannel = supabase
      .channel('all-user-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as any;
          console.log('📨 New message in any conversation:', newMessage);
          
          // Only reload if not in the selected conversation (to avoid double updates)
          if (!selectedConversation || newMessage.conversation_id !== selectedConversation.id) {
            loadConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('✏️ Message updated in any conversation:', payload.new);
          // Reload to update read status indicators
          if (!selectedConversation) {
            loadConversations();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 All messages channel status:', status);
      });

    // Listen to group_members deletions to handle club leave
    const groupMembersChannel = supabase
      .channel('user-group-members-deletions')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('👋 User left a club:', payload.old);
          // Remove the club conversation from local state
          setConversations(prev => prev.filter(c => c.id !== payload.old.conversation_id));
          // If the club was selected, deselect it
          if (selectedConversation?.id === payload.old.conversation_id) {
            setSelectedConversation(null);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Group members channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up conversations realtime channels');
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(allMessagesChannel);
      supabase.removeChannel(groupMembersChannel);
    };
  }, [user, selectedConversation]);

  // Removed message limit check - no longer needed

  useEffect(() => {
    const timeoutId = setTimeout(searchForUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchUsers]);

  // Real-time updates for messages and typing indicators
  useEffect(() => {
    if (!selectedConversation) return;

    console.log('🔄 Setting up real-time channels for conversation:', selectedConversation.id);

    const messagesChannel = supabase
      .channel(`messages-${selectedConversation.id}`) // Unique channel per conversation
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          console.log('📨 New message received via realtime:', payload.new);
          const newMessage = payload.new as any;
          
          // Load sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url')
            .eq('user_id', newMessage.sender_id)
            .single();

          // Load session if it's a session message
          let session = null;
          if (newMessage.session_id) {
            const { data: sessionData } = await supabase
              .from('sessions')
              .select('id, title, activity_type, location_name, location_lat, location_lng, scheduled_at, max_participants, current_participants')
              .eq('id', newMessage.session_id)
              .single();
            session = sessionData;
          }

          const messageWithProfile = {
            ...newMessage,
            sender: profile || {
              user_id: newMessage.sender_id,
              username: 'Utilisateur inconnu',
              display_name: 'Utilisateur inconnu',
              avatar_url: null
            },
            session: session
          };

          // Add message to state if not already present
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, messageWithProfile];
          });
          
          // If message is from another user, mark as read immediately since conversation is open
          if (newMessage.sender_id !== user?.id) {
            await supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMessage.id);
          }

          // Refresh conversations list to update last message
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          console.log('✏️ Message updated via realtime:', payload.new);
          const updatedMessage = payload.new as any;
          
          // ✅ FIX: Only update DB-level fields, preserve enriched client data (sender, reactions, reply_to)
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id 
              ? { 
                  ...m, 
                  content: updatedMessage.content,
                  read_at: updatedMessage.read_at,
                  deleted_at: updatedMessage.deleted_at,
                  file_url: updatedMessage.file_url,
                  file_type: updatedMessage.file_type,
                  file_name: updatedMessage.file_name,
                  message_type: updatedMessage.message_type,
                }
              : m
          ));
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages channel status:', status);
      });

    // Typing indicators channel
    const typingChannel = supabase
      .channel(`typing-${selectedConversation.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, username, timestamp } = payload.payload;
        if (user_id !== user?.id) {
          setTypingUsers(prev => ({
            ...prev,
            [user_id]: { username, lastSeen: timestamp }
          }));
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        const { user_id } = payload.payload;
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[user_id];
          return updated;
        });
      })
      .subscribe((status) => {
        console.log('⌨️ Typing channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up realtime channels');
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [selectedConversation, user]);

  // Handle URL parameters for starting conversations
  useEffect(() => {
    const startConversationId = searchParams.get('startConversation');
    const messageText = searchParams.get('message');
    
    if (startConversationId && user && !selectedConversation) {
      // Start conversation with specific user
      startConversation(startConversationId);
      
      // Set the message if provided
      if (messageText) {
        setNewMessage(decodeURIComponent(messageText));
      }
      
      // Clear URL parameters
      setSearchParams({});
    }
  }, [searchParams, user, selectedConversation]);

  if (showNewConversation) {
    return (
      <NewConversationView
        onBack={() => setShowNewConversation(false)}
        onStartConversation={startConversation}
        onCreateClub={() => {
          setShowNewConversation(false);
          setShowCreateGroup(true);
        }}
        onAvatarClick={handleAvatarClick}
      />
    );
  }

  if (selectedConversation) {
    const isDirectMessage = !selectedConversation.is_group;
    
    return (
      <>
        <div className="h-full bg-secondary">
        <div className="max-w-md mx-auto w-full flex flex-col keyboard-aware-container" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* iMessage Style Header */}
          <div className="shrink-0 bg-card border-b border-border/50 z-50">
            <div className="flex items-center px-2 py-2">
              {/* Back button - Left */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedConversation(null)}
                className="gap-1 text-primary p-0 h-auto font-normal shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </Button>
              
              {/* Center - Avatar and Name (stacked) */}
              <div className="flex-1 flex flex-col items-center justify-center -ml-4">
                {selectedConversation.is_group ? (
                  <div 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const clubData = selectedConversation;
                      setSelectedConversation(null);
                      setTimeout(() => {
                        setGroupInfoData(clubData);
                        setShowGroupInfo(true);
                      }, 100);
                    }}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={selectedConversation.group_avatar_url || ""} />
                      <AvatarFallback className="bg-border text-muted-foreground">
                        <Users className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-[13px] text-foreground mt-0.5">{selectedConversation.group_name}</p>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`);
                    }}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={selectedConversation.other_participant?.avatar_url || ""} />
                        <AvatarFallback className="bg-border text-muted-foreground text-[13px]">
                          {(selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name || "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineStatus userId={selectedConversation.other_participant?.user_id || ""} className="w-2 h-2" />
                    </div>
                    <p className="font-semibold text-[13px] text-foreground mt-0.5">
                      {selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name}
                    </p>
                  </div>
                )}
              </div>

              {/* Right - Info button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 text-primary shrink-0">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border border-border rounded-[14px] shadow-lg">
                  {!selectedConversation.is_group && (
                    <DropdownMenuItem 
                      onClick={() => navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`)}
                      className="py-3"
                    >
                      <User className="h-4 w-4 mr-3 text-primary" />
                      Voir le profil
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedConversation(null);
                      setShowCreateGroup(true);
                    }}
                    className="py-3"
                  >
                    <Users className="h-4 w-4 mr-3 text-primary" />
                    Créer un groupe
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => setIsMuted(!isMuted)}
                    className="py-3 justify-between"
                  >
                    <div className="flex items-center">
                      <span className="mr-3 text-lg">{isMuted ? "🔔" : "🔕"}</span>
                      <span>Notifications</span>
                    </div>
                     <span className="text-xs text-muted-foreground">
                      {isMuted ? "On" : "Off"}
                    </span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => selectedConversation && togglePinConversation(selectedConversation.id)}
                    className="py-3 justify-between"
                  >
                    <div className="flex items-center">
                      <span className="mr-3 text-lg">📌</span>
                      <span>Épingler</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedConversation && pinnedConversations.has(selectedConversation.id) ? "Oui" : "Non"}
                    </span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => confirmDeleteConversation()}
                    className="py-3 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    {selectedConversation.is_group && selectedConversation.created_by !== user?.id 
                      ? "Quitter le club" 
                      : "Supprimer"
                    }
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages - iMessage style scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="h-full px-3 pt-2 pb-2 space-y-0.5 bg-secondary">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const showHeader = shouldShowSectionHeader(message, previousMessage);
                const showIndividualTime = visibleTimestamps.has(message.id);
                const isDirectMessage = !selectedConversation.is_group;
                
                // Check if this is a consecutive message from same sender
                const isSameSender = previousMessage && previousMessage.sender_id === message.sender_id;
                const isWithin5Minutes = previousMessage && 
                  (new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime()) < 5 * 60 * 1000;
                const shouldShowSenderInfo = !isOwnMessage && !isDirectMessage && (!isSameSender || !isWithin5Minutes || showHeader);
                
                const toggleTimestamp = () => {
                  setVisibleTimestamps(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(message.id)) {
                      newSet.delete(message.id);
                    } else {
                      newSet.add(message.id);
                    }
                    return newSet;
                  });
                };
                
                return (
                  <div key={message.id}>
                    {showHeader && (
                      <MessageSectionHeader timestamp={message.created_at} />
                    )}
                    
                    <div
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} py-0.5`}
                      onClick={toggleTimestamp}
                    >
                      <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'} relative`}>
                        {/* Show sender info only for groups, not for DMs (iMessage style) */}
                        {shouldShowSenderInfo && (
                          <div className="flex items-center gap-2 mb-1 ml-1">
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {message.sender.username || message.sender.display_name}
                            </span>
                          </div>
                        )}
                        
                        {/* Individual timestamp - iMessage style pill */}
                        {showIndividualTime && (
                          <div className={`absolute -bottom-5 ${isOwnMessage ? 'right-0' : 'left-0'} z-10`}>
                            <span className="text-[11px] text-muted-foreground">
                              {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                        )}
                        
                        <div 
                          className="relative group"
                          onTouchStart={() => {
                            if (message.deleted_at) return;
                            longPressTimerRef.current = setTimeout(() => {
                              setLongPressMessage(message);
                            }, 500);
                          }}
                          onTouchEnd={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onTouchMove={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onMouseDown={() => {
                            if (message.deleted_at) return;
                            longPressTimerRef.current = setTimeout(() => {
                              setLongPressMessage(message);
                            }, 500);
                          }}
                          onMouseUp={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onMouseLeave={() => {
                            if (longPressTimerRef.current) {
                              clearTimeout(longPressTimerRef.current);
                              longPressTimerRef.current = null;
                            }
                          }}
                          onContextMenu={(e) => {
                            if (message.deleted_at) return;
                            e.preventDefault();
                            setLongPressMessage(message);
                          }}
                        >

                          {/* Image - iMessage rounded style */}
                          {message.file_url && message.file_type?.startsWith('image/') && !message.deleted_at && (
                            <img 
                              src={message.file_url} 
                              alt=""
                              className="max-w-full h-auto rounded-[18px]"
                              style={{ maxHeight: '240px' }}
                            />
                          )}
                          
                          {/* Emoji-only messages - Large display without bubble */}
                          {message.content && !message.deleted_at && isOnlyEmojis(message.content) && !message.message_type && !message.file_url && (
                            <div className="py-0.5">
                              <p className="text-[42px] leading-tight">{message.content}</p>
                            </div>
                          )}

                          {/* iMessage bubble */}
                          {(message.message_type === 'session' || 
                            (message.file_url && !message.file_type?.startsWith('image/')) ||
                            (message.content && !message.content.match(/^(Image partagée)$/i) && !isOnlyEmojis(message.content)) ||
                            message.deleted_at ||
                            message.reply_to) && (
                            <div
                              className={`rounded-[18px] px-3 py-2 ${
                                isOwnMessage
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-[#E5E5EA] text-black dark:bg-[#38383A] dark:text-white'
                              }`}
                            >
                              {/* Reply context */}
                              {message.reply_to && !message.deleted_at && (
                                <ReplyBubble
                                  replyContent={message.reply_to.content}
                                  replySenderName={message.reply_to.sender.username || message.reply_to.sender.display_name}
                                  isOwnMessage={isOwnMessage}
                                />
                              )}
                              {/* Show deleted message */}
                              {message.deleted_at ? (
                                <p className="text-sm italic text-muted-foreground">Message supprimé</p>
                              ) : (
                                <>
                                  {/* Poll Card */}
                                  {message.message_type === 'poll' && message.content && (
                                    <div className="mb-2">
                                      <PollCard pollId={message.content} />
                                    </div>
                                  )}

                                  {/* Session sharing - iOS Card Style */}
                                  {message.message_type === 'session' && message.session && (
                                    <div 
                                      className="mb-2 bg-background rounded-xl overflow-hidden shadow-sm border border-border/50 cursor-pointer active:scale-[0.98] transition-transform"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSessionClick(message.session);
                                      }}
                                    >
                                      {/* Header */}
                                      <div className="px-3 py-2 bg-primary/10 border-b border-border/30">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                                            <Calendar className="h-3.5 w-3.5 text-primary-foreground" />
                                          </div>
                                          <span className="font-semibold text-sm text-foreground flex-1 truncate">{message.session.title}</span>
                                        </div>
                                      </div>
                                      {/* Content */}
                                      <div className="p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-md bg-[#FF3B30]/10 flex items-center justify-center">
                                            <Clock className="h-3 w-3 text-[#FF3B30]" />
                                          </div>
                                          <span className="text-xs text-foreground">{format(new Date(message.session.scheduled_at), 'dd/MM à HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-md bg-[#34C759]/10 flex items-center justify-center">
                                            <MapPin className="h-3 w-3 text-[#34C759]" />
                                          </div>
                                          <span className="text-xs text-muted-foreground truncate">{message.session.location_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                                            <Users className="h-3 w-3 text-primary" />
                                          </div>
                                          <span className="text-xs text-muted-foreground">{message.session.current_participants}/{message.session.max_participants} participants</span>
                                        </div>
                                      </div>
                                      {/* Footer CTA */}
                                      <div className="px-3 py-2 bg-secondary/50 border-t border-border/30">
                                        <span className="text-xs text-primary font-medium">Voir sur la carte →</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Non-image file attachments (audio, files) */}
                                  {message.file_url && !message.file_type?.startsWith('image/') && (
                                    <div className="mb-2">
                                       {message.message_type === 'voice' || message.file_type?.startsWith('audio/') ? (
                                         <div className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-background/30 backdrop-blur-sm border border-border/20 shadow-md">
                                           <Mic className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                           <audio 
                                             controls 
                                             src={message.file_url}
                                             className="max-w-full audio-player-glass"
                                             style={{ height: '28px', width: '160px' }}
                                           />
                                         </div>
                                      ) : (
                                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                                          <Paperclip className="h-4 w-4" />
                                          <span className="text-sm truncate">{message.file_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show text content only if it's not a media-only message and not emoji-only */}
                                  {message.content && !message.content.match(/^(Image partagée|Message vocal)$/i) && !isOnlyEmojis(message.content) && (
                                    <p className="text-sm">{message.content}</p>
                                  )}
                                </>
                              )}
                          
                              {/* Read status for own messages inside bubble */}
                              {isOwnMessage && (message.content || message.message_type === 'session' || (message.file_url && !message.file_type?.startsWith('image/'))) && (
                                <div className={`flex justify-end mt-1 ${
                                  isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  <div className="flex items-center">
                                    {message.read_at ? (
                                      <CheckCheck className="h-3 w-3 text-blue-500" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Read status for image-only messages (outside bubble) */}
                          {message.file_type?.startsWith('image/') && 
                           (!message.content || message.content.match(/^(Image partagée)$/i)) && 
                           isOwnMessage && !message.deleted_at && (
                            <div className="flex justify-end">
                              <div className="flex items-center text-muted-foreground">
                                {message.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reactions display only */}
                        {!message.deleted_at && (
                          <MessageReactions
                            messageId={message.id}
                            reactions={message.reactions || []}
                            onReactionChange={() => loadMessages(selectedConversation!.id)}
                            isOwnMessage={isOwnMessage}
                            displayOnly
                          />
                        )}

                       </div>
                     </div>
                   </div>
                );
              })}
              
              {/* Typing indicators */}
              {Object.entries(typingUsers).map(([userId, data]) => (
                <TypingIndicator 
                  key={userId}
                  isTyping={true}
                  username={data.username}
                />
              ))}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  {(conversationToDelete || selectedConversation)?.is_group 
                    ? (conversationToDelete || selectedConversation)?.created_by === user?.id
                      ? `Êtes-vous sûr de vouloir supprimer définitivement le club "${(conversationToDelete || selectedConversation)?.group_name}" ? Cette action est irréversible.`
                      : `Êtes-vous sûr de vouloir quitter le club "${(conversationToDelete || selectedConversation)?.group_name}" ?`
                    : `Êtes-vous sûr de vouloir supprimer cette conversation avec ${(conversationToDelete || selectedConversation)?.other_participant?.username || (conversationToDelete || selectedConversation)?.other_participant?.display_name} ? Tous les messages seront perdus.`
                  }
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setConversationToDelete(null);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteConversation}
                >
                  {(conversationToDelete || selectedConversation)?.is_group && (conversationToDelete || selectedConversation)?.created_by !== user?.id 
                    ? "Quitter" 
                    : "Supprimer"
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Delete Dialog */}
          <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer {selectedConversations.size} conversation(s) ? Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDeleteDialog(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={bulkDeleteConversations}
                >
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

           {/* iMessage Style Input */}
          <div 
             className="shrink-0 w-full px-2 py-1 bg-card border-t border-border/50 z-40 keyboard-input-container"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Reply Preview */}
            {replyTo && (
              <ReplyPreview
                replyTo={replyTo}
                onCancel={() => setReplyTo(null)}
              />
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-[60] animate-scale-in"
              >
                <div className="bg-card rounded-2xl shadow-xl border border-border">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.LIGHT}
                    width={320}
                    height={400}
                    searchPlaceHolder="Rechercher..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>
            )}
            
            {uploadProgress && (
               <div className="flex items-center gap-2 px-4 py-2 bg-border rounded-full mb-2 mx-2">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-[13px] text-muted-foreground">{uploadProgress}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {!isRecording && (
                <>
                  {/* Plus button - opens attachment options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                         className="w-8 h-8 flex items-center justify-center text-primary shrink-0"
                        disabled={isLoading}
                      >
                        <Plus className="h-6 w-6" strokeWidth={2} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 bg-card border border-border rounded-[14px] shadow-lg">
                      <DropdownMenuItem 
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3"
                      >
                        <Paperclip className="h-4 w-4 mr-3 text-primary" />
                        Fichier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={async () => {
                          try {
                            const file = await selectFromGallery();
                            if (file) uploadFile(file);
                          } catch (error) {
                            toast({
                              title: "Erreur",
                              description: "Impossible d'accéder à la galerie",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="py-3"
                      >
                        <Image className="h-4 w-4 mr-3 text-[#34C759]" />
                        Photo
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="py-3"
                      >
                        <Smile className="h-4 w-4 mr-3 text-[#FF9500]" />
                        Emoji
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setTimeout(() => setShowCreatePoll(true), 300);
                        }}
                        className="py-3"
                      >
                        <BarChart3 className="h-4 w-4 mr-3 text-[#5856D6]" />
                        Sondage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 50 * 1024 * 1024) {
                          toast({
                            title: "Fichier trop volumineux",
                            description: "La taille maximale est de 50 MB",
                            variant: "destructive"
                          });
                          return;
                        }
                        uploadFile(file);
                      }
                    }}
                    className="hidden"
                    disabled={isLoading}
                  />
                  
                  {/* iMessage input field */}
                  <div className="flex-1 flex items-center bg-secondary border border-border rounded-full px-4 py-2">
                    <input
                      type="text"
                      placeholder="iMessage"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-transparent text-[17px] text-foreground placeholder:text-muted-foreground outline-none"
                      disabled={isLoading}
                    />
                  </div>
                  
                  {/* Send or Mic button */}
                  {newMessage.trim() ? (
                    <button
                      onClick={sendMessage}
                      disabled={loading || !newMessage.trim()}
                      className="w-8 h-8 flex items-center justify-center bg-primary rounded-full shrink-0 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 text-white" />
                    </button>
                  ) : (
                    <button
                      onClick={handleVoiceRecording}
                      disabled={loading}
                      className="w-8 h-8 flex items-center justify-center text-primary shrink-0"
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                  )}
                </>
              )}
              
              {isRecording && (
                 <div className="flex-1 flex items-center gap-3">
                   <div className="flex-1 flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-full px-4 py-2">
                     <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                     <span className="text-[15px] font-medium text-destructive">
                       {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                     </span>
                     <span className="text-[13px] text-muted-foreground flex-1">
                      Enregistrement...
                    </span>
                  </div>
                  <button
                    onClick={cancelRecording}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleVoiceRecording}
                    className="w-8 h-8 flex items-center justify-center bg-destructive rounded-full"
                  >
                    <Square className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Delete message confirmation dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => { if (!open) setMessageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (messageToDelete) handleDeleteMessage(messageToDelete);
                setMessageToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Long press context menu */}
      <MessageLongPressMenu
        isOpen={!!longPressMessage}
        onClose={() => setLongPressMessage(null)}
        messageContent={longPressMessage?.content || ''}
        isOwnMessage={longPressMessage?.sender_id === user?.id}
        onReaction={async (emoji) => {
          if (!longPressMessage || !user) return;
          const existing = longPressMessage.reactions?.find(
            (r) => r.emoji === emoji && r.user_id === user.id
          );
          if (existing) {
            await supabase.from('message_reactions').delete().eq('id', existing.id);
          } else {
            await supabase.from('message_reactions').insert({
              message_id: longPressMessage.id,
              user_id: user.id,
              emoji,
            });
          }
          if (selectedConversation) loadMessages(selectedConversation.id);
        }}
        onReply={() => {
          if (!longPressMessage) return;
          setReplyTo({
            id: longPressMessage.id,
            content: longPressMessage.content || (longPressMessage.file_url ? '📎 Pièce jointe' : ''),
            senderName: longPressMessage.sender.username || longPressMessage.sender.display_name
          });
        }}
        onDelete={() => {
          if (!longPressMessage) return;
          setMessageToDelete(longPressMessage.id);
        }}
      />
      {user && (
        <CreatePollDialog
          open={showCreatePoll}
          onOpenChange={setShowCreatePoll}
          conversationId={selectedConversation.id}
          userId={user.id}
          onPollCreated={async (pollId: string) => {
            try {
              const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: selectedConversation.id,
                sender_id: user.id,
                content: pollId,
                message_type: 'poll',
              });

              if (msgError) {
                console.error('❌ Error inserting poll message:', msgError);
                toast({ title: 'Erreur', description: 'Impossible d\'envoyer le sondage', variant: 'destructive' });
                return;
              }

              await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', selectedConversation.id);
              loadMessages(selectedConversation.id);
            } catch (err) {
              console.error('Error sending poll message:', err);
            }
          }}
        />
      )}
      </>
    );
  }

  return (
    <>
      <div className="h-full bg-secondary flex flex-col">
        {/* iOS Header */}
        <div className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="px-4 pt-4 pb-4 relative flex items-center justify-center min-h-[60px]">
            {isSelectionMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="text-primary p-0 h-auto font-normal absolute left-4"
                >
                  Annuler
                </Button>
                <h1 className="text-[17px] font-semibold text-center">
                  {selectedConversations.size} sélectionné(s)
                </h1>
                <Button
                  onClick={confirmBulkDelete}
                  size="sm"
                  variant="ghost"
                  disabled={selectedConversations.size === 0}
                  className="text-destructive p-0 h-auto font-normal absolute right-4"
                >
                  Supprimer
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-[34px] font-bold tracking-tight text-center">Messages</h1>
                <div className="absolute right-4 flex items-center gap-2">
                  <Button
                    onClick={() => setShowNewConversation(true)}
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                  >
                    <Plus className="h-6 w-6 text-primary" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Quick Search Buttons */}
          <div className="bg-card p-3">
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => navigate('/search?tab=profiles')}
                className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] active:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground">Profils</span>
              </button>
              
              <button
                onClick={() => navigate('/search?tab=contacts')}
                className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] active:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground">Contacts</span>
              </button>
              
              <button
                onClick={() => navigate('/search?tab=clubs')}
                className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] active:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground">Clubs</span>
              </button>
              
              <button
                onClick={() => setShowCoachAccess(true)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] active:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground">Coach</span>
              </button>

              <button
                onClick={() => setShowCreateGroup(true)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] active:bg-secondary transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground">Club</span>
              </button>
            </div>
          </div>

          {/* Search Conversations */}
          <div className="relative px-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une conversation..."
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              className="pl-9 h-9 bg-secondary border-0 rounded-[10px] text-[15px] placeholder:text-muted-foreground"
            />
          </div>

          {/* Conversations List */}
          <div className="bg-card overflow-hidden">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-6 p-6 bg-secondary rounded-full">
                  <MessageCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2 mb-8">
                  <h3 className="text-[20px] font-semibold text-foreground">
                    Aucune conversation
                  </h3>
                  <p className="text-[15px] text-muted-foreground max-w-xs leading-relaxed">
                    Envoyez un message à un ami ou créez un club pour commencer à échanger.
                  </p>
                </div>
                <Button
                  onClick={() => setShowNewConversation(true)}
                  className="w-full max-w-xs"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouvelle conversation
                </Button>
              </div>
            ) : (
              <div>
                {filteredAndSortedConversations.map((conversation, index) => (
                  <SwipeableConversationItem
                    key={conversation.id}
                    isPinned={pinnedConversations.has(conversation.id)}
                    disabled={isSelectionMode}
                    onSwipeLeft={() => {
                      setConversationToDelete(conversation);
                      confirmDeleteConversation(conversation);
                    }}
                    onSwipeRight={() => togglePinConversation(conversation.id)}
                  >
                    <div
                      className={`flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors relative ${
                        selectedConversations.has(conversation.id) ? 'bg-primary/5' : ''
                      }`}
                      onTouchStart={() => !isSelectionMode && handleLongPressStart(conversation)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchCancel={handleLongPressEnd}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setConversationToDelete(conversation);
                        confirmDeleteConversation(conversation);
                      }}
                    >
                      {isSelectionMode && (
                        <div className="flex items-center mr-2">
                          <input
                            type="checkbox"
                            checked={selectedConversations.has(conversation.id)}
                            onChange={() => toggleConversationSelection(conversation.id)}
                            className="w-5 h-5 rounded-full border-2 border-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      
                      <div className="relative">
                        <Avatar className="h-[52px] w-[52px] min-w-[52px] min-h-[52px] aspect-square shrink-0 avatar-fixed">
                          {conversation.is_group ? (
                            <>
                              <AvatarImage src={conversation.group_avatar_url || ""} />
                              <AvatarFallback className="bg-secondary">
                                <Users className="h-6 w-6 text-muted-foreground" />
                              </AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src={conversation.other_participant?.avatar_url || ""} />
                              <AvatarFallback className="bg-secondary text-[17px] font-semibold">
                                {(conversation.other_participant?.username || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        {!conversation.is_group && <OnlineStatus userId={conversation.other_participant?.user_id || ""} />}
                      </div>
                      
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleConversationSelection(conversation.id);
                          } else {
                            setSelectedConversation(conversation);
                            loadMessages(conversation.id);
                            markMessagesAsReadOnOpen(conversation.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {pinnedConversations.has(conversation.id) && (
                              <span className="text-[13px] flex-shrink-0">📌</span>
                            )}
                            <p className="text-[17px] font-medium truncate">
                              {conversation.is_group 
                                ? conversation.group_name 
                                : (conversation.other_participant?.username || "Utilisateur")
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-[15px] truncate ${
                            conversation.unread_count > 0 
                              ? 'text-foreground font-medium' 
                              : 'text-muted-foreground'
                          }`}>
                            {conversation.last_message ? (
                              <>
                                {conversation.last_message.message_type === 'image' && (
                                  <span className="inline-flex items-center gap-1.5">
                                    {conversation.last_message.file_url ? (
                                      <img 
                                        src={conversation.last_message.file_url} 
                                        alt="" 
                                        className="h-4 w-4 rounded-[3px] object-cover inline-block" 
                                      />
                                    ) : null}
                                    Photo
                                  </span>
                                )}
                                {conversation.last_message.message_type === 'file' && 'Fichier'}
                                {conversation.last_message.message_type === 'voice' && 'Message vocal'}
                                {conversation.last_message.message_type === 'session' && 'Session partagée'}
                                {conversation.last_message.message_type === 'poll' && '📊 Sondage'}
                                {(!conversation.last_message.message_type || conversation.last_message.message_type === 'text') && 
                                  (conversation.last_message.content?.length > 40 
                                    ? conversation.last_message.content.substring(0, 40) + '…' 
                                    : conversation.last_message.content || 'Message supprimé'
                                  )
                                }
                              </>
                            ) : (
                              conversation.is_group 
                                ? `${conversation.group_members?.length || 0} membres`
                                : 'Aucun message'
                            )}
                          </p>
                          {conversation.unread_count > 0 && (
                            <div className="h-5 min-w-5 px-1.5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2 animate-[pulse_2s_ease-in-out_infinite]">
                              <span className="text-[11px] font-semibold text-primary-foreground">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Right column: time + camera */}
                      <div className="flex items-center justify-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[13px] text-muted-foreground">
                          {(() => {
                            const date = new Date(conversation.last_message_date || conversation.updated_at);
                            const now = new Date();
                            const diffMs = now.getTime() - date.getTime();
                            const diffMin = Math.floor(diffMs / 60000);
                            const diffH = Math.floor(diffMs / 3600000);
                            const diffD = Math.floor(diffMs / 86400000);
                            if (diffMin < 1) return "à l'instant";
                            if (diffMin < 60) return `${diffMin} min`;
                            if (diffH < 24) return `${diffH}h`;
                            if (diffD < 7) return format(date, 'EEEE', { locale: fr });
                            return format(date, 'dd/MM', { locale: fr });
                          })()}
                        </span>
                        {!isSelectionMode && (
                          <button
                            className="p-1 rounded-full active:bg-secondary transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickCameraForConversation(conversation);
                            }}
                          >
                            <Camera className="h-5 w-5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                      
                      {/* iOS-style inset separator */}
                      {index < filteredAndSortedConversations.length - 1 && (
                        <div className="absolute bottom-0 left-[76px] right-0 h-px bg-border" />
                      )}
                    </div>
                  </SwipeableConversationItem>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Club Dialog */}
        <CreateClubDialogPremium
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(groupId) => {
            loadConversations();
            setShowCreateGroup(false);
          }}
        />

        {/* Club Info Dialog */}
        <ClubInfoDialog
          isOpen={showGroupInfo}
          onClose={() => {
            console.log('🔍 ClubInfoDialog onClose called');
            setShowGroupInfo(false);
            setGroupInfoData(null);
          }}
          conversationId={groupInfoData?.id || ''}
          groupName={groupInfoData?.group_name || ""}
          groupDescription={groupInfoData?.group_description || null}
          groupAvatarUrl={groupInfoData?.group_avatar_url || null}
          clubCode={groupInfoData?.club_code || ""}
          createdBy={groupInfoData?.created_by || ""}
          isAdmin={groupInfoData?.created_by === user?.id}
          onEditGroup={() => {
            console.log('🔍 onEditGroup called from ClubInfoDialog');
            setShowGroupInfo(false);
            setTimeout(() => {
              setShowEditGroup(true);
            }, 100);
          }}
        />
        
        {/* Debug info removed - functionality should work now */}

        {/* Edit Club Dialog - available globally */}
        <EditClubDialog
          isOpen={showEditGroup}
          onClose={() => setShowEditGroup(false)}
          conversationId={groupInfoData?.id || selectedConversation?.id || ""}
          groupName={groupInfoData?.group_name || selectedConversation?.group_name || ""}
          groupDescription={groupInfoData?.group_description || selectedConversation?.group_description}
          groupAvatarUrl={groupInfoData?.group_avatar_url || selectedConversation?.group_avatar_url}
          clubCode={groupInfoData?.club_code || selectedConversation?.club_code || ""}
          createdBy={groupInfoData?.created_by || selectedConversation?.created_by || ""}
          isAdmin={(groupInfoData?.created_by || selectedConversation?.created_by) === user?.id}
          onGroupUpdated={() => {
            loadConversations();
            setShowEditGroup(false);
            if (selectedConversation) {
              // Reload the conversation to get updated info
              const updatedConv = conversations.find(c => c.id === selectedConversation.id);
              if (updatedConv) {
                setSelectedConversation(updatedConv);
              }
            }
          }}
        />

        {/* Contacts Dialog */}
        <ContactsDialog
          open={showContactsDialog}
          onClose={() => setShowContactsDialog(false)}
        />

        {/* Avatar Viewer */}
        <AvatarViewer
          open={showAvatarViewer}
          onClose={() => setShowAvatarViewer(false)}
          avatarUrl={selectedAvatarData?.url || null}
          username={selectedAvatarData?.username || "Utilisateur"}
        />
        {/* Coach Access Dialog */}
        <CoachAccessDialog
          isOpen={showCoachAccess}
          onClose={() => setShowCoachAccess(false)}
          onSelectClub={(clubId) => {
            setCoachClubId(clubId);
            setShowCoachCreate(true);
          }}
          onCreateClub={() => setShowCreateGroup(true)}
        />

        {coachClubId && (
          <CreateCoachingSessionDialog
            isOpen={showCoachCreate}
            onClose={() => { setShowCoachCreate(false); setCoachClubId(null); }}
            clubId={coachClubId}
            onCreated={() => {}}
          />
        )}

      </div>

    </>
  );
};

export default Messages;