import { lazy, Suspense, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfileMetrics } from "@/hooks/useProfileMetrics";
import { compressImageFileToJpeg } from "@/lib/imageCompression";
import type { Profile, UserRoute, CommonClubRow, AuditConnectionRow } from "@/types/profile";
import type { SettingsDialogPage } from "@/components/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Settings, LogOut, Crown, Camera, Users, Sun, Moon, Key, Bell, Shield, FileText, Mail, Route, MapPin, Calendar, Trash2, Share2, Volume2, Flag, ChevronRight, ChevronLeft, Trophy } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { ContactsPermissionButton } from "@/components/ContactsPermissionButton";
import { PushNotificationButton } from "@/components/PushNotificationButton";

import { StravaConnect } from "@/components/StravaConnect";
import { ReportUserDialog } from "@/components/ReportUserDialog";

import { ProfileRecordsDisplay } from "@/components/profile/ProfileRecordsDisplay";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { useLanguage } from "@/contexts/LanguageContext";
import { PersonalGoals } from "@/components/profile/PersonalGoals";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import { ProfileSportsCard } from "@/components/profile/ProfileSportsCard";
import { ProfileCompletenessBanner } from "@/components/profile/ProfileCompletenessBanner";
import { ProfileEditCard } from "@/components/profile/ProfileEditCard";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);
const Profile = () => {
  const {
    user,
    signOut,
    subscriptionInfo,
    refreshSubscription
  } = useAuth();
  

  const {
    userProfile: globalProfile,
    refreshProfile: refreshGlobalProfile,
    loading: profileCtxLoading,
    error: profileCtxError,
  } = useUserProfile();
  const queryClient = useQueryClient();
  const metricsQuery = useProfileMetrics(user?.id);
  const followerCount = metricsQuery.data?.followerCount ?? 0;
  const followingCount = metricsQuery.data?.followingCount ?? 0;
  const reliabilityRate = metricsQuery.data?.reliabilityRate ?? null;
  const totalSessionsCreated = metricsQuery.data?.totalSessionsCreated ?? 0;
  const totalSessionsJoined = metricsQuery.data?.totalSessionsJoined ?? 0;
  const totalSessionsCompleted = metricsQuery.data?.totalSessionsCompleted ?? 0;
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
  const [profileFetchError, setProfileFetchError] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [commonClubs, setCommonClubs] = useState<CommonClubRow[]>([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsDialogPage | undefined>(undefined);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<AuditConnectionRow[]>([]);
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
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
      if (!isViewingOtherUser && globalProfile) {
        setProfile(globalProfile as Profile);
        setFormData(globalProfile as Profile);
        setLoading(false);
        setProfileFetchError(false);
      } else {
        void fetchProfile();
      }
      if (!isViewingOtherUser) {
        void fetchUserRoutes();
      } else {
        void fetchCommonClubs();
        if (hasCreatorSupportAccess(user?.email, globalProfile?.username)) {
          void fetchConnectionHistory();
        }
      }
    }
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user, viewingUserId, isViewingOtherUser, globalProfile]);
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
      setProfileFetchError(false);
      if (isViewingOtherUser) {
        const {
          data,
          error
        } = await supabase.rpc('get_public_profile_safe', {
          profile_user_id: targetUserId
        });
        if (error) throw error;
        if (data && data.length > 0) {
          const publicProfile = {
            ...data[0],
            phone: null,
            notifications_enabled: false,
            rgpd_accepted: false,
            security_rules_accepted: false
          } as Profile;
          setProfile(publicProfile);
          setFormData(publicProfile);
        }
      } else {
        const {
          data,
          error
        } = await supabase.from('profiles').select('*').eq('user_id', targetUserId).single();
        if (error) {
          if (error.message.includes('JWT') && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(retryCount + 1);
          }
          throw error;
        }
        setProfile(data as Profile);
        setFormData(data as Profile);
      }
    } catch (_error: unknown) {
      setProfileFetchError(true);
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
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    const baseFile = new File([croppedImageBlob], "avatar.jpg", {
      type: "image/jpeg",
    });
    const compressed = await compressImageFileToJpeg(baseFile, {
      maxEdge: 1024,
      maxBytes: 900_000,
    });
    const finalFile = new File([compressed], "avatar.jpg", { type: "image/jpeg" });
    setAvatarFile(finalFile);
    const previewUrl = URL.createObjectURL(compressed);
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
      const compressed = await compressImageFileToJpeg(file, {
        maxEdge: 1920,
        maxBytes: 1_200_000,
      });
      const uploadBlob = compressed;
      const fileExt = "jpg";
      const fileName = `cover-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, uploadBlob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const coverUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_image_url: coverUrl })
        .eq("user_id", user.id);
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
      const fileName = `${user?.id}-${Math.random()}.jpg`;
      const filePath = `${user?.id}/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file, {
        contentType: "image/jpeg",
      });
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
      await queryClient.invalidateQueries({ queryKey: ["profile-metrics"] });
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

  const stillLoading =
    !!user &&
    !profile &&
    !profileFetchError &&
    (profileCtxLoading || loading);

  if (stillLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !profile && (profileFetchError || !!profileCtxError)) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 bg-secondary px-6 text-center">
        <p className="text-ios-body text-muted-foreground">{t("profilePage.loadError")}</p>
        <Button
          type="button"
          onClick={() => {
            setProfileFetchError(false);
            void refreshGlobalProfile();
            void fetchProfile();
          }}
        >
          {t("profilePage.retry")}
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-hidden bg-secondary"
      data-tutorial="tutorial-profile-page"
    >
      {/* Aligné hub Paramètres (SettingsDialog) : pas de w-full + mx-auto sur le même bloc ; gouttières px-4 / ios-shell:px-2 */}
      <div className="ios-scroll-region flex-1 min-h-0 min-w-0 w-full max-w-full">
      {/* Couverture pleine largeur — pas de max-w-2xl ici (évite flex/scroll WebKit + recentrage qui coupent les cartes). */}
      <div className="relative w-full min-w-0 max-w-full overflow-x-hidden">
        {/* Cover Photo */}
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10">
          {(coverPreview || profile?.cover_image_url) ? (
            <img
              src={coverPreview || profile?.cover_image_url || ""}
              alt={t("profilePage.coverAlt")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
          )}
          {/* Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          {/* Top bar buttons */}
          <div className="absolute left-0 right-0 top-0 z-10 flex min-w-0 items-center justify-between px-4 pt-[max(0.75rem,var(--safe-area-top))] ios-shell:px-2">
            {isViewingOtherUser ? (
              <button onClick={() => navigate(-1)} className="flex items-center gap-ios-1 text-white drop-shadow-lg">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-ios-headline">Retour</span>
              </button>
            ) : <div className="w-16" />}
            <div className="flex items-center gap-ios-2">
              {!isViewingOtherUser && (
                <>
                  <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors active:bg-black/60">
                    <Camera className="h-4 w-4 text-white" />
                    <input type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                  </label>
                  <button
                    type="button"
                    aria-label={t("profilePage.privacySettings")}
                    onClick={() => {
                      setSettingsInitialPage("privacy");
                      setShowSettingsDialog(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <Shield className="h-4 w-4 text-white" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("navigation.settings")}
                    onClick={() => {
                      setSettingsInitialPage(undefined);
                      setShowSettingsDialog(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
                  >
                    <Settings className="h-4 w-4 text-white" />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {coverUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Avatar overlapping cover */}
        <div className="relative flex justify-center" style={{ marginTop: '-50px' }}>
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
              <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-primary/40">
                {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {profile?.is_premium && (
              <div className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-green-500 border-3 border-card flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
            {isEditing && !isViewingOtherUser && (
              <button 
                type="button" 
                onClick={async () => {
                  try {
                    const file = await selectFromGallery();
                    if (file) {
                      handleAvatarChange({ target: { files: [file] } } as any);
                    }
                  } catch (error) {
                    console.error('❌ Erreur sélection galerie:', error);
                    toast({ title: "Erreur", description: "Impossible d'accéder à la galerie", variant: "destructive" });
                  }
                }} 
                disabled={cameraLoading} 
                className="absolute bottom-0 left-0 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditing && !isViewingOtherUser && (
        <input id="avatar-upload" type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} className="hidden" />
      )}

      {/* Colonne cartes : pleine largeur puis max-w-2xl centré sans w-full+mx sur le même nœud (cf. SettingsDialog). */}
      <div className="box-border min-h-0 w-full min-w-0 max-w-full overflow-x-hidden pb-[calc(2rem+var(--safe-area-bottom))] pt-0">
        <div className="box-border min-h-0 min-w-0 w-full max-w-full space-y-0">
        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
          <div className="w-full min-w-0 overflow-hidden">
            <div className="flex flex-col items-center px-4 py-3 pb-ios-1 pt-ios-1 ios-shell:px-2.5 ios-shell:py-2.5">
            <div className="mb-0.5 flex max-w-full items-center justify-center gap-ios-2">
              <h2 className="max-w-full truncate text-center text-ios-title2 font-bold text-foreground">
                {profile?.display_name || profile?.username}
              </h2>
              {profile?.is_premium && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>

            <p className="mb-ios-1 text-ios-subheadline text-muted-foreground">
              @{profile?.username}
            </p>

            {!isViewingOtherUser && !isEditing && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-ios-2 h-8 gap-ios-2 text-ios-footnote"
                onClick={() => setIsEditing(true)}
              >
                {t("profilePage.editProfile")}
              </Button>
            )}

            {!isViewingOtherUser && !subscriptionInfo?.subscribed && (
              <Button onClick={() => navigate('/subscription')} variant="outline" size="sm" className="mt-ios-2 gap-ios-2 h-8 text-ios-footnote">
                <Crown className="h-3.5 w-3.5" />
                Devenir Premium
              </Button>
            )}

            {isViewingOtherUser && (
              <Button onClick={() => setShowReportDialog(true)} variant="ghost" size="sm" className="mt-ios-2 text-destructive hover:text-destructive hover:bg-destructive/10 gap-ios-2 h-8 text-ios-footnote">
                <Flag className="h-3.5 w-3.5" />
                Signaler
              </Button>
            )}
            </div>
          </div>
        </div>

        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
          <div className="w-full min-w-0 overflow-hidden">
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
              reliabilityPercent={!isViewingOtherUser ? reliabilityRate : undefined}
              onReliabilityClick={
                !isViewingOtherUser ? () => setShowReliabilityDialog(true) : undefined
              }
            />
          </div>
        </div>

        {!isViewingOtherUser && profile ? (
          <ProfileCompletenessBanner profile={profile} onEditProfile={() => setIsEditing(true)} />
        ) : null}

        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card px-4 py-1 ios-shell:px-2">
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
          <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
            <PersonalGoals />
          </div>
        )}

        {!isViewingOtherUser && user?.id ? (
          <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card px-4 py-3 ios-shell:px-2.5">
            <p className="mb-2 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground">
              Activités récentes
            </p>
            <RecentActivities userId={user.id} viewerUserId={user.id} limit={5} />
          </div>
        ) : null}

        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
          <IOSListGroup header="RACCOURCIS" flush className="mb-0 w-full min-w-0">
            <IOSListItem
              icon={Route}
              iconBgColor="bg-teal-500"
              iconColor="text-white"
              title={!isViewingOtherUser ? 'Mes séances et itinéraires' : 'Ses séances et itinéraires'}
              onClick={() => navigate(!isViewingOtherUser ? '/my-sessions' : `/my-sessions?user=${viewingUserId}`)}
              showSeparator={!isViewingOtherUser}
            />
            {!isViewingOtherUser && (
              <IOSListItem
                icon={MapPin}
                iconBgColor="bg-purple-500"
                iconColor="text-white"
                title="Créer un parcours"
                onClick={() => navigate('/route-creation')}
                showSeparator={false}
              />
            )}
          </IOSListGroup>
        </div>

        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card">
          <IOSListGroup header="RECORDS" flush className="mb-0 w-full min-w-0">
            <IOSListItem
              icon={Trophy}
              iconBgColor="bg-amber-500"
              iconColor="text-white"
              title="Records sport"
              subtitle="Renseigner tes perfs"
              onClick={() => navigate("/profile/records")}
              showSeparator
            />
            <div className="border-t border-border/60">
              <ProfileRecordsDisplay
                userId={viewingUserId || user?.id || ""}
                legacy={{
                  running_records: profile?.running_records,
                  cycling_records: profile?.cycling_records,
                  swimming_records: profile?.swimming_records,
                  triathlon_records: profile?.triathlon_records,
                  walking_records: profile?.walking_records,
                }}
              />
            </div>
          </IOSListGroup>
        </div>

        {!isViewingOtherUser && isEditing && (
          <ProfileEditCard
            formData={formData}
            setFormData={setFormData}
            onSave={updateProfile}
            onCancel={() => {
              setIsEditing(false);
              setAvatarFile(null);
              setAvatarPreview("");
              setFormData(profile || {});
            }}
            saving={loading}
          />
        )}

        <div className="box-border min-w-0 w-full max-w-full border-b border-border/60 bg-card px-4 py-3 ios-shell:px-2.5">
          <StravaConnect profile={profile} isOwnProfile={!isViewingOtherUser} onProfileUpdate={fetchProfile} />
        </div>

        {/* Follow Dialog */}
        <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} targetUserId={viewingUserId || undefined} />

        {!isViewingOtherUser && (
          <ReliabilityDetailsDialog
            open={showReliabilityDialog}
            onOpenChange={setShowReliabilityDialog}
            reliabilityRate={reliabilityRate ?? 100}
            totalSessionsCreated={totalSessionsCreated}
            totalSessionsJoined={totalSessionsJoined}
            totalSessionsCompleted={totalSessionsCompleted}
          />
        )}

        {/* Settings Dialog */}
        <Suspense fallback={null}>
          <SettingsDialog
            open={showSettingsDialog}
            onOpenChange={(open) => {
              setShowSettingsDialog(open);
              if (!open) setSettingsInitialPage(undefined);
            }}
            initialSearch={settingsFocus}
            initialPage={settingsInitialPage}
          />
        </Suspense>

        {/* Report User Dialog */}
        <ReportUserDialog isOpen={showReportDialog} onClose={() => setShowReportDialog(false)} reportedUserId={viewingUserId || ""} reportedUsername={profile?.username || ""} />

        {/* Image Crop Editor */}
        <ImageCropEditor
          open={showCropEditor}
          onClose={() => setShowCropEditor(false)}
          imageSrc={originalImageSrc}
          onCropComplete={(blob) => {
            void handleCropComplete(blob);
          }}
        />

        </div>
      </div>
      </div>
    </div>
  );
};
export default Profile;