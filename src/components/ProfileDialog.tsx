import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Crown, Camera, ArrowLeft, Calendar, Heart, Route, MapPin, Shield, Zap, Instagram, Footprints, Globe, Trophy, Share2, Settings, History, Map, Video, Gift } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { QRShareDialog } from "@/components/QRShareDialog";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";

import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import { COUNTRY_LABELS } from "@/lib/countryLabels";
import { prepareImageForProfileCrop } from "@/lib/prepareImageForProfileCrop";
import { cn } from "@/lib/utils";

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
  referral_code?: string | null;
}
const SettingsDialog = lazy(() =>
  import("@/components/SettingsDialog").then((m) => ({ default: m.SettingsDialog }))
);
const ReferralDialog = lazy(() =>
  import("@/components/ReferralDialog").then((m) => ({ default: m.ReferralDialog }))
);

const SPORT_LABELS: Record<string, string> = {
  running: '🏃 Course à pied',
  cycling: '🚴 Vélo',
  swimming: '🏊 Natation',
  triathlon: '🏅 Triathlon',
  walking: '🚶 Marche',
  trail: '⛰️ Trail',
};

const HIGHLIGHT_GRID_LONG_PRESS_MS = 480;
const HIGHLIGHT_GRID_MOVE_CANCEL_PX = 16;

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
  const [preparingAvatarCrop, setPreparingAvatarCrop] = useState(false);
  const [showFollowDialog, setShowFollowDialog] = useState(false);
  const [followDialogType, setFollowDialogType] = useState<'followers' | 'following'>('followers');
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showOwnStory, setShowOwnStory] = useState(false);
  const [showAvatarFullscreen, setShowAvatarFullscreen] = useState(false);
  const [showHighlightsManager, setShowHighlightsManager] = useState(false);
  const [ownStories, setOwnStories] = useState<Array<{
    id: string;
    created_at: string;
    expires_at: string;
    media_url: string | null;
    media_type: 'image' | 'video' | 'boomerang' | null;
    duration_label: string | null;
    is_highlighted: boolean;
  }>>([]);
  const [storyHighlights, setStoryHighlights] = useState<Array<{ id: string; story_id: string; title: string }>>([]);
  const [highlightStoryId, setHighlightStoryId] = useState<string | null>(null);
  const [newHighlightTitle, setNewHighlightTitle] = useState("");
  /** Ordre de sélection = ordre d’insertion dans « à la une » (premier tap = position 0). */
  const [highlightPickOrder, setHighlightPickOrder] = useState<string[]>([]);
  const [highlightSubmitting, setHighlightSubmitting] = useState(false);
  const highlightPressRef = useRef<{
    storyId: string | null;
    timer: ReturnType<typeof setTimeout> | null;
    longTriggered: boolean;
    startX: number;
    startY: number;
    startT: number;
  }>({
    storyId: null,
    timer: null,
    longTriggered: false,
    startX: 0,
    startY: 0,
    startT: 0,
  });
  const clearHighlightGridPressTimer = () => {
    const t = highlightPressRef.current.timer;
    if (t) clearTimeout(t);
    highlightPressRef.current.timer = null;
  };
  const resetHighlightGridPress = () => {
    clearHighlightGridPressTimer();
    highlightPressRef.current.storyId = null;
    highlightPressRef.current.longTriggered = false;
  };
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
    const baseStories = (stories ?? []) as Array<{ id: string; created_at: string; expires_at: string }>;
    const highlightRows = (highlights ?? []) as Array<{ id: string; story_id: string; title: string }>;
    const storyIds = baseStories.map((s) => s.id);
    const highlighted = new Set(highlightRows.map((h) => h.story_id));
    const { data: mediaRows } = storyIds.length
      ? await (supabase as any)
          .from("story_media")
          .select("story_id, media_url, media_type, metadata, created_at")
          .in("story_id", storyIds)
          .order("created_at", { ascending: true })
      : { data: [] };
    const mediaByStory = new Map<string, { media_url: string | null; media_type: 'image' | 'video' | 'boomerang' | null; duration_label: string | null }>();
    for (const row of (mediaRows ?? []) as Array<any>) {
      if (mediaByStory.has(row.story_id)) continue;
      const sec = Number(row?.metadata?.duration_sec ?? row?.metadata?.duration ?? 0);
      const duration_label = Number.isFinite(sec) && sec > 0 ? `0:${String(Math.round(sec)).padStart(2, "0")}` : null;
      mediaByStory.set(row.story_id, {
        media_url: row.media_url ?? null,
        media_type: row.media_type ?? null,
        duration_label,
      });
    }
    setOwnStories(
      baseStories.map((s) => {
        const media = mediaByStory.get(s.id);
        return {
          ...s,
          media_url: media?.media_url ?? null,
          media_type: media?.media_type ?? null,
          duration_label: media?.duration_label ?? null,
          is_highlighted: highlighted.has(s.id),
        };
      })
    );
    setStoryHighlights(highlightRows);
    setHighlightPickOrder([]);
  };

  const addStoriesToHighlights = async (storyIds: string[]) => {
    if (!user || storyIds.length === 0) return;
    setHighlightSubmitting(true);
    try {
      const title = (newHighlightTitle || "À la une").trim();
      const startPos = storyHighlights.length;
      const payload = storyIds.map((story_id, idx) => ({
        owner_id: user.id,
        story_id,
        title,
        position: startPos + idx,
      }));
      const { error } = await (supabase as any).from("profile_story_highlights").insert(payload);
      if (error) throw error;
      toast({ title: "Ajouté", description: `${storyIds.length} story${storyIds.length > 1 ? "s" : ""} ajoutée${storyIds.length > 1 ? "s" : ""} à la une.` });
      await fetchStoriesAndHighlights();
      setShowHighlightsManager(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter ces stories à la une", variant: "destructive" });
    } finally {
      setHighlightSubmitting(false);
    }
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
  const openAvatarCropFromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
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
        description: "La taille du fichier ne doit pas dépasser 5 Mo.",
        variant: "destructive",
      });
      return;
    }
    setPreparingAvatarCrop(true);
    try {
      const imageSrc = await prepareImageForProfileCrop(file);
      setOriginalImageSrc(imageSrc);
      setShowCropEditor(true);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erreur",
        description: "Impossible de préparer cette image pour le recadrage.",
        variant: "destructive",
      });
    } finally {
      setPreparingAvatarCrop(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    void openAvatarCropFromFile(file).finally(() => {
      input.value = "";
    });
  };
  const handleCropComplete = (croppedImageBlob: Blob) => {
    const croppedFile = new File([croppedImageBlob], 'avatar.jpg', {
      type: 'image/jpeg'
    });
    setAvatarFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedImageBlob);
    setAvatarPreview(previewUrl);
    setShowCropEditor(false);
    setOriginalImageSrc("");
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

  const hasActiveOwnStory = ownStories.some((story) => {
    const expiresAtMs = Date.parse(story.expires_at);
    return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now();
  });

  const handleAvatarPress = () => {
    if (hasActiveOwnStory) {
      setShowOwnStory(true);
      return;
    }
    setShowAvatarFullscreen(true);
  };

  const socialSessionsCount = Math.max(totalSessionsCompleted, totalSessionsCreated);
  const isPremiumUser = !!(profile?.is_premium || subscriptionInfo?.subscribed);
  const socialHighlights = [
    profile?.favorite_sport ? SPORT_LABELS[profile.favorite_sport] ?? "Sport" : null,
    profile?.country ? COUNTRY_LABELS[profile.country] ?? profile.country : null,
    (profile?.strava_connected && profile?.strava_verified_at) ? "Strava" : null,
    (profile?.instagram_connected && profile?.instagram_verified_at) ? "Instagram" : null,
    isPremiumUser ? "Premium" : null,
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-secondary">
            <DialogTitle className="sr-only">Chargement du profil</DialogTitle>
            <div className="flex flex-1 items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-secondary">
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
          
           <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-secondary">
             <div className="box-border min-w-0 max-w-full pb-4">
                {/* Profile Header - Instagram layout: avatar + stats side by side */}
                <div className="bg-card border-b border-border px-4 pt-5 pb-4">
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <button type="button" className="relative shrink-0" onClick={handleAvatarPress}>
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
                              if (file) await openAvatarCropFromFile(file);
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
                      {isPremiumUser && (
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
                      onClick={() => { onOpenChange(false); navigate('/profile/edit'); }}
                    >
                      Modifier le profil
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-lg text-[13px] font-semibold"
                      onClick={() => {
                        const u = profile?.username?.trim();
                        if (!u) {
                          toast({
                            title: "Pseudo manquant",
                            description: "Définis un nom d'utilisateur dans « Modifier le profil » pour partager ton lien.",
                            variant: "destructive",
                          });
                          return;
                        }
                        void shareProfile({
                          username: u,
                          displayName: profile.display_name,
                          bio: profile.bio,
                          avatarUrl: profile.avatar_url,
                          referralCode: profile.referral_code,
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

                  {/* Raccourcis — grille 2 colonnes ; premium: rangée basse Parrainage + Plan d'entraînement */}
                  <div className="bg-card border-b border-border px-4 py-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: Trophy, label: 'Records', color: 'text-yellow-500', action: () => { onOpenChange(false); navigate('/profile/records'); } },
                        { icon: History, label: 'Séances', color: 'text-primary', action: () => { onOpenChange(false); navigate('/my-sessions'); } },
                        { icon: Map, label: 'Parcours', color: 'text-green-500', action: () => { onOpenChange(false); navigate('/route-creation'); } },
                        { icon: MapPin, label: 'Mes itinéraires', color: 'text-blue-500', action: () => { onOpenChange(false); navigate('/itinerary/my-routes'); } },
                        isPremiumUser
                          ? {
                              icon: Gift,
                              label: 'Parrainer quelqu’un',
                              color: 'text-primary',
                              action: () => setShowReferralDialog(true),
                              halfTile: true as const,
                            }
                          : {
                              icon: Crown,
                              label: 'Devenir premium',
                              color: 'text-yellow-600',
                              action: () => {
                                onOpenChange(false);
                                navigate('/subscription');
                              },
                              accentTile: 'premium' as const,
                              centeredHalf: true as const,
                            },
                        isPremiumUser
                          ? {
                              icon: Calendar,
                              label: "Plan d'entraînement",
                              color: 'text-primary',
                              action: () => {
                                onOpenChange(false);
                                navigate('/coaching');
                              },
                              halfTile: true as const,
                            }
                          : {
                              icon: Crown,
                              label: '',
                              color: 'hidden',
                              action: () => {},
                              hiddenTile: true as const,
                            },
                      ].map((item, idx) => (
                        <button
                          key={item.label || `shortcut-empty-${idx}`}
                          type="button"
                          onClick={item.action}
                          disabled={item.hiddenTile}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors',
                            item.hiddenTile && 'pointer-events-none opacity-0',
                            item.halfTile && 'w-full',
                            item.centeredHalf &&
                              'col-span-2 mx-auto w-full max-w-[calc(50%-0.3125rem)]',
                            item.accentTile === 'premium'
                              ? 'border border-yellow-500/40 bg-yellow-500/10 active:bg-yellow-500/15'
                              : 'bg-secondary/50 active:bg-secondary',
                          )}
                        >
                          <item.icon className={`h-6 w-6 shrink-0 ${item.color}`} />
                          <span className="text-center text-[13px] font-medium text-foreground leading-snug">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-border/40 bg-secondary px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom,0px))] dark:border-border/50">
            <div className="mx-auto w-full max-w-md">
              <Button
                type="button"
                className="h-12 w-full gap-2 rounded-2xl text-[15px] font-semibold shadow-md shadow-black/[0.07] ring-1 ring-black/[0.05] dark:shadow-black/30 dark:ring-white/[0.08]"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/stories/create");
                }}
              >
                <Video className="h-4 w-4 shrink-0" />
                Créer une story
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} />

      {preparingAvatarCrop && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/55 px-6">
          <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden />
          <p className="text-center text-[15px] font-medium text-white">Préparation de la photo…</p>
        </div>
      )}

      <ImageCropEditor
        open={showCropEditor}
        onClose={() => {
          setShowCropEditor(false);
          setOriginalImageSrc("");
        }}
        imageSrc={originalImageSrc}
        onCropComplete={handleCropComplete}
      />

      {/* Settings Dialog */}
      <Suspense fallback={null}>
        <SettingsDialog open={showSettingsDialog} onOpenChange={open => setShowSettingsDialog(open)} />
      </Suspense>

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog open={showReliabilityDialog} onOpenChange={setShowReliabilityDialog} reliabilityRate={reliabilityRate} totalSessionsCreated={totalSessionsCreated} totalSessionsJoined={totalSessionsJoined} totalSessionsCompleted={totalSessionsCompleted} />

      <Suspense fallback={null}>
        <ReferralDialog isOpen={showReferralDialog} onClose={() => setShowReferralDialog(false)} />
      </Suspense>

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
      <Dialog
        open={showHighlightsManager}
        onOpenChange={(next) => {
          setShowHighlightsManager(next);
          if (next) setHighlightPickOrder([]);
        }}
      >
        <DialogContent stackNested fullScreen hideCloseButton className="z-[200] flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-none border-0 bg-secondary p-0 !bg-secondary h-[100dvh] max-h-[100dvh]" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Stories à la une</DialogTitle>
          <div className="shrink-0 border-b border-border/70 bg-card/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
            <div className="grid grid-cols-[72px_1fr_72px] items-center px-3 py-3">
              <button
                type="button"
                onClick={() => setShowHighlightsManager(false)}
                className="justify-self-start rounded-full px-2 py-1 text-[15px] font-medium text-primary active:opacity-70"
              >
                Annuler
              </button>
              <h1 className="truncate px-2 text-center text-[16px] font-semibold text-foreground">Ajouter au contenu à la une</h1>
              <button
                type="button"
                disabled={highlightPickOrder.length === 0 || highlightSubmitting}
                onClick={() => void addStoriesToHighlights(highlightPickOrder)}
                className={cn(
                  "justify-self-end rounded-full px-2 py-1 text-[15px] font-semibold transition-opacity",
                  highlightPickOrder.length === 0 || highlightSubmitting
                    ? "text-muted-foreground/60"
                    : "text-primary active:opacity-70"
                )}
              >
                {highlightSubmitting ? "..." : "Suivant"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-3">
            {ownStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Heart className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">Aucune story</p>
                <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
                  Crée ta première story pour pouvoir l&apos;épingler à la une de ton profil.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {ownStories.map((story) => {
                  const pickIndex = highlightPickOrder.indexOf(story.id);
                  const selected = pickIndex >= 0;
                  const dateLabel = new Date(story.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                  return (
                    <button
                      key={story.id}
                      type="button"
                      onPointerDown={(e) => {
                        if (e.button !== 0 && e.button !== -1) return;
                        resetHighlightGridPress();
                        const r = highlightPressRef.current;
                        r.storyId = story.id;
                        r.longTriggered = false;
                        r.startX = e.clientX;
                        r.startY = e.clientY;
                        r.startT = Date.now();
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {
                          /* ignore */
                        }
                        r.timer = setTimeout(() => {
                          r.longTriggered = true;
                          r.timer = null;
                          setHighlightStoryId(story.id);
                          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                            navigator.vibrate(12);
                          }
                        }, HIGHLIGHT_GRID_LONG_PRESS_MS);
                      }}
                      onPointerMove={(e) => {
                        const r = highlightPressRef.current;
                        if (r.storyId !== story.id || r.longTriggered) return;
                        const dx = e.clientX - r.startX;
                        const dy = e.clientY - r.startY;
                        if (Math.hypot(dx, dy) > HIGHLIGHT_GRID_MOVE_CANCEL_PX) clearHighlightGridPressTimer();
                      }}
                      onPointerUp={(e) => {
                        const r = highlightPressRef.current;
                        if (r.storyId !== story.id) return;
                        const longTriggered = r.longTriggered;
                        clearHighlightGridPressTimer();
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {
                          /* ignore */
                        }
                        const dur = Date.now() - r.startT;
                        const dist = Math.hypot(e.clientX - r.startX, e.clientY - r.startY);
                        resetHighlightGridPress();
                        if (longTriggered) return;
                        if (dur < HIGHLIGHT_GRID_LONG_PRESS_MS && dist <= HIGHLIGHT_GRID_MOVE_CANCEL_PX) {
                          setHighlightPickOrder((prev) =>
                            prev.includes(story.id) ? prev.filter((id) => id !== story.id) : [...prev, story.id]
                          );
                          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                            navigator.vibrate(8);
                          }
                        }
                      }}
                      onPointerCancel={resetHighlightGridPress}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        setHighlightPickOrder((prev) =>
                          prev.includes(story.id) ? prev.filter((id) => id !== story.id) : [...prev, story.id]
                        );
                        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                          navigator.vibrate(8);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        clearHighlightGridPressTimer();
                        resetHighlightGridPress();
                        setHighlightStoryId(story.id);
                      }}
                      className={cn(
                        "group relative aspect-[9/16] touch-manipulation overflow-hidden rounded-xl bg-black transition-all select-none",
                        selected && "ring-2 ring-primary"
                      )}
                    >
                      {story.media_type === "video" || story.media_type === "boomerang" ? (
                        <video
                          src={story.media_url ?? undefined}
                          className={cn("h-full w-full object-cover transition-opacity", selected ? "opacity-75" : "opacity-100")}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={story.media_url ?? ""}
                          alt=""
                          loading="lazy"
                          className={cn("h-full w-full object-cover transition-opacity", selected ? "opacity-75" : "opacity-100")}
                        />
                      )}

                      <div className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {dateLabel}
                      </div>

                      {(story.media_type === "video" || story.media_type === "boomerang") && (
                        <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {story.duration_label || "Vidéo"}
                        </div>
                      )}

                      {story.is_highlighted && !selected && (
                        <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          Déjà à la une
                        </div>
                      )}

                      <div
                        className={cn(
                          "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                          selected
                            ? "border-primary bg-primary text-white"
                            : "border-white/75 bg-black/25 text-transparent"
                        )}
                        aria-hidden
                      >
                        {selected ? pickIndex + 1 : "\u00a0"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <SessionStoryDialog
        open={showOwnStory}
        onOpenChange={setShowOwnStory}
        authorId={user?.id ?? null}
        viewerUserId={user?.id ?? null}
        stackNested
        onOpenFeed={() => {
          setShowOwnStory(false);
          onOpenChange(false);
          navigate("/feed");
        }}
      />
      <Dialog open={showAvatarFullscreen} onOpenChange={setShowAvatarFullscreen}>
        <DialogContent
          stackNested
          hideCloseButton
          className="z-[210] flex min-h-0 min-w-0 max-w-[min(100vw,28rem)] flex-col items-center gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Photo de profil</DialogTitle>
          <div className="w-full p-3">
            <img
              src={avatarPreview || profile?.avatar_url || ""}
              alt="Photo de profil"
              className="block aspect-square w-full rounded-xl object-cover"
            />
          </div>
        </DialogContent>
      </Dialog>
      <SessionStoryDialog
        open={!!highlightStoryId}
        onOpenChange={(open) => {
          if (!open) setHighlightStoryId(null);
        }}
        authorId={user?.id ?? null}
        viewerUserId={user?.id ?? null}
        storyId={highlightStoryId}
        stackNested
        onOpenFeed={() => {
          setHighlightStoryId(null);
          onOpenChange(false);
          navigate("/feed");
        }}
      />
    </>;
};