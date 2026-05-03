import { lazy, Suspense, useState, useEffect } from "react";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Settings, LogOut, Crown, BadgeCheck, Camera, Users, Sun, Moon, Key, Bell, Shield, FileText, Mail, Route, MapPin, Calendar, Trash2, Share2, Volume2, Flag, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { ContactsPermissionButton } from "@/components/ContactsPermissionButton";
import { PushNotificationButton } from "@/components/PushNotificationButton";

import { StravaConnect } from "@/components/StravaConnect";
import { ReportUserDialog } from "@/components/ReportUserDialog";

import { PersonalRecords } from "@/components/PersonalRecords";
import { useLanguage } from "@/contexts/LanguageContext";
import { PersonalGoals } from "@/components/profile/PersonalGoals";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { ProfileSportsCard } from "@/components/profile/ProfileSportsCard";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
import { MainTopHeader } from "@/components/layout/MainTopHeader";
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
interface UserRoute {
  id: string;
  name: string;
  description: string | null;
  total_distance: number | null;
  total_elevation_gain: number | null;
  created_at: string;
}
const Profile = () => {
  const {
    user,
    signOut,
    subscriptionInfo,
    refreshSubscription
  } = useAuth();
  

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
    shareProfile
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [commonClubs, setCommonClubs] = useState<any[]>([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const {
    toast
  } = useToast();
  const {
    selectFromGallery,
    loading: cameraLoading
  } = useCamera();
  const {
    t
  } = useLanguage();
  const profileHeaderTabs = [{
    id: "profile",
    label: "Profil",
    active: true
  }, {
    id: "records",
    label: "Record",
    active: false,
    onClick: () => navigate("/profile/records")
  }, {
    id: "story",
    label: "Créer une story",
    active: false,
    onClick: () => navigate("/stories/create")
  }];

  // Vérifier si on arrive avec un message d'erreur
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
      // Si on regarde son propre profil, utiliser le profil global
      if (!isViewingOtherUser && globalProfile) {
        console.log('✅ [Profile] Using global profile:', globalProfile.username);
        setProfile(globalProfile);
        setFormData(globalProfile);
        setLoading(false);
      } else {
        // Sinon charger le profil spécifique
        fetchProfile();
      }
      fetchFollowCounts();
      // fetchReliabilityRate removed - no longer shown on profile
      if (!isViewingOtherUser) {
        fetchUserRoutes();
      } else {
        fetchCommonClubs();
        // Fetch connection history only for creator
        if (hasCreatorSupportAccess(user?.email, globalProfile?.username)) {
          fetchConnectionHistory();
        }
      }
    }
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user, viewingUserId, isViewingOtherUser, globalProfile]);
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
  const fetchUserRoutes = async () => {
    if (!user) return;
    setRoutesLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('routes').select('id, name, description, total_distance, total_elevation_gain, created_at').eq('created_by', user.id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setUserRoutes(data || []);
    } catch (error) {
      console.error('Error fetching user routes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos parcours",
        variant: "destructive"
      });
    } finally {
      setRoutesLoading(false);
    }
  };

  // Vérifier le rôle admin via la fonction sécurisée has_role
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
  const deleteRoute = async (routeId: string) => {
    try {
      const {
        error
      } = await supabase.from('routes').delete().eq('id', routeId).eq('created_by', user?.id);
      if (error) throw error;
      setUserRoutes(prev => prev.filter(route => route.id !== routeId));
      toast({
        title: "Parcours supprimé",
        description: "Le parcours a été supprimé avec succès"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le parcours",
        variant: "destructive"
      });
    }
  };
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
  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-secondary"
      data-tutorial="tutorial-profile-page"
    >
      <MainTopHeader
        title="Mon profil"
        tabs={profileHeaderTabs}
        tabsAriaLabel="Navigation du profil"
        right={
          <button
            type="button"
            onClick={() => setShowSettingsDialog(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
            aria-label="Ouvrir les paramètres"
          >
            <Settings className="h-5 w-5" />
          </button>
        }
      />
      <div className="ios-scroll-region flex-1 min-h-0 min-w-0 w-full max-w-full">
      {/* Refonte Apple Profil (mockup 19) — Apple-ID banner inline (carte blanche, avatar 64, nom display 22, handle line muted, chevron). */}
      {isEditing && !isViewingOtherUser && (
        <input id="avatar-upload" type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} className="hidden" />
      )}

      <div className="box-border min-h-0 w-full min-w-0 max-w-full overflow-x-hidden pt-3 pb-[calc(2rem+var(--safe-area-bottom))]">
        <div className="box-border min-h-0 min-w-0 max-w-full space-y-4 sm:mx-auto sm:max-w-2xl">
        {/* Apple-ID banner (mockup 19) */}
        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <div className="flex w-full min-w-0 items-center gap-3.5 rounded-[14px] border border-border/60 bg-card p-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-[24px] font-semibold tracking-[-0.3px] text-primary-foreground">
                  {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {isEditing && !isViewingOtherUser && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const file = await selectFromGallery();
                      if (file) {
                        handleAvatarChange({ target: { files: [file] } } as never);
                      }
                    } catch (error) {
                      console.error('❌ Erreur sélection galerie:', error);
                      toast({ title: "Erreur", description: "Impossible d'accéder à la galerie", variant: "destructive" });
                    }
                  }}
                  disabled={cameraLoading}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md"
                  aria-label="Changer l'avatar"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              {coverUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="font-display text-[22px] font-semibold leading-tight tracking-[-0.4px] text-foreground truncate">
                  {profile?.display_name || profile?.username}
                </div>
                {profile?.is_admin || isAdmin ? (
                  <BadgeCheck className="h-[18px] w-[18px] shrink-0 fill-amber-500 text-white" />
                ) : profile?.is_premium ? (
                  <BadgeCheck className="h-[18px] w-[18px] shrink-0 fill-[hsl(var(--primary))] text-white" />
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground truncate">
                <span>@{profile?.username}</span>
                {profile?.country && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{profile.country}</span>
                  </>
                )}
                {profile?.is_premium && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-[hsl(var(--primary))]">Premium ✓</span>
                  </>
                )}
              </div>
              {!isViewingOtherUser && !subscriptionInfo?.subscribed && (
                <button
                  type="button"
                  onClick={() => navigate('/subscription')}
                  className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-[hsl(var(--primary))]/10 px-3 text-[12px] font-medium text-[hsl(var(--primary))] active:opacity-70"
                >
                  <Crown className="h-3 w-3" />
                  Devenir Premium
                </button>
              )}
              {isViewingOtherUser && (
                <button
                  type="button"
                  onClick={() => setShowReportDialog(true)}
                  className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-destructive/10 px-3 text-[12px] font-medium text-destructive active:opacity-70"
                >
                  <Flag className="h-3 w-3" />
                  Signaler
                </button>
              )}
            </div>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-muted-foreground/60">
              <path d="M1 6.5h11M7.5 1.5l5 5-5 5" />
            </svg>
          </div>
        </div>

        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <div className="ios-card w-full min-w-0 overflow-hidden border border-border/60">
            <ProfileQuickStats
              userId={viewingUserId || user?.id || ''}
              followerCount={followerCount}
              followingCount={followingCount}
              onFollowersClick={() => {
                setFollowDialogType('followers');
                setShowFollowDialog(true);
              }}
              onFollowingClick={() => {
                setFollowDialogType('following');
                setShowFollowDialog(true);
              }}
            />
          </div>
        </div>

        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <ProfileSportsCard
            favoriteSport={profile?.favorite_sport}
            isOwnProfile={!isViewingOtherUser}
            onUpdated={(value) => {
              setProfile((p) => (p ? { ...p, favorite_sport: value } : null));
              setFormData((fd) => ({ ...fd, favorite_sport: value }));
            }}
          />
        </div>


        {!isViewingOtherUser && (
          <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
            <PersonalGoals />
          </div>
        )}

        {/* Refonte Apple Profil (mockup 19) — Group avec icônes 29×29 colorées
            (📅 Historique séances, 📸 Stories, 📍 Itinéraires) */}
        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <IOSListGroup
            className="ios-card mb-0 w-full min-w-0 border border-border/60 shadow-[var(--shadow-card)]"
          >
            <IOSListItem
              icon={Calendar}
              iconBgColor="bg-[hsl(var(--primary))]"
              iconColor="text-white"
              title="Historique des séances"
              subtitle={!isViewingOtherUser ? 'Tes séances passées et à venir' : undefined}
              onClick={() => navigate(!isViewingOtherUser ? '/my-sessions' : `/my-sessions?user=${viewingUserId}`)}
              showSeparator
            />
            {!isViewingOtherUser && (
              <IOSListItem
                icon={Camera}
                iconBgColor="bg-[#ff9500]"
                iconColor="text-white"
                title="Mes stories"
                subtitle="Publiées par toi"
                onClick={() => navigate('/drafts/stories')}
                showSeparator
              />
            )}
            {!isViewingOtherUser && (
              <IOSListItem
                icon={Route}
                iconBgColor="bg-[#34c759]"
                iconColor="text-white"
                title="Mes itinéraires"
                subtitle="Parcours enregistrés"
                onClick={() => navigate('/itinerary/my-routes')}
                showSeparator
              />
            )}
            {!isViewingOtherUser && (
              <IOSListItem
                icon={MapPin}
                iconBgColor="bg-[#af52de]"
                iconColor="text-white"
                title="Créer un parcours"
                onClick={() => navigate('/route-creation')}
                showSeparator={false}
              />
            )}
          </IOSListGroup>
        </div>

        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <Collapsible className="ios-card mb-0 w-full min-w-0 overflow-hidden border border-border/60 shadow-[var(--shadow-card)]">
            <CollapsibleTrigger className="group flex w-full min-w-0 items-center justify-between px-ios-4 py-ios-3 ios-shell:px-2.5">
              <p className="text-[13px] uppercase tracking-[0.3px] text-muted-foreground">
                Records personnels
              </p>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border/60">
              <PersonalRecords
                records={{
                  running_records: profile?.running_records,
                  cycling_records: profile?.cycling_records,
                  swimming_records: profile?.swimming_records,
                  triathlon_records: profile?.triathlon_records,
                  walking_records: profile?.walking_records,
                }}
                canEdit={!isViewingOtherUser}
                onRecordsChange={(nextRecords) => {
                  setProfile((prev) => (prev ? { ...prev, ...nextRecords } : prev));
                }}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {!isViewingOtherUser && isEditing && (
          <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
            <div className="ios-card overflow-hidden border border-border/60">
            <div className="space-y-ios-3 px-4 py-3 ios-shell:px-2.5 ios-shell:py-2.5">
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Pseudo</label>
                  <Input value={formData.username || ''} onChange={e => setFormData({
              ...formData,
              username: e.target.value
            })} className="h-11 rounded-ios-sm" />
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Nom d'affichage</label>
                  <Input value={formData.display_name || ''} onChange={e => setFormData({
              ...formData,
              display_name: e.target.value
            })} className="h-11 rounded-ios-sm" />
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Âge</label>
                  <Input type="number" value={formData.age || ''} onChange={e => setFormData({
              ...formData,
              age: parseInt(e.target.value) || null
            })} className="h-11 rounded-ios-sm" />
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Téléphone</label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({
              ...formData,
              phone: e.target.value
            })} placeholder="06 12 34 56 78" className="h-11 rounded-ios-sm" />
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Bio</label>
                  <Input value={formData.bio || ''} onChange={e => setFormData({
              ...formData,
              bio: e.target.value
            })} placeholder="Décrivez vos records, vos objectifs..." className="h-11 rounded-ios-sm" />
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Pays</label>
                  <select
                    value={formData.country || ''}
                    onChange={e => setFormData({ ...formData, country: e.target.value || null })}
                    className="h-11 w-full rounded-ios-sm border border-input bg-background px-3 text-ios-subheadline"
                  >
                    <option value="">Non spécifié</option>
                    <option value="FR">🇫🇷 France</option>
                    <option value="BE">🇧🇪 Belgique</option>
                    <option value="CH">🇨🇭 Suisse</option>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="LU">🇱🇺 Luxembourg</option>
                    <option value="MA">🇲🇦 Maroc</option>
                    <option value="TN">🇹🇳 Tunisie</option>
                    <option value="DZ">🇩🇿 Algérie</option>
                    <option value="SN">🇸🇳 Sénégal</option>
                    <option value="CI">🇨🇮 Côte d'Ivoire</option>
                    <option value="ES">🇪🇸 Espagne</option>
                    <option value="PT">🇵🇹 Portugal</option>
                    <option value="DE">🇩🇪 Allemagne</option>
                    <option value="IT">🇮🇹 Italie</option>
                    <option value="GB">🇬🇧 Royaume-Uni</option>
                    <option value="US">🇺🇸 États-Unis</option>
                  </select>
                </div>
                <div className="flex gap-ios-2 pt-ios-2">
                  <Button onClick={updateProfile} disabled={loading} className="flex-1 h-11 rounded-ios-sm">
                    {loading && <Loader2 className="mr-ios-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setAvatarFile(null);
              setAvatarPreview("");
              setFormData(profile || {});
            }} className="flex-1 h-11 rounded-ios-sm">
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="box-border min-w-0 w-full max-w-full px-4 ios-shell:px-2">
          <StravaConnect profile={profile} isOwnProfile={!isViewingOtherUser} onProfileUpdate={fetchProfile} />
        </div>

        {/* Follow Dialog */}
        <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} targetUserId={viewingUserId || undefined} />

        {/* Settings Dialog */}
        <Suspense fallback={null}>
          <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} initialSearch={settingsFocus} />
        </Suspense>

        {/* Report User Dialog */}
        <ReportUserDialog isOpen={showReportDialog} onClose={() => setShowReportDialog(false)} reportedUserId={viewingUserId || ""} reportedUsername={profile?.username || ""} />

        {/* Image Crop Editor */}
        <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />

        </div>
      </div>
      </div>
    </div>
  );
};
export default Profile;