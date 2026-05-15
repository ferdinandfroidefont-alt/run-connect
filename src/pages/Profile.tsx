import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropEditor } from "@/components/ImageCropEditor";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";

import { ReportUserDialog } from "@/components/ReportUserDialog";

import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import { QRShareDialog } from "@/components/QRShareDialog";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
import { ProfileSelfMaquetteLayout } from "@/components/profile/ProfileSelfMaquetteLayout";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import type {
  ProfileMaquetteNextSession,
  ProfileMaquetteParticipantChip,
} from "@/components/profile/ProfileSelfMaquetteLayout";
import { SessionDetailsDialog } from "@/components/SessionDetailsDialog";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";
const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);
interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url?: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
  favorite_sport?: string | null;
  country?: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  notifications_enabled?: boolean;
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
  running_records?: any;
  cycling_records?: any;
  swimming_records?: any;
  triathlon_records?: any;
  walking_records?: any;
  strava_connected?: boolean;
  strava_verified_at?: string;
  strava_user_id?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
}
interface ProfileStoryHighlight {
  id: string;
  story_id: string;
  title: string;
  position: number;
}

const SESSION_DASHBOARD_SELECT =
  "id, title, scheduled_at, activity_type, location_name, location_lat, location_lng, current_participants, max_participants, organizer_id, description, distance_km, pace_general, session_blocks, intensity, created_at";

