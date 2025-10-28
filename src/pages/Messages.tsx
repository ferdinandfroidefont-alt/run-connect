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
      setIsSelectionMode(true);
      setSelectedConversations(new Set([conversation.id]));
    }, 500); // 500ms for long press
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
        <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto w-full h-screen flex flex-col keyboard-aware-container">
          {/* Top Bar - Fixed - Remonté légèrement */}
          <div className="fixed top-0 left-1/2 transform -translate-x-1/2 max-w-md w-full h-4 bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-700/80 backdrop-blur-md z-50"></div>
          
          {/* Header - Fixed - Remonté et plus compact */}
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full flex items-center justify-between p-3 border-b border-border/30 bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-700/80 backdrop-blur-md shadow-lg z-50">
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
                   <Avatar 
                     className="h-8 w-8 cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-primary/50 transition-all duration-200 glass-card border border-white/20"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔍 Club avatar clicked - redirecting to club settings');
                      // Fermer la conversation et ouvrir les paramètres du club
                      const clubData = selectedConversation;
                      setSelectedConversation(null); // Ferme la conversation
                      // Attendre que l'animation de fermeture soit terminée avant d'ouvrir le dialogue
                      setTimeout(() => {
                        setGroupInfoData(clubData);
                        setShowGroupInfo(true);
                      }, 100);
                    }}
                  >
                    <AvatarImage src={selectedConversation.group_avatar_url || ""} />
                    <AvatarFallback>
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="cursor-pointer hover:opacity-80 hover:bg-muted/30 rounded p-1 -m-1 transition-all duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔍 Club name clicked - redirecting to club settings');
                      // Fermer la conversation et ouvrir les paramètres du club
                      const clubData = selectedConversation;
                      setSelectedConversation(null); // Ferme la conversation
                      // Attendre que l'animation de fermeture soit terminée avant d'ouvrir le dialogue
                      setTimeout(() => {
                        setGroupInfoData(clubData);
                        setShowGroupInfo(true);
                      }, 100);
                    }}
                  >
                    <p className="font-medium text-sm">{selectedConversation.group_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.group_members?.length || 0} membres • Cliquez pour voir
                    </p>
                  </div>
                </>
              ) : (
                <>
                   <div className="relative">
                     <Avatar 
                       className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all glass-card border border-white/20"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Navigation directe vers la page profil
                        navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`);
                      }}
                    >
                      <AvatarImage src={selectedConversation.other_participant?.avatar_url || ""} />
                      <AvatarFallback>
                        {(selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatus userId={selectedConversation.other_participant?.user_id || ""} />
                  </div>
                  <div 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigation directe vers la page profil
                      navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`);
                    }}
                  >
                    <p className="font-medium text-sm">
                      {selectedConversation.other_participant?.username || selectedConversation.other_participant?.display_name}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-sm">
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

          {/* Messages - Scrollable area with top margin for fixed header - Ajusté pour nouveau header */}
          <div className="pt-[72px] flex-1 overflow-y-auto min-h-0">
            <div className={`h-full px-4 pt-4 pb-4 space-y-2 ${getThemeClasses().background}`} style={{borderBottom: 'none', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'}}>
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
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                      onMouseEnter={() => setVisibleTimestamps(prev => new Set(prev).add(message.id))}
                      onMouseLeave={() => setVisibleTimestamps(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(message.id);
                        return newSet;
                      })}
                      onClick={toggleTimestamp}
                    >
                      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'} relative`}>
                        {!isOwnMessage && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="relative">
                                <Avatar 
                                  className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAvatarClick(message.sender.avatar_url, message.sender.username || message.sender.display_name || "Utilisateur");
                                  }}
                                >
                                <AvatarImage src={message.sender.avatar_url || ""} />
                                <AvatarFallback>
                                  {(message.sender.username || message.sender.display_name || "").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <OnlineStatus userId={message.sender.user_id} className="w-2 h-2" />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {message.sender.username || message.sender.display_name}
                            </span>
                          </div>
                        )}
                        
                        {/* Individual timestamp - appears on hover/click */}
                        {showIndividualTime && (
                          <div className={`absolute -bottom-6 ${isOwnMessage ? 'right-0' : 'left-0'} z-10`}>
                            <div className="bg-background/90 border text-foreground text-xs px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                              {format(new Date(message.created_at), 'HH:mm', { locale: fr })}
                            </div>
                          </div>
                        )}
                        
                         <div className="relative group">
                           <div
                             className={`rounded-2xl p-3.5 transition-all duration-200 ${
                               isOwnMessage
                                 ? getThemeClasses().ownMessage
                                 : getThemeClasses().otherMessage
                             } ${showIndividualTime ? 'shadow-2xl scale-[1.02]' : ''}`}
                           >
                            {/* Delete button for own messages (only if not deleted) */}
                            {isOwnMessage && !message.deleted_at && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                onClick={() => {
                                  if (confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
                                    handleDeleteMessage(message.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}

                            {/* Show deleted message */}
                            {message.deleted_at ? (
                              <p className="text-sm italic text-muted-foreground">Message supprimé</p>
                            ) : (
                              <>
                                {/* Session sharing */}
                                {message.message_type === 'session' && message.session && (
                                  <div 
                                    className="mb-2 p-3 bg-background/50 rounded border cursor-pointer hover:bg-background/70 transition-colors"
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

                                {/* File attachment */}
                                {message.file_url && (
                                  <div className="mb-2">
                                     {message.message_type === 'voice' || message.file_type?.startsWith('audio/') ? (
                                       <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-background/30 backdrop-blur-sm border border-border/20 shadow-md">
                                         <Mic className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                         <audio 
                                           controls 
                                           src={message.file_url}
                                           className="max-w-full audio-player-glass"
                                           style={{ height: '28px', width: '160px' }}
                                         />
                                       </div>
                                     ) : message.file_type?.startsWith('image/') ? (
                                       <img 
                                         src={message.file_url} 
                                         alt=""
                                         className="max-w-full h-auto rounded-2xl shadow-lg backdrop-blur-sm border border-white/10"
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
                            </div>
                          )}
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

          {/* Message input - Sticky at bottom (follows keyboard) - Descendu légèrement */}
          <div 
            className="sticky bottom-0 w-full p-3 bg-background/95 backdrop-blur-sm border-t border-border/30 z-40 keyboard-input-container"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-[60] animate-scale-in"
              >
                <div className="glass-primary backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-border/30">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.AUTO}
                    width={320}
                    height={400}
                    searchPlaceHolder="Rechercher un emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>
            )}
            
            <div className="glass-primary backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-border/30">
            {uploadProgress && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg mb-2">
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">{uploadProgress}</span>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 glass-card border-border/40 hover:bg-background/60"
                      disabled={isLoading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
                      className="px-3 glass-card border-border/40 hover:bg-background/60"
                      disabled={isLoading}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`px-3 glass-card border-border/40 hover:bg-background/60 transition-all duration-200 ${
                        showEmojiPicker ? 'bg-primary/20 border-primary/40 shadow-lg shadow-primary/20' : ''
                      }`}
                      disabled={isLoading}
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Tapez votre message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 glass-card border-border/40 focus:border-primary/60 bg-background/40"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !newMessage.trim()}
                      size="sm"
                      className="px-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-primary/50 transition-all duration-200"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={handleVoiceRecording}
                      disabled={loading}
                      size="sm"
                      variant="outline"
                      className="px-3 glass-card border-border/40 hover:bg-background/60"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                {isRecording && (
                  <>
                    <div className="flex-1 flex items-center gap-3 glass-card bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-2 backdrop-blur-md shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-red-500">
                        {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground flex-1">
                      Enregistrement en cours...
                    </span>
                  </div>
                  <Button
                    onClick={cancelRecording}
                    size="sm"
                    variant="outline"
                    className="px-3"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleVoiceRecording}
                    size="sm"
                    className="px-3 bg-red-500 hover:bg-red-600"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
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
      {/* Petite barre noire en haut uniquement pour Messages */}
      <div className="fixed top-0 left-0 right-0 w-full h-6 bg-background z-50"></div>
      <div className="h-screen bg-background flex flex-col">
        <div className="max-w-md mx-auto w-full h-full flex flex-col">
          {/* Fixed Header Only - Remonté légèrement */}
          <div className="fixed top-4 left-0 right-0 flex-shrink-0 bg-background z-50 p-3 border-b border-border">
            <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between">
              {isSelectionMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="mr-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isSelectionMode 
                    ? `${selectedConversations.size} sélectionné(s)` 
                    : "Messages"
                  }
                </h1>
                {!isSelectionMode && (
                  <p className="text-muted-foreground text-sm">
                    Restez en contact avec la communauté
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {isSelectionMode ? (
                  <Button
                    onClick={confirmBulkDelete}
                    size="sm"
                    variant="destructive"
                    disabled={selectedConversations.size === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                ) : (
                  <>
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
                    Club
                  </Button>
                </>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Scrollable Content - Conversations only */}
          <div className="flex-1 overflow-y-auto pt-32 pb-24">
            {/* Conversations */}
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-base font-medium">
                  Aucune conversation
                </p>
                <p className="text-muted-foreground/70 text-sm mt-2">
                  Appuyez sur + pour démarrer une conversation
                </p>
              </div>
            ) : (
              <div className="space-y-1 px-2">
                {conversations.map((conversation) => (
                   <div
                     key={conversation.id}
                     className={`flex items-center gap-3 p-4 hover:bg-muted/30 cursor-pointer transition-all rounded-xl mx-2 my-1 ${
                       selectedConversations.has(conversation.id) ? 'bg-primary/10' : ''
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
                           className="w-5 h-5 rounded border-2 border-primary"
                           onClick={(e) => e.stopPropagation()}
                         />
                       </div>
                     )}
                     
                     <div className="relative">
                        <Avatar 
                          className="h-12 w-12 cursor-pointer"
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
                             <AvatarFallback>
                               <Users className="h-6 w-6" />
                             </AvatarFallback>
                           </>
                         ) : (
                           <>
                             <AvatarImage src={conversation.other_participant?.avatar_url || ""} />
                             <AvatarFallback>
                               {(conversation.other_participant?.username || conversation.other_participant?.display_name || "U").charAt(0).toUpperCase()}
                             </AvatarFallback>
                           </>
                         )}
                       </Avatar>
                       {!conversation.is_group && <OnlineStatus userId={conversation.other_participant?.user_id || ""} />}
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
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          {conversation.is_group 
                            ? conversation.group_name 
                            : (conversation.other_participant?.username || conversation.other_participant?.display_name || "Utilisateur inconnu")
                          }
                        </p>
                         <div className="flex items-center gap-2">
                           {conversation.unread_count > 0 && (
                             <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                               {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                             </Badge>
                           )}
                           <span className="text-xs text-muted-foreground">
                             {format(new Date(conversation.updated_at), 'dd/MM', { locale: fr })}
                           </span>
                         </div>
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
      </div>
    </>
  );
};

export default Messages;