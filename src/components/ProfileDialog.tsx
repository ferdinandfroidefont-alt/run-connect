import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Crown, Camera, ArrowLeft, Calendar, Heart } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ProfileStatCard } from "@/components/ProfileStatCard";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserActivityChart } from "@/components/UserActivityChart";
import { ReliabilityBadge } from "@/components/ReliabilityBadge";
import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  phone: string | null;
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

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const { user, subscriptionInfo } = useAuth();
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
  const [totalSessionsCreated, setTotalSessionsCreated] = useState(0);
  const [totalSessionsJoined, setTotalSessionsJoined] = useState(0);
  const [totalSessionsCompleted, setTotalSessionsCompleted] = useState(0);
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
  const { selectFromGallery, loading: cameraLoading } = useCamera();

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

  const fetchReliabilityStats = async () => {
    if (!user) return;
    try {
      // Fetch reliability rate from user_stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('reliability_rate, total_sessions_joined, total_sessions_completed')
        .eq('user_id', user.id)
        .single();

      if (statsData) {
        setReliabilityRate(Number(statsData.reliability_rate) || 100);
        setTotalSessionsJoined(statsData.total_sessions_joined || 0);
        setTotalSessionsCompleted(statsData.total_sessions_completed || 0);
      }

      // Fetch total sessions created
      const { count: createdCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', user.id);

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
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

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
      console.error(`❌ [ProfileDialog] Fetch profile error:`, error);
      toast({
        title: "Erreur",
        description: "Impossible de charger votre profil. Reconnectez-vous si le problème persiste.",
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

      if (uploadError) throw uploadError;

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

      const { error } = await supabase
        .from('profiles')
        .update({ 
          ...formData,
          phone: normalizedPhone,
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
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <button 
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-center p-1 rounded-full hover:bg-accent transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              Mon Profil
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 pb-6 overflow-y-auto">
            <div className="space-y-6 pb-4 min-h-full">
              {/* Header modernisé - Avatar détaché */}
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center py-8 relative">
                  {/* Avatar détaché avec bordure lumineuse */}
                  <div className="relative mb-4 group">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl group-hover:bg-primary/50 transition-all duration-300" />
                    <Avatar className="h-28 w-28 relative border-4 border-primary shadow-2xl shadow-primary/50">
                      <AvatarImage src={avatarPreview || profile?.avatar_url || ""} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/50">
                        {profile?.display_name?.[0]?.toUpperCase() || 
                         profile?.username?.[0]?.toUpperCase() || 
                         user?.email?.[0]?.toUpperCase() || "U"}
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
                            toast({
                              title: "Erreur",
                              description: "Impossible d'accéder à la galerie",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={cameraLoading}
                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2.5 cursor-pointer hover:bg-primary/90 disabled:opacity-50 shadow-lg"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Pseudo + Couronne fine */}
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-2xl font-bold">{profile?.username || profile?.display_name}</h2>
                    {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                      <Crown className="h-5 w-5 text-yellow-400 drop-shadow-lg" />
                    )}
                  </div>

                  {/* Badges compacts sur une ligne */}
                  <div className="flex gap-2 items-center mb-4 flex-wrap justify-center">
                    {profile?.is_admin && (
                      <Badge variant="destructive" className="text-xs px-2 py-0.5">
                        Admin
                      </Badge>
                    )}
                    {(() => {
                      const isStravaVerified = profile?.strava_connected && profile?.strava_verified_at;
                      const isInstagramVerified = profile?.instagram_connected && profile?.instagram_verified_at;
                      
                      return (
                        <>
                          {isStravaVerified && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs px-2 py-0.5 hover:bg-orange-500/30 cursor-pointer">
                              🏃 Strava
                            </Badge>
                          )}
                          {isInstagramVerified && (
                            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs px-2 py-0.5 hover:bg-pink-500/30 cursor-pointer">
                              📷 Instagram
                            </Badge>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Pastilles followers/following/fiabilité sur une ligne */}
                  <div className="flex gap-6 items-center">
                    <button
                      onClick={() => {
                        setFollowDialogType('followers');
                        setShowFollowDialog(true);
                      }}
                      className="flex flex-col items-center hover:scale-105 transition-transform"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-1 border border-primary/30">
                        <p className="font-bold text-sm">{followerCount}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Abonnés</p>
                    </button>
                    <button
                      onClick={() => {
                        setFollowDialogType('following');
                        setShowFollowDialog(true);
                      }}
                      className="flex flex-col items-center hover:scale-105 transition-transform"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-1 border border-primary/30">
                        <p className="font-bold text-sm">{followingCount}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Abonnements</p>
                    </button>
                    <button
                      onClick={() => setShowReliabilityDialog(true)}
                      className="flex flex-col items-center hover:scale-105 transition-transform"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-1 border border-primary/30">
                        <p className="font-bold text-sm">{Math.round(reliabilityRate)}%</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Fiabilité</p>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Statistiques principales - Mini cards (3 par ligne) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 px-1">Statistiques</h3>
                <div className="grid grid-cols-3 gap-3">
                  <ProfileStatCard 
                    icon={Calendar}
                    label="Séances créées"
                    value={totalSessionsCreated}
                  />
                  <ProfileStatCard 
                    icon={User}
                    label="Séances rejointes"
                    value={totalSessionsJoined}
                  />
                  <ProfileStatCard 
                    icon={Heart}
                    label="Fiabilité"
                    value={`${Math.round(reliabilityRate)}%`}
                    gradient
                  />
                </div>
              </div>

              {/* Heatmap d'activité */}
              {user?.id && (
                <ActivityHeatmap userId={user.id} />
              )}

              {/* Bio dans une card simple */}
              {profile?.bio && (
                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                  </CardContent>
                </Card>
              )}

              {/* Informations personnelles - Section editing */}
              {isEditing ? (
                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Modifier mes informations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informations personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Pseudo</p>
                        <p className="font-medium">{profile?.username}</p>
                      </div>
                      {profile?.display_name && (
                        <div>
                          <p className="text-muted-foreground mb-1">Nom</p>
                          <p className="font-medium">{profile.display_name}</p>
                        </div>
                      )}
                      {profile?.age && (
                        <div>
                          <p className="text-muted-foreground mb-1">Âge</p>
                          <p className="font-medium">{profile.age} ans</p>
                        </div>
                      )}
                      {profile?.phone && (
                        <div>
                          <p className="text-muted-foreground mb-1">Téléphone</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => setIsEditing(true)} className="w-full mt-4" variant="outline">
                      <User className="h-4 w-4 mr-2" />
                      Modifier le profil
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Bouton Paramètres */}
              <Button 
                onClick={() => setShowSettingsDialog(true)} 
                variant="outline"
                className="w-full"
              >
                Paramètres
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FollowDialog
        open={showFollowDialog}
        onOpenChange={setShowFollowDialog}
        type={followDialogType}
        followerCount={followerCount}
        followingCount={followingCount}
      />

      <ImageCropEditor
        open={showCropEditor}
        onClose={() => setShowCropEditor(false)}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />

      {/* Settings Dialog */}
      <SettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={(open) => setShowSettingsDialog(open)} 
      />

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog
        open={showReliabilityDialog}
        onOpenChange={setShowReliabilityDialog}
        userName={profile?.display_name || profile?.username || ''}
        reliabilityRate={reliabilityRate}
        totalSessionsCreated={totalSessionsCreated}
        totalSessionsJoined={totalSessionsJoined}
        totalSessionsCompleted={totalSessionsCompleted}
      />
    </>
  );
};