function profileChipInitials(displayName: string | null, username: string | null) {
  const source = (displayName || username || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
const Profile = () => {
  const { user } = useAuth();
  

  const {
    userProfile: globalProfile,
    refreshProfile: refreshGlobalProfile
  } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    userId: urlUserId
  } = useParams();
  const viewingUserId = urlUserId || searchParams.get('user'); // ID de l'utilisateur à voir via URL ou query param
  const isViewingOtherUser = viewingUserId && viewingUserId !== user?.id;
  const {
    shareProfile,
    showProfileShare,
    setShowProfileShare,
    showQRDialog,
    setShowQRDialog,
    qrData,
  } = useShareProfile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [originalImageSrc, setOriginalImageSrc] = useState<string>("");
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followDialogType, setFollowDialogType] = useState<'followers' | 'following'>('followers');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [commonClubs, setCommonClubs] = useState<any[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reliabilityRate, setReliabilityRate] = useState(100);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [totalSessionsAbsent, setTotalSessionsAbsent] = useState(0);
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
  const [storyHighlights, setStoryHighlights] = useState<ProfileStoryHighlight[]>([]);
  const [highlightPreviewByStoryId, setHighlightPreviewByStoryId] = useState<Record<string, string>>({});
  const [selectedHighlightStoryId, setSelectedHighlightStoryId] = useState<string | null>(null);
  const [dashNextSummary, setDashNextSummary] = useState<ProfileMaquetteNextSession | null>(null);
  const [dashNextRaw, setDashNextRaw] = useState<Record<string, unknown> | null>(null);
  const [dashNextOrganizer, setDashNextOrganizer] = useState<{
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [participantChips, setParticipantChips] = useState<ProfileMaquetteParticipantChip[]>([]);
  const [profileSessionDetail, setProfileSessionDetail] = useState<Record<string, unknown> | null>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'not_friends') {
      toast({
        title: "Non autorisé",
        description: "Vous n'êtes pas amis donc vous n'êtes pas autorisé à envoyer un message",
        variant: "destructive"
      });
      // Nettoyer l'URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      navigate({
        search: newParams.toString()
      }, {
        replace: true
      });
    }
  }, [searchParams, toast, navigate]);

  // Ouvrir automatiquement les paramètres si tab=settings
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const focusParam = searchParams.get('focus');
    if (tabParam === 'settings' && !isViewingOtherUser) {
      setSettingsFocus(focusParam || "");
      setShowSettingsDialog(true);
      // Nettoyer l'URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      newParams.delete('focus');
      navigate({
        search: newParams.toString()
      }, {
        replace: true
      });
    }
  }, [searchParams, navigate, isViewingOtherUser]);
  useEffect(() => {
    if (user) {
      if (!isViewingOtherUser && globalProfile) {
        setProfile(globalProfile);
        setFormData(globalProfile);
        setLoading(false);
      } else {
        fetchProfile();
      }
      fetchFollowCounts();
      fetchReliabilityStats();
      if (!isViewingOtherUser) {
        fetchStoriesAndHighlights();
      } else {
        fetchCommonClubs();
        if (hasCreatorSupportAccess(user?.email, globalProfile?.username)) {
          fetchConnectionHistory();
        }
      }
    }
  }, [user, viewingUserId, isViewingOtherUser, globalProfile]);

  useEffect(() => {
    if ("Notification" in window) setNotificationPermission(Notification.permission);
  }, []);
  const fetchReliabilityStats = async () => {
    if (!user || isViewingOtherUser) return;
    try {
      const { data } = await supabase
        .from('user_stats')
        .select('reliability_rate, total_sessions_joined, total_sessions_completed, total_sessions_absent')
        .eq('user_id', user.id)
        .single();
      if (!data) return;
      setReliabilityRate(Math.max(0, Math.min(100, Number(data.reliability_rate) || 0)));
      setTotalSessionsJoined(data.total_sessions_joined || 0);
      setTotalSessionsCompleted(data.total_sessions_completed || 0);
      setTotalSessionsAbsent(Number(data.total_sessions_absent) || 0);

      const { count: createdCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id);
      setTotalSessionsCreated(createdCount || 0);
    } catch (error) {
      console.error('Error fetching reliability stats:', error);
    }
  };
  const fetchStoriesAndHighlights = async () => {
    if (!user || isViewingOtherUser) return;
    try {
      const { data: highlights } = await (supabase as any)
        .from("profile_story_highlights")
        .select("id, story_id, title, position")
        .eq("owner_id", user.id)
        .order("position", { ascending: true });
      const rows = (highlights ?? []) as ProfileStoryHighlight[];
      setStoryHighlights(rows);
      const storyIds = rows.map((h) => h.story_id);
      if (storyIds.length === 0) {
        setHighlightPreviewByStoryId({});
        return;
      }
      const { data: mediaRows } = await (supabase as any)
        .from("story_media")
        .select("story_id, media_url, created_at")
        .in("story_id", storyIds)
        .order("created_at", { ascending: true });
      const previewByStoryId: Record<string, string> = {};
      for (const row of (mediaRows ?? []) as Array<any>) {
        if (!previewByStoryId[row.story_id] && row.media_url) {
          previewByStoryId[row.story_id] = row.media_url;
        }
      }
      setHighlightPreviewByStoryId(previewByStoryId);
    } catch (error) {
      console.error("Error fetching highlights:", error);
    }
  };
  const fetchProfileDashboard = useCallback(async () => {
    if (!user?.id || isViewingOtherUser) return;

    try {
      const uid = user.id;
      const now = new Date();
      const nowIso = now.toISOString();

      const { data: organizedUp } = await supabase
        .from("sessions")
        .select(SESSION_DASHBOARD_SELECT)
        .eq("organizer_id", uid)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true })
        .limit(20);

      const { data: participantRows } = await supabase
        .from("session_participants")
        .select("session_id")
        .eq("user_id", uid);

      const pidList = [...new Set((participantRows ?? []).map((p) => p.session_id).filter(Boolean))] as string[];
      let joinedUp: Record<string, unknown>[] = [];
      if (pidList.length > 0) {
        const { data } = await supabase
          .from("sessions")
          .select(SESSION_DASHBOARD_SELECT)
          .in("id", pidList)
          .neq("organizer_id", uid)
          .gte("scheduled_at", nowIso)
          .order("scheduled_at", { ascending: true })
          .limit(20);
        joinedUp = data ?? [];
      }

      const upcomingMerged = [...(organizedUp ?? []), ...joinedUp] as Array<Record<string, unknown>>;
      upcomingMerged.sort((a, b) => {
        const ta = String(a.scheduled_at);
        const tb = String(b.scheduled_at);
        return ta.localeCompare(tb);
      });
      const next = upcomingMerged[0] ?? null;

      if (!next) {
        setDashNextSummary(null);
        setDashNextRaw(null);
        setDashNextOrganizer(null);
        setParticipantChips([]);
      } else {
        setDashNextSummary({
          id: String(next.id),
          title: String(next.title ?? ""),
          scheduled_at: String(next.scheduled_at),
          activity_type: String(next.activity_type ?? ""),
          location_name:
            typeof next.location_name === "string" && next.location_name.trim() ? next.location_name : null,
          current_participants: next.current_participants != null ? Number(next.current_participants) : null,
        });
        setDashNextRaw(next);

        const orgId = String(next.organizer_id);
        const { data: orgProf } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("user_id", orgId)
          .maybeSingle();

        setDashNextOrganizer(
          orgProf
            ? {
                username: orgProf.username,
                display_name: orgProf.display_name,
                avatar_url: orgProf.avatar_url,
              }
            : null,
        );

        let chips: ProfileMaquetteParticipantChip[] = [];
        const sid = String(next.id);
        const { data: pals } = await supabase
          .from("session_participants")
          .select("user_id")
          .eq("session_id", sid)
          .neq("user_id", uid)
          .limit(24);
        const friendIds = [...new Set((pals ?? []).map((p) => p.user_id).filter(Boolean))] as string[];
        if (friendIds.length > 0) {
          const { data: pfRows } = await supabase
            .from("profiles")
            .select("username, display_name")
            .in("user_id", friendIds.slice(0, 8));
          const PALETTE = ["#007AFF", "#34C759", "#FF9500"];
          chips = (pfRows ?? []).slice(0, 3).map((p, idx) => {
            const initials = profileChipInitials(p.display_name, p.username);
            return {
              label: initials,
              bg: PALETTE[idx % PALETTE.length]!,
            };
          });
        }
        setParticipantChips(chips);
      }
    } catch (e) {
      console.error("Error loading profile dashboard:", e);
    }
  }, [user?.id, isViewingOtherUser]);

  useEffect(() => {
    void fetchProfileDashboard();
  }, [fetchProfileDashboard]);

  const fetchFollowCounts = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;
    try {
      // Get follower count
      const {
        data: followerData
      } = await supabase.rpc('get_follower_count', {
        profile_user_id: targetUserId
      });

      // Get following count
      const {
        data: followingData
      } = await supabase.rpc('get_following_count', {
        profile_user_id: targetUserId
      });
      setFollowerCount(followerData || 0);
      setFollowingCount(followingData || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };
  const fetchCommonClubs = async () => {
    if (!user || !viewingUserId) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_common_clubs', {
        user_1_id: user.id,
        user_2_id: viewingUserId
      });
      if (error) throw error;
      setCommonClubs(data || []);
    } catch (error) {
      console.error('Error fetching common clubs:', error);
    }
  };
  const fetchConnectionHistory = async () => {
    if (!viewingUserId || !user || !hasCreatorSupportAccess(user.email, globalProfile?.username)) return;
    try {
      // Fetch audit logs for login activities for this user
      const {
        data,
        error
      } = await supabase.from('audit_log').select('timestamp, details, action').eq('user_id', viewingUserId).in('action', ['LOGIN', 'LOGOUT', 'SESSION_START', 'SESSION_END']).order('timestamp', {
        ascending: false
      }).limit(10);
      if (error) {
        console.error('Error fetching connection history:', error);
        return;
      }
      setConnectionHistory(data || []);
    } catch (error) {
      console.error('Error fetching connection history:', error);
    }
  };
  const fetchAdminStatus = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: targetUserId,
        _role: 'admin'
      });
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Appeler fetchAdminStatus quand l'utilisateur change
  useEffect(() => {
    fetchAdminStatus();
  }, [user?.id, viewingUserId]);
  const fetchProfile = async (retryCount = 0) => {
    try {
      const targetUserId = viewingUserId || user?.id;
      if (!targetUserId) return;
      console.log(`🔍 [Profile] Fetching profile (attempt ${retryCount + 1}/3)`);
      console.log(`🔍 [Profile] Target User ID:`, targetUserId);
      console.log(`🔍 [Profile] Is viewing other user:`, isViewingOtherUser);
      if (isViewingOtherUser) {
        // Viewing another user's profile - use public profile function
        const {
          data,
          error
        } = await supabase.rpc('get_public_profile_safe', {
          profile_user_id: targetUserId
        });
        if (error) throw error;
        if (data && data.length > 0) {
          // Pour les profils publics, on ajoute des valeurs par défaut pour les champs manquants
          const publicProfile = {
            ...data[0],
            phone: null,
            // Les profils publics ne montrent pas le téléphone
            notifications_enabled: false,
            rgpd_accepted: false,
            security_rules_accepted: false
          };
          console.log(`✅ [Profile] Public profile loaded:`, publicProfile.username);
          setProfile(publicProfile);
          setFormData(publicProfile);
        }
      } else {
        // Viewing own profile - get full profile
        const {
          data,
          error
        } = await supabase.from('profiles').select('*').eq('user_id', targetUserId).single();
        if (error) {
          // Si l'erreur est liée à l'authentification, retry
          if (error.message.includes('JWT') && retryCount < 2) {
            console.warn(`⚠️ Auth error, retrying in 1s... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(retryCount + 1);
          }
          throw error;
        }
        console.log(`✅ [Profile] Own profile loaded:`, data?.username);
        setProfile(data);
        setFormData(data);
      }
    } catch (error: any) {
      console.error(`❌ [Profile] Fetch profile error:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil. Reconnectez-vous si le problème persiste.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un fichier image.",
          variant: "destructive"
        });
        return;
      }

      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "La taille du fichier ne doit pas dépasser 5MB.",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const imageSrc = e.target?.result as string;
        setOriginalImageSrc(imageSrc);
        setShowCropEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Créer un fichier à partir du blob croppé
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', {
      type: 'image/jpeg'
    });
    setAvatarFile(croppedFile);

    // Créer l'URL de prévisualisation
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    setAvatarPreview(previewUrl);
    setShowCropEditor(false);
  };
  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 10MB.", variant: "destructive" });
      return;
    }
    setCoverUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const coverUrl = data.publicUrl;
      const { error: updateError } = await supabase.from('profiles').update({ cover_image_url: coverUrl } as any).eq('user_id', user.id);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, cover_image_url: coverUrl } : null);
      setCoverPreview(coverUrl);
      await refreshGlobalProfile();
      toast({ title: "Photo de couverture mise à jour !" });
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast({ title: "Erreur", description: "Impossible de mettre à jour la couverture", variant: "destructive" });
    } finally {
      setCoverUploading(false);
    }
  };
  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }
      const {
        data
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Erreur upload avatar:', error);
      return null;
    }
  };
  const updateProfile = async () => {
    try {
      setLoading(true);
      let avatarUrl = formData.avatar_url;

      // Upload nouvel avatar si sélectionné
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          toast({
            title: "Erreur",
            description: "Impossible d'uploader la photo de profil.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }
      const {
        error
      } = await supabase.from('profiles').update({
        ...formData,
        avatar_url: avatarUrl
      }).eq('user_id', user?.id);
      if (error) throw error;
      setProfile({
        ...profile!,
        ...formData,
        avatar_url: avatarUrl
      });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");

      // Rafraîchir le profil global
      await refreshGlobalProfile();
      toast({
        title: "Profil mis à jour !",
        description: "Vos modifications ont été sauvegardées."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer votre adresse email.",
        variant: "destructive"
      });
      return;
    }
    setIsChangingPassword(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.AndroidBridge ? 'app.runconnect://auth' : `${window.location.origin}/auth`
      });
      if (error) throw error;
      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        // Update profile with new permission
        if (user) {
          await supabase.from('profiles').update({
            notifications_enabled: permission === 'granted'
          }).eq('user_id', user.id);
        }
        toast({
          title: permission === 'granted' ? "Notifications activées" : "Notifications refusées",
          description: permission === 'granted' ? "Vous recevrez désormais des notifications." : "Vous ne recevrez pas de notifications."
        });
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };
  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        [field]: value
      }).eq('user_id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? {
        ...prev,
        [field]: value
      } : null);
      toast({
        title: "Paramètres mis à jour",
        description: "Vos préférences ont été sauvegardées."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les paramètres",
        variant: "destructive"
      });
    }
  };
  // When viewing another user's profile, show ProfilePreviewDialog instead of full profile
  if (isViewingOtherUser && viewingUserId) {
    return (
      <div className="h-full min-h-0 w-full min-w-0 overflow-x-hidden bg-secondary">
        <ProfilePreviewDialog
          userId={viewingUserId}
          onClose={() => navigate(-1)}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-full min-h-0 items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const formatCompactCount = (value: number) =>
    new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value ?? 0);
  const getInitials = (fullName: string | null | undefined, username: string | null | undefined) => {
    const source = (fullName || username || "U").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  if (!profile) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#F2F2F7]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openNextSessionDetailModal = () => {
    const row = dashNextRaw;
    if (!row || !user) return;
    const org = dashNextOrganizer;
    const isSelfOrg = String(row.organizer_id) === user.id;
    const prof =
      org && !isSelfOrg
        ? org
        : { username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url };

    setProfileSessionDetail({
      ...row,
      session_type: row.activity_type ?? "course",
      intensity: (row.intensity as string) ?? "moderate",
      location_lat: Number(row.location_lat ?? 0),
      location_lng: Number(row.location_lng ?? 0),
      location_name: row.location_name ? String(row.location_name) : "",
      max_participants: Number(row.max_participants ?? 0),
      current_participants: Number(row.current_participants ?? 0),
      description: row.description ? String(row.description) : "",
      profiles: {
        username: prof.username,
        display_name: prof.display_name,
        avatar_url: prof.avatar_url ?? undefined,
      },
    });
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden bg-[#F2F2F7]"
      data-tutorial="tutorial-profile-page"
    >
      {isEditing && !isViewingOtherUser && (
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleAvatarChange}
          className="hidden"
        />
      )}

      <ProfileSelfMaquetteLayout
        profile={profile}
        avatarPreview={avatarPreview}
        getInitials={getInitials}
        navigate={navigate}
        followerCount={followerCount}
        followingCount={followingCount}
        sessionsJoinedCount={totalSessionsJoined}
        formatCompactCount={formatCompactCount}
        openFollowDialog={(type) => {
          setFollowDialogType(type);
          setShowFollowDialog(true);
        }}
        onShareProfile={() =>
          shareProfile({
            username: profile.username,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
          })
        }
        onOpenSettings={() => navigate("/profile?tab=settings")}
        nextSession={dashNextSummary}
        friendCountPreview={participantChips}
        onOpenNextSessionDetail={() => dashNextSummary && openNextSessionDetailModal()}
        onGoToNextSession={() => dashNextSummary && openNextSessionDetailModal()}
        storyHighlights={storyHighlights.slice(0, 8)}
        highlightPreviewByStoryId={highlightPreviewByStoryId}
        onOpenHighlight={(sid) => setSelectedHighlightStoryId(sid)}
        reliabilityRate={reliabilityRate}
        totalSessionsJoined={totalSessionsJoined}
        totalSessionsCompleted={totalSessionsCompleted}
        totalSessionsAbsent={totalSessionsAbsent}
        onOpenReliabilityDetail={() => setShowReliabilityDialog(true)}
        userIdForRecords={user.id}
        legacyRecords={{
          running_records: profile.running_records,
          cycling_records: profile.cycling_records,
          swimming_records: profile.swimming_records,
          triathlon_records: profile.triathlon_records,
          walking_records: profile.walking_records,
        }}
      />

      {/* Follow Dialog */}
      <FollowDialog
        open={showFollowDialog}
        onOpenChange={setShowFollowDialog}
        type={followDialogType}
        followerCount={followerCount}
        followingCount={followingCount}
        targetUserId={viewingUserId || undefined}
      />

      {!isViewingOtherUser && isEditing && (
        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <div className="ios-card overflow-hidden border border-border/60">
            <div className="space-y-ios-3 px-4 py-3 ios-shell:px-2.5 ios-shell:py-2.5">
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Pseudo</label>
                <Input
                  value={formData.username || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value,
                    })
                  }
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Nom d'affichage</label>
                <Input
                  value={formData.display_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_name: e.target.value,
                    })
                  }
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Âge</label>
                <Input
                  type="number"
                  value={formData.age || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      age: parseInt(e.target.value) || null,
                    })
                  }
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Téléphone</label>
                <Input
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="06 12 34 56 78"
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Bio</label>
                <Input
                  value={formData.bio || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bio: e.target.value,
                    })
                  }
                  placeholder="Décrivez vos records, vos objectifs..."
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <div>
                <label className="mb-ios-1 block text-ios-footnote text-muted-foreground">Pays</label>
                <select
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value || null })}
                  className="h-11 w-full rounded-ios-sm border border-input bg-background px-3 text-ios-subheadline"
                >
                  <option value="">Non spécifié</option>
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="CH">Suisse</option>
                  <option value="CA">Canada</option>
                  <option value="LU">Luxembourg</option>
                  <option value="MA">Maroc</option>
                  <option value="TN">Tunisie</option>
                  <option value="DZ">Algérie</option>
                  <option value="SN">Sénégal</option>
                  <option value="CI">Côte d'Ivoire</option>
                  <option value="ES">Espagne</option>
                  <option value="PT">Portugal</option>
                  <option value="DE">Allemagne</option>
                  <option value="IT">Italie</option>
                  <option value="GB">Royaume-Uni</option>
                  <option value="US">États-Unis</option>
                </select>
              </div>
              <div className="flex gap-ios-2 pt-ios-2">
                <Button onClick={updateProfile} disabled={loading} className="h-11 flex-1 rounded-ios-sm">
                  {loading && <Loader2 className="mr-ios-2 h-4 w-4 animate-spin" />}
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setAvatarFile(null);
                    setAvatarPreview("");
                    setFormData(profile || {});
                  }}
                  className="h-11 flex-1 rounded-ios-sm"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} initialSearch={settingsFocus} />
      </Suspense>

      <ReliabilityDetailsDialog
        open={showReliabilityDialog}
        onOpenChange={setShowReliabilityDialog}
        reliabilityRate={reliabilityRate}
        totalSessionsCreated={totalSessionsCreated}
        totalSessionsJoined={totalSessionsJoined}
        totalSessionsCompleted={totalSessionsCompleted}
        totalSessionsAbsent={totalSessionsAbsent}
        reliabilitySubjectUserId={user?.id ?? null}
      />

      {/* Report User Dialog */}
      <ReportUserDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        reportedUserId={viewingUserId || ""}
        reportedUsername={profile.username}
      />

        {/* Image Crop Editor */}
      <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />

      <SessionDetailsDialog
        session={profileSessionDetail as never}
        onClose={() => setProfileSessionDetail(null)}
        onSessionUpdated={() => void fetchProfileDashboard()}
      />

      <ProfileShareScreen open={showProfileShare} onClose={() => setShowProfileShare(false)} />
      <SessionStoryDialog
        open={!!selectedHighlightStoryId}
        onOpenChange={(open) => {
          if (!open) setSelectedHighlightStoryId(null);
        }}
        authorId={user?.id || ""}
        viewerUserId={user?.id ?? null}
        storyId={selectedHighlightStoryId}
        onOpenFeed={() => {
          setSelectedHighlightStoryId(null);
          navigate("/feed");
        }}
      />
      {qrData ? (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
          avatarUrl={qrData.avatarUrl}
          referralCode={qrData.referralCode}
        />
      ) : null}
    </div>
  );
};
export default Profile;