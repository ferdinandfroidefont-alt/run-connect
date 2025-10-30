import { useState, useEffect, useRef, useTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { FriendSuggestions } from "@/components/FriendSuggestions";
import { ClubInfoDialog } from "@/components/ClubInfoDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateClubDialog } from "@/components/CreateClubDialog";
import { EditClubDialog } from "@/components/EditClubDialog";
import { ContactsDialog } from "@/components/ContactsDialog";
import { AvatarViewer } from "@/components/AvatarViewer";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useCamera } from "@/hooks/useCamera";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { MessageFilterPills } from "@/components/MessageFilterPills";
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
  Smile
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSectionHeader, shouldShowSectionHeader } from "../components/MessageTimestamp";
import { useConversationTheme } from "@/hooks/useConversationTheme";
import { TypingIndicator } from "@/components/TypingIndicator";

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
}

const Messages = () => {
  const { user, subscriptionInfo } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getThemeClasses } = useConversationTheme();
  const { setHideBottomNav } = useAppContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
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
  const { selectFromGallery, loading: cameraLoading } = useCamera();
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  
  // Long press & multi-select states
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Conversation settings states
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
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
    if (selectedConversation) {
      setHideBottomNav(true);
    } else {
      setHideBottomNav(false);
    }
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
      const sortedConversations = conversationsWithProfiles
        .filter(Boolean)
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
      // Vibration haptique si disponible
      if (navigator.vibrate) {
        navigator.vibrate(50); // 50ms de vibration
      }
      setIsSelectionMode(true);
      setSelectedConversations(new Set([conversation.id]));
    }, 1000); // 1000ms (1 seconde) pour l'appui long
    setLongPressTimer(timer);
  };

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
    if (!selectedConversation || !user) return;

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

      // Go back to conversations list
      setSelectedConversation(null);
      loadConversations();
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
          // Marquer les messages comme lus automatiquement
          markMessagesAsReadOnOpen(existingConv.id);
          setTimeout(() => {
            markAllMessagesAsRead();
          }, 100);
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

    return () => {
      console.log('🔌 Cleaning up conversations realtime channels');
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(allMessagesChannel);
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
          
          // Update message in state (for deleted messages or read status)
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id 
              ? { ...m, ...updatedMessage }
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
      <>
        {/* Barre système Android */}
        <div className="fixed top-0 left-0 right-0 w-full h-6 bg-background z-50"></div>
        
        <div className="min-h-screen bg-background">
          <div className="max-w-md mx-auto pt-6">
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

          {/* Reminder about friends only */}
          <div className="px-4 pt-2 pb-2">
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground text-center font-medium">
                💬 Uniquement pour les amis
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 pt-2">
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
                 <div className="relative">
                     <Avatar 
                       className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleAvatarClick(profile.avatar_url, profile.username || profile.display_name || "Utilisateur");
                       }}
                     >
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                   <OnlineStatus userId={profile.user_id} className="w-3 h-3" />
                 </div>
                 <div>
                   <p className="font-medium">{profile.username || profile.display_name}</p>
                   <p className="text-sm text-muted-foreground">@{profile.username}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      </>
    );
  }

  if (selectedConversation) {
    return (
      <>
        {/* Premium Conversation View - Noir profond avec dégradé bleu */}
        <div className="min-h-screen bg-gradient-to-b from-[#000714] via-[#001133] to-[#000714]">
        <div className="max-w-md mx-auto w-full h-screen flex flex-col keyboard-aware-container">
          
          {/* Premium Header avec glassmorphisme */}
          <div className="fixed top-0 left-1/2 transform -translate-x-1/2 max-w-md w-full flex items-center justify-between p-4 backdrop-blur-xl bg-gradient-to-r from-[hsl(var(--royal-blue))]/20 via-[hsl(var(--royal-blue))]/15 to-[hsl(var(--cyan-bright))]/20 border-b border-white/10 shadow-[0_4px_24px_rgba(0,85,255,0.15)] z-50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              {selectedConversation.is_group ? (
                <>
                   <Avatar 
                     className="h-12 w-12 cursor-pointer ring-2 ring-[hsl(var(--royal-blue))]/40 hover:ring-[hsl(var(--royal-blue))] transition-all duration-300 shadow-[0_0_20px_rgba(0,85,255,0.4)]"
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
                    <AvatarImage src={selectedConversation.group_avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white">
                      <Users className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
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
                    <p className="font-['Poppins',sans-serif] font-semibold text-white text-base">
                      {selectedConversation.group_name}
                    </p>
                    <p className="text-xs text-white/60">
                      {selectedConversation.group_members?.length || 0} membres
                    </p>
                  </div>
                </>
              ) : (
                <>
                   <div className="relative">
                     <Avatar 
                       className="h-12 w-12 cursor-pointer ring-2 ring-[hsl(var(--royal-blue))]/40 hover:ring-[hsl(var(--royal-blue))] transition-all duration-300 shadow-[0_0_20px_rgba(0,85,255,0.4)]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`);
                      }}
                    >
                      <AvatarImage src={selectedConversation.other_participant?.avatar_url || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white font-['Poppins',sans-serif] font-bold text-lg">
                        {(selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <OnlineStatus userId={selectedConversation.other_participant?.user_id || ""} className="ring-2 ring-[#000714]" />
                    </div>
                  </div>
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`);
                    }}
                  >
                    <p className="font-['Poppins',sans-serif] font-semibold text-white text-base">
                      {selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name}
                    </p>
                    <p className="text-xs text-white/60">
                      @{selectedConversation.other_participant?.username}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 backdrop-blur-xl bg-[#001133]/95 border border-white/10 text-white">
                  {!selectedConversation.is_group && (
                    <DropdownMenuItem 
                      onClick={() => navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Voir le profil
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedConversation(null);
                      setShowCreateGroup(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Créer un chat de groupe
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => setIsMuted(!isMuted)}
                    className="justify-between"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{isMuted ? "🔔" : "🔕"}</span>
                      <span>Notifications</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isMuted ? "Activées" : "Désactivées"}
                    </span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => setIsPinned(!isPinned)}
                    className="justify-between"
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📌</span>
                      <span>Épingler</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {isPinned ? "Oui" : "Non"}
                    </span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => confirmDeleteConversation()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {selectedConversation.is_group && selectedConversation.created_by !== user?.id 
                      ? "Quitter le club" 
                      : "Supprimer"
                    }
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages - Zone de messages avec arrière-plan dégradé animé */}
          <div className="pt-[80px] flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="h-full px-4 pt-6 pb-4 space-y-3 relative">
              {/* Subtle animated background effect */}
              <div className="fixed inset-0 pointer-events-none opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[hsl(var(--royal-blue))]/5 via-transparent to-[hsl(var(--cyan-bright))]/5 animate-pulse"></div>
              </div>
              
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const showHeader = shouldShowSectionHeader(message, previousMessage);
                const showIndividualTime = visibleTimestamps.has(message.id);
                
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
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group animate-fade-in`}
                      onMouseEnter={() => setVisibleTimestamps(prev => new Set(prev).add(message.id))}
                      onMouseLeave={() => setVisibleTimestamps(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(message.id);
                        return newSet;
                      })}
                      onClick={toggleTimestamp}
                    >
                      <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'} relative`}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="relative">
                                <Avatar 
                                  className="h-8 w-8 cursor-pointer ring-2 ring-white/20 hover:ring-[hsl(var(--cyan-bright))] transition-all duration-300 shadow-[0_0_12px_rgba(0,208,255,0.3)]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAvatarClick(message.sender.avatar_url, message.sender.username || message.sender.display_name || "Utilisateur");
                                  }}
                                >
                                <AvatarImage src={message.sender.avatar_url || ""} />
                                <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white font-bold">
                                  {(message.sender.username || message.sender.display_name || "").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5">
                                <OnlineStatus userId={message.sender.user_id} className="w-3 h-3 ring-2 ring-[#000714]" />
                              </div>
                            </div>
                            <span className="text-xs font-['Poppins',sans-serif] font-medium text-white/70">
                              {message.sender.username || message.sender.display_name}
                            </span>
                          </div>
                        )}
                        
                        {/* Premium timestamp avec effet glass */}
                        {showIndividualTime && (
                          <div className={`absolute -bottom-7 ${isOwnMessage ? 'right-0' : 'left-0'} z-10 animate-scale-in`}>
                            <div className="backdrop-blur-xl bg-white/10 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                              {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                            </div>
                          </div>
                        )}
                        
                         <div className="relative group">
                           <div
                             className={`rounded-[20px] p-4 transition-all duration-300 backdrop-blur-xl border ${
                               isOwnMessage
                                 ? 'bg-gradient-to-br from-[#005CFF]/90 to-[#002B80]/90 text-white border-white/20 shadow-[0_8px_24px_rgba(0,85,255,0.4)] hover:shadow-[0_12px_32px_rgba(0,85,255,0.6)]'
                                 : 'bg-[#1A1F3C]/80 text-white/90 border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:bg-[#1A1F3C]/90'
                             } ${showIndividualTime ? 'scale-[1.02] shadow-2xl' : ''} ${isOnlyEmojis(message.content || '') ? 'bg-transparent border-none shadow-none p-2' : ''}`}
                           >
                            {/* Premium delete button with glow effect */}
                            {isOwnMessage && !message.deleted_at && (
                              <button
                                className="absolute -top-2 -right-2 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-red-500/50 flex items-center justify-center"
                                onClick={() => {
                                  if (confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
                                    handleDeleteMessage(message.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Deleted message with premium style */}
                            {message.deleted_at ? (
                              <p className="text-sm italic text-white/40 flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                Message supprimé
                              </p>
                            ) : (
                              <>
                                {/* Premium session sharing card */}
                                {message.message_type === 'session' && message.session && (
                                  <div 
                                    className="mb-3 p-4 backdrop-blur-xl bg-white/5 rounded-[16px] border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSessionClick(message.session);
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-sm">{message.session.title}</span>
                                      </div>
                                      <span className="text-xs text-muted-foreground">Cliquer pour voir sur la carte</span>
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

                                {/* Premium file attachments */}
                                {message.file_url && (
                                  <div className="mb-3">
                                     {message.message_type === 'voice' || message.file_type?.startsWith('audio/') ? (
                                       <div className="flex items-center gap-3 px-4 py-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300">
                                         <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] flex items-center justify-center shadow-[0_0_16px_rgba(0,208,255,0.4)]">
                                           <Mic className="h-5 w-5 text-white" />
                                         </div>
                                         <audio 
                                           controls 
                                           src={message.file_url}
                                           className="flex-1 audio-player-glass"
                                           style={{ height: '32px', maxWidth: '200px' }}
                                         />
                                       </div>
                                     ) : message.file_type?.startsWith('image/') ? (
                                       <div className="relative group/image">
                                         <img 
                                           src={message.file_url} 
                                           alt=""
                                           className="max-w-full h-auto rounded-[16px] shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-white/10 hover:scale-[1.02] transition-transform duration-300"
                                           style={{ maxHeight: '280px' }}
                                         />
                                       </div>
                                    ) : (
                                      <div className="flex items-center gap-3 p-3 backdrop-blur-xl bg-white/5 rounded-[16px] border border-white/10 hover:bg-white/10 transition-all duration-300">
                                        <Paperclip className="h-4 w-4" />
                                        <span className="text-sm truncate">{message.file_name}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show text content only if it's not a media-only message */}
                                {message.content && !message.content.match(/^(Image partagée|Message vocal)/i) && (
                                  <p className={`${
                                    isOnlyEmojis(message.content) 
                                      ? 'text-4xl leading-tight' 
                                      : 'text-sm'
                                  }`}>
                                    {message.content}
                                  </p>
                                )}
                              </>
                            )}
                         
                           {/* Read status for own messages - minimal display */}
                           {isOwnMessage && (
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
                        </div>
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

          {/* Premium Message Input Bar - Glassmorphic avec halos lumineux */}
          <div 
            className="sticky bottom-0 w-full p-4 backdrop-blur-xl bg-gradient-to-t from-[#001133]/95 via-[#000714]/90 to-transparent border-t border-white/10 z-40 keyboard-input-container shadow-[0_-4px_24px_rgba(0,85,255,0.15)]"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Premium Emoji Picker */}
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 z-[60] animate-scale-in"
              >
                <div className="backdrop-blur-xl bg-[#001133]/95 rounded-[20px] p-3 shadow-[0_8px_32px_rgba(0,85,255,0.3)] border border-white/10">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.DARK}
                    width={320}
                    height={400}
                    searchPlaceHolder="Rechercher un emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>
            )}
            
            <div className="backdrop-blur-xl bg-white/5 rounded-[20px] p-3 shadow-lg border border-white/10">
            {uploadProgress && (
              <div className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl bg-[hsl(var(--cyan-bright))]/10 rounded-[16px] mb-3 border border-[hsl(var(--cyan-bright))]/20 shadow-[0_0_16px_rgba(0,208,255,0.2)]">
                <div className="w-4 h-4 border-2 border-[hsl(var(--cyan-bright))] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-white font-['Poppins',sans-serif] font-medium">{uploadProgress}</span>
              </div>
            )}
              <div className="flex gap-2">
                {!isRecording && (
                  <>
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
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="p-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[hsl(var(--royal-blue))]/40 hover:shadow-[0_0_16px_rgba(0,85,255,0.3)] transition-all duration-300 disabled:opacity-50"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                      onClick={async () => {
                        console.log('🖼️ Bouton Image cliqué');
                        try {
                          const file = await selectFromGallery();
                          if (file) {
                            console.log('📸 Fichier sélectionné:', file.name);
                            uploadFile(file);
                          } else {
                            toast({
                              title: "Aucun fichier",
                              description: "Aucune image sélectionnée",
                              variant: "default"
                            });
                          }
                        } catch (error: any) {
                          console.error('❌ Erreur sélection galerie:', error);
                          let errorMessage = "Impossible d'accéder à la galerie. Vérifiez les permissions.";
                          if (error.message === 'PERMISSION_DENIED') {
                            errorMessage = "Permission refusée. Activez l'accès à la galerie dans les paramètres.";
                          } else if (error.message === 'TIMEOUT') {
                            errorMessage = "Délai d'attente dépassé. Réessayez.";
                          }
                          toast({
                            title: "Erreur",
                            description: errorMessage,
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={isLoading}
                      className="p-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[hsl(var(--royal-blue))]/40 hover:shadow-[0_0_16px_rgba(0,85,255,0.3)] transition-all duration-300 disabled:opacity-50"
                    >
                      <Image className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      disabled={isLoading}
                      className={`p-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 text-white transition-all duration-300 disabled:opacity-50 ${
                        showEmojiPicker ? 'bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/40 shadow-[0_0_16px_rgba(255,215,0,0.4)]' : 'hover:bg-white/10 hover:border-[hsl(var(--gold))]/30 hover:shadow-[0_0_12px_rgba(255,215,0,0.2)]'
                      }`}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    <Input
                      placeholder="Tapez votre message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 backdrop-blur-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-[hsl(var(--royal-blue))]/60 focus:shadow-[0_0_16px_rgba(0,85,255,0.2)] rounded-[16px] px-4 font-['Poppins',sans-serif] transition-all duration-300"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={loading || !newMessage.trim()}
                      className="p-3 rounded-full bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white hover:shadow-[0_0_20px_rgba(0,85,255,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleVoiceRecording}
                      disabled={loading}
                      className="p-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[hsl(var(--royal-blue))]/40 hover:shadow-[0_0_16px_rgba(0,85,255,0.3)] transition-all duration-300 disabled:opacity-50"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  </>
                )}
                
                {isRecording && (
                  <>
                    <div className="flex-1 flex items-center gap-4 backdrop-blur-xl bg-red-500/20 border border-red-500/40 rounded-[16px] px-5 py-3 shadow-[0_0_24px_rgba(239,68,68,0.3)]">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                      <span className="text-base font-['Poppins',sans-serif] font-semibold text-red-500">
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-sm text-white/70 flex-1 font-['Poppins',sans-serif] font-medium">
                      Enregistrement en cours...
                    </span>
                  </div>
                  <button
                    onClick={cancelRecording}
                    className="p-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleVoiceRecording}
                    className="p-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all duration-300"
                  >
                    <Square className="h-5 w-5 fill-white" />
                  </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-[hsl(var(--royal-blue))] via-[hsl(var(--royal-blue))]/95 to-[hsl(var(--cyan-bright))]/90 flex flex-col">
        <div className="max-w-md mx-auto w-full h-full flex flex-col">
          {/* Premium Glassmorphic Header */}
          <div className="relative pt-safe">
            <div className="px-4 pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-['Poppins',sans-serif] font-semibold text-white tracking-tight">
                  {isSelectionMode 
                    ? `${selectedConversations.size} sélectionné(s)` 
                    : "Messages"
                  }
                </h1>
                <div className="flex items-center gap-3">
                  {isSelectionMode ? (
                    <>
                      <button 
                        onClick={exitSelectionMode}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      <button
                        onClick={confirmBulkDelete}
                        disabled={selectedConversations.size === 0}
                        className="p-3 rounded-full bg-red-500/80 backdrop-blur-xl border border-white/20 text-white hover:bg-red-600 transition-all duration-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => navigate('/search')}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
                      >
                        <Search className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => setShowNewConversation(true)}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conversations List - No borders */}

          {/* Scroll area with conversations */}
          <ScrollArea className="flex-1 overflow-y-auto scroll-smooth scrollbar-hide bg-gradient-to-b from-transparent via-[hsl(var(--messages-dark-bg))]/60 to-[hsl(var(--messages-dark-bg))]" style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}>
            {/* Premium Filter Pills */}
            {!isSelectionMode && (
              <div className="mt-2">
                <MessageFilterPills />
              </div>
            )}

            <div className="px-4 pb-safe">
              {conversations.length === 0 ? (
              <div className="text-center text-white/70 py-16 px-4">
                <MessageCircle className="h-20 w-20 mx-auto mb-6 text-white/30" />
                <p className="text-lg font-['Poppins',sans-serif] font-semibold mb-2 text-white">Aucune conversation</p>
                <p className="text-sm text-white/60">Commencez à discuter avec des membres</p>
              </div>
            ) : (
              <>
                {/* Selection mode banner */}
                {isSelectionMode && (
                  <div className="sticky top-0 z-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 mb-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setIsSelectionMode(false);
                            setSelectedConversations(new Set());
                          }}
                          className="text-white hover:bg-white/10"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                        <span className="text-white font-['Poppins',sans-serif] font-semibold">
                          {selectedConversations.size} sélectionnée(s)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        disabled={selectedConversations.size === 0}
                        className="text-white hover:bg-white/10"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Conversation cards with premium design */}
                <div className="space-y-3 pt-2 animate-fade-in">
                  {conversations.map((conversation, index) => (
                     <div
                        key={conversation.id}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        className={`
                          group relative flex items-center gap-4 p-4 rounded-[20px] 
                          transition-all duration-300 cursor-pointer
                          backdrop-blur-xl bg-white/5 border border-white/10
                          hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(0,85,255,0.3)] hover:border-white/20 hover:-translate-y-1
                          active:bg-white/15 active:scale-[0.98]
                          animate-fade-in
                          ${isSelectionMode ? 'cursor-pointer' : ''}
                          ${selectedConversations.has(conversation.id) ? 'bg-white/15 ring-2 ring-[hsl(var(--gold))]/60 shadow-[0_0_20px_rgba(255,215,0,0.3)]' : ''}
                          ${conversation.unread_count && conversation.unread_count > 0 ? 'bg-white/10 ring-1 ring-[hsl(var(--cyan-bright))]/50 shadow-[0_0_12px_rgba(0,208,255,0.2)]' : ''}
                        `}
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
                        <div className="flex items-center mr-1">
                          <input
                            type="checkbox"
                            checked={selectedConversations.has(conversation.id)}
                            onChange={() => toggleConversationSelection(conversation.id)}
                            className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-[hsl(var(--gold))] checked:border-[hsl(var(--gold))]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                      
                      <div className="relative">
                         <Avatar 
                           className="h-14 w-14 cursor-pointer ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300"
                             onClick={(e) => {
                               e.stopPropagation();
                               if (isSelectionMode) {
                                 toggleConversationSelection(conversation.id);
                               } else if (conversation.is_group) {
                                 setSelectedConversation(conversation);
                                 setGroupInfoData(conversation);
                                 setShowGroupInfo(true);
                               } else if (conversation.other_participant) {
                                 handleAvatarClick(conversation.other_participant.avatar_url, conversation.other_participant.username || conversation.other_participant.display_name || "Utilisateur");
                               }
                             }}
                        >
                          {conversation.is_group ? (
                            <>
                              <AvatarImage src={conversation.group_avatar_url || ""} />
                              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white">
                                <Users className="h-7 w-7" />
                              </AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src={conversation.other_participant?.avatar_url || ""} />
                              <AvatarFallback className="bg-gradient-to-br from-[hsl(var(--royal-blue))] to-[hsl(var(--cyan-bright))] text-white font-['Poppins',sans-serif] font-bold text-lg">
                                {(conversation.other_participant?.username || conversation.other_participant?.display_name || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        {!conversation.is_group && (
                          <div className="absolute bottom-0 right-0">
                            <OnlineStatus userId={conversation.other_participant?.user_id || ""} />
                          </div>
                        )}
                      </div>
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                         onClick={() => {
                           if (isSelectionMode) {
                             toggleConversationSelection(conversation.id);
                           } else {
                             setSelectedConversation(conversation);
                             loadMessages(conversation.id);
                             // Marquer les messages comme lus automatiquement
                             markMessagesAsReadOnOpen(conversation.id);
                           }
                         }}
                      >
                       <div className="flex items-center justify-between mb-1">
                         <p className="font-['Poppins',sans-serif] font-semibold text-white text-base truncate">
                           {conversation.is_group 
                             ? conversation.group_name 
                             : (conversation.other_participant?.username || conversation.other_participant?.display_name || "Utilisateur inconnu")
                           }
                         </p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {conversation.unread_count > 0 && (
                              <Badge 
                                variant="default" 
                                className="h-6 min-w-[24px] px-2 flex items-center justify-center text-xs font-bold bg-[hsl(var(--cyan-bright))] text-white border-0 shadow-[0_0_12px_rgba(0,208,255,0.5)] animate-pulse"
                              >
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </Badge>
                            )}
                            <span className="text-xs text-white/50 font-medium">
                              {format(new Date(conversation.updated_at), 'dd/MM', { locale: fr })}
                            </span>
                          </div>
                       </div>
                       <div className="flex items-center justify-between">
                         <p className="text-sm text-white/60 truncate">
                           {conversation.is_group 
                             ? `${conversation.group_members?.length || 0} membres`
                             : `@${conversation.other_participant?.username || "utilisateur"}`
                           }
                         </p>
                         {conversation.last_message && (
                           <p className="text-xs text-white/40 truncate ml-2 max-w-[120px]">
                             {conversation.last_message.content?.substring(0, 30) || "Fichier partagé"}
                           </p>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
               
               {/* Premium Suggestions Section with Carousel */}
               {conversations.length > 0 && (
                 <div className="mt-8 mb-6 animate-slide-up">
                   <h3 className="text-base font-['Poppins',sans-serif] font-semibold text-white/90 mb-4 px-1 flex items-center gap-2">
                     <span className="w-1 h-5 bg-gradient-to-b from-[hsl(var(--gold))] to-[hsl(var(--cyan-bright))] rounded-full" />
                     Suggestions
                   </h3>
                   <FriendSuggestions compact={true} />
                 </div>
                )}
              </>
            )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Create Club Dialog */}
      <CreateClubDialog
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
      </>
    );
};

export default Messages;