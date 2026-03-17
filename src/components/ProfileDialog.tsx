import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Crown, Camera, ArrowLeft, Calendar, Heart, Route, MapPin, ChevronRight, Shield, Zap, Instagram } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ProfileStatsGroup } from "@/components/profile/ProfileStatsGroup";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
  favorite_sport?: string | null;
  country?: string | null;
  is_premium: boolean;
  is_admin?: boolean;
  walking_records?: any;
  running_records?: any;
  cycling_records?: any;
  swimming_records?: any;
  strava_connected?: boolean;
  strava_verified_at?: string;
  strava_user_id?: string;
  instagram_connected?: boolean;
  instagram_verified_at?: string;
  instagram_username?: string;
}

const SPORT_LABELS: Record<string, string> = {
  running: '🏃 Course à pied',
  cycling: '🚴 Vélo',
  swimming: '🏊 Natation',
  triathlon: '🏅 Triathlon',
  walking: '🚶 Marche',
  trail: '⛰️ Trail',
};

const COUNTRY_LABELS: Record<string, string> = {
  FR: '🇫🇷 France',
  BE: '🇧🇪 Belgique',
  CH: '🇨🇭 Suisse',
  CA: '🇨🇦 Canada',
  LU: '🇱🇺 Luxembourg',
  MA: '🇲🇦 Maroc',
  TN: '🇹🇳 Tunisie',
  DZ: '🇩🇿 Algérie',
  SN: '🇸🇳 Sénégal',
  CI: "🇨🇮 Côte d'Ivoire",
  ES: '🇪🇸 Espagne',
  PT: '🇵🇹 Portugal',
  DE: '🇩🇪 Allemagne',
  IT: '🇮🇹 Italie',
  GB: '🇬🇧 Royaume-Uni',
  US: '🇺🇸 États-Unis',
};

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const ProfileDialog = ({
  open,
  onOpenChange
}: ProfileDialogProps) => {
  const {
    user,
    subscriptionInfo
  } = useAuth();
  const navigate = useNavigate();
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
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
  const [reliabilityRate, setReliabilityRate] = useState(100);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
  const [recordsData, setRecordsData] = useState<{
    walking: Record<string, string>;
    running: Record<string, string>;
    cycling: Record<string, string>;
    swimming: Record<string, string>;
  }>({
    walking: {
      '5k': '',
      '10k': '',
      '21k': '',
      '42k': ''
    },
    running: {
      '5k': '',
      '10k': '',
      '21k': '',
      '42k': ''
    },
    cycling: {
      '25k': '',
      '50k': '',
      '100k': '',
      '200k': ''
    },
    swimming: {
      '100m': '',
      '500m': '',
      '1000m': '',
      '1500m': ''
    }
  });
  const {
    toast
  } = useToast();
  const {
    selectFromGallery,
    loading: cameraLoading
  } = useCamera();
  useEffect(() => {
    if (user && open) {
      fetchProfile();
      fetchFollowCounts();
      fetchReliabilityStats();
    }
  }, [user, open]);
  const fetchFollowCounts = async () => {
    if (!user) return;
    try {
      const {
        data: followerData
      } = await supabase.rpc('get_follower_count', {
        profile_user_id: user.id
      });
      const {
        data: followingData
      } = await supabase.rpc('get_following_count', {
        profile_user_id: user.id
      });
      setFollowerCount(followerData || 0);
      setFollowingCount(followingData || 0);

      // Fetch pending follow requests
      const { count } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'pending');
      setPendingRequestsCount(count || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };
  const fetchReliabilityStats = async () => {
    if (!user) return;
    try {
      // Fetch reliability rate from user_stats
      const {
        data: statsData
      } = await supabase.from('user_stats').select('reliability_rate, total_sessions_joined, total_sessions_completed').eq('user_id', user.id).single();
      if (statsData) {
        setReliabilityRate(Number(statsData.reliability_rate) || 100);
        setTotalSessionsJoined(statsData.total_sessions_joined || 0);
        setTotalSessionsCompleted(statsData.total_sessions_completed || 0);
      }

      // Fetch total sessions created
      const {
        count: createdCount
      } = await supabase.from('sessions').select('*', {
        count: 'exact',
        head: true
      }).eq('organizer_id', user.id);
      setTotalSessionsCreated(createdCount || 0);
    } catch (error) {
      console.error('Error fetching reliability stats:', error);
    }
  };
  const fetchProfile = async (retryCount = 0) => {
    try {
      console.log(`🔍 [ProfileDialog] Fetching profile (attempt ${retryCount + 1}/3)`);
      console.log(`🔍 [ProfileDialog] User ID:`, user?.id);
      console.log(`🔍 [ProfileDialog] User authenticated:`, !!user);
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (error) {
        // Si l'erreur est liée à l'authentification, retry
        if (error.message.includes('JWT') && retryCount < 2) {
          console.warn(`⚠️ Auth error, retrying in 1s... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(retryCount + 1);
        }
        throw error;
      }
      console.log(`✅ [ProfileDialog] Profile loaded successfully:`, data?.username);
      setProfile(data);
      setFormData(data);
      const defaultRecords = {
        walking: {
          '5k': '',
          '10k': '',
          '21k': '',
          '42k': ''
        },
        running: {
          '5k': '',
          '10k': '',
          '21k': '',
          '42k': ''
        },
        cycling: {
          '25k': '',
          '50k': '',
          '100k': '',
          '200k': ''
        },
        swimming: {
          '100m': '',
          '500m': '',
          '1000m': '',
          '1500m': ''
        }
      };
      setRecordsData({
        walking: data.walking_records && typeof data.walking_records === 'object' ? {
          ...defaultRecords.walking,
          ...data.walking_records
        } : defaultRecords.walking,
        running: data.running_records && typeof data.running_records === 'object' ? {
          ...defaultRecords.running,
          ...data.running_records
        } : defaultRecords.running,
        cycling: data.cycling_records && typeof data.cycling_records === 'object' ? {
          ...defaultRecords.cycling,
          ...data.cycling_records
        } : defaultRecords.cycling,
        swimming: data.swimming_records && typeof data.swimming_records === 'object' ? {
          ...defaultRecords.swimming,
          ...data.swimming_records
        } : defaultRecords.swimming
      });
    } catch (error: any) {
      console.error(`❌ [ProfileDialog] Fetch profile error:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil. Reconnectez-vous si le problème persiste.",
        variant: "destructive"
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
          variant: "destructive"
        });
        return;
      }
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
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', {
      type: 'image/jpeg'
    });
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
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
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

      // Normaliser le numéro de téléphone avant sauvegarde
      let normalizedPhone = formData.phone;
      if (normalizedPhone) {
        normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
        if (normalizedPhone.startsWith('+33')) {
          normalizedPhone = '0' + normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('33') && normalizedPhone.length === 11) {
          normalizedPhone = '0' + normalizedPhone.substring(2);
        } else if (normalizedPhone.length === 9 && /^[1-9]/.test(normalizedPhone)) {
          normalizedPhone = '0' + normalizedPhone;
        }
      }
      const {
        error
      } = await supabase.from('profiles').update({
        ...formData,
        phone: normalizedPhone,
        avatar_url: avatarUrl,
        walking_records: recordsData.walking,
        running_records: recordsData.running,
        cycling_records: recordsData.cycling,
        swimming_records: recordsData.swimming
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
  if (loading && open) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] p-0">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>;
  }
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-md sm:max-h-[85vh] rounded-none sm:rounded-lg p-0 flex flex-col bg-secondary border-0 sm:border">
          {/* iOS Header */}
          <div className="sticky top-0 z-40 bg-card border-b border-border shrink-0">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1 text-primary"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-[17px]">Retour</span>
              </button>
              <h1 className="text-[17px] font-semibold text-foreground">Mon Profil</h1>
              <div className="w-16" />
            </div>
          </div>
          
           <ScrollArea className="flex-1">
            <div className="py-4 space-y-6 pb-0">
              {/* Profile Header - Centered */}
              <div className="flex flex-col items-center pt-4 pb-2">
                <div className="relative mb-3">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                    <AvatarImage src={avatarPreview || profile?.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-secondary">
                      {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={async () => {
                        try {
                          const file = await selectFromGallery();
                          if (file) {
                            handleAvatarChange({ target: { files: [file] } } as any);
                          }
                        } catch (error) {
                          console.error('Error selecting from gallery:', error);
                          toast({ title: "Erreur", description: "Impossible d'accéder à la galerie", variant: "destructive" });
                        }
                      }} 
                      disabled={cameraLoading} 
                      className="absolute bottom-0 right-0 h-7 w-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                <h2 className="text-[22px] font-bold text-foreground leading-tight">
                  {profile?.display_name || profile?.username || "Utilisateur"}
                </h2>
                <p className="text-[14px] text-muted-foreground mt-0.5">
                  @{profile?.username}
                </p>
                
                {/* Status Badges */}
                <div className="flex items-center gap-1.5 mt-2">
                  {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                    <div className="flex items-center gap-1 bg-primary/12 text-primary px-2 py-0.5 rounded-full">
                      <Crown className="h-3 w-3" />
                      <span className="text-[11px] font-semibold">Premium</span>
                    </div>
                  )}
                  {profile?.is_admin && (
                    <div className="flex items-center gap-1 bg-destructive/12 text-destructive px-2 py-0.5 rounded-full">
                      <Shield className="h-3 w-3" />
                      <span className="text-[11px] font-semibold">Admin</span>
                    </div>
                  )}
                  {profile?.strava_connected && profile?.strava_verified_at && (
                    <div className="flex items-center gap-1 bg-orange-500/12 text-orange-600 px-2 py-0.5 rounded-full">
                      <Zap className="h-3 w-3" />
                      <span className="text-[11px] font-semibold">Strava</span>
                    </div>
                  )}
                  {profile?.instagram_connected && profile?.instagram_verified_at && (
                    <div className="flex items-center gap-1 bg-pink-500/12 text-pink-600 px-2 py-0.5 rounded-full">
                      <Instagram className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {profile?.bio && (
                  <p className="text-center text-muted-foreground text-[14px] max-w-[280px] mt-3 line-clamp-2">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Social Stats - iOS Segmented */}
              <IOSListGroup flush>
                <div className="flex items-center divide-x divide-border">
                  <button
                    onClick={() => { setFollowDialogType('followers'); setShowFollowDialog(true); }}
                    className="flex-1 py-3 active:bg-secondary/50 transition-colors relative"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-[20px] font-bold text-foreground">{followerCount}</p>
                      {pendingRequestsCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold px-1">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground">Abonnés</p>
                  </button>
                  <button
                    onClick={() => { setFollowDialogType('following'); setShowFollowDialog(true); }}
                    className="flex-1 py-3 active:bg-secondary/50 transition-colors"
                  >
                    <p className="text-[20px] font-bold text-foreground">{followingCount}</p>
                    <p className="text-[12px] text-muted-foreground">Abonnements</p>
                  </button>
                  <button
                    onClick={() => setShowReliabilityDialog(true)}
                    className="flex-1 py-3 active:bg-secondary/50 transition-colors"
                  >
                    <p className="text-[20px] font-bold text-foreground">{reliabilityRate}%</p>
                    <p className="text-[12px] text-muted-foreground">Fiabilité</p>
                  </button>
                </div>
              </IOSListGroup>

              {/* Gamification Section */}
              {user?.id && (
                <ProfileStatsGroup userId={user.id} />
              )}

              {/* Personal Info or Edit Form */}
              {isEditing ? (
                <IOSListGroup header="MODIFIER MES INFORMATIONS" flush>
                  <div className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Pseudo</label>
                        <Input 
                          value={formData.username || ''} 
                          onChange={e => setFormData({ ...formData, username: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Nom d'affichage</label>
                        <Input 
                          value={formData.display_name || ''} 
                          onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Âge</label>
                        <Input 
                          type="number" 
                          value={formData.age || ''} 
                          onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || null })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Téléphone</label>
                        <Input 
                          value={formData.phone || ''} 
                          onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                          placeholder="06 12 34 56 78"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Sport favori</label>
                        <select
                          value={formData.favorite_sport || ''}
                          onChange={e => setFormData({ ...formData, favorite_sport: e.target.value || null })}
                          className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Non renseigné</option>
                          <option value="running">🏃 Course à pied</option>
                          <option value="cycling">🚴 Vélo</option>
                          <option value="triathlon">🏅 Triathlon</option>
                          <option value="swimming">🏊 Natation</option>
                          <option value="walking">🚶 Marche</option>
                          <option value="trail">⛰️ Trail</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Pays</label>
                        <select
                          value={formData.country || ''}
                          onChange={e => setFormData({ ...formData, country: e.target.value || null })}
                          className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Non renseigné</option>
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
                      <div>
                        <label className="text-[13px] font-medium text-muted-foreground">Bio</label>
                        <Input 
                          value={formData.bio || ''} 
                          onChange={e => setFormData({ ...formData, bio: e.target.value })} 
                          placeholder="Décrivez vos records, vos objectifs..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={updateProfile} disabled={loading} className="flex-1">
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sauvegarder
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </div>
                </IOSListGroup>
              ) : (
                <>
                  {/* Personal Info */}
                  <IOSListGroup header="INFORMATIONS" flush>
                    <IOSListItem
                      icon={User}
                      iconBgColor="bg-blue-500"
                      iconColor="text-white"
                      title="Pseudo"
                      value={profile?.username || 'Non renseigné'}
                      showChevron={false}
                    />
                    <IOSListItem
                      icon={User}
                      iconBgColor="bg-purple-500"
                      iconColor="text-white"
                      title="Nom"
                      value={profile?.display_name || 'Non renseigné'}
                      showChevron={false}
                    />
                    <IOSListItem
                      icon={Calendar}
                      iconBgColor="bg-pink-500"
                      iconColor="text-white"
                      title="Âge"
                      value={profile?.age ? `${profile.age} ans` : 'Non renseigné'}
                      showChevron={false}
                    />
                    <IOSListItem
                      icon={Heart}
                      iconBgColor="bg-green-500"
                      iconColor="text-white"
                      title="Téléphone"
                      value={profile?.phone || 'Non renseigné'}
                      showChevron={false}
                    />
                    <IOSListItem
                      title="Sport favori"
                      value={(profile?.favorite_sport && SPORT_LABELS[profile.favorite_sport]) || 'Non renseigné'}
                      showChevron={false}
                    />
                    <IOSListItem
                      title="Pays"
                      value={(profile?.country && COUNTRY_LABELS[profile.country]) || 'Non renseigné'}
                      showChevron={false}
                      showSeparator={false}
                    />
                  </IOSListGroup>

                  {/* Actions */}
                  <IOSListGroup header="RACCOURCIS" flush className="mb-0">
                    <IOSListItem
                      icon={Route}
                      iconBgColor="bg-teal-500"
                      iconColor="text-white"
                      title="Mes séances et itinéraires"
                      onClick={() => { onOpenChange(false); navigate('/my-sessions'); }}
                    />
                    <IOSListItem
                      icon={MapPin}
                      iconBgColor="bg-purple-500"
                      iconColor="text-white"
                      title="Créer un parcours"
                      onClick={() => { onOpenChange(false); navigate('/route-creation'); }}
                    />
                    <IOSListItem
                      icon={User}
                      iconBgColor="bg-gray-500"
                      iconColor="text-white"
                      title="Paramètres"
                      onClick={() => setShowSettingsDialog(true)}
                    />
                    <IOSListItem
                      icon={Shield}
                      iconBgColor="bg-orange-500"
                      iconColor="text-white"
                      title="Modifier mon profil"
                      onClick={() => setIsEditing(true)}
                      showSeparator={false}
                    />
                   </IOSListGroup>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} />

      <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettingsDialog} onOpenChange={open => setShowSettingsDialog(open)} />

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog open={showReliabilityDialog} onOpenChange={setShowReliabilityDialog} userName={profile?.display_name || profile?.username || ''} reliabilityRate={reliabilityRate} totalSessionsCreated={totalSessionsCreated} totalSessionsJoined={totalSessionsJoined} totalSessionsCompleted={totalSessionsCompleted} />
    </>;
};