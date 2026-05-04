import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveSubscriptionInfo } from "@/hooks/useEffectiveSubscription";
import { useAppPreview } from "@/contexts/AppPreviewContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Crown, BadgeCheck, Camera, Calendar, Heart, Route, MapPin, Shield, Zap, Instagram, Footprints, Globe, Trophy, Share2, Settings, History, Map as MapIcon, Video, Gift } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { QRShareDialog } from "@/components/QRShareDialog";
import { ProfileShareScreen } from "@/components/profile-share/ProfileShareScreen";
import { SessionStoryDialog } from "@/components/stories/SessionStoryDialog";
import { AvatarViewer } from "@/components/AvatarViewer";

import { ReliabilityDetailsDialog } from "@/components/ReliabilityDetailsDialog";
import { COUNTRY_LABELS } from "@/lib/countryLabels";
import { prepareImageForProfileCrop } from "@/lib/prepareImageForProfileCrop";
import { cn } from "@/lib/utils";
import { MainTopHeader } from "@/components/layout/MainTopHeader";

function formatMaquetteCompactStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function shortDisplayMaquette(displayName: string | null | undefined, username: string): string {
  const base = (displayName ?? "").trim();
  if (!base) return username;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const initial = last[0]?.toUpperCase() ?? "";
  return `${parts[0]} ${initial}.`;
}

