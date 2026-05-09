import { lazy, Suspense, useState, useEffect, useRef, useTransition, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";
import { applyWebChromeForTheme } from "@/lib/iosStatusBarTheme";
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
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
import { getIosEmptyStateSpacing } from "@/lib/iosEmptyStateLayout";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SwipeableConversationItem } from "@/components/SwipeableConversationItem";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useCamera } from "@/hooks/useCamera";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import {
  MessageCircle, 
  Users, 
  Send,
  ArrowLeft,
  ChevronLeft,
  Search,
  Plus,
  Paperclip,
  Check,
  CheckCheck,
  Image,
  UserPlus,
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
  ChevronRight
} from "lucide-react";
import { format, isToday, isYesterday, isValid, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { getActivityEmoji } from "@/lib/discoverSessionVisual";
import { MessageSectionHeader, shouldShowSectionHeader } from "../components/MessageTimestamp";

import { TypingIndicator } from "@/components/TypingIndicator";
import { MessageReactions, useMessageReactionPicker } from "@/components/MessageReactions";
import { ReplyPreview, ReplyBubble } from "@/components/MessageReply";
import { PollCard } from "@/components/PollCard";
import { MessageLongPressMenu } from "@/components/MessageLongPressMenu";
import { CoachingMessageCard } from "@/components/coaching/CoachingMessageCard";
import { VoiceMessagePlayer } from "@/components/VoiceMessagePlayer";
import { SignedImage } from "@/components/SignedImage";
import { SessionStoriesStrip } from "@/components/stories/SessionStoriesStrip";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";
import { SearchTabs } from "@/components/SearchTabs";
import { ProfilesTab } from "@/components/search/ProfilesTab";
import { ClubsTab } from "@/components/search/ClubsTab";
import { StravaTab } from "@/components/search/StravaTab";
import { ContactsTab } from "@/components/search/ContactsTab";

const NewConversationView = lazy(() =>
  import("@/components/NewConversationView").then((m) => ({ default: m.NewConversationView }))
);
const CreatePollDialog = lazy(() =>
  import("@/components/CreatePollDialog").then((m) => ({ default: m.CreatePollDialog }))
);
const ConversationInfoSheet = lazy(() =>
  import("@/components/ConversationInfoSheet").then((m) => ({ default: m.ConversationInfoSheet }))
);
const CreateClubFormPanel = lazy(() =>
  import("@/components/CreateClubDialogPremium").then((m) => ({ default: m.CreateClubFormPanel }))
);
const ClubInfoDialog = lazy(() =>
  import("@/components/ClubInfoDialog").then((m) => ({ default: m.ClubInfoDialog }))
);
const ClubProfileDialog = lazy(() =>
  import("@/components/ClubProfileDialog").then((m) => ({ default: m.ClubProfileDialog }))
);
const EditClubDialog = lazy(() =>
  import("@/components/EditClubDialog").then((m) => ({ default: m.EditClubDialog }))
);
const ContactsDialog = lazy(() =>
  import("@/components/ContactsDialog").then((m) => ({ default: m.ContactsDialog }))
);
const AvatarViewer = lazy(() =>
  import("@/components/AvatarViewer").then((m) => ({ default: m.AvatarViewer }))
);
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

/** Heure / date en ligne de liste (maquette 17 : HH:mm, Hier, Lun…). */
function formatConversationListTime(iso: string): string {
  const date = new Date(iso);
  if (!isValid(date)) return "";
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hier";
  const todayStart = startOfDay(new Date());
  const msgStart = startOfDay(date);
  const diffDays = Math.round((todayStart.getTime() - msgStart.getTime()) / 86400000);
  if (diffDays > 1 && diffDays < 7) {
    const raw = format(date, "EEE", { locale: fr });
    const strip = raw.replace(/\.$/, "");
    return strip.charAt(0).toUpperCase() + strip.slice(1);
  }
  return format(date, "dd/MM", { locale: fr });
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

interface PastSessionCommentTarget {
  id: string;
  title: string;
  scheduled_at: string;
  location_name: string | null;
  activity_type: string | null;
}

type MessagesRootTab = "conversations" | "create-club";
type MessageDiscoveryTab = "profiles" | "clubs" | "strava" | "contacts";

const Messages = () => {
  const { user } = useAuth();
  const { isPreviewMode } = useAppPreview();
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { setBottomNavSuppressed } = useAppContext();
  const { sendPushNotification } = useSendNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  /** Après le 1er chargement de la liste (évite de traiter un deep link avant ; permet les DM sans message). */
  const [conversationsHydrated, setConversationsHydrated] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [isInboxSearchMode, setIsInboxSearchMode] = useState(false);
  const [messageDiscoveryTab, setMessageDiscoveryTab] = useState<MessageDiscoveryTab>("profiles");
  /** Filtre liste inbox (maquette 17) — chips Conversations / Clubs / Groupes */
  const [messagesInboxSegment, setMessagesInboxSegment] = useState<"all" | "clubs" | "groups">("all");
  const [activeRootTab, setActiveRootTab] = useState<MessagesRootTab>("conversations");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);
  /** Remplace le Dropdown sur l’écran Messages : évite conflits swipe horizontal + tab bar z-[120]. */
  const [messagesComposeSheetOpen, setMessagesComposeSheetOpen] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showClubProfile, setShowClubProfile] = useState(false);
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
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Canal `typing-*` déjà souscrit (obligatoire pour que `broadcast` parte) */
  const typingBroadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingBroadcastReadyRef = useRef(false);
  const lastTypingSentAtRef = useRef(0);
  const typingDisplayNameRef = useRef("");
  const TYPING_THROTTLE_MS = 750;
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
  const [conversationToPin, setConversationToPin] = useState<Conversation | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCoachCreate, setShowCoachCreate] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [longPressMessage, setLongPressMessage] = useState<Message | null>(null);
  const [storyAuthorId, setStoryAuthorId] = useState<string | null>(null);
  const [storiesRefreshToken, setStoriesRefreshToken] = useState(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Conversation settings states
  const [isMuted, setIsMuted] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [userNotifSettings, setUserNotifSettings] = useState<{ notifications_enabled: boolean; notif_message: boolean }>({ notifications_enabled: false, notif_message: true });
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("pinnedConversations");
      if (!saved) return new Set();
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
    } catch {
      try {
        localStorage.removeItem("pinnedConversations");
      } catch {
        /* ignore — quota ou mode privé */
      }
      return new Set();
    }
  });
  /** Recherche locale dans le fil de messages ouvert */
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [keyboardInsetBottom, setKeyboardInsetBottom] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const viewportBaseHeightRef = useRef(0);
  const emptyStateSx = useMemo(() => getIosEmptyStateSpacing(), []);
  const conversationParam = searchParams.get("conversation");
  const tabParam = searchParams.get("tab");
  const isCommentsTab = tabParam === "comments";
  const [pastSessions, setPastSessions] = useState<PastSessionCommentTarget[]>([]);
  const [commentsBySession, setCommentsBySession] = useState<Record<string, string>>({});
  const [isLoadingPastSessions, setIsLoadingPastSessions] = useState(false);
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null);

  const visibleMessages = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => {
      const text = (m.content || "").toLowerCase();
      const sender = (m.sender?.username || m.sender?.display_name || "").toLowerCase();
      return text.includes(q) || sender.includes(q);
    });
  }, [messages, threadSearch]);

  const broadcastStopTyping = useCallback(() => {
    const ch = typingBroadcastChannelRef.current;
    if (!ch || !typingBroadcastReadyRef.current || !user) return;
    void ch.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { user_id: user.id },
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [user]);

  /** Même flux que l’entrée « Créer un club » : formulaire club / groupe conversation. */
  const openCreateClubTab = useCallback(() => {
    setMessagesComposeSheetOpen(false);
    setActiveRootTab("create-club");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "create-club");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const openNewConversationView = useCallback(() => {
    setMessagesComposeSheetOpen(false);
    setActiveRootTab("conversations");
    setSelectedConversation(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tab");
      return next;
    }, { replace: true });
    setShowNewConversation(true);
  }, [setSearchParams]);

  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from("profiles")
      .select("username, display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const dn = data.display_name?.trim();
          const un = data.username?.trim();
          typingDisplayNameRef.current =
            dn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dn) ? dn : un || "";
        }
      });
  }, [user?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      broadcastStopTyping();
      setThreadSearchOpen(false);
      setThreadSearch("");
    }
  }, [selectedConversation, broadcastStopTyping]);

  // Explicit reset requested by bottom navigation: always show inbox list.
  useEffect(() => {
    const resetConversation = Boolean((location.state as { resetConversation?: boolean } | null)?.resetConversation);
    if (!resetConversation) return;
    if (selectedConversation) {
      setSelectedConversation(null);
    }
    setBottomNavSuppressed("messages-thread", false);
    navigate("/messages", { replace: true, state: {} });
  }, [location.state, navigate, selectedConversation, setBottomNavSuppressed]);

  /** Ouverture « Nouvelle conversation » depuis un autre écran (ex. header identique sur /search). */
  useEffect(() => {
    if (location.pathname !== "/messages") return;
    const open = (location.state as { openNewConversation?: boolean } | null)?.openNewConversation;
    if (!open) return;
    setShowNewConversation(true);
    navigate({ pathname: "/messages", search: location.search }, { replace: true, state: {} });
  }, [location.pathname, location.search, location.state, navigate]);

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

  useEffect(() => {
    if (!selectedConversation) {
      setKeyboardInsetBottom(0);
      viewportBaseHeightRef.current = 0;
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const syncKeyboardInset = () => {
      const viewportBottom = vv.height + vv.offsetTop;
      const hasBaseline = viewportBaseHeightRef.current > 0;

      if (!hasBaseline || viewportBottom > viewportBaseHeightRef.current - 8) {
        viewportBaseHeightRef.current = viewportBottom;
      }

      const active = document.activeElement as HTMLElement | null;
      const hasInputFocus = !!active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
      );

      // Use a stable visual viewport baseline to avoid iOS innerHeight jumps.
      const nextInset = hasInputFocus
        ? Math.max(0, viewportBaseHeightRef.current - viewportBottom)
        : 0;
      setKeyboardInsetBottom((prev) => (Math.abs(prev - nextInset) > 1 ? nextInset : prev));
    };

    syncKeyboardInset();
    vv.addEventListener("resize", syncKeyboardInset);
    vv.addEventListener("scroll", syncKeyboardInset);
    window.addEventListener("orientationchange", syncKeyboardInset);

    return () => {
      vv.removeEventListener("resize", syncKeyboardInset);
      vv.removeEventListener("scroll", syncKeyboardInset);
      window.removeEventListener("orientationchange", syncKeyboardInset);
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (!selectedConversation) return;
    const el = composerRef.current;
    if (!el) return;

    const syncComposerHeight = () => {
      const next = Math.ceil(el.getBoundingClientRect().height);
      setComposerHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    syncComposerHeight();
    const ro = new ResizeObserver(syncComposerHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedConversation, replyTo, showEmojiPicker, uploadProgress, isRecording, newMessage]);

  useEffect(() => {
    if (!selectedConversation) return;
    const activeEl = document.activeElement;
    const isComposerFocused = !!(activeEl && composerRef.current?.contains(activeEl));
    if (!isComposerFocused && keyboardInsetBottom <= 0) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [keyboardInsetBottom, selectedConversation]);

  // iOS iMessage-style keyboard fix: track visual viewport height via JS and expose it
  // as --vvh so the conversation container (position:fixed) can size itself correctly.
  useEffect(() => {
    if (!selectedConversation) {
      document.documentElement.style.removeProperty('--vvh');
      return;
    }
    const vv = window.visualViewport;
    const update = () => {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${h}px`);
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--vvh');
    };
  }, [selectedConversation]);

  // Single effect for tab bar visibility + chrome color.
  // Tab bar visible sur la liste seulement : masquée dans un fil, « Nouveau message », ou création club/groupe
  // (sinon la barre fixed z-[120] reste au-dessus du contenu Messages, qui vit sous MainTabsSwipeHost + transform).
  // Ne pas remettre le suppressor à false dans le cleanup : sinon éclair entre deux conversations (liste swipe host).
  useEffect(() => {
    const onMessagesPage = location.pathname.startsWith("/messages");
    const inThread = onMessagesPage && !!selectedConversation;
    const inNewMessageCompose = onMessagesPage && showNewConversation;
    const inClubComposer = onMessagesPage && activeRootTab === "create-club";
    const suppressTabBar = inThread || inNewMessageCompose || inClubComposer;
    setBottomNavSuppressed("messages-thread", suppressTabBar);

    const root = document.documentElement;
    const hslVar = (name: string) => {
      const t = getComputedStyle(root).getPropertyValue(name).trim();
      return t ? `hsl(${t})` : '';
    };
    if (inThread || inNewMessageCompose) {
      const dark = root.classList.contains("dark");
      const threadBg = dark ? hslVar("--secondary") || "" : "#f5f5f7";
      if (threadBg) {
        root.style.backgroundColor = threadBg;
        document.body.style.backgroundColor = threadBg;
      }
      // Prevent iOS rubber-band scroll that shifts the fixed conversation layout
      document.body.style.overscrollBehavior = 'none';
    } else {
      const bg = hslVar('--background');
      if (bg) {
        root.style.backgroundColor = bg;
        document.body.style.backgroundColor = bg;
      }
      document.body.style.overscrollBehavior = '';
    }
    return () => {
      document.body.style.overscrollBehavior = '';
      applyWebChromeForTheme(root.classList.contains('dark'));
    };
  }, [selectedConversation, showNewConversation, activeRootTab, setBottomNavSuppressed, location.pathname]);

  useEffect(() => {
    return () => {
      setBottomNavSuppressed("messages-thread", false);
    };
  }, [setBottomNavSuppressed]);

  // Fetch user notification settings
  useEffect(() => {
    if (!user) return;
    const fetchNotifSettings = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notifications_enabled, notif_message')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUserNotifSettings({
          notifications_enabled: data.notifications_enabled ?? false,
          notif_message: data.notif_message ?? true,
        });
        // Sync mute state: muted if notif_message is explicitly false
        setIsMuted(data.notif_message === false);
      }
    };
    fetchNotifSettings();
  }, [user]);

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

            if (!membership) {
              // Auto-repair: if user is the creator, insert them as admin
              if (conv.created_by === user.id) {
                console.log(`🔧 Auto-repair: inserting creator as admin for club ${conv.id}`);
                await supabase.from('group_members').insert({
                  conversation_id: conv.id,
                  user_id: user.id,
                  is_admin: true
                });
              } else {
                return null; // User is not a member
              }
            }

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
    } finally {
      setConversationsHydrated(true);
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

  const handleSessionClick = (session: {
    id: string;
    location_lat?: number | null;
    location_lng?: number | null;
  }) => {
    const lat = session.location_lat;
    const lng = session.location_lng;
    if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
      navigate(`/?sessionId=${encodeURIComponent(session.id)}`);
      return;
    }
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      zoom: "15",
      sessionId: session.id,
    });
    navigate(`/?${params.toString()}`);
  };

  // Long press handlers — open quick camera instead of selection mode
  const handleLongPressStart = (conversation: Conversation) => {
    const timer = setTimeout(() => {
      handleQuickCameraForConversation(conversation);
    }, 500); // 500ms long press to open camera
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

  const { inboxClubCount, inboxGroupCount, filteredAndSortedConversations } = useMemo(() => {
    const inboxClubCount = conversations.filter((c) => c.is_group && !!c.club_code).length;
    const inboxGroupCount = conversations.filter((c) => c.is_group && !c.club_code).length;

    const list = [...conversations]
      .filter((conv) => {
        if (messagesInboxSegment === "clubs") return !!(conv.is_group && conv.club_code);
        if (messagesInboxSegment === "groups") return !!(conv.is_group && !conv.club_code);
        return true;
      })
      .filter((conv) => {
        if (!conversationSearch.trim()) return true;
        const query = conversationSearch.toLowerCase();
        if (conv.is_group) {
          return (conv.group_name ?? "").toLowerCase().includes(query);
        }
        return (
          (conv.other_participant?.username ?? "").toLowerCase().includes(query) ||
          (conv.other_participant?.display_name ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aPinned = pinnedConversations.has(a.id);
        const bPinned = pinnedConversations.has(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return 0;
      });

    return { inboxClubCount, inboxGroupCount, filteredAndSortedConversations: list };
  }, [conversations, conversationSearch, pinnedConversations, messagesInboxSegment]);

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

  const confirmPinConversation = (conversation: Conversation) => {
    setConversationToPin(conversation);
    setShowPinDialog(true);
  };

  const applyPinConversation = () => {
    if (!conversationToPin) return;
    togglePinConversation(conversationToPin.id);
    setShowPinDialog(false);
    setConversationToPin(null);
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

    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "L’envoi de messages est désactivé.",
        variant: "destructive",
      });
      return;
    }

    const messageContent = newMessage.trim();
    const currentReplyTo = replyTo;

    broadcastStopTyping();
    
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
      broadcastStopTyping();
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

      console.log('File uploaded successfully, path:', filePath);

      // Send message with file attachment (store path, not public URL)
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: file.type.startsWith('image/') ? 'Image partagée' : 'Fichier partagé',
          file_url: filePath,
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

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          sender_id: user.id,
          content: '📸 Photo',
          file_url: filePath,
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
      broadcastStopTyping();
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

      console.log('🎤 Message vocal uploadé, path:', filePath);

      // Send message with voice attachment (store path, not public URL)
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: `Message vocal (${duration}s)`,
          file_url: filePath,
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

  // Indicateur « en train d’écrire » — même canal que l’écoute realtime + throttle
  const handleTyping = () => {
    if (!selectedConversation || !user) return;
    if (!typingBroadcastReadyRef.current || !typingBroadcastChannelRef.current) return;

    const now = Date.now();
    if (now - lastTypingSentAtRef.current < TYPING_THROTTLE_MS) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => broadcastStopTyping(), 2800);
      return;
    }
    lastTypingSentAtRef.current = now;

    const ch = typingBroadcastChannelRef.current;
    const username =
      typingDisplayNameRef.current ||
      (user.user_metadata?.username as string | undefined) ||
      user.email?.split("@")[0] ||
      "Utilisateur";

    void ch.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: user.id,
        username,
        timestamp: now,
      },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastStopTyping(), 2800);
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
      setConversationsHydrated(false);
      loadConversations();
    } else {
      setConversations([]);
      setConversationsHydrated(false);
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

    setTypingUsers({});

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
        if (status === 'SUBSCRIBED') {
          typingBroadcastChannelRef.current = typingChannel;
          typingBroadcastReadyRef.current = true;
        } else {
          typingBroadcastReadyRef.current = false;
        }
      });

    return () => {
      console.log('🔌 Cleaning up realtime channels');
      typingBroadcastChannelRef.current = null;
      typingBroadcastReadyRef.current = false;
      lastTypingSentAtRef.current = 0;
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

  // Deep link : /messages?conversation=<uuid> (push, partage, profil → DM encore sans message)
  useEffect(() => {
    if (!conversationParam || !user || !conversationsHydrated) return;

    const clearConversationParam = () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("conversation");
          return next;
        },
        { replace: true }
      );

    if (selectedConversation?.id === conversationParam) {
      clearConversationParam();
      return;
    }

    const conv = conversations.find((c) => c.id === conversationParam);
    if (conv) {
      setSelectedConversation(conv);
      void loadMessages(conv.id);
      void markMessagesAsReadOnOpen(conv.id);
      clearConversationParam();
      return;
    }

    let cancelled = false;
    const targetId = conversationParam;

    void (async () => {
      const { data: row, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", targetId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !row) {
        clearConversationParam();
        toast({
          title: "Conversation introuvable",
          description: "Elle n’est pas dans ta liste ou tu n’y as pas accès.",
          variant: "destructive",
        });
        return;
      }

      if (row.is_group) {
        clearConversationParam();
        toast({
          title: "Conversation introuvable",
          description: "Elle n’est pas dans ta liste ou tu n’y as pas accès.",
          variant: "destructive",
        });
        return;
      }

      if (row.participant_1 !== user.id && row.participant_2 !== user.id) {
        clearConversationParam();
        toast({
          title: "Conversation introuvable",
          description: "Elle n’est pas dans ta liste ou tu n’y as pas accès.",
          variant: "destructive",
        });
        return;
      }

      const otherParticipantId =
        row.participant_1 === user.id ? row.participant_2 : row.participant_1;

      const { data: profileArray } = await supabase.rpc("get_safe_public_profile", {
        profile_user_id: otherParticipantId,
      });

      if (cancelled) return;

      const profile =
        profileArray && profileArray.length > 0
          ? profileArray[0]
          : {
              user_id: otherParticipantId,
              username: "Utilisateur inconnu",
              display_name: "Utilisateur inconnu",
              avatar_url: null,
            };

      setSelectedConversation({
        ...row,
        other_participant: profile,
        unread_count: 0,
        last_message: undefined,
        last_message_date: row.updated_at,
      });
      void loadMessages(row.id);
      void markMessagesAsReadOnOpen(row.id);
      clearConversationParam();
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversationParam,
    user,
    conversations,
    conversationsHydrated,
    selectedConversation?.id,
    setSearchParams,
  ]);

  useEffect(() => {
    if (tabParam === "feed") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        return next;
      }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  useEffect(() => {
    if (isCommentsTab) return;
    if (tabParam === "search") {
      navigate("/search", { replace: true });
      return;
    }
    if (tabParam === "create-club") {
      setActiveRootTab("create-club");
      return;
    }
  }, [isCommentsTab, navigate, tabParam]);

  useEffect(() => {
    if (!user || !isCommentsTab) return;
    let cancelled = false;

    const loadPastSessions = async () => {
      setIsLoadingPastSessions(true);
      try {
        const { data: joinedRows, error: joinedError } = await supabase
          .from("session_participants")
          .select("session_id")
          .eq("user_id", user.id);

        if (joinedError) throw joinedError;

        const joinedIds = (joinedRows || [])
          .map((row) => row.session_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        const clauses = [`organizer_id.eq.${user.id}`];
        if (joinedIds.length > 0) {
          clauses.push(`id.in.(${Array.from(new Set(joinedIds)).join(",")})`);
        }

        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select("id,title,scheduled_at,location_name,activity_type")
          .lt("scheduled_at", new Date().toISOString())
          .or(clauses.join(","))
          .order("scheduled_at", { ascending: false })
          .limit(30);

        if (sessionsError) throw sessionsError;
        if (cancelled) return;

        const uniqueSessions = Array.from(
          new Map((sessionsData || []).map((session) => [session.id, session])).values()
        ) as PastSessionCommentTarget[];

        setPastSessions(uniqueSessions);
      } catch (error) {
        console.error("Error loading past sessions for comments:", error);
        if (!cancelled) {
          toast({
            title: "Erreur",
            description: "Impossible de charger vos séances passées.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingPastSessions(false);
      }
    };

    void loadPastSessions();
    return () => {
      cancelled = true;
    };
  }, [isCommentsTab, toast, user]);

  const submitSessionComment = useCallback(
    async (sessionId: string) => {
      if (!user) return;
      const content = commentsBySession[sessionId]?.trim();
      if (!content) return;

      setSubmittingSessionId(sessionId);
      try {
        const { error } = await supabase.from("session_comments").insert({
          session_id: sessionId,
          user_id: user.id,
          content,
        });
        if (error) throw error;

        setCommentsBySession((prev) => ({ ...prev, [sessionId]: "" }));
        toast({
          title: "Commentaire publié",
          description: "Ton commentaire a bien été ajouté à la séance.",
        });
      } catch (error) {
        console.error("Error posting session comment:", error);
        toast({
          title: "Erreur",
          description: "Le commentaire n'a pas pu être publié.",
          variant: "destructive",
        });
      } finally {
        setSubmittingSessionId(null);
      }
    },
    [commentsBySession, toast, user]
  );

  // Deep link : /messages?createClub=1 → même vue que l’onglet « Créer un club »
  useEffect(() => {
    if (searchParams.get("createClub") === "1") {
      setActiveRootTab("create-club");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("createClub");
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  /** Rendu hors panneaux à transform (swipe onglets) : z-index au-dessus de la tab bar (z-110). */
  const conversationDeleteDialogs = (
    <>
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setConversationToDelete(null);
        }}
      >
        <DialogContent className="max-w-md z-[150]" overlayClassName="z-[150]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              {(conversationToDelete || selectedConversation)?.is_group
                ? (conversationToDelete || selectedConversation)?.created_by === user?.id
                  ? `Êtes-vous sûr de vouloir supprimer définitivement le club "${(conversationToDelete || selectedConversation)?.group_name}" ? Cette action est irréversible.`
                  : `Êtes-vous sûr de vouloir quitter le club "${(conversationToDelete || selectedConversation)?.group_name}" ?`
                : `Êtes-vous sûr de vouloir supprimer cette conversation avec ${(conversationToDelete || selectedConversation)?.other_participant?.username || (conversationToDelete || selectedConversation)?.other_participant?.display_name} ? Tous les messages seront perdus.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-ios-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setConversationToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={deleteConversation}>
              {(conversationToDelete || selectedConversation)?.is_group &&
              (conversationToDelete || selectedConversation)?.created_by !== user?.id
                ? "Quitter"
                : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-md z-[150]" overlayClassName="z-[150]">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedConversations.size} conversation(s) ? Cette action
              est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-ios-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={bulkDeleteConversations}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPinDialog}
        onOpenChange={(open) => {
          setShowPinDialog(open);
          if (!open) setConversationToPin(null);
        }}
      >
        <DialogContent className="max-w-md z-[150]" overlayClassName="z-[150]">
          <DialogHeader>
            <DialogTitle>
              {conversationToPin && pinnedConversations.has(conversationToPin.id) ? "Confirmer le désépinglage" : "Confirmer l'épinglage"}
            </DialogTitle>
            <DialogDescription>
              {conversationToPin && pinnedConversations.has(conversationToPin.id)
                ? "Voulez-vous retirer cette conversation des conversations épinglées ?"
                : "Voulez-vous épingler cette conversation en haut de la liste ?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-ios-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPinDialog(false);
                setConversationToPin(null);
              }}
            >
              Annuler
            </Button>
            <Button onClick={applyPinConversation}>
              {conversationToPin && pinnedConversations.has(conversationToPin.id) ? "Désépingler" : "Épingler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (showNewConversation) {
    return (
      <>
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[125] flex items-center justify-center bg-[#f5f5f7] dark:bg-secondary" />
          }
        >
          <NewConversationView
            onBack={() => setShowNewConversation(false)}
            onStartConversation={startConversation}
            onCreateClub={() => {
              setShowNewConversation(false);
              openCreateClubTab();
            }}
            onAvatarClick={handleAvatarClick}
          />
        </Suspense>
        {conversationDeleteDialogs}
      </>
    );
  }

  if (selectedConversation && !isCommentsTab) {
    const isDirectMessage = !selectedConversation.is_group;
    
    return (
      <>
        <div
          className="flex min-h-0 flex-col overflow-hidden bg-[#f5f5f7] dark:bg-secondary"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 'var(--vvh, 100dvh)',
            overscrollBehavior: 'none',
            zIndex: 10,
          }}
        >
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
            <IosFixedPageHeaderShell
              className="min-h-0 flex-1"
              pinHeader={false}
              scrollRef={threadScrollRef}
              headerWrapperClassName="z-50 shrink-0 border-b border-[#e0e0e0] bg-white dark:border-border dark:bg-card"
              header={
                <>
                  <div
                    className="bg-white dark:bg-card"
                    style={{ height: "max(env(safe-area-inset-top, 0px), 12px)" }}
                    aria-hidden="true"
                  />
                {isDirectMessage ? (
                  <div className="flex items-center gap-2.5 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="h-9 w-9 shrink-0 rounded-full p-0 hover:bg-transparent dark:hover:bg-secondary"
                      aria-label="Retour"
                    >
                      <ChevronLeft className="h-4 w-4 text-[#1d1d1f] dark:text-foreground" strokeWidth={2.5} />
                    </Button>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowConversationInfo(true);
                      }}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={selectedConversation.other_participant?.avatar_url || ""} />
                        <AvatarFallback className="bg-[#f5f5f7] text-[13px] font-semibold text-[#1d1d1f] dark:bg-secondary dark:text-foreground">
                          {(selectedConversation.other_participant?.username ||
                            selectedConversation.other_participant?.display_name ||
                            "").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-bold leading-tight text-[15px] tracking-tight text-[#1d1d1f] dark:text-foreground"
                          style={{ fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif" }}
                        >
                          {selectedConversation.other_participant?.username ||
                            selectedConversation.other_participant?.display_name}
                        </p>
                        {selectedConversation.other_participant?.user_id && (
                          <OnlineStatus
                            userId={selectedConversation.other_participant.user_id}
                            display="subtitle"
                            className="mt-0.5"
                          />
                        )}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1d1d1f] dark:text-foreground"
                          aria-label="Plus d’options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-ios-lg border border-border bg-card shadow-lg"
                      >
                        <DropdownMenuItem
                          onClick={() => navigate(`/profile?user=${selectedConversation.other_participant?.user_id}`)}
                          className="py-ios-3"
                        >
                          <User className="mr-ios-3 h-4 w-4 text-primary" />
                          Voir le profil
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedConversation(null);
                            openCreateClubTab();
                          }}
                          className="py-ios-3"
                        >
                          <Users className="mr-ios-3 h-4 w-4 text-primary" />
                          Créer un groupe
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            if (!userNotifSettings.notifications_enabled) {
                              navigate("/profile");
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent("open-notification-settings"));
                              }, 500);
                              return;
                            }
                            const newMuted = !isMuted;
                            setIsMuted(newMuted);
                            if (user) {
                              supabase
                                .from("profiles")
                                .update({ notif_message: !newMuted })
                                .eq("user_id", user.id);
                            }
                          }}
                          className="justify-between py-ios-3"
                        >
                          <div className="flex items-center">
                            <span className="mr-ios-3 text-lg">
                              {!userNotifSettings.notifications_enabled ? "🔕" : isMuted ? "🔕" : "🔔"}
                            </span>
                            <span>Notifications</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {!userNotifSettings.notifications_enabled
                              ? "Désactivées"
                              : isMuted
                                ? "Off"
                                : "On"}
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => selectedConversation && togglePinConversation(selectedConversation.id)}
                          className="justify-between py-ios-3"
                        >
                          <div className="flex items-center">
                            <span className="mr-ios-3 text-lg">📌</span>
                            <span>Épingler</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {selectedConversation && pinnedConversations.has(selectedConversation.id) ? "Oui" : "Non"}
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => setThreadSearchOpen(true)}
                          className="py-ios-3"
                        >
                          <Search className="mr-ios-3 h-4 w-4 text-primary" />
                          Rechercher dans la conversation
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => confirmDeleteConversation()}
                          className="py-ios-3 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-ios-3 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedConversation(null)}
                      className="h-9 shrink-0 gap-1 px-0 font-normal text-primary hover:bg-transparent dark:hover:bg-secondary"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                      Retour
                    </Button>

                    <div className="min-w-0 flex flex-1 items-center justify-center">
                      <div
                        className="flex min-w-0 cursor-pointer flex-col items-center gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const clubData = selectedConversation;
                          setSelectedConversation(null);
                          setTimeout(() => {
                            setGroupInfoData(clubData);
                            setShowClubProfile(true);
                          }, 100);
                        }}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={selectedConversation.group_avatar_url || ""} />
                          <AvatarFallback className="border bg-border text-muted-foreground">
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex max-w-full items-center gap-1 px-1">
                          <p className="truncate font-semibold text-ios-footnote text-foreground">
                            {selectedConversation.group_name}
                          </p>
                          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className={cn(
                          "p-ios-2 text-primary",
                          threadSearchOpen && "rounded-ios-md bg-secondary"
                        )}
                        aria-label="Rechercher dans la conversation"
                        onClick={() => {
                          setThreadSearchOpen((o) => {
                            if (o) setThreadSearch("");
                            return !o;
                          });
                        }}
                      >
                        <Search className="h-5 w-5" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="shrink-0 p-ios-2 text-primary">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-ios-lg border border-border bg-card shadow-lg">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedConversation(null);
                              openCreateClubTab();
                            }}
                            className="py-ios-3"
                          >
                            <Users className="mr-ios-3 h-4 w-4 text-primary" />
                            Créer un groupe
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => {
                              if (!userNotifSettings.notifications_enabled) {
                                navigate("/profile");
                                setTimeout(() => {
                                  window.dispatchEvent(new CustomEvent("open-notification-settings"));
                                }, 500);
                                return;
                              }
                              const newMuted = !isMuted;
                              setIsMuted(newMuted);
                              if (user) {
                                supabase
                                  .from("profiles")
                                  .update({ notif_message: !newMuted })
                                  .eq("user_id", user.id);
                              }
                            }}
                            className="justify-between py-ios-3"
                          >
                            <div className="flex items-center">
                              <span className="mr-ios-3 text-lg">
                                {!userNotifSettings.notifications_enabled ? "🔕" : isMuted ? "🔕" : "🔔"}
                              </span>
                              <span>Notifications</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {!userNotifSettings.notifications_enabled
                                ? "Désactivées"
                                : isMuted
                                  ? "Off"
                                  : "On"}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => selectedConversation && togglePinConversation(selectedConversation.id)}
                            className="justify-between py-ios-3"
                          >
                            <div className="flex items-center">
                              <span className="mr-ios-3 text-lg">📌</span>
                              <span>Épingler</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {selectedConversation && pinnedConversations.has(selectedConversation.id) ? "Oui" : "Non"}
                            </span>
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => setThreadSearchOpen(true)} className="py-ios-3">
                            <Search className="mr-ios-3 h-4 w-4 text-primary" />
                            Rechercher dans la conversation
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => confirmDeleteConversation()}
                            className="py-ios-3 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-ios-3 h-4 w-4" />
                            {selectedConversation.created_by !== user?.id ? "Quitter le club" : "Supprimer"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
                </>
              }
            scrollClassName="overscroll-y-contain [-webkit-overflow-scrolling:touch]"
            footer={
              <div
                ref={composerRef}
                className={cn(
                  "keyboard-input-container z-40 mx-auto w-full max-w-md shrink-0 border-0 bg-transparent px-3 pt-1",
                  "dark:backdrop-blur-none"
                )}
                style={{
                  paddingBottom: "max(26px, env(safe-area-inset-bottom, 0px))",
                }}
              >
                {replyTo && (
                  <ReplyPreview
                    replyTo={replyTo}
                    onCancel={() => setReplyTo(null)}
                  />
                )}
                {showEmojiPicker && (
                  <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full mb-ios-2 left-1/2 transform -translate-x-1/2 z-[60] animate-scale-in"
                  >
                    <div className="bg-card rounded-ios-lg shadow-xl border border-border">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => {
                          setNewMessage((prev) => prev + emojiData.emoji);
                          setShowEmojiPicker(false);
                        }}
                      />
                    </div>
                  </div>
                )}
                {uploadProgress !== null && (
                  <div className="flex items-center gap-ios-2 px-ios-3 py-ios-2">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px] text-muted-foreground">{uploadProgress}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-[26px] border border-[#e0e0e0] bg-white py-1 pl-3 pr-1.5 dark:border-[#1f1f1f] dark:bg-[#1c1c1e]">
                  {!isRecording && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f] disabled:opacity-50 dark:bg-secondary dark:text-foreground"
                            disabled={isLoading}
                            type="button"
                            aria-label="Pièces jointes"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.25} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuItem
                            onClick={() => fileInputRef.current?.click()}
                            className="py-ios-3"
                          >
                            <Paperclip className="h-4 w-4 mr-ios-3 text-[#0066cc]" />
                            Document
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const file = await takePicture();
                                if (file) uploadFile(file);
                              } catch (error) {
                                toast({
                                  title: "Erreur",
                                  description: "Impossible d'accéder à la caméra",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="py-ios-3"
                          >
                            <Camera className="h-4 w-4 mr-ios-3 text-[#0066cc]" />
                            Caméra
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
                            className="py-ios-3"
                          >
                            <Image className="h-4 w-4 mr-ios-3 text-[#0066cc]" />
                            Photo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="py-ios-3"
                          >
                            <Smile className="h-4 w-4 mr-ios-3 text-[#0066cc]" />
                            Emoji
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTimeout(() => setShowCreatePoll(true), 300);
                            }}
                            className="py-ios-3"
                          >
                            <BarChart3 className="h-4 w-4 mr-ios-3 text-[#0066cc]" />
                            Sondage
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                      <input
                        type="text"
                        enterKeyHint="send"
                        autoComplete="off"
                        placeholder="Message…"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          handleTyping();
                        }}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        className="min-w-0 flex-1 bg-transparent py-2 text-[14px] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a] dark:text-foreground dark:placeholder:text-muted-foreground"
                        disabled={isLoading}
                      />
                      {newMessage.trim() ? (
                        <button
                          type="button"
                          onClick={sendMessage}
                          disabled={loading || !newMessage.trim()}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-white disabled:opacity-50 dark:bg-primary"
                          aria-label="Envoyer"
                        >
                          <Send className="h-[18px] w-[18px]" strokeWidth={2} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleVoiceRecording}
                          disabled={loading}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-white dark:bg-primary"
                          aria-label="Message vocal"
                        >
                          <Mic className="h-[18px] w-[18px]" strokeWidth={2.25} />
                        </button>
                      )}
                    </>
                  )}
                  {isRecording && (
                    <div className="flex w-full min-w-0 flex-1 items-center gap-ios-3 px-1">
                      <div className="flex min-w-0 flex-1 items-center gap-ios-2 rounded-full border border-destructive/30 bg-destructive/10 px-ios-4 py-ios-2">
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
            }
          >
            {threadSearchOpen && (
              <div className="shrink-0 border-b border-[#e0e0e0] bg-white px-4 py-2 dark:border-border dark:bg-card">
                <div className="flex items-center gap-2">
                  <div className="apple-search min-h-9 min-w-0 flex-1 gap-1.5 px-2 py-0">
                    <Search
                      className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <input
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      placeholder="Rechercher dans la conversation…"
                      className="min-h-9 min-w-0 flex-1 border-0 bg-transparent py-1 text-[17px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
                      autoFocus
                      autoCorrect="off"
                      autoCapitalize="none"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setThreadSearch("");
                      setThreadSearchOpen(false);
                    }}
                    aria-label="Fermer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {threadSearch.trim() && (
                  <p className="mt-ios-2 text-ios-caption1 text-muted-foreground">
                    {visibleMessages.length} message{visibleMessages.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
            <div
              className="flex flex-1 flex-col gap-2 bg-[#f5f5f7] px-4 pb-2 pt-2 dark:bg-secondary"
              style={{ paddingBottom: composerHeight + 8 }}
            >
              {visibleMessages.map((message, index) => {
                const isOwnMessage = message.sender_id === user?.id;
                const previousMessage = index > 0 ? visibleMessages[index - 1] : null;
                const showHeader = shouldShowSectionHeader(message, previousMessage);
                const showIndividualTime = visibleTimestamps.has(message.id);
                
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
                
                // System message rendering
                if (message.message_type === 'system') {
                  return (
                    <div key={message.id}>
                      {showHeader && (
                        <MessageSectionHeader timestamp={message.created_at} />
                      )}
                      <div className="text-center py-ios-2">
                        <span className="text-xs text-muted-foreground italic">
                          {message.sender?.username || message.sender?.display_name || ''} {message.content}
                        </span>
                      </div>
                    </div>
                  );
                }
                
                const sessionShareOnly =
                  message.message_type === "session" &&
                  !!message.session &&
                  !message.deleted_at &&
                  !message.reply_to &&
                  !(message.content && message.content.trim().length > 0);

                return (
                  <div key={message.id}>
                    {showHeader && (
                      <MessageSectionHeader timestamp={message.created_at} />
                    )}
                    
                    <div
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} py-1`}
                      onClick={toggleTimestamp}
                    >
                      <div className={`relative max-w-[78%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        {/* Show sender info only for groups, not for DMs (iMessage style) */}
                        {shouldShowSenderInfo && (
                          <div className="flex items-center gap-ios-2 mb-ios-1 ml-ios-1">
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
                            <SignedImage 
                              fileUrl={message.file_url} 
                              className="h-auto max-w-full rounded-[18px]"
                              style={{ maxHeight: '240px' }}
                            />
                          )}
                          
                          {/* Emoji-only messages - Large display without bubble */}
                          {message.content && !message.deleted_at && isOnlyEmojis(message.content) && !message.message_type && !message.file_url && (
                            <div className="py-ios-1">
                              <p className="text-[42px] leading-tight">{message.content}</p>
                            </div>
                          )}

                          {/* Bulles — maquette RC #18 */}
                          {(message.message_type === 'session' || message.message_type === 'coaching_session' || 
                            (message.file_url && !message.file_type?.startsWith('image/')) ||
                            (message.content && !message.content.match(/^(Image partagée)$/i) && !isOnlyEmojis(message.content)) ||
                            message.deleted_at ||
                            message.reply_to) && (
                            <div
                              className={cn(
                                !sessionShareOnly &&
                                  "rounded-[18px] px-[14px] py-[10px] text-[14px] leading-[1.4] tracking-normal",
                                !sessionShareOnly &&
                                  (isOwnMessage
                                    ? "rounded-br-[6px] bg-[#1d1d1f] text-white dark:bg-primary dark:text-primary-foreground"
                                    : "rounded-bl-[6px] border border-[#e0e0e0] bg-white text-[#1d1d1f] dark:border-[#1f1f1f] dark:bg-[#2c2c2e] dark:text-foreground"),
                                sessionShareOnly &&
                                  "max-w-[min(240px,78vw)] rounded-[18px] border-0 bg-transparent p-0 text-[#1d1d1f] dark:bg-transparent dark:text-foreground"
                              )}
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
                                <p className="text-[14px] italic leading-[1.4] text-muted-foreground">Message supprimé</p>
                              ) : (
                                <>
                                  {/* Poll Card */}
                                  {message.message_type === 'poll' && message.content && (
                                    <div className="mb-ios-2">
                                      <PollCard pollId={message.content} />
                                    </div>
                                  )}

                                  {/* Coaching session card */}
                                  {message.message_type === 'coaching_session' && message.content && (
                                    <div className="mb-ios-2">
                                      <CoachingMessageCard
                                        coachingSessionId={message.content}
                                        currentUserId={user?.id || ""}
                                      />
                                    </div>
                                  )}

                                  {/* Partage séance — carte maquette 18 */}
                                  {message.message_type === 'session' && message.session && (() => {
                                    const act = (message.session!.activity_type ?? "").toLowerCase();
                                    const emoji = getActivityEmoji(message.session!.activity_type ?? "");
                                    const sportWord =
                                      act.includes("velo") || act.includes("vtt") || act.includes("bike") || act.includes("cycl") || act.includes("gravel")
                                        ? "Vélo"
                                        : act.includes("nat") || act.includes("swim") || act.includes("kayak") || act.includes("surf")
                                          ? "Natation"
                                          : act.includes("trail") || act.includes("rando") || act.includes("marche") || act.includes("walk") || act.includes("hike")
                                            ? "Marche · trail"
                                            : "Course";
                                    const sched = message.session.scheduled_at
                                      ? new Date(message.session.scheduled_at)
                                      : null;
                                    const whenLabel =
                                      sched && isValid(sched)
                                        ? format(sched, "EEEE · HH:mm", { locale: fr }).replace(
                                            /^./,
                                            (ch) => ch.toUpperCase()
                                          )
                                        : "—";
                                    return (
                                    <div
                                      className="mb-ios-2 w-full max-w-[240px] cursor-pointer overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white active:scale-[0.98] dark:border-[#1f1f1f] dark:bg-[#2c2c2e]"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSessionClick(message.session);
                                      }}
                                    >
                                      <div className="relative h-20 shrink-0 overflow-hidden bg-[#f5f5f7] dark:bg-muted">
                                        {/* mini « carte » + tracé type maquette */}
                                        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 240 80">
                                          <path
                                            d="M20 50 Q60 30 110 42 T216 34"
                                            fill="none"
                                            stroke="#0066cc"
                                            strokeLinecap="round"
                                            strokeWidth="2"
                                          />
                                        </svg>
                                        <div className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#1d1d1f] dark:bg-card dark:text-foreground">
                                          {emoji} {sportWord}
                                        </div>
                                      </div>
                                      <div className="px-3 py-3">
                                        <div
                                          className="truncate font-bold leading-tight text-[14px] text-[#1d1d1f] dark:text-foreground"
                                          style={{ fontFamily: "Inter Tight, ui-sans-serif, system-ui, sans-serif" }}
                                        >
                                          {message.session.title}
                                        </div>
                                        <div className="mt-0.5 text-[11px] font-normal leading-snug text-[#7a7a7a] dark:text-muted-foreground">
                                          {whenLabel}
                                          {message.session.location_name
                                            ? ` · ${message.session.location_name}`
                                            : ""}
                                        </div>
                                        <div
                                          className="mt-2 flex h-8 w-full cursor-pointer select-none items-center justify-center rounded-lg bg-[#0066cc] text-[12px] font-bold text-white dark:bg-primary"
                                          role="presentation"
                                        >
                                          Rejoindre
                                        </div>
                                      </div>
                                    </div>
                                    );
                                  })()}

                                  {/* Non-image file attachments (audio, files) */}
                                  {message.file_url && !message.file_type?.startsWith('image/') && (
                                    <div className="mb-ios-2">
                                       {message.message_type === 'voice' || message.file_type?.startsWith('audio/') ? (
                                         <VoiceMessagePlayer src={message.file_url!} isMine={message.sender_id === user?.id} />
                                      ) : (
                                        <div className="flex items-center gap-ios-2 p-ios-2 bg-muted/50 rounded">
                                          <Paperclip className="h-4 w-4" />
                                          <span className="text-sm truncate">{message.file_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Show text content only if it's not a media-only message and not emoji-only */}
                                  {message.content && !message.content.match(/^(Image partagée|Message vocal.*)/i) && !isOnlyEmojis(message.content) && (
                                    <p className="text-[14px] leading-[1.4]">{message.content}</p>
                                  )}
                                </>
                              )}
                          
                              {/* Read status for own messages inside bubble */}
                              {isOwnMessage &&
                                !sessionShareOnly &&
                                (message.content || message.message_type === 'session' || (message.file_url && !message.file_type?.startsWith('image/'))) && (
                                  <div
                                    className={`mt-1 flex justify-end ${
                                      isOwnMessage
                                        ? "text-white/60 dark:text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center">
                                      {message.read_at ? (
                                        <CheckCheck className="h-3 w-3 text-[#5AC8FA]" />
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
              {Object.entries(typingUsers).map(([userId]) => (
                <TypingIndicator key={userId} isTyping={true} variant="caption" />
              ))}
              
              <div ref={messagesEndRef} />
            </div>
          </IosFixedPageHeaderShell>

        </div>
      </div>
      {conversationDeleteDialogs}
      {/* Delete message confirmation dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => { if (!open) setMessageToDelete(null); }}>
        <AlertDialogContent className="z-[160]" overlayClassName="z-[160]">
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
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* Conversation Info Sheet */}
      <Suspense fallback={null}>
        <ConversationInfoSheet
          isOpen={showConversationInfo}
          onClose={() => setShowConversationInfo(false)}
          conversation={selectedConversation}
          isMuted={isMuted}
          onToggleMute={() => {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            if (user) {
              supabase.from('profiles').update({ notif_message: !newMuted }).eq('user_id', user.id);
            }
          }}
          isPinned={selectedConversation ? pinnedConversations.has(selectedConversation.id) : false}
          onTogglePin={() => selectedConversation && togglePinConversation(selectedConversation.id)}
          onDelete={() => confirmDeleteConversation()}
          notificationsEnabled={userNotifSettings.notifications_enabled}
          onGoToNotifSettings={() => {
            navigate('/profile');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-notification-settings'));
            }, 500);
          }}
        />
      </Suspense>
      </>
    );
  }

  if (isCommentsTab) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background" data-tutorial="tutorial-messages-comments">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          contentTopOffsetPx={0}
          headerWrapperClassName="z-50"
          header={
            <MainTopHeader
              title="Mes séances"
              disableScrollCollapse
              tabsAriaLabel="Navigation Mes séances"
              tabs={[
                { id: "list", label: "Liste", active: false, onClick: () => navigate("/my-sessions") },
                { id: "create", label: "Création", active: false, onClick: () => navigate("/my-sessions") },
                { id: "comment", label: "Commentaire", active: true },
              ]}
            />
          }
        >
          <div className="ios-scroll-region min-h-0 flex-1 overflow-y-auto bg-background px-ios-4 pb-ios-6 pt-ios-3">
            {isLoadingPastSessions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="ios-card animate-pulse px-ios-3 py-ios-3">
                    <div className="mb-2 h-4 w-2/3 rounded bg-secondary" />
                    <div className="mb-3 h-3 w-1/2 rounded bg-secondary" />
                    <div className="h-20 w-full rounded bg-secondary" />
                  </div>
                ))}
              </div>
            ) : pastSessions.length === 0 ? (
              <div className={emptyStateSx.shell}>
                <div className={emptyStateSx.iconCircle}>
                  <MessageCircle className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className={emptyStateSx.textBlock}>
                  <h3 className="text-ios-title3 font-semibold text-foreground">Aucune séance passée</h3>
                  <p className="max-w-xs text-ios-subheadline leading-relaxed text-muted-foreground">
                    Reviens ici après tes prochaines séances pour laisser un commentaire.
                  </p>
                </div>
              </div>
            ) : (
              <div className="ios-list-stack">
                {pastSessions.map((session) => {
                  const draft = commentsBySession[session.id] || "";
                  const disabled = submittingSessionId === session.id || !draft.trim();
                  return (
                    <div key={session.id} className="ios-card space-y-3 px-ios-3 py-ios-3">
                      <div>
                        <h3 className="truncate text-ios-headline font-semibold text-foreground">{session.title}</h3>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {format(new Date(session.scheduled_at), "EEE d MMM • HH:mm", { locale: fr })}
                          {session.location_name ? ` • ${session.location_name}` : ""}
                        </p>
                      </div>

                      <textarea
                        value={draft}
                        onChange={(event) =>
                          setCommentsBySession((prev) => ({ ...prev, [session.id]: event.target.value }))
                        }
                        placeholder="Écrire un commentaire sur cette séance..."
                        className="min-h-[92px] w-full resize-none rounded-[14px] border border-border bg-card px-3 py-2 text-[15px] outline-none transition-colors focus:border-primary"
                        maxLength={800}
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">{draft.length}/800</span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => submitSessionComment(session.id)}
                          disabled={disabled}
                          className="gap-1.5"
                        >
                          <Send className="h-4 w-4" />
                          Publier
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </IosFixedPageHeaderShell>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden",
          activeRootTab === "conversations" ? "apple-grouped-bg" : "bg-background"
        )}
        data-tutorial="tutorial-messages"
      >
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          contentScroll={activeRootTab !== "conversations"}
          pinHeader={activeRootTab === "conversations"}
          /** Même logique que le coaching : épinglé seulement sous WebKit iOS (clavier), pas sur desktop. */
          forcePin={false}
          contentTopOffsetPx={0}
          headerWrapperClassName="z-50 apple-grouped-bg"
          header={
            activeRootTab === "create-club" ? (
              <MainTopHeader
                title="Créer un club"
                disableScrollCollapse
                left={
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRootTab("conversations");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete("tab");
                        return next;
                      }, { replace: true });
                    }}
                    className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full active:scale-95"
                    aria-label="Retour aux messages"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                }
              />
            ) : (
              <div>
                <div onClick={() => isInboxSearchMode && setIsInboxSearchMode(false)}>
                  <MainTopHeader
                    title="Messages"
                    disableScrollCollapse
                    className="apple-grouped-bg"
                    largeTitleRight={
                      <div className="flex items-center text-primary">
                        <button
                          type="button"
                          onClick={() => setMessagesComposeSheetOpen(true)}
                          className="tap-highlight-none flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full active:bg-black/[0.04] dark:active:bg-white/[0.06]"
                          aria-label="Nouvelle conversation, club ou groupe"
                          aria-expanded={messagesComposeSheetOpen}
                          aria-haspopup="dialog"
                        >
                          <Plus className="h-[23px] w-[23px]" strokeWidth={2.5} />
                        </button>
                        <Sheet open={messagesComposeSheetOpen} onOpenChange={setMessagesComposeSheetOpen}>
                          <SheetContent
                            side="bottom"
                            overlayClassName="z-[130]"
                            className={cn(
                              "z-[130] max-h-[85dvh] gap-0 rounded-t-[14px] border-t border-[#e0e0e0] bg-card p-0",
                              "pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                            )}
                            showCloseButton={false}
                          >
                            <SheetHeader className="border-b border-[#e0e0e0] px-5 py-4 text-left">
                              <SheetTitle className="text-[17px] font-semibold tracking-[-0.37px] text-foreground">
                                Nouveau
                              </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col px-2 py-2">
                              <button
                                type="button"
                                className="flex min-h-[48px] w-full items-center gap-3 rounded-ios-md px-4 py-3 text-left active:bg-muted"
                                data-no-tab-swipe="true"
                                onClick={() => openNewConversationView()}
                              >
                                <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
                                <span className="text-[17px] font-normal leading-snug tracking-[-0.37px] text-foreground">
                                  Nouvelle conversation
                                </span>
                              </button>
                              <button
                                type="button"
                                className="flex min-h-[48px] w-full items-center gap-3 rounded-ios-md px-4 py-3 text-left active:bg-muted"
                                data-no-tab-swipe="true"
                                onClick={() => openCreateClubTab()}
                              >
                                <Users className="h-5 w-5 shrink-0 text-primary" />
                                <span className="text-[17px] font-normal leading-snug tracking-[-0.37px] text-foreground">
                                  Créer un club
                                </span>
                              </button>
                              <button
                                type="button"
                                className="flex min-h-[48px] w-full items-center gap-3 rounded-ios-md px-4 py-3 text-left active:bg-muted"
                                data-no-tab-swipe="true"
                                onClick={() => openCreateClubTab()}
                              >
                                <UserPlus className="h-5 w-5 shrink-0 text-primary" />
                                <span className="text-[17px] font-normal leading-snug tracking-[-0.37px] text-foreground">
                                  Créer un groupe
                                </span>
                              </button>
                            </div>
                            <div className="px-4 pb-2">
                              <button
                                type="button"
                                className="tap-highlight-none flex min-h-[48px] w-full items-center justify-center rounded-full border border-[#e0e0e0] bg-transparent px-4 text-[17px] font-medium text-foreground active:bg-muted"
                                data-no-tab-swipe="true"
                                onClick={() => setMessagesComposeSheetOpen(false)}
                              >
                                Annuler
                              </button>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    }
                  />
                </div>

                <div className="mt-3 px-5 py-1">
                  <div className="apple-search min-h-9 w-full gap-1.5 px-2 py-0">
                    <Search
                      className="pointer-events-none h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <input
                      value={conversationSearch}
                      onChange={(e) => setConversationSearch(e.target.value)}
                      onFocus={() => setIsInboxSearchMode(true)}
                      placeholder="Rechercher amis · clubs · groupes"
                      className="min-h-9 min-w-0 flex-1 border-0 bg-transparent py-1 text-[17px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
                      aria-label="Rechercher une conversation"
                      autoCorrect="off"
                      autoCapitalize="none"
                    />
                  </div>
                </div>

                {!isInboxSearchMode && (
                  <>
                    <div className="mt-2.5">
                      <SessionStoriesStrip
                        currentUserId={user?.id ?? null}
                        refreshToken={storiesRefreshToken}
                        onOpenStory={(authorId) => setStoryAuthorId(authorId)}
                        onCreateStory={() => navigate("/stories/create")}
                        className="border-0 bg-transparent"
                      />
                    </div>

                    <div
                      role="tablist"
                      aria-label="Filtrer les conversations"
                      className="mt-3.5 flex min-h-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {(
                        [
                          { id: "all" as const, label: "Conversations" },
                          { id: "clubs" as const, label: `Clubs · ${inboxClubCount}` },
                          { id: "groups" as const, label: `Groupes · ${inboxGroupCount}` },
                        ] as const
                      ).map((chip) => {
                        const active = messagesInboxSegment === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setMessagesInboxSegment(chip.id)}
                            className={cn(
                              "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold tracking-[-0.1px] transition-[transform,opacity] active:scale-[0.98]",
                              active
                                ? "border-[#0066cc] bg-[#0066cc] text-white shadow-none"
                                : "border-[#0066cc] bg-white text-[#0066cc]"
                            )}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          }
        >
        <div
          className={cn(
            "min-h-0 flex flex-1 flex-col pb-ios-2",
            activeRootTab === "create-club"
              ? "bg-secondary pt-2.5"
              : "apple-grouped-bg"
          )}
        >
          {activeRootTab === "conversations" ? (
            <>
              {isInboxSearchMode ? (
                <div className="mx-4 mt-3.5 min-h-[280px] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-card dark:border-border">
                  <SearchTabs activeTab={messageDiscoveryTab} onTabChange={setMessageDiscoveryTab} />
                  <div className="min-w-0">
                    {messageDiscoveryTab === "profiles" && <ProfilesTab searchQuery={conversationSearch} />}
                    {messageDiscoveryTab === "clubs" && <ClubsTab searchQuery={conversationSearch} />}
                    {messageDiscoveryTab === "strava" && <StravaTab searchQuery={conversationSearch} />}
                    {messageDiscoveryTab === "contacts" && <ContactsTab searchQuery={conversationSearch} />}
                  </div>
                </div>
              ) : (
                /* Liste — carte blanche arrondie (maquette 17) : overflow-hidden pour que les coins 18px restent visibles */
                <div
                  className={cn(
                    "mx-4 mt-3.5 min-h-[280px] overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-card pb-ios-4 dark:border-border",
                    filteredAndSortedConversations.length > 0 && "divide-y divide-border"
                  )}
                >
                  {conversations.length === 0 ? (
                    <div className={emptyStateSx.shell}>
                      <div className={emptyStateSx.iconCircle}>
                        <MessageCircle className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div className={emptyStateSx.textBlock}>
                        <h3 className="text-ios-title3 font-semibold text-foreground">
                          Aucune conversation
                        </h3>
                        <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed">
                          Envoyez un message à un ami ou créez un club pour commencer à échanger.
                        </p>
                      </div>
                      <Button
                        onClick={() => openNewConversationView()}
                        className="w-full max-w-xs"
                      >
                        <Plus className="h-5 w-5 mr-ios-2" />
                        Nouvelle conversation
                      </Button>
                    </div>
                  ) : filteredAndSortedConversations.length === 0 ? (
                    <div className={cn(emptyStateSx.shell, "py-ios-8")}>
                      <div className={emptyStateSx.textBlock}>
                        <h3 className="text-ios-title3 font-semibold text-foreground">
                          Aucun fil à afficher
                        </h3>
                        <p className="text-ios-subheadline text-muted-foreground max-w-xs leading-relaxed">
                          Aucune conversation ne correspond à ce filtre ou à ta recherche.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="sm:mx-auto sm:max-w-2xl">
                      {filteredAndSortedConversations.map((conversation) => {
                      const when = formatConversationListTime(
                        conversation.last_message_date || conversation.updated_at
                      );
                      const unread = conversation.unread_count > 0;
                      const isClub = !!(conversation.is_group && conversation.club_code);
                      const isGrp = !!(conversation.is_group && !conversation.club_code);
                      return (
                      <SwipeableConversationItem
                        key={conversation.id}
                        isPinned={pinnedConversations.has(conversation.id)}
                        disabled={isSelectionMode}
                        onSwipeLeft={() => {
                          setConversationToDelete(conversation);
                          confirmDeleteConversation(conversation);
                        }}
                        onSwipeRight={() => confirmPinConversation(conversation)}
                      >
                        <div
                          className={cn(
                            "relative flex items-center gap-3 bg-card px-5 py-3",
                            selectedConversations.has(conversation.id) && "bg-primary/5"
                          )}
                          onTouchStart={() => !isSelectionMode && handleLongPressStart(conversation)}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setConversationToDelete(conversation);
                            confirmDeleteConversation(conversation);
                          }}
                        >
                          <button
                            type="button"
                            className="relative shrink-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isSelectionMode) {
                                toggleConversationSelection(conversation.id);
                              }
                            }}
                            aria-label={
                              isSelectionMode
                                ? selectedConversations.has(conversation.id)
                                  ? "Désélectionner la conversation"
                                  : "Sélectionner la conversation"
                                : "Avatar"
                            }
                          >
                            {isSelectionMode && selectedConversations.has(conversation.id) ? (
                              <div className="flex h-[50px] w-[50px] min-h-[50px] min-w-[50px] items-center justify-center rounded-full border-2 border-primary bg-primary">
                                <Check className="h-5 w-5 text-primary-foreground" />
                              </div>
                            ) : (
                              <Avatar className="avatar-fixed aspect-square h-[50px] w-[50px] min-h-[50px] min-w-[50px]">
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
                            )}
                            {!conversation.is_group && (!isSelectionMode || !selectedConversations.has(conversation.id)) && (
                              <OnlineStatus userId={conversation.other_participant?.user_id || ""} />
                            )}
                            {(isClub || isGrp) && (!isSelectionMode || !selectedConversations.has(conversation.id)) && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-card text-[10px]"
                                aria-hidden
                              >
                                {isClub ? "🏛" : "👥"}
                              </div>
                            )}
                          </button>

                          <div
                            className="min-w-0 flex-1"
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
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                {pinnedConversations.has(conversation.id) ? (
                                  <span className="flex-shrink-0 text-[12px]" aria-hidden>
                                    📌
                                  </span>
                                ) : null}
                                <p className="truncate font-display text-[15px] font-bold text-foreground">
                                  {conversation.is_group
                                    ? conversation.group_name
                                    : conversation.other_participant?.username || "Utilisateur"}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 text-[11px] tabular-nums",
                                  unread
                                    ? "font-bold text-primary"
                                    : "font-medium text-muted-foreground"
                                )}
                              >
                                {when}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  "min-w-0 truncate text-[13px] text-muted-foreground",
                                  unread && "font-medium text-foreground/90"
                                )}
                              >
                                {conversation.last_message ? (
                                  <>
                                    {conversation.last_message.message_type === "image" && (
                                      <span className="inline-flex items-center gap-ios-2">
                                        {conversation.last_message.file_url ? (
                                          <SignedImage
                                            fileUrl={conversation.last_message.file_url}
                                            className="inline-block h-4 w-4 rounded-ios-sm object-cover"
                                          />
                                        ) : null}
                                        Photo
                                      </span>
                                    )}
                                    {conversation.last_message.message_type === "file" && "Fichier"}
                                    {conversation.last_message.message_type === "voice" && "Message vocal"}
                                    {conversation.last_message.message_type === "session" && "Session partagée"}
                                    {conversation.last_message.message_type === "poll" && "📊 Sondage"}
                                    {conversation.last_message.message_type === "coaching_session" && "🎓 Séance coach"}
                                    {conversation.last_message.message_type === "system" && (
                                      <span className="italic">{conversation.last_message.content}</span>
                                    )}
                                    {(!conversation.last_message.message_type ||
                                      conversation.last_message.message_type === "text") &&
                                      (conversation.last_message.content?.length > 40
                                        ? `${conversation.last_message.content.substring(0, 40)}…`
                                        : conversation.last_message.content || "Message supprimé")}
                                  </>
                                ) : conversation.is_group ? (
                                  `${conversation.group_members?.length || 0} membre${(conversation.group_members?.length || 0) > 1 ? "s" : ""}`
                                ) : (
                                  "Aucun message"
                                )}
                              </p>
                              {unread ? (
                                conversation.unread_count === 1 ? (
                                  <span
                                    className="mx-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                                    aria-label="Non lu"
                                  />
                                ) : (
                                  <div className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5">
                                    <span className="text-[11px] font-bold text-primary-foreground">
                                      {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                                    </span>
                                  </div>
                                )
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </SwipeableConversationItem>
                      );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <Suspense fallback={<div className="min-h-[50vh] bg-secondary" />}>
              <CreateClubFormPanel
                active={activeRootTab === "create-club"}
                onSuccess={() => {
                  void loadConversations();
                  setActiveRootTab("conversations");
                }}
              />
            </Suspense>
          )}
        </div>
        </IosFixedPageHeaderShell>

        {/* Club Info Dialog */}
        <Suspense fallback={null}>
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
        </Suspense>

        {/* Club Profile Dialog - for all members */}
        <Suspense fallback={null}>
          <ClubProfileDialog
            isOpen={showClubProfile}
            onClose={() => {
              setShowClubProfile(false);
              setGroupInfoData(null);
            }}
            conversationId={groupInfoData?.id || ''}
            groupName={groupInfoData?.group_name || ""}
            groupDescription={groupInfoData?.group_description || null}
            groupAvatarUrl={groupInfoData?.group_avatar_url || null}
            clubCode={groupInfoData?.club_code || ""}
            createdBy={groupInfoData?.created_by || ""}
            createdAt={groupInfoData?.created_at || ""}
            isAdmin={groupInfoData?.created_by === user?.id}
            isClub={!!groupInfoData?.club_code}
            isMuted={isMuted}
            onToggleMute={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              if (user) {
                supabase.from('profiles').update({ notif_message: !newMuted }).eq('user_id', user.id);
              }
            }}
            onClubLeftOrDeleted={() => {
              const id = groupInfoData?.id;
              if (id) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                if (selectedConversation?.id === id) {
                  setSelectedConversation(null);
                }
              }
              setGroupInfoData(null);
              void loadConversations();
            }}
            onOpenManageClubInCoaching={() => {
              const id = groupInfoData?.id;
              if (!id || !groupInfoData?.club_code) return;
              setShowClubProfile(false);
              navigate("/coaching", { state: { coachingClubManage: { clubId: id } } });
            }}
            onEditClub={() => {
              setShowClubProfile(false);
              setTimeout(() => setShowEditGroup(true), 0);
            }}
            groupsCount={0}
          />
        </Suspense>
        
        {/* Debug info removed - functionality should work now */}

        {/* Edit Club Dialog - available globally */}
        <Suspense fallback={null}>
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
        </Suspense>

        {/* Contacts Dialog */}
        <Suspense fallback={null}>
          <ContactsDialog
            open={showContactsDialog}
            onClose={() => setShowContactsDialog(false)}
          />
        </Suspense>

        {/* Avatar Viewer */}
        <Suspense fallback={null}>
          <AvatarViewer
            open={showAvatarViewer}
            onClose={() => setShowAvatarViewer(false)}
            avatarUrl={selectedAvatarData?.url || null}
            username={selectedAvatarData?.username || "Utilisateur"}
          />
        </Suspense>

        <SessionStoryDialog
          open={!!storyAuthorId}
          onOpenChange={(open) => {
            if (!open) setStoryAuthorId(null);
          }}
          authorId={storyAuthorId}
          viewerUserId={user?.id ?? null}
        />

        {conversationDeleteDialogs}
      </div>

    </>
  );
};

export default Messages;
