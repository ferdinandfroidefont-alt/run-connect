import { lazy, Suspense, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Crown, Camera, ArrowLeft, Calendar, Heart, Route, MapPin, Shield, Zap, Instagram, Footprints, Globe, Trophy, Share2, Settings, History, Map } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { QRShareDialog } from "@/components/QRShareDialog";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";

import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import { COUNTRY_LABELS } from "@/lib/countryLabels";

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
const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);

const SPORT_LABELS: Record<string, string> = {
  running: '🏃 Course à pied',
  cycling: '🚴 Vélo',
  swimming: '🏊 Natation',
  triathlon: '🏅 Triathlon',
  walking: '🚶 Marche',
  trail: '⛰️ Trail',
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
  const [showOwnStory, setShowOwnStory] = useState(false);
  const [showHighlightsManager, setShowHighlightsManager] = useState(false);
  const [ownStories, setOwnStories] = useState<Array<{ id: string; created_at: string; expires_at: string }>>([]);
  const [storyHighlights, setStoryHighlights] = useState<Array<{ id: string; story_id: string; title: string }>>([]);
  const [highlightStoryId, setHighlightStoryId] = useState<string | null>(null);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
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
  const { shareProfile, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const {
    selectFromGallery,
    loading: cameraLoading
  } = useCamera();
  useEffect(() => {
    if (user && open) {
      fetchProfile();
      fetchFollowCounts();
      fetchReliabilityStats();
      void fetchStoriesAndHighlights();
    }
  }, [user, open]);
  const fetchStoriesAndHighlights = async () => {
    if (!user) return;
    const [{ data: stories }, { data: highlights }] = await Promise.all([
      (supabase as any)
        .from("session_stories")
        .select("id, created_at, expires_at")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80),
      (supabase as any)
        .from("profile_story_highlights")
        .select("id, story_id, title, position")
        .eq("owner_id", user.id)
        .order("position", { ascending: true }),
    ]);
    setOwnStories((stories ?? []) as Array<{ id: string; created_at: string; expires_at: string }>);
    setStoryHighlights((highlights ?? []) as Array<{ id: string; story_id: string; title: string }>);
  };
  const addStoryToHighlights = async (storyId: string) => {
    if (!user) return;
    const title = (newHighlightTitle || "A la une").trim();
    const position = storyHighlights.length;
    const { error } = await (supabase as any).from("profile_story_highlights").insert({
      owner_id: user.id,
      story_id: storyId,
      title,
      position,
    });
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter cette story a la une", variant: "destructive" });
      return;
    }
    setNewHighlightTitle("");
    await fetchStoriesAndHighlights();
  };
  const removeHighlight = async (highlightId: string) => {
    const { error } = await (supabase as any).from("profile_story_highlights").delete().eq("id", highlightId);
    if (error) return;
    await fetchStoriesAndHighlights();
  };
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
  /** Plein écran bord à bord (comme les sous-pages Paramètres), sans carte centrée sur desktop. */
  const profileDialogShellClassName =
    "z-[116] flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-none border-0 bg-secondary p-0 !bg-secondary h-[100dvh] max-h-[100dvh]";

  const socialSessionsCount = Math.max(totalSessionsCompleted, totalSessionsCreated);
  const socialHighlights = [
    profile?.favorite_sport ? SPORT_LABELS[profile.favorite_sport] ?? "Sport" : null,
    profile?.country ? COUNTRY_LABELS[profile.country] ?? profile.country : null,
    (profile?.strava_connected && profile?.strava_verified_at) ? "Strava" : null,
    (profile?.instagram_connected && profile?.instagram_verified_at) ? "Instagram" : null,
    (profile?.is_premium || subscriptionInfo?.subscribed) ? "Premium" : null,
  ].filter(Boolean) as string[];

  if (loading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-tutorial="tutorial-profile-page"
          hideCloseButton
          fullScreen
          className={profileDialogShellClassName}
        >
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-tutorial="tutorial-profile-page"
          hideCloseButton
          fullScreen
          className={profileDialogShellClassName}
        >
          {/* iOS Header */}
          <div className="shrink-0 border-b border-border bg-card pt-[env(safe-area-inset-top,0px)]">
            <div className="flex min-w-0 max-w-full items-center justify-between gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 max-w-[42%] items-center gap-1 text-primary"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
                <span className="truncate text-[17px]">Retour</span>
              </button>
              <h1 className="shrink-0 text-center text-[17px] font-semibold text-foreground">Mon Profil</h1>
              <button
                type="button"
                onClick={() => setShowSettingsDialog(true)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
          
           <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
             <div className="box-border min-w-0 max-w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
                {/* Profile Header - Instagram layout: avatar + stats side by side */}
                <div className="bg-card border-b border-border px-4 pt-5 pb-4">
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <button type="button" className="relative shrink-0" onClick={() => setShowOwnStory(true)}>
                      <Avatar className="h-20 w-20 ring-[3px] ring-primary/20">
                        <AvatarImage src={avatarPreview || profile?.avatar_url || ""} className="object-cover" />
                        <AvatarFallback className="text-2xl bg-secondary">
                          {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
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
                          className="absolute bottom-0 right-0 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md"
                        >
                          <Camera className="h-3 w-3" />
                        </button>
                      )}
                    </button>

                    {/* Stats à droite de l'avatar */}
                    <div className="flex flex-1 min-w-0 items-center justify-around">
                      <div className="text-center">
                        <p className="text-[18px] font-bold text-foreground leading-none">{socialSessionsCount}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Séances</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setFollowDialogType('followers'); setShowFollowDialog(true); }}
                        className="text-center touch-manipulation transition-colors active:opacity-70"
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <p className="text-[18px] font-bold text-foreground leading-none">{followerCount}</p>
                          {pendingRequestsCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-0.5 -mt-2">
                              {pendingRequestsCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Abonnés</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setFollowDialogType('following'); setShowFollowDialog(true); }}
                        className="text-center touch-manipulation transition-colors active:opacity-70"
                      >
                        <p className="text-[18px] font-bold text-foreground leading-none">{followingCount}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Abonnements</p>
                      </button>
                    </div>
                  </div>

                  {/* Nom + meta line */}
                  <div className="mt-3 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="truncate text-[16px] font-bold text-foreground leading-tight">
                        {profile?.display_name || profile?.username || "Utilisateur"}
                      </h2>
                      {(profile?.is_premium || subscriptionInfo?.subscribed) && (
                        <Crown className="h-4 w-4 shrink-0 text-yellow-500" />
                      )}
                    </div>
                    <p className="truncate text-[13px] text-muted-foreground">
                      @{profile?.username}
                    </p>
                    {/* Meta line: country · age · sport */}
                    {(() => {
                      const parts: string[] = [];
                      if (profile?.country) parts.push(COUNTRY_LABELS[profile.country] ?? profile.country);
                      if (profile?.age) parts.push(`${profile.age} ans`);
                      if (profile?.favorite_sport) parts.push(SPORT_LABELS[profile.favorite_sport] ?? profile.favorite_sport);
                      return parts.length > 0 ? (
                        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                          {parts.join(' · ')}
                        </p>
                      ) : null;
                    })()}
                    {profile?.bio && (
                      <p className="mt-2 text-[14px] leading-relaxed text-foreground/80 line-clamp-3 break-words">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  {/* Boutons Modifier / Partager */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1 rounded-lg text-[13px] font-semibold"
                      onClick={() => setIsEditing(true)}
                    >
                      Modifier le profil
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-lg text-[13px] font-semibold"
                      onClick={() => {
                        if (!profile?.username) return;
                        void shareProfile({
                          username: profile.username,
                          displayName: profile.display_name,
                          bio: profile.bio,
                          avatarUrl: profile.avatar_url,
                        });
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Partager
                    </Button>
                  </div>
                </div>

              {/* Stories à la une - cercles style Instagram */}
              <div className="bg-card border-b border-border px-4 py-3">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {storyHighlights.map((item) => (
                    <button key={item.id} type="button" className="flex w-16 shrink-0 flex-col items-center gap-1.5" onClick={() => setHighlightStoryId(item.story_id)}>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary">
                        {item.title.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="w-full truncate text-center text-[11px] text-muted-foreground">{item.title}</p>
                    </button>
                  ))}
                  {/* Bouton ajouter */}
                  <button
                    type="button"
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                    onClick={() => setShowHighlightsManager(true)}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-secondary/50 text-muted-foreground">
                      <span className="text-xl leading-none">+</span>
                    </div>
                    <p className="w-full truncate text-center text-[11px] text-muted-foreground">Ajouter</p>
                  </button>
                </div>
              </div>

              {/* Personal Info or Edit Form */}
              {isEditing ? (
                 <IOSListGroup
                   header="MODIFIER MES INFORMATIONS"
                   flush
                 >
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

                  {/* Raccourcis - grille 2x2 */}
                  <div className="bg-card border-b border-border px-4 py-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: Trophy, label: 'Records', color: 'text-yellow-500', action: () => { onOpenChange(false); navigate('/profile/records'); } },
                        { icon: Shield, label: `Fiabilité ${reliabilityRate}%`, color: 'text-blue-500', action: () => setShowReliabilityDialog(true) },
                        { icon: Map, label: 'Parcours', color: 'text-green-500', action: () => { onOpenChange(false); navigate('/route-creation'); } },
                        { icon: History, label: 'Séances', color: 'text-primary', action: () => { onOpenChange(false); navigate('/my-sessions'); } },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-secondary/50 p-4 transition-colors active:bg-secondary"
                        >
                          <item.icon className={`h-6 w-6 ${item.color}`} />
                          <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} />

      <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />

      {/* Settings Dialog */}
      <Suspense fallback={null}>
        <SettingsDialog open={showSettingsDialog} onOpenChange={open => setShowSettingsDialog(open)} />
      </Suspense>

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog open={showReliabilityDialog} onOpenChange={setShowReliabilityDialog} reliabilityRate={reliabilityRate} totalSessionsCreated={totalSessionsCreated} totalSessionsJoined={totalSessionsJoined} totalSessionsCompleted={totalSessionsCompleted} />

      {qrData && (
        <QRShareDialog
          open={showQRDialog}
          onOpenChange={setShowQRDialog}
          profileUrl={qrData.profileUrl}
          username={qrData.username}
          displayName={qrData.displayName}
          avatarUrl={qrData.avatarUrl}
          referralCode={qrData.referralCode}
        />
      )}
      <Dialog open={showHighlightsManager} onOpenChange={setShowHighlightsManager}>
        <DialogContent className="max-w-md">
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Modifier les stories a la une</h3>
            <Input
              value={newHighlightTitle}
              onChange={(e) => setNewHighlightTitle(e.target.value)}
              placeholder="Titre (ex: Courses, PR...)"
            />
            <div className="max-h-64 space-y-2 overflow-auto">
              {ownStories.map((story) => {
                const already = storyHighlights.some((h) => h.story_id === story.id);
                return (
                  <div key={story.id} className="flex items-center justify-between rounded-ios-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Story {new Date(story.created_at).toLocaleDateString()}
                    </p>
                    {already ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const h = storyHighlights.find((x) => x.story_id === story.id);
                          if (h) void removeHighlight(h.id);
                        }}
                      >
                        Retirer
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => void addStoryToHighlights(story.id)}>
                        Mettre a la une
                      </Button>
                    )}
                  </div>
                );
              })}
              {ownStories.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune story disponible.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <SessionStoryDialog
        open={showOwnStory}
        onOpenChange={setShowOwnStory}
        authorId={user?.id ?? null}
        viewerUserId={user?.id ?? null}
        onOpenFeed={() => {
          setShowOwnStory(false);
          onOpenChange(false);
          navigate("/feed");
        }}
      />
      <SessionStoryDialog
        open={!!highlightStoryId}
        onOpenChange={(open) => {
          if (!open) setHighlightStoryId(null);
        }}
        authorId={user?.id ?? null}
        viewerUserId={user?.id ?? null}
        storyId={highlightStoryId}
        onOpenFeed={() => {
          setHighlightStoryId(null);
          onOpenChange(false);
          navigate("/feed");
        }}
      />
    </>;
};