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
import { Settings, LogOut, Crown, Camera, Users, Sun, Moon, Key, Bell, Shield, FileText, Mail, Route, MapPin, Calendar, Trash2, Share2, Volume2, Flag, ChevronRight, ChevronLeft, Award, ChevronDown } from "lucide-react";
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
import { ProfileStatsGroup } from "@/components/profile/ProfileStatsGroup";
import { PersonalGoals } from "@/components/profile/PersonalGoals";
import { ProfileQuickStats } from "@/components/profile/ProfileQuickStats";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { SportsBadges } from "@/components/profile/SportsBadges";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { hasCreatorSupportAccess } from "@/lib/creatorSupportAccess";
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-secondary">
      <div className="ios-scroll-region">
      {/* Cover Image - Facebook Style */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10">
          {(coverPreview || profile?.cover_image_url) ? (
            <img 
              src={coverPreview || profile?.cover_image_url || ''} 
              alt="Couverture" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20" />
          )}
          {/* Overlay gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          {/* Top bar buttons */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-ios-4 z-10 pt-[max(0.75rem,var(--safe-area-top))]">
            {isViewingOtherUser ? (
              <button onClick={() => navigate(-1)} className="flex items-center gap-ios-1 text-white drop-shadow-lg">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-ios-headline">Retour</span>
              </button>
            ) : <div className="w-16" />}
            <div className="flex items-center gap-ios-2">
              {!isViewingOtherUser && (
                <>
                  <label className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer active:bg-black/60 transition-colors">
                    <Camera className="h-4 w-4 text-white" />
                    <input type="file" accept="image/*" onChange={handleCoverImageChange} className="hidden" />
                  </label>
                  <button onClick={() => setShowSettingsDialog(true)} className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
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

      <div className="mx-auto w-full min-w-0 max-w-md space-y-ios-3 pb-ios-4">
        {/* Name, username, bio */}
        <div className="flex flex-col items-center px-ios-4 pb-ios-1 pt-ios-2">
          <div className="mb-0.5 flex items-center gap-ios-2">
            <h2 className="text-ios-title2 font-bold text-foreground">
              {profile?.display_name || profile?.username}
            </h2>
            {profile?.is_premium && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          
          <p className="mb-ios-1 text-ios-subheadline text-muted-foreground">
            @{profile?.username}
          </p>

          {/* Action Buttons */}
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

        {/* Sports Badges */}
        <div className="px-ios-4">
          <SportsBadges
            runningRecords={profile?.running_records}
            cyclingRecords={profile?.cycling_records}
            swimmingRecords={profile?.swimming_records}
            triathlonRecords={profile?.triathlon_records}
            walkingRecords={profile?.walking_records}
          />
        </div>

        {/* Quick Stats */}
        <div className="px-ios-4">
          <ProfileQuickStats
            userId={viewingUserId || user?.id || ''}
            followerCount={followerCount}
            followingCount={followingCount}
            onFollowersClick={() => { setFollowDialogType('followers'); setShowFollowDialog(true); }}
            onFollowingClick={() => { setFollowDialogType('following'); setShowFollowDialog(true); }}
          />
        </div>

        {/* Recent Activities */}
        <div className="px-ios-4">
          <p className="pb-ios-1 text-ios-footnote uppercase tracking-wide text-muted-foreground">
            Activités récentes
          </p>
          <RecentActivities userId={viewingUserId || user?.id || ''} />
        </div>

        {/* Objectifs personnels - Own profile only */}
        {!isViewingOtherUser && <PersonalGoals />}

        {/* Séances & Parcours links */}
        <div className="px-ios-4">
          <IOSListGroup flush={false} className="mb-0">
            <IOSListItem
              icon={Route}
              iconBgColor="bg-primary/80"
              iconColor="text-primary-foreground"
              title={!isViewingOtherUser ? 'Mes séances et itinéraires' : 'Ses séances et itinéraires'}
              onClick={() => navigate(!isViewingOtherUser ? '/my-sessions' : `/my-sessions?user=${viewingUserId}`)}
              showSeparator={!isViewingOtherUser}
            />
            {!isViewingOtherUser && (
              <IOSListItem
                icon={MapPin}
                iconBgColor="bg-accent/80"
                iconColor="text-accent-foreground"
                title="Créer un parcours"
                onClick={() => navigate('/route-creation')}
                showSeparator={false}
              />
            )}
          </IOSListGroup>
        </div>

        {/* Collapsible Achievements Section */}
        <div className="px-ios-4">
          <Collapsible>
            <CollapsibleTrigger className="group flex w-full items-center justify-between py-ios-1">
              <p className="text-ios-footnote text-muted-foreground uppercase tracking-wide">
                Succès & Records
              </p>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-ios-2">
              {/* Personal Goals - Own profile only */}
              {!isViewingOtherUser && <PersonalGoals />}

              {/* Classement, Badges & Activités */}
              {!isViewingOtherUser ? (
                <ProfileStatsGroup userId={user?.id || ''} onSettingsClick={() => setShowSettingsDialog(true)} onInfoClick={() => setIsEditing(!isEditing)} />
              ) : (
                <ProfileStatsGroup userId={viewingUserId || ''} />
              )}

              {/* Personal Records */}
              <div className="ios-card overflow-hidden">
                <PersonalRecords records={{
                  running_records: profile?.running_records,
                  cycling_records: profile?.cycling_records,
                  swimming_records: profile?.swimming_records,
                  triathlon_records: profile?.triathlon_records,
                  walking_records: profile?.walking_records
                }} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Informations Section - Own Profile (editing form) */}
        {!isViewingOtherUser && isEditing && <div className="ios-card overflow-hidden">
            <div className="space-y-ios-3 px-ios-4 py-ios-3">
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
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Sport favori</label>
                  <select
                    value={formData.favorite_sport || ''}
                    onChange={e => setFormData({ ...formData, favorite_sport: e.target.value || null })}
                    className="w-full h-11 rounded-ios-sm bg-background border border-input px-ios-3 text-ios-subheadline"
                  >
                    <option value="">Non spécifié</option>
                    <option value="running">🏃 Course à pied</option>
                    <option value="cycling">🚴 Cyclisme</option>
                    <option value="triathlon">🏅 Triathlon</option>
                    <option value="swimming">🏊 Natation</option>
                    <option value="walking">🚶 Marche</option>
                    <option value="trail">🏔️ Trail</option>
                  </select>
                </div>
                <div>
                  <label className="text-ios-footnote text-muted-foreground mb-ios-1 block">Pays</label>
                  <select
                    value={formData.country || ''}
                    onChange={e => setFormData({ ...formData, country: e.target.value || null })}
                    className="w-full h-11 rounded-ios-sm bg-background border border-input px-ios-3 text-ios-subheadline"
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
          </div>}

        {/* Strava Connect Section */}
        <div className="px-ios-4">
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
  );
};
export default Profile;