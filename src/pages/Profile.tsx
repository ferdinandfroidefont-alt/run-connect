import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Settings, LogOut, Crown, Camera, Users, Heart, Sun, Moon, Key, Bell, Shield, FileText, Mail, Route, MapPin, Calendar, Trash2, Share2, Volume2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { ContactsPermissionButton } from "@/components/ContactsPermissionButton";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { useAppContext } from "@/contexts/AppContext";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
  is_premium: boolean;
  notifications_enabled?: boolean;
  rgpd_accepted?: boolean;
  security_rules_accepted?: boolean;
  running_records?: any;
  cycling_records?: any;
  swimming_records?: any;
  triathlon_records?: any;
  walking_records?: any;
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
  const { user, signOut, subscriptionInfo, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewingUserId = searchParams.get('user'); // ID de l'utilisateur à voir
  const isViewingOtherUser = viewingUserId && viewingUserId !== user?.id;
  const { theme, setTheme } = useTheme();
  const { shareProfile } = useShareProfile();
  const { soundEnabled, setSoundEnabled } = useAppContext();
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
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFollowCounts();
      if (!isViewingOtherUser) {
        fetchUserRoutes();
      } else {
        fetchCommonClubs();
      }
    }
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user, viewingUserId, isViewingOtherUser]);

  const fetchFollowCounts = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;

    try {
      // Get follower count
      const { data: followerData } = await supabase.rpc('get_follower_count', { 
        profile_user_id: targetUserId 
      });
      
      // Get following count
      const { data: followingData } = await supabase.rpc('get_following_count', { 
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
      const { data, error } = await supabase.rpc('get_common_clubs', {
        user_1_id: user.id,
        user_2_id: viewingUserId
      });

      if (error) throw error;
      setCommonClubs(data || []);
    } catch (error) {
      console.error('Error fetching common clubs:', error);
    }
  };

  const fetchUserRoutes = async () => {
    if (!user) return;

    setRoutesLoading(true);
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, description, total_distance, total_elevation_gain, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserRoutes(data || []);
    } catch (error) {
      console.error('Error fetching user routes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos parcours",
        variant: "destructive",
      });
    } finally {
      setRoutesLoading(false);
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId)
        .eq('created_by', user?.id);

      if (error) throw error;

      setUserRoutes(prev => prev.filter(route => route.id !== routeId));
      toast({
        title: "Parcours supprimé",
        description: "Le parcours a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le parcours",
        variant: "destructive",
      });
    }
  };

  const fetchProfile = async () => {
    try {
      const targetUserId = viewingUserId || user?.id;
      if (!targetUserId) return;

      if (isViewingOtherUser) {
        // Viewing another user's profile - use public profile function
        const { data, error } = await supabase.rpc('get_public_profile_safe', {
          profile_user_id: targetUserId
        });
        
        if (error) throw error;
        if (data && data.length > 0) {
          // Pour les profils publics, on ajoute des valeurs par défaut pour les champs manquants
          const publicProfile = {
            ...data[0],
            phone: null, // Les profils publics ne montrent pas le téléphone
            notifications_enabled: false,
            rgpd_accepted: false,
            security_rules_accepted: false
          };
          setProfile(publicProfile);
          setFormData(publicProfile);
        }
      } else {
        // Viewing own profile - get full profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', targetUserId)
          .single();

        if (error) throw error;
        setProfile(data);
        setFormData(data);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
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
          variant: "destructive",
        });
        return;
      }

      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "La taille du fichier ne doit pas dépasser 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setOriginalImageSrc(imageSrc);
        setShowCropEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImageBlob: Blob) => {
    // Créer un fichier à partir du blob croppé
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
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

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ...formData, avatar_url: avatarUrl })
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setProfile({ ...profile!, ...formData, avatar_url: avatarUrl });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      toast({
        title: "Profil mis à jour !",
        description: "Vos modifications ont été sauvegardées.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé !",
        description: "Vérifiez votre boîte email pour réinitialiser votre mot de passe.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
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
          await supabase
            .from('profiles')
            .update({ notifications_enabled: permission === 'granted' })
            .eq('user_id', user.id);
        }
        
        toast({
          title: permission === 'granted' ? "Notifications activées" : "Notifications refusées",
          description: permission === 'granted' ? 
            "Vous recevrez désormais des notifications." : 
            "Vous ne recevrez pas de notifications."
        });
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const updatePrivacySettings = async (field: string, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, [field]: value } : null);
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center py-8">
          <div className="flex items-center gap-3 justify-center mb-2">
            {isViewingOtherUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="gap-2"
              >
                ← Retour
              </Button>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {isViewingOtherUser ? 'Profil utilisateur' : 'Mon Profil'}
            </h1>
          </div>
        </div>

        {/* Avatar Section */}
        <Card>
          <CardContent className="flex flex-col items-center py-6">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
                <AvatarFallback className="text-lg">
                  {profile?.display_name?.[0]?.toUpperCase() || 
                   profile?.username?.[0]?.toUpperCase() || 
                   user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              {isEditing && !isViewingOtherUser && (
                <label 
                  htmlFor="avatar-upload" 
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90"
                >
                  <Camera className="h-4 w-4" />
                </label>
              )}
            </div>
            {isEditing && !isViewingOtherUser && (
              <>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Cliquez sur l'icône pour changer votre photo
                </p>
              </>
            )}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold">{profile?.username || profile?.display_name}</h2>
              {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                <Crown className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            {!isViewingOtherUser && (
              <div className="flex gap-2 items-center mb-4">
                {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                    {subscriptionInfo?.subscription_tier || 'Premium'}
                  </Badge>
                )}
                {!subscriptionInfo?.subscribed && (
                  <Button 
                    onClick={() => navigate('/subscription')}
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Devenir Premium
                  </Button>
                )}
              </div>
            )}
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => {
                  setFollowDialogType('followers');
                  setShowFollowDialog(true);
                }}
                className="text-center hover:text-primary transition-colors"
              >
                <p className="font-bold text-lg">{followerCount}</p>
                <p className="text-sm text-muted-foreground">Abonnés</p>
              </button>
              <button
                onClick={() => {
                  setFollowDialogType('following');
                  setShowFollowDialog(true);
                }}
                className="text-center hover:text-primary transition-colors"
              >
                <p className="font-bold text-lg">{followingCount}</p>
                <p className="text-sm text-muted-foreground">Abonnements</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Informations Section - Only for own profile */}
        {!isViewingOtherUser && (
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <User className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-lg">Informations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Pseudo</label>
                  <Input
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nom d'affichage</label>
                  <Input
                    value={formData.display_name || ''}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Âge</label>
                  <Input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Téléphone</label>
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bio</label>
                  <Input
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Décrivez vos records, vos objectifs..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={updateProfile} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsEditing(false);
                    setAvatarFile(null);
                    setAvatarPreview("");
                    setFormData(profile || {});
                  }}>
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Pseudo</p>
                  <p className="font-medium">{profile?.username}</p>
                </div>
                {profile?.display_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Nom d'affichage</p>
                    <p className="font-medium">{profile.display_name}</p>
                  </div>
                )}
                {profile?.age && (
                  <div>
                    <p className="text-sm text-muted-foreground">Âge</p>
                    <p className="font-medium">{profile.age} ans</p>
                  </div>
                )}
                {profile?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                )}
                {profile?.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bio</p>
                    <p className="font-medium">{profile.bio}</p>
                  </div>
                )}
                {!isViewingOtherUser && (
                  <Button onClick={() => setIsEditing(true)} className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Modifier le profil
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Bio Section - Only for other users */}
        {isViewingOtherUser && profile?.bio && (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <User className="h-5 w-5 text-primary mr-2" />
                <CardTitle className="text-lg">Bio</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Records Section - For other users */}
        {isViewingOtherUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Crown className="h-5 w-5 text-primary mr-2" />
                <CardTitle className="text-lg">Records</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Running Records */}
              {profile?.running_records && typeof profile.running_records === 'object' && Object.keys(profile.running_records).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    🏃‍♂️ Course à pied
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(profile.running_records).map(([distance, time]) => (
                      <div key={distance} className="flex justify-between bg-muted/50 p-2 rounded">
                        <span>{distance}</span>
                        <span className="font-medium">{String(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cycling Records */}
              {profile?.cycling_records && typeof profile.cycling_records === 'object' && Object.keys(profile.cycling_records).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    🚴‍♂️ Cyclisme
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(profile.cycling_records).map(([distance, time]) => (
                      <div key={distance} className="flex justify-between bg-muted/50 p-2 rounded">
                        <span>{distance}</span>
                        <span className="font-medium">{String(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Swimming Records */}
              {profile?.swimming_records && typeof profile.swimming_records === 'object' && Object.keys(profile.swimming_records).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    🏊‍♂️ Natation
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(profile.swimming_records).map(([distance, time]) => (
                      <div key={distance} className="flex justify-between bg-muted/50 p-2 rounded">
                        <span>{distance}</span>
                        <span className="font-medium">{String(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triathlon Records */}
              {profile?.triathlon_records && typeof profile.triathlon_records === 'object' && Object.keys(profile.triathlon_records).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    🏊‍♂️🚴‍♂️🏃‍♂️ Triathlon
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {Object.entries(profile.triathlon_records).map(([distance, time]) => (
                      <div key={distance} className="flex justify-between bg-muted/50 p-2 rounded">
                        <span>{distance}</span>
                        <span className="font-medium">{String(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walking Records */}
              {profile?.walking_records && typeof profile.walking_records === 'object' && Object.keys(profile.walking_records).length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    🚶‍♂️ Marche
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(profile.walking_records).map(([distance, time]) => (
                      <div key={distance} className="flex justify-between bg-muted/50 p-2 rounded">
                        <span>{distance}</span>
                        <span className="font-medium">{String(time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No records message */}
              {(!profile?.running_records || typeof profile.running_records !== 'object' || Object.keys(profile.running_records).length === 0) &&
               (!profile?.cycling_records || typeof profile.cycling_records !== 'object' || Object.keys(profile.cycling_records).length === 0) &&
               (!profile?.swimming_records || typeof profile.swimming_records !== 'object' || Object.keys(profile.swimming_records).length === 0) &&
               (!profile?.triathlon_records || typeof profile.triathlon_records !== 'object' || Object.keys(profile.triathlon_records).length === 0) &&
               (!profile?.walking_records || typeof profile.walking_records !== 'object' || Object.keys(profile.walking_records).length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Crown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun record enregistré</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Common Clubs Section - For other users */}
        {isViewingOtherUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                <CardTitle className="text-lg">Clubs en commun ({commonClubs.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {commonClubs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun club en commun</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commonClubs.map((club) => (
                    <div key={club.club_id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{club.club_name}</h4>
                        {club.club_description && (
                          <p className="text-xs text-muted-foreground mt-1">{club.club_description}</p>
                        )}
                        {club.club_code && club.created_by === user?.id && (
                          <p className="text-xs text-primary mt-1">Code: {club.club_code}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mes Parcours Section - Only for own profile */}
        {!isViewingOtherUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Route className="h-5 w-5 text-primary mr-2" />
                  <CardTitle className="text-lg">Mes Parcours ({userRoutes.length})</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate('/my-sessions')}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Route className="h-4 w-4" />
                    Voir mes séances/itinéraires
                  </Button>
                  <Button
                    onClick={() => navigate('/')}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    Créer
                  </Button>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            {routesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : userRoutes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun parcours créé</p>
                <p className="text-xs">Utilisez le bouton crayon sur la carte pour créer votre premier parcours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userRoutes.slice(0, 3).map((route) => (
                  <div key={route.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{route.name}</h4>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(route.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {route.description && (
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {route.description}
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {route.total_distance && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {Math.round(route.total_distance / 1000 * 10) / 10} km
                          </span>
                        )}
                        {route.total_elevation_gain && (
                          <span className="flex items-center gap-1">
                            ↗️ {Math.round(route.total_elevation_gain)} m
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteRoute(route.id)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {userRoutes.length > 3 && (
                  <div className="text-center pt-2">
                    <Button
                      onClick={() => navigate('/my-sessions')}
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary"
                    >
                      Voir tous les itinéraires ({userRoutes.length})
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Follow Dialog */}
        <FollowDialog
          open={showFollowDialog}
          onOpenChange={setShowFollowDialog}
          type={followDialogType}
          followerCount={followerCount}
          followingCount={followingCount}
          targetUserId={viewingUserId || undefined}
        />

        {/* Image Crop Editor */}
        <ImageCropEditor
          open={showCropEditor}
          onClose={() => setShowCropEditor(false)}
          imageSrc={originalImageSrc}
          onCropComplete={handleCropComplete}
        />
      </div>
    </div>
  );
};

export default Profile;