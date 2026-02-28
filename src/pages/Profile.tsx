import { useState, useEffect } from "react";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { Switch } from "@/components/ui/switch";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { User, Settings, LogOut, Crown, Camera, Users, Heart, Sun, Moon, Key, Bell, Shield, FileText, Mail, Route, MapPin, Calendar, Trash2, Share2, Volume2, Flag, ChevronRight, ChevronLeft, Award } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { ContactsPermissionButton } from "@/components/ContactsPermissionButton";
import { PushNotificationButton } from "@/components/PushNotificationButton";

import { StravaConnect } from "@/components/StravaConnect";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ReportUserDialog } from "@/components/ReportUserDialog";

import { UserActivityChart } from "@/components/UserActivityChart";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import { PersonalRecords } from "@/components/PersonalRecords";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProfileRankBadgeCompact } from "@/components/profile/ProfileRankBadgeCompact";
import { ProfileStatsGroup } from "@/components/profile/ProfileStatsGroup";
import { StreakBadge } from "@/components/StreakBadge";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { AdminPremiumManager } from "@/components/AdminPremiumManager";
import { PersonalGoals } from "@/components/profile/PersonalGoals";
interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
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
  const [showAdminPremium, setShowAdminPremium] = useState(false);
  const [reliabilityRate, setReliabilityRate] = useState(0);
  const [showReliabilityDetails, setShowReliabilityDetails] = useState(false);
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
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
      fetchReliabilityRate(); // Fetch for all profiles
      if (!isViewingOtherUser) {
        fetchUserRoutes();
      } else {
        fetchCommonClubs();
        // Fetch connection history only for creator
        if (user?.email === 'ferdinand.froidefont@gmail.com') {
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
    if (!viewingUserId || !user || user.email !== 'ferdinand.froidefont@gmail.com') return;
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
  const fetchReliabilityRate = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('user_stats').select('reliability_rate, total_sessions_completed, total_sessions_joined').eq('user_id', targetUserId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setReliabilityRate(data.reliability_rate || 100);
        setTotalSessionsJoined(data.total_sessions_joined || 0);
        setTotalSessionsCompleted(data.total_sessions_completed || 0);
      }

      // Compter les sessions créées
      const {
        count: createdCount
      } = await supabase.from('sessions').select('id', {
        count: 'exact',
        head: true
      }).eq('organizer_id', targetUserId);
      setTotalSessionsCreated(createdCount || 0);
    } catch (error) {
      console.error('Error fetching reliability rate:', error);
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
      <div className="h-full bg-secondary">
        <ProfilePreviewDialog
          userId={viewingUserId}
          onClose={() => navigate(-1)}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="h-full bg-secondary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="h-full bg-secondary overflow-y-auto">
      {/* Status bar area removed for cleaner iOS look */}
      {/* iOS Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {isViewingOtherUser ? <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-primary">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[17px]">Retour</span>
            </button> : <div className="w-16" />}
          <h1 className="text-[17px] font-semibold text-foreground">
            {isViewingOtherUser ? 'Profil' : 'Mon Profil'}
          </h1>
          {!isViewingOtherUser ? <button onClick={() => setShowSettingsDialog(true)} className="w-16 flex justify-end">
              <Settings className="h-5 w-5 text-primary" />
            </button> : <div className="w-16" />}
        </div>
      </div>

      <div className="max-w-md mx-auto py-4 space-y-4">
        {/* Profile Header - iOS Style Premium */}
        <div className="flex flex-col items-center pt-4 pb-2">
          {/* Avatar with subtle shadow */}
          <div className="relative mb-3">
            <Avatar className="h-20 w-20 ring-[3px] ring-white shadow-lg">
              <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/40">
                {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
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
                    toast({
                      title: "Erreur",
                      description: "Impossible d'accéder à la galerie",
                      variant: "destructive"
                    });
                  }
                }} 
                disabled={cameraLoading} 
                className="absolute bottom-0 right-0 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          {isEditing && !isViewingOtherUser && (
            <input id="avatar-upload" type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} className="hidden" />
          )}
          
          {/* Display Name - Primary */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <h2 className="text-[22px] font-bold text-foreground">
              {profile?.display_name || profile?.username}
            </h2>
            {/* Couronne uniquement si le profil visualisé est premium */}
            {profile?.is_premium && (
              <Crown className="h-4 w-4 text-yellow-500" />
            )}
          </div>
          
          {/* Username - Secondary */}
          <p className="text-[14px] text-muted-foreground mb-2">
            @{profile?.username}
          </p>
          
          {/* Status Badges - Compact Inline */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {/* Badge Admin uniquement si le profil visualisé est admin, sinon Membre */}
            {isAdmin ? (
              <Badge className="bg-red-100 text-red-700 border-0 text-[11px] px-2 py-0.5 font-medium">
                Admin
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-0 text-[11px] px-2 py-0.5 font-medium">
                Membre
              </Badge>
            )}
            {/* Badge Premium uniquement basé sur le profil, pas sur subscriptionInfo de l'utilisateur connecté */}
            {profile?.is_premium && (
              <Badge className="bg-orange-100 text-orange-700 border-0 text-[11px] px-2 py-0.5 font-medium">
                Premium
              </Badge>
            )}
            {profile?.strava_connected && profile?.strava_verified_at && (
              <Badge className="bg-orange-100 text-orange-600 border-0 text-[11px] px-2 py-0.5 font-medium">
                Strava ✓
              </Badge>
            )}
            {profile?.instagram_connected && profile?.instagram_verified_at && (
              <Badge className="bg-pink-100 text-pink-600 border-0 text-[11px] px-2 py-0.5 font-medium">
                Instagram ✓
              </Badge>
            )}
          </div>
          
          {/* Stats Row - Instagram/Strava Style */}
          <div className="flex items-center justify-center gap-8 py-3 w-full">
            <button 
              onClick={() => {
                setFollowDialogType('followers');
                setShowFollowDialog(true);
              }} 
              className="text-center min-w-[60px] active:opacity-70 transition-opacity"
            >
              <p className="text-[20px] font-bold text-foreground">{followerCount}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnés</p>
            </button>
            <div className="w-px h-8 bg-border/60" />
            <button 
              onClick={() => {
                setFollowDialogType('following');
                setShowFollowDialog(true);
              }} 
              className="text-center min-w-[60px] active:opacity-70 transition-opacity"
            >
              <p className="text-[20px] font-bold text-foreground">{followingCount}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Abonnements</p>
            </button>
            <div className="w-px h-8 bg-border/60" />
            <div className="text-center min-w-[60px]">
              <p className="text-[20px] font-bold text-foreground">{totalSessionsCreated}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Séances</p>
            </div>
          </div>
          
          {/* Bio - Juste sous les stats */}
          {profile?.bio && (
            <p className="text-[14px] text-muted-foreground text-center max-w-[280px] mt-3 leading-relaxed">
              {profile.bio}
            </p>
          )}
          
          {/* Reliability Badge - Compact */}
          <div className="w-full max-w-[160px] mt-3">
            <ReliabilityBadge rate={reliabilityRate} onClick={() => setShowReliabilityDetails(true)} />
          </div>
          
          {/* Action Buttons */}
          {!isViewingOtherUser && !subscriptionInfo?.subscribed && (
            <Button onClick={() => navigate('/subscription')} variant="outline" size="sm" className="mt-3 gap-1.5 h-8 text-[13px]">
              <Crown className="h-3.5 w-3.5" />
              Devenir Premium
            </Button>
          )}
          
          {isViewingOtherUser && (
            <Button onClick={() => setShowReportDialog(true)} variant="ghost" size="sm" className="mt-3 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 text-[13px]">
              <Flag className="h-3.5 w-3.5" />
              Signaler
            </Button>
          )}
        </div>

        {/* Streak Badge */}
        {!isViewingOtherUser && user && <StreakBadge userId={user.id} variant="full" />}
        {isViewingOtherUser && viewingUserId && <StreakBadge userId={viewingUserId} variant="full" />}

        {/* Objectifs personnels - Own profile only */}
        {!isViewingOtherUser && <PersonalGoals />}

        {/* Classement, Badges & Activités - iOS Style Group */}
        {!isViewingOtherUser ? (
          <ProfileStatsGroup userId={user?.id || ''} onSettingsClick={() => setShowSettingsDialog(true)} onInfoClick={() => setIsEditing(!isEditing)}>
            <div className="h-px bg-border ml-[54px]" />
            <PersonalRecords records={{
              running_records: profile?.running_records,
              cycling_records: profile?.cycling_records,
              swimming_records: profile?.swimming_records,
              triathlon_records: profile?.triathlon_records,
              walking_records: profile?.walking_records
            }} />
            <div className="h-px bg-border ml-[54px]" />
            <div onClick={() => navigate('/my-sessions')} className="flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors cursor-pointer">
              <div className="h-[30px] w-[30px] rounded-[7px] bg-teal-500 flex items-center justify-center">
                <Route className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] text-foreground">Voir mes séances et itinéraires</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div className="h-px bg-border ml-[54px]" />
            <div onClick={() => navigate('/route-creation')} className="flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors cursor-pointer">
              <div className="h-[30px] w-[30px] rounded-[7px] bg-purple-500 flex items-center justify-center">
                <MapPin className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] text-foreground">Créer un parcours</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </ProfileStatsGroup>
        ) : (
          <ProfileStatsGroup userId={viewingUserId || ''}>
            <div className="h-px bg-border ml-[54px]" />
            <PersonalRecords records={{
              running_records: profile?.running_records,
              cycling_records: profile?.cycling_records,
              swimming_records: profile?.swimming_records,
              triathlon_records: profile?.triathlon_records,
              walking_records: profile?.walking_records
            }} />
            <div className="h-px bg-border ml-[54px]" />
            <div onClick={() => navigate(`/my-sessions?user=${viewingUserId}`)} className="flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors cursor-pointer">
              <div className="h-[30px] w-[30px] rounded-[7px] bg-teal-500 flex items-center justify-center">
                <Route className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[17px] text-foreground">Voir ses séances et itinéraires</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </div>
          </ProfileStatsGroup>
        )}

        {/* iOS List Groups */}
        
        {/* Informations Section - Own Profile (editing form) */}
        {!isViewingOtherUser && isEditing && <div className="bg-card overflow-hidden">
            <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Pseudo</label>
                  <Input value={formData.username || ''} onChange={e => setFormData({
              ...formData,
              username: e.target.value
            })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Nom d'affichage</label>
                  <Input value={formData.display_name || ''} onChange={e => setFormData({
              ...formData,
              display_name: e.target.value
            })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Âge</label>
                  <Input type="number" value={formData.age || ''} onChange={e => setFormData({
              ...formData,
              age: parseInt(e.target.value) || null
            })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Téléphone</label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({
              ...formData,
              phone: e.target.value
            })} placeholder="06 12 34 56 78" className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Bio</label>
                  <Input value={formData.bio || ''} onChange={e => setFormData({
              ...formData,
              bio: e.target.value
            })} placeholder="Décrivez vos records, vos objectifs..." className="h-11 rounded-[8px]" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={updateProfile} disabled={loading} className="flex-1 h-11 rounded-[8px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => {
              setIsEditing(false);
              setAvatarFile(null);
              setAvatarPreview("");
              setFormData(profile || {});
            }} className="flex-1 h-11 rounded-[8px]">
                    Annuler
                  </Button>
                </div>
              </div>
          </div>}



        {/* Common Clubs - Other Users */}
        {isViewingOtherUser && commonClubs.length > 0 && <div>
            <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 pb-2">
              Clubs en commun ({commonClubs.length})
            </p>
            <div className="bg-card overflow-hidden">
              {commonClubs.map((club, index) => <div key={club.club_id} className="relative">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-[30px] w-[30px] rounded-[7px] bg-green-500 flex items-center justify-center">
                      <Users className="h-[18px] w-[18px] text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] text-foreground">{club.club_name}</p>
                      {club.club_description && <p className="text-[13px] text-muted-foreground truncate">{club.club_description}</p>}
                    </div>
                  </div>
                  {index < commonClubs.length - 1 && <div className="absolute bottom-0 left-[52px] right-0 h-px bg-border" />}
                </div>)}
            </div>
          </div>}

        {/* Connection History - Admin Only */}
        {isViewingOtherUser && user?.email === 'ferdinand.froidefont@gmail.com' && connectionHistory.length > 0 && <div>
            <p className="text-[13px] text-muted-foreground uppercase tracking-wide px-4 pb-2">
              Historique des connexions
            </p>
            <div className="bg-card overflow-hidden">
              {connectionHistory.map((log, index) => <div key={index} className="relative">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] text-muted-foreground">{log.action}</span>
                    <span className="text-[13px] font-mono text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                    </span>
                  </div>
                  {index < connectionHistory.length - 1 && <div className="absolute bottom-0 left-4 right-0 h-px bg-border" />}
                </div>)}
            </div>
          </div>}

        {/* Historique d'activité */}
        <ActivityTimeline userId={viewingUserId || user?.id || ''} />

        
        {/* Admin Premium Manager - Creator only */}
        {!isViewingOtherUser && user?.email === 'ferdinand.froidefont@gmail.com' && (
          <div className="bg-card rounded-[10px] overflow-hidden">
            <button
              onClick={() => setShowAdminPremium(true)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
            >
              <div className="h-[30px] w-[30px] rounded-[7px] bg-yellow-500 flex items-center justify-center">
                <Crown className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[17px] text-foreground">Gestion Premium</p>
                <p className="text-[13px] text-muted-foreground">Offrir ou retirer des abonnements</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </button>
          </div>
        )}
        

        {/* Strava Connect Section */}
        <StravaConnect profile={profile} isOwnProfile={!isViewingOtherUser} onProfileUpdate={fetchProfile} />

        {/* Follow Dialog */}
        <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} targetUserId={viewingUserId || undefined} />

        {/* Settings Dialog */}
        <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} initialSearch={settingsFocus} />

        {/* Report User Dialog */}
        <ReportUserDialog isOpen={showReportDialog} onClose={() => setShowReportDialog(false)} reportedUserId={viewingUserId || ""} reportedUsername={profile?.username || ""} />

        {/* Reliability Details Dialog - Pour tous les profils */}
        <ReliabilityDetailsDialog open={showReliabilityDetails} onOpenChange={setShowReliabilityDetails} userName={profile?.username || profile?.display_name || ''} reliabilityRate={reliabilityRate} totalSessionsCreated={totalSessionsCreated} totalSessionsJoined={totalSessionsJoined} totalSessionsCompleted={totalSessionsCompleted} />

        {/* Image Crop Editor */}
        <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />

        {/* Admin Premium Manager Dialog */}
        <AdminPremiumManager open={showAdminPremium} onOpenChange={setShowAdminPremium} />
      </div>
    </div>;
};
export default Profile;