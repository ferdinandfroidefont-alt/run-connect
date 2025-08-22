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
import { useNavigate } from "react-router-dom";
import { User, Settings, LogOut, Crown, Camera, Users, Heart, Sun, Moon, Key, Bell, Shield, FileText, Mail, X, Smartphone, Share2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { FollowDialog } from "@/components/FollowDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useShareProfile } from "@/hooks/useShareProfile";
import { ContactsPermissionButton } from "./ContactsPermissionButton";

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
  allow_friend_suggestions?: boolean;
  walking_records?: any;
  running_records?: any;
  cycling_records?: any;
  swimming_records?: any;
}

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { user, signOut, subscriptionInfo, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { shareProfile } = useShareProfile();
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
  const [recordsData, setRecordsData] = useState<{
    walking: Record<string, string>;
    running: Record<string, string>;
    cycling: Record<string, string>;
    swimming: Record<string, string>;
  }>({
    walking: { '5k': '', '10k': '', '21k': '', '42k': '' },
    running: { '5k': '', '10k': '', '21k': '', '42k': '' },
    cycling: { '25k': '', '50k': '', '100k': '', '200k': '' },
    swimming: { '100m': '', '500m': '', '1000m': '', '1500m': '' }
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchProfile();
      fetchFollowCounts();
    }
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [user, open]);

  const fetchFollowCounts = async () => {
    if (!user) return;

    try {
      const { data: followerData } = await supabase.rpc('get_follower_count', { 
        profile_user_id: user.id 
      });
      
      const { data: followingData } = await supabase.rpc('get_following_count', { 
        profile_user_id: user.id 
      });
      
      setFollowerCount(followerData || 0);
      setFollowingCount(followingData || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData(data);
      // Initialize records data safely
      const defaultRecords = {
        walking: { '5k': '', '10k': '', '21k': '', '42k': '' },
        running: { '5k': '', '10k': '', '21k': '', '42k': '' },
        cycling: { '25k': '', '50k': '', '100k': '', '200k': '' },
        swimming: { '100m': '', '500m': '', '1000m': '', '1500m': '' }
      };
      
      setRecordsData({
        walking: (data.walking_records && typeof data.walking_records === 'object') ? 
          { ...defaultRecords.walking, ...data.walking_records } : defaultRecords.walking,
        running: (data.running_records && typeof data.running_records === 'object') ? 
          { ...defaultRecords.running, ...data.running_records } : defaultRecords.running,
        cycling: (data.cycling_records && typeof data.cycling_records === 'object') ? 
          { ...defaultRecords.cycling, ...data.cycling_records } : defaultRecords.cycling,
        swimming: (data.swimming_records && typeof data.swimming_records === 'object') ? 
          { ...defaultRecords.swimming, ...data.swimming_records } : defaultRecords.swimming
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un fichier image.",
          variant: "destructive",
        });
        return;
      }

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
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(croppedFile);
    
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
        .update({ 
          ...formData, 
          avatar_url: avatarUrl,
          walking_records: recordsData.walking,
          running_records: recordsData.running,
          cycling_records: recordsData.cycling,
          swimming_records: recordsData.swimming
        })
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

  const handleSignOut = () => {
    signOut();
    onOpenChange(false);
  };

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="text-center text-2xl font-bold">Mon Profil</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="space-y-4 pb-4 min-h-full"
                 style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
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
                    {isEditing && (
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90"
                      >
                        <Camera className="h-4 w-4" />
                      </label>
                    )}
                  </div>
                  {isEditing && (
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
                  <div className="flex gap-2 items-center mb-4">
                    {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                        {subscriptionInfo?.subscription_tier || 'Premium'}
                      </Badge>
                    )}
                    {!subscriptionInfo?.subscribed && (
                      <Button 
                        onClick={() => {
                          navigate('/subscription');
                          onOpenChange(false);
                        }}
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                      >
                        <Crown className="h-4 w-4" />
                        Devenir Premium
                      </Button>
                    )}
                  </div>
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
                           // Reset records data safely
                           const defaultRecords = {
                             walking: { '5k': '', '10k': '', '21k': '', '42k': '' },
                             running: { '5k': '', '10k': '', '21k': '', '42k': '' },
                             cycling: { '25k': '', '50k': '', '100k': '', '200k': '' },
                             swimming: { '100m': '', '500m': '', '1000m': '', '1500m': '' }
                           };
                           
                           setRecordsData({
                             walking: (profile?.walking_records && typeof profile.walking_records === 'object') ? 
                               { ...defaultRecords.walking, ...profile.walking_records } : defaultRecords.walking,
                             running: (profile?.running_records && typeof profile.running_records === 'object') ? 
                               { ...defaultRecords.running, ...profile.running_records } : defaultRecords.running,
                             cycling: (profile?.cycling_records && typeof profile.cycling_records === 'object') ? 
                               { ...defaultRecords.cycling, ...profile.cycling_records } : defaultRecords.cycling,
                             swimming: (profile?.swimming_records && typeof profile.swimming_records === 'object') ? 
                               { ...defaultRecords.swimming, ...profile.swimming_records } : defaultRecords.swimming
                           });
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
                      <Button onClick={() => setIsEditing(true)} className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Modifier le profil
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sports Records Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Records Sportifs</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-6">
                      {/* Walking Records */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          🚶‍♂️ Marche
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(recordsData.walking).map(([distance, time]) => (
                            <div key={distance}>
                              <label className="text-xs font-medium">{distance}</label>
                              <Input
                                placeholder="00:00:00"
                                value={time}
                                onChange={(e) => setRecordsData(prev => ({
                                  ...prev,
                                  walking: { ...prev.walking, [distance]: e.target.value }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Distance custom (ex: 3k)"
                            className="text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const distance = target.value.trim();
                                if (distance && !recordsData.walking[distance]) {
                                  setRecordsData(prev => ({
                                    ...prev,
                                    walking: { ...prev.walking, [distance]: '' }
                                  }));
                                  target.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Running Records */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          🏃‍♂️ Course à pied
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(recordsData.running).map(([distance, time]) => (
                            <div key={distance}>
                              <label className="text-xs font-medium">{distance}</label>
                              <Input
                                placeholder="00:00:00"
                                value={time}
                                onChange={(e) => setRecordsData(prev => ({
                                  ...prev,
                                  running: { ...prev.running, [distance]: e.target.value }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Distance custom (ex: 15k)"
                            className="text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const distance = target.value.trim();
                                if (distance && !recordsData.running[distance]) {
                                  setRecordsData(prev => ({
                                    ...prev,
                                    running: { ...prev.running, [distance]: '' }
                                  }));
                                  target.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Cycling Records */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          🚴‍♂️ Vélo
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(recordsData.cycling).map(([distance, time]) => (
                            <div key={distance}>
                              <label className="text-xs font-medium">{distance}</label>
                              <Input
                                placeholder="00:00:00"
                                value={time}
                                onChange={(e) => setRecordsData(prev => ({
                                  ...prev,
                                  cycling: { ...prev.cycling, [distance]: e.target.value }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Distance custom (ex: 80k)"
                            className="text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const distance = target.value.trim();
                                if (distance && !recordsData.cycling[distance]) {
                                  setRecordsData(prev => ({
                                    ...prev,
                                    cycling: { ...prev.cycling, [distance]: '' }
                                  }));
                                  target.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Swimming Records */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          🏊‍♂️ Natation
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(recordsData.swimming).map(([distance, time]) => (
                            <div key={distance}>
                              <label className="text-xs font-medium">{distance}</label>
                              <Input
                                placeholder="00:00:00"
                                value={time}
                                onChange={(e) => setRecordsData(prev => ({
                                  ...prev,
                                  swimming: { ...prev.swimming, [distance]: e.target.value }
                                }))}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Distance custom (ex: 2000m)"
                            className="text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const distance = target.value.trim();
                                if (distance && !recordsData.swimming[distance]) {
                                  setRecordsData(prev => ({
                                    ...prev,
                                    swimming: { ...prev.swimming, [distance]: '' }
                                  }));
                                  target.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p className="mb-4">Cliquez sur "Modifier le profil" pour ajouter vos records</p>
                      
                      {/* Display existing records if any */}
                      {(profile?.walking_records && typeof profile.walking_records === 'object' && Object.values(profile.walking_records).some(v => v)) && (
                        <div className="text-left mb-4">
                          <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                            🚶‍♂️ Marche
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(profile.walking_records).map(([distance, time]) => 
                              time && (
                                <div key={distance} className="flex justify-between">
                                  <span>{distance}</span>
                                   <span className="font-mono">{String(time)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {(profile?.running_records && typeof profile.running_records === 'object' && Object.values(profile.running_records).some(v => v)) && (
                        <div className="text-left mb-4">
                          <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                            🏃‍♂️ Course à pied
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(profile.running_records).map(([distance, time]) => 
                              time && (
                                <div key={distance} className="flex justify-between">
                                  <span>{distance}</span>
                                   <span className="font-mono">{String(time)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {(profile?.cycling_records && typeof profile.cycling_records === 'object' && Object.values(profile.cycling_records).some(v => v)) && (
                        <div className="text-left mb-4">
                          <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                            🚴‍♂️ Vélo
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(profile.cycling_records).map(([distance, time]) => 
                              time && (
                                <div key={distance} className="flex justify-between">
                                  <span>{distance}</span>
                                   <span className="font-mono">{String(time)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {(profile?.swimming_records && typeof profile.swimming_records === 'object' && Object.values(profile.swimming_records).some(v => v)) && (
                        <div className="text-left mb-4">
                          <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                            🏊‍♂️ Natation
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(profile.swimming_records).map(([distance, time]) => 
                              time && (
                                <div key={distance} className="flex justify-between">
                                  <span>{distance}</span>
                                  <span className="font-mono">{String(time)}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Settings className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Paramètres</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Theme Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Mode clair
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Basculer entre le mode sombre et clair
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === 'light'}
                      onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
                    />
                  </div>

                  {/* Password Reset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Mot de passe
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Changer votre mot de passe par email
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePasswordReset}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Modifier"
                      )}
                    </Button>
                  </div>

                  {/* Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Notifications
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Recevoir des notifications push
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notificationPermission === 'denied' && (
                        <span className="text-xs text-red-600">Refusées</span>
                      )}
                      {notificationPermission === 'granted' && (
                        <span className="text-xs text-green-600">Autorisées</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={requestNotificationPermission}
                        disabled={notificationPermission === 'granted'}
                      >
                        {notificationPermission === 'granted' ? 'Activées' : 'Activer'}
                      </Button>
                    </div>
                  </div>

                  {/* Friend Suggestions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Suggestions d'amis
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Autoriser les suggestions et être suggéré
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.allow_friend_suggestions !== false}
                      onCheckedChange={(checked) => updatePrivacySettings('allow_friend_suggestions', checked)}
                    />
                  </div>

                  {/* Share Profile */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Share2 className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Partager mon profil
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Partagez votre profil sur Instagram, WhatsApp...
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (profile) {
                          shareProfile({
                            username: profile.username,
                            displayName: profile.display_name,
                            bio: profile.bio
                          });
                        }
                      }}
                    >
                      Partager
                    </Button>
                  </div>

                  {/* Contacts Access - Only show on mobile */}
                  <ContactsPermissionButton />
                </CardContent>
              </Card>

              {/* Privacy & Legal Settings */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Confidentialité & Légal</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* RGPD */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Règlement RGPD
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Traitement des données personnelles
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.rgpd_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('rgpd_accepted', checked)}
                    />
                  </div>

                  {/* Security Rules */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <div className="grid gap-1.5">
                        <label className="text-sm font-medium leading-none">
                          Règles de sécurité
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Règles d'utilisation et sécurité
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.security_rules_accepted || false}
                      onCheckedChange={(checked) => updatePrivacySettings('security_rules_accepted', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-primary mr-2" />
                    <CardTitle className="text-lg">Support</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Besoin d'aide ? Contactez notre équipe support
                    </p>
                    <a 
                      href="mailto:ferdinand.froidefont@gmail.com"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      ferdinand.froidefont@gmail.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Se déconnecter
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Indicateur de scroll en bas */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="h-1 w-12 bg-muted rounded-full opacity-50"></div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Follow Dialog */}
      <FollowDialog
        open={showFollowDialog}
        onOpenChange={setShowFollowDialog}
        type={followDialogType}
        followerCount={followerCount}
        followingCount={followingCount}
      />

      {/* Image Crop Editor */}
      <ImageCropEditor
        open={showCropEditor}
        onClose={() => setShowCropEditor(false)}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />
    </>
  );
};