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
import { ProfileRankCard } from "@/components/profile/ProfileRankCard";
import { EarnedBadgesSection } from "@/components/profile/EarnedBadgesSection";
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
        <DialogContent className="w-full h-full sm:max-w-md sm:h-auto p-0 flex flex-col">
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
              {/* Header Full-Width avec fond bleu dégradé */}
              <div className="relative -mx-6 mb-6">
                <div className="bg-gradient-to-br from-primary via-primary/80 to-primary/60 px-6 pt-12 pb-6">
                  {/* Avatar centré avec glow enhanced */}
                  <div className="relative mb-4 flex justify-center group">
                    <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl scale-110 group-hover:scale-125 transition-all duration-300" />
                    <Avatar className="h-36 w-36 relative border-4 border-white/20 shadow-2xl cursor-pointer hover:scale-105 transition-transform">
                      <AvatarImage src={avatarPreview || profile?.avatar_url || ""} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-white/10 text-white">
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
                        className="absolute bottom-2 right-2 bg-white text-primary rounded-full p-3 cursor-pointer hover:bg-white/90 disabled:opacity-50 shadow-lg"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Pseudo + Couronne */}
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-white">@{profile?.username}</h2>
                    {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                      <span className="text-2xl">👑</span>
                    )}
                  </div>

                  {/* Badges services connectés */}
                  <div className="flex gap-2 mb-3 justify-center">
                    {profile?.is_admin && (
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full font-semibold">
                        Admin
                      </span>
                    )}
                    {profile?.strava_connected && profile?.strava_verified_at && (
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
                        🏃 Strava
                      </span>
                    )}
                    {profile?.instagram_connected && profile?.instagram_verified_at && (
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
                        📷 Instagram
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  {profile?.bio && (
                    <p className="text-center text-white/90 text-sm max-w-md mx-auto mb-4 line-clamp-2">
                      {profile.bio}
                    </p>
                  )}

                  {/* Badge fiabilité */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowReliabilityDialog(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full transition-colors text-white text-sm font-medium"
                    >
                      <span className="text-lg">✓</span>
                      <span>{Math.round(reliabilityRate)}% • Très fiable</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mini Stats - 3 blocs alignés */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => {
                    setFollowDialogType('followers');
                    setShowFollowDialog(true);
                  }}
                  className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-xl font-bold">{followerCount}</div>
                  <div className="text-xs text-muted-foreground">Abonnés</div>
                </button>
                <button
                  onClick={() => {
                    setFollowDialogType('following');
                    setShowFollowDialog(true);
                  }}
                  className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="text-2xl mb-1">➕</div>
                  <div className="text-xl font-bold">{followingCount}</div>
                  <div className="text-xs text-muted-foreground">Abonnements</div>
                </button>
                <button
                  onClick={() => setShowReliabilityDialog(true)}
                  className="text-center p-4 bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl hover:bg-accent/50 transition-colors"
                >
                  <div className="text-2xl mb-1">✓</div>
                  <div className="text-xl font-bold">{Math.round(reliabilityRate)}%</div>
                  <div className="text-xs text-muted-foreground">Fiable</div>
                </button>
              </div>

              {/* Mon Classement */}
              {user?.id && <ProfileRankCard userId={user.id} />}

              {/* Badges gagnés */}
              {user?.id && <EarnedBadgesSection userId={user.id} />}

              {/* Activité récente */}
              {user?.id && <UserActivityChart userId={user.id} username={profile?.username} />}

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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      👤 Informations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg">
                      <span className="text-xl">🔤</span>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">Pseudo</div>
                        <div className="font-medium">{profile?.username || 'Non renseigné'}</div>
                      </div>
                    </div>
                    {profile?.display_name && (
                      <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg">
                        <span className="text-xl">👤</span>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Nom</div>
                          <div className="font-medium">{profile.display_name}</div>
                        </div>
                      </div>
                    )}
                    {profile?.age && (
                      <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg">
                        <span className="text-xl">🎂</span>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Âge</div>
                          <div className="font-medium">{profile.age} ans</div>
                        </div>
                      </div>
                    )}
                    {profile?.phone && (
                      <div className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg">
                        <span className="text-xl">📞</span>
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Téléphone</div>
                          <div className="font-medium">{profile.phone}</div>
                        </div>
                      </div>
                    )}
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      variant="outline" 
                      className="w-full mt-4"
                    >
                      ✏️ Modifier mon profil
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