/** À partir d'une durée type MM:SS ou H:MM:SS → allure /km si parsable. */
function paceForKmMaquette(timeRaw: string | undefined, km: number): string | undefined {
  const t = timeRaw?.trim();
  if (!t || km <= 0) return undefined;
  const segments = t.split(":").map((x) => Number.parseFloat(x));
  if (segments.some((x) => Number.isNaN(x))) return undefined;
  let sec = 0;
  if (segments.length === 3) sec = segments[0] * 3600 + segments[1] * 60 + segments[2];
  else if (segments.length === 2) sec = segments[0] * 60 + segments[1];
  else return undefined;
  if (!Number.isFinite(sec) || sec <= 0) return undefined;
  const pace = sec / km;
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

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
  onboarding_completed?: boolean;
  cover_image_url?: string | null;
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
  } = useAuth();
  const subscriptionInfo = useEffectiveSubscriptionInfo();
  const { isPreviewMode, previewIdentity } = useAppPreview();
  const { userProfile } = useUserProfile();
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
  /** Évite que Radix ferme le profil au même geste qu’à l’ouverture des réglages. */
  const suppressProfileDismissRef = useRef(false);
  const [showReliabilityDialog, setShowReliabilityDialog] = useState(false);
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
  const { shareProfile, showProfileShare, setShowProfileShare, showQRDialog, setShowQRDialog, qrData } = useShareProfile();
  const {
    selectFromGallery,
    loading: cameraLoading
  } = useCamera();
  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);
    if (isPreviewMode && userProfile && previewIdentity) {
      const data = userProfile as unknown as Profile;
      setProfile(data);
      setFormData(data);
      const defaultRecords = {
        walking: { '5k': '', '10k': '', '21k': '', '42k': '' },
        running: { '5k': '', '10k': '', '21k': '', '42k': '' },
        cycling: { '25k': '', '50k': '', '100k': '', '200k': '' },
        swimming: { '100m': '', '500m': '', '1000m': '', '1500m': '' },
      };
      setRecordsData({
        walking: data.walking_records && typeof data.walking_records === "object"
          ? { ...defaultRecords.walking, ...data.walking_records } : defaultRecords.walking,
        running: data.running_records && typeof data.running_records === "object"
          ? { ...defaultRecords.running, ...data.running_records } : defaultRecords.running,
        cycling: data.cycling_records && typeof data.cycling_records === "object"
          ? { ...defaultRecords.cycling, ...data.cycling_records } : defaultRecords.cycling,
        swimming: data.swimming_records && typeof data.swimming_records === "object"
          ? { ...defaultRecords.swimming, ...data.swimming_records } : defaultRecords.swimming,
      });
      setFollowerCount(previewIdentity.followerCount ?? 0);
      setFollowingCount(previewIdentity.followingCount ?? 0);
      setPendingRequestsCount(0);
      const ms = previewIdentity.mockStats;
      if (ms) {
        setReliabilityRate(ms.reliability_rate ?? 100);
        setTotalSessionsJoined(ms.total_sessions_joined ?? 0);
        setTotalSessionsCompleted(ms.total_sessions_completed ?? 0);
        setTotalSessionsCreated(ms.sessions_created ?? 0);
      } else {
        setReliabilityRate(100);
        setTotalSessionsJoined(0);
        setTotalSessionsCompleted(0);
        setTotalSessionsCreated(0);
      }
      setOwnStories([]);
      setStoryHighlights([]);
      setHighlightPickOrder([]);
      setLoading(false);
      return;
    }
    void fetchProfile();
    void fetchFollowCounts();
    void fetchReliabilityStats();
    void fetchStoriesAndHighlights();
  }, [user, open, isPreviewMode, userProfile, previewIdentity]);
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
    const mediaByStory: Map<string, { media_url: string | null; media_type: 'image' | 'video' | 'boomerang' | null; duration_label: string | null }> = new Map();
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
      const title = newHighlightTitle.trim();
      if (!title) {
        toast({ title: "Titre requis", description: "Donne un titre à ton groupe de stories à la une." });
        return;
      }
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
    const title = newHighlightTitle.trim();
    if (!title) {
      toast({ title: "Titre requis", description: "Donne un titre à ton groupe de stories à la une." });
      return;
    }
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
    if (isPreviewMode) {
      toast({
        title: "Mode aperçu",
        description: "Les modifications ne sont pas enregistrées. Quittez l’aperçu pour retrouver votre compte réel.",
      });
      return;
    }
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
        normalizedPhone = normalizedPhone.replace(/[\s\-()]/g, '');
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
  /** Plein écran — fond crème maquette 19 (screens-msg-profile), dark inchangé. */
  const profileDialogShellClassName =
    "z-[110] flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-none border-0 bg-[#F6F2EC] p-0 text-[#0E0E0F] dark:bg-background dark:text-foreground !h-[calc(100dvh-var(--bottom-nav-offset))] !max-h-[calc(100dvh-var(--bottom-nav-offset))]";

  const handleProfileDialogOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (showSettingsDialog) return;
        if (suppressProfileDismissRef.current) return;
      }
      onOpenChange(next);
    },
    [onOpenChange, showSettingsDialog]
  );

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
  const fiveKmTime = recordsData.running["5k"]?.trim() ?? "";
  const tenKmTime = recordsData.running["10k"]?.trim() ?? "";

  return <>
      <Dialog open={open} onOpenChange={handleProfileDialogOpenChange} modal={false}>
        {open ? (
        <DialogContent
          data-tutorial="tutorial-profile-page"
          hideCloseButton
          fullScreen
          overlayClassName="hidden"
          className={profileDialogShellClassName}
          onInteractOutside={(e) => {
            if (showSettingsDialog) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (showSettingsDialog) e.preventDefault();
          }}
        >
          {loading ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F6F2EC] dark:bg-background">
            <DialogTitle className="sr-only">Chargement du profil</DialogTitle>
            <div className="flex flex-1 items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#FF4D1A] dark:text-primary" />
            </div>
          </div>
          ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-transparent">
          <DialogTitle className="sr-only">Profil</DialogTitle>

          {isEditing ? (
            <div className="z-50 shrink-0 bg-transparent pt-[env(safe-area-inset-top,0px)]">
              <MainTopHeader
                title="Profil"
                className="bg-transparent"
                right={
                  <div className="flex min-w-0 items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const u = profile?.username?.trim();
                        if (!u) {
                          toast({
                            title: "Pseudo manquant",
                            description:
                              "Définis un nom d'utilisateur dans « Modifier le profil » pour partager ton lien.",
                            variant: "destructive",
                          });
                          return;
                        }
                        void shareProfile({
                          username: u,
                          displayName: profile?.display_name,
                          bio: profile?.bio,
                          avatarUrl: profile?.avatar_url,
                          referralCode: profile?.referral_code,
                        });
                      }}
                      className="tap-highlight-none -mr-1 flex h-10 w-10 min-w-[44px] shrink-0 items-center justify-center rounded-full text-primary active:opacity-70"
                      aria-label="Partager le profil"
                    >
                      <Share2 className="h-6 w-6" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => {
                        suppressProfileDismissRef.current = true;
                      }}
                      onClick={() => {
                        setShowSettingsDialog(true);
                        window.setTimeout(() => {
                          suppressProfileDismissRef.current = false;
                        }, 400);
                      }}
                      className="tap-highlight-none flex max-w-[min(52%,11rem)] shrink-0 items-center gap-1 py-1 pl-1 text-primary active:opacity-70"
                      aria-label="Ouvrir les paramètres"
                    >
                      <Settings className="h-5 w-5 shrink-0" strokeWidth={2.4} />
                      <span className="truncate text-[17px] font-normal leading-none">Paramètres</span>
                    </button>
                  </div>
                }
              />
            </div>
          ) : null}

           <div className="ios-scroll-region min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-transparent">
             {!isEditing ? (
               <div className="relative h-[290px] w-full shrink-0 overflow-hidden">
                 {profile?.cover_image_url ? (
                   <img
                     src={profile.cover_image_url}
                     alt=""
                     className="absolute inset-0 h-full w-full object-cover"
                   />
                 ) : (
                   <div
                     className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_20%,#d96b3a_0%,#7a3a1d_45%,#3a1d12_100%)]"
                     aria-hidden
                   />
                 )}
                 <div
                   className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 to-[#F6F2EC] dark:to-background"
                   aria-hidden
                 />
                 <div className="absolute left-4 right-4 z-20 flex justify-between pt-[calc(env(safe-area-inset-top,0px)+6px)]">
                   <button
                     type="button"
                     onClick={() => {
                       const u = profile?.username?.trim();
                       if (!u) {
                         toast({
                           title: "Pseudo manquant",
                           description:
                             "Définis un nom d'utilisateur dans « Modifier le profil » pour partager ton lien.",
                           variant: "destructive",
                         });
                         return;
                       }
                       void shareProfile({
                         username: u,
                         displayName: profile?.display_name,
                         bio: profile?.bio,
                         avatarUrl: profile?.avatar_url,
                         referralCode: profile?.referral_code,
                       });
                     }}
                     className="tap-highlight-none flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white/85 text-[#0E0E0F] shadow-sm backdrop-blur-xl active:opacity-80 dark:border-white/10 dark:bg-white/10 dark:text-white"
                     aria-label="Partager le profil"
                   >
                     <Share2 className="h-[14px] w-[14px]" strokeWidth={2.2} />
                   </button>
                   <button
                     type="button"
                     onPointerDown={() => {
                       suppressProfileDismissRef.current = true;
                     }}
                     onClick={() => {
                       setShowSettingsDialog(true);
                       window.setTimeout(() => {
                         suppressProfileDismissRef.current = false;
                       }, 400);
                     }}
                     className="tap-highlight-none flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white/85 text-[#0E0E0F] shadow-sm backdrop-blur-xl active:opacity-80 dark:border-white/10 dark:bg-white/10 dark:text-white"
                     aria-label="Ouvrir les paramètres"
                   >
                     <Settings className="h-4 w-4" strokeWidth={2.2} />
                   </button>
                 </div>
               </div>
             ) : null}
             <div
               className={cn(
                 "box-border min-w-0 max-w-full",
                 isEditing ? "px-4 pt-3 ios-shell:px-2" : "relative z-10 -mt-[110px] px-5 ios-shell:px-4"
               )}
             >
                <div className="pb-2 pt-0">
                  <div className="flex min-w-0 items-end gap-3.5">
                    <button type="button" className="relative shrink-0 rounded-full" onClick={handleAvatarPress}>
                      <div
                        className="rounded-full p-[2.5px] shadow-[0_0_0_2.5px_#fff,0_0_0_4.5px_#FF4D1A] dark:shadow-[0_0_0_2.5px_hsl(var(--card)),0_0_0_4.5px_hsl(var(--primary))]"
                      >
                        <div className="rounded-full bg-white p-0.5 dark:bg-card">
                          <Avatar className="h-[92px] w-[92px]">
                            <AvatarImage src={avatarPreview || profile?.avatar_url || ""} className="object-cover" />
                            <AvatarFallback className="bg-muted font-display text-[32px] font-bold text-foreground">
                              {profile?.display_name?.[0]?.toUpperCase() ||
                                profile?.username?.[0]?.toUpperCase() ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const file = await selectFromGallery();
                              if (file) await openAvatarCropFromFile(file);
                            } catch (error) {
                              console.error("Error selecting from gallery:", error);
                              toast({
                                title: "Erreur",
                                description: "Impossible d'accéder à la galerie",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={cameraLoading}
                          className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-md disabled:opacity-50"
                          aria-label="Changer l'avatar"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </button>
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h2 className="truncate font-display text-[26px] font-bold leading-none tracking-[-0.4px] text-[#0E0E0F] dark:text-foreground">
                          {shortDisplayMaquette(profile?.display_name, profile?.username ?? "")}
                        </h2>
                        {profile?.is_admin ? (
                          <BadgeCheck className="h-[18px] w-[18px] shrink-0 fill-amber-500 text-white" />
                        ) : isPremiumUser ? (
                          <BadgeCheck className="h-[18px] w-[18px] shrink-0 fill-primary text-primary-foreground" />
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-[13px] leading-snug text-[#7A7771] dark:text-muted-foreground">
                        @{profile?.username}
                        {profile?.country ? (
                          <>
                            {" "}
                            · {COUNTRY_LABELS[profile.country] ?? profile.country}
                          </>
                        ) : null}
                        {profile?.age != null ? (
                          <>
                            {" "}
                            · {profile.age} ans
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-2 text-[13px] text-[#0E0E0F] dark:text-foreground">
                    <div>
                      <span className="font-display text-[18px] font-bold tracking-tight">
                        {formatMaquetteCompactStat(socialSessionsCount)}
                      </span>{" "}
                      séances
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFollowDialogType("followers");
                        setShowFollowDialog(true);
                      }}
                      className="touch-manipulation text-left transition-opacity active:opacity-70"
                    >
                      <span className="font-display text-[18px] font-bold tracking-tight">
                        {formatMaquetteCompactStat(followerCount)}
                      </span>
                      {pendingRequestsCount > 0 ? (
                        <span className="ml-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                          {pendingRequestsCount}
                        </span>
                      ) : null}{" "}
                      abonnés
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFollowDialogType("following");
                        setShowFollowDialog(true);
                      }}
                      className="touch-manipulation text-left transition-opacity active:opacity-70"
                    >
                      <span className="font-display text-[18px] font-bold tracking-tight">
                        {formatMaquetteCompactStat(followingCount)}
                      </span>{" "}
                      abonnements
                    </button>
                  </div>

                  <p className="mt-3.5 text-[14px] leading-[1.4] text-[#3A3936] dark:text-muted-foreground">
                    {(profile?.bio ?? "").trim() ||
                      "Ajoute une bio depuis « Modifier le profil » pour te présenter."}
                  </p>

                  <div className="mt-3.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/profile/edit");
                      }}
                      className="font-display h-11 min-h-[44px] flex-1 rounded-[12px] bg-[#0E0E0F] text-[13px] font-bold text-white transition-opacity active:opacity-90 dark:bg-foreground dark:text-background"
                    >
                      Modifier le profil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const u = profile?.username?.trim();
                        if (!u) {
                          toast({
                            title: "Pseudo manquant",
                            description:
                              "Définis un nom d'utilisateur dans « Modifier le profil » pour partager ton lien.",
                            variant: "destructive",
                          });
                          return;
                        }
                        void shareProfile({
                          username: u,
                          displayName: profile?.display_name,
                          bio: profile?.bio,
                          avatarUrl: profile?.avatar_url,
                          referralCode: profile?.referral_code,
                        });
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#E2DBD0] bg-white text-[#0E0E0F] transition-colors active:bg-[#EDE6DC] dark:border-border dark:bg-card dark:text-foreground dark:active:bg-muted/60"
                      aria-label="Partager le profil"
                    >
                      <Share2 className="h-[14px] w-[14px]" strokeWidth={2.2} />
                    </button>
                  </div>

                  <div
                    role="tablist"
                    aria-label="Sections du profil"
                    className="mt-[22px] flex border-b border-[#E2DBD0] dark:border-border"
                  >
                    <div className="flex flex-1 flex-col items-center border-b-2 border-[#FF4D1A] pb-3 pt-3 dark:border-primary">
                      <span className="font-display text-[13px] font-bold text-[#0E0E0F] dark:text-foreground">Profil</span>
                    </div>
                    <button
                      type="button"
                      role="tab"
                      className="flex flex-1 flex-col items-center border-b-2 border-transparent pb-3 pt-3 transition-colors active:opacity-70"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/profile/records");
                      }}
                    >
                      <span className="font-display text-[13px] font-bold text-[#7A7771] dark:text-muted-foreground">Records</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="flex flex-1 flex-col items-center border-b-2 border-transparent pb-3 pt-3 transition-colors active:opacity-70"
                      onClick={() => {
                        onOpenChange(false);
                        navigate("/stories/create");
                      }}
                    >
                      <span className="font-display text-[13px] font-bold text-[#7A7771] dark:text-muted-foreground">Stories</span>
                    </button>
                  </div>

                  <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                    <div className="relative overflow-hidden rounded-[18px] border-[1.5px] border-[#E2DBD0] bg-white p-3.5 text-[#0E0E0F] dark:border-border/60 dark:bg-card dark:text-foreground">
                      <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#7A7771] dark:text-muted-foreground">
                        Record · 5 km
                      </div>
                      <div className="mt-2 font-display text-[28px] font-bold leading-none tracking-[-1px]">
                        {fiveKmTime || "—"}
                      </div>
                      {fiveKmTime ? (
                        <div className="mt-0.5 text-[11px] font-semibold text-[#7A7771] dark:text-muted-foreground">
                          {paceForKmMaquette(fiveKmTime, 5) ?? ""}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[11px] font-semibold text-[#7A7771]/80 dark:text-muted-foreground/80">
                          Renseigne ton temps
                        </div>
                      )}
                      <div className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FF4D1A] text-white">
                        <Zap className="h-3 w-3" strokeWidth={2.4} />
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-[18px] bg-[#0E0E0F] p-3.5 text-white dark:bg-foreground dark:text-background">
                      <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-white/60 dark:text-background/60">
                        Record · 10 km
                      </div>
                      <div className="mt-2 font-display text-[28px] font-bold leading-none tracking-[-1px]">
                        {tenKmTime || "—"}
                      </div>
                      {tenKmTime ? (
                        <div className="mt-0.5 text-[11px] font-semibold text-white/70 dark:text-background/70">
                          {paceForKmMaquette(tenKmTime, 10) ?? ""}
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[11px] font-semibold text-white/70 dark:text-background/70">
                          Renseigne ton temps
                        </div>
                      )}
                      <div className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white dark:bg-background/15 dark:text-background">
                        <Zap className="h-3 w-3" strokeWidth={2.4} />
                      </div>
                    </div>
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

                </>
              )}
            </div>

            <div className="pb-[calc(env(safe-area-inset-bottom,0px)+12px)]" />
          </div>
          </div>
          )}
        </DialogContent>
        ) : null}
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
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          stackNested
        />
      </Suspense>

      {/* Reliability Details Dialog */}
      <ReliabilityDetailsDialog open={showReliabilityDialog} onOpenChange={setShowReliabilityDialog} reliabilityRate={reliabilityRate} totalSessionsCreated={totalSessionsCreated} totalSessionsJoined={totalSessionsJoined} totalSessionsCompleted={totalSessionsCompleted} />

      <ProfileShareScreen
        open={showProfileShare}
        onClose={() => setShowProfileShare(false)}
        onOpenQr={() => {
          setShowProfileShare(false);
          setShowQRDialog(true);
        }}
      />

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
        {showHighlightsManager ? (
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
                disabled={highlightPickOrder.length === 0 || highlightSubmitting || !newHighlightTitle.trim()}
                onClick={() => void addStoriesToHighlights(highlightPickOrder)}
                className={cn(
                  "justify-self-end rounded-full px-2 py-1 text-[15px] font-semibold transition-opacity",
                  highlightPickOrder.length === 0 || highlightSubmitting || !newHighlightTitle.trim()
                    ? "text-muted-foreground/60"
                    : "text-primary active:opacity-70"
                )}
              >
                {highlightSubmitting ? "..." : "Suivant"}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-[max(16px,env(safe-area-inset-bottom,16px))] pt-3">
            <div className="mb-3">
              <Input
                value={newHighlightTitle}
                onChange={(e) => setNewHighlightTitle(e.target.value)}
                placeholder="Titre du groupe à la une"
                className="h-11 bg-card"
              />
            </div>
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
        ) : null}
      </Dialog>
      {showOwnStory && (
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
      )}
      {highlightStoryId && (
      <SessionStoryDialog
        open
        onOpenChange={(next) => {
          if (!next) setHighlightStoryId(null);
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
      )}
      <AvatarViewer
        open={showAvatarFullscreen}
        onClose={() => setShowAvatarFullscreen(false)}
        avatarUrl={avatarPreview || profile?.avatar_url || null}
        username={profile?.username?.trim() || "Profil"}
        stackNested
      />
    </>;
};