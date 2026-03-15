import { useState, useEffect } from "react";
import { ProfilePreviewDialog } from "@/components/ProfilePreviewDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropEditor } from "@/components/ImageCropEditor";

import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  Settings, Crown, Camera, ChevronRight, ChevronLeft,
  MoreVertical, Flag, MessageCircle, Route, MapPin,
  Calendar, Trophy, Award, Clock, Loader2
} from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { FollowDialog } from "@/components/FollowDialog";
import { useShareProfile } from "@/hooks/useShareProfile";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ReportUserDialog } from "@/components/ReportUserDialog";
import { PersonalRecords } from "@/components/PersonalRecords";
import { useLanguage } from "@/contexts/LanguageContext";
import { AdminPremiumManager } from "@/components/AdminPremiumManager";
import { RecentActivities } from "@/components/profile/RecentActivities";
import { SportsBadges } from "@/components/profile/SportsBadges";
import { IOSListItem, IOSListGroup } from "@/components/ui/ios-list-item";
import { ProfileStatsGroup } from "@/components/profile/ProfileStatsGroup";
import { StravaConnect } from "@/components/StravaConnect";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_image_url?: string | null;
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
  const { user, signOut, subscriptionInfo, refreshSubscription } = useAuth();
  const { userProfile: globalProfile, refreshProfile: refreshGlobalProfile } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId: urlUserId } = useParams();
  const viewingUserId = urlUserId || searchParams.get('user');
  const isViewingOtherUser = viewingUserId && viewingUserId !== user?.id;
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
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<string>("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAdminPremium, setShowAdminPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Stats counts
  const [sessionsCreatedCount, setSessionsCreatedCount] = useState(0);
  const [sessionsJoinedCount, setSessionsJoinedCount] = useState(0);
  const [routesCreatedCount, setRoutesCreatedCount] = useState(0);

  // Period filter
  const [periodFilter, setPeriodFilter] = useState<'total' | '30days' | '7days'>('total');

  // Dialogs
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);
  const [showRecentActivities, setShowRecentActivities] = useState(false);

  const { toast } = useToast();
  const { selectFromGallery, loading: cameraLoading } = useCamera();
  const { t } = useLanguage();

  // =================== DATA FETCHING (preserved from original) ===================

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'not_friends') {
      toast({ title: "Non autorisé", description: "Vous n'êtes pas amis donc vous n'êtes pas autorisé à envoyer un message", variant: "destructive" });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, toast, navigate]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const focusParam = searchParams.get('focus');
    if (tabParam === 'settings' && !isViewingOtherUser) {
      setSettingsFocus(focusParam || "");
      setShowSettingsDialog(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('tab');
      newParams.delete('focus');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams, navigate, isViewingOtherUser]);

  useEffect(() => {
    if (user) {
      if (!isViewingOtherUser && globalProfile) {
        setProfile(globalProfile);
        setFormData(globalProfile);
        setLoading(false);
      } else {
        fetchProfile();
      }
      fetchFollowCounts();
      fetchStatsCounts();
    }
  }, [user, viewingUserId, isViewingOtherUser, globalProfile]);

  useEffect(() => {
    if (user) {
      fetchStatsCounts();
    }
  }, [periodFilter, user, viewingUserId]);

  useEffect(() => {
    fetchAdminStatus();
  }, [user?.id, viewingUserId]);

  const fetchFollowCounts = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;
    try {
      const { data: followerData } = await supabase.rpc('get_follower_count', { profile_user_id: targetUserId });
      const { data: followingData } = await supabase.rpc('get_following_count', { profile_user_id: targetUserId });
      setFollowerCount(followerData || 0);
      setFollowingCount(followingData || 0);
    } catch (error) {
      console.error('Error fetching follow counts:', error);
    }
  };

  const fetchStatsCounts = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;

    let dateFilter: string | null = null;
    if (periodFilter === '30days') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (periodFilter === '7days') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    try {
      let createdQuery = supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('organizer_id', targetUserId);
      let joinedQuery = supabase.from('session_participants').select('id', { count: 'exact', head: true }).eq('user_id', targetUserId);
      let routesQuery = supabase.from('routes').select('id', { count: 'exact', head: true }).eq('created_by', targetUserId);

      if (dateFilter) {
        createdQuery = createdQuery.gte('created_at', dateFilter);
        joinedQuery = joinedQuery.gte('joined_at', dateFilter);
        routesQuery = routesQuery.gte('created_at', dateFilter);
      }

      const [createdRes, joinedRes, routesRes] = await Promise.all([createdQuery, joinedQuery, routesQuery]);

      setSessionsCreatedCount(createdRes.count || 0);
      setSessionsJoinedCount(joinedRes.count || 0);
      setRoutesCreatedCount(routesRes.count || 0);
    } catch (error) {
      console.error('Error fetching stats counts:', error);
    }
  };

  const fetchAdminStatus = async () => {
    const targetUserId = viewingUserId || user?.id;
    if (!targetUserId) return;
    try {
      const { data, error } = await supabase.rpc('has_role', { _user_id: targetUserId, _role: 'admin' });
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const fetchProfile = async (retryCount = 0) => {
    try {
      const targetUserId = viewingUserId || user?.id;
      if (!targetUserId) return;
      if (isViewingOtherUser) {
        const { data, error } = await supabase.rpc('get_public_profile_safe', { profile_user_id: targetUserId });
        if (error) throw error;
        if (data && data.length > 0) {
          const publicProfile = { ...data[0], phone: null, notifications_enabled: false, rgpd_accepted: false, security_rules_accepted: false };
          setProfile(publicProfile);
          setFormData(publicProfile);
        }
      } else {
        const { data, error } = await supabase.from('profiles').select('*').eq('user_id', targetUserId).single();
        if (error) {
          if (error.message.includes('JWT') && retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return fetchProfile(retryCount + 1);
          }
          throw error;
        }
        setProfile(data);
        setFormData(data);
      }
    } catch (error: any) {
      console.error('Fetch profile error:', error);
      toast({ title: "Erreur", description: "Impossible de charger le profil.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // =================== AVATAR & PROFILE UPDATE (preserved) ===================

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Erreur", description: "Veuillez sélectionner un fichier image.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Erreur", description: "La taille du fichier ne doit pas dépasser 5MB.", variant: "destructive" });
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
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
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
          toast({ title: "Erreur", description: "Impossible d'uploader la photo de profil.", variant: "destructive" });
          setLoading(false);
          return;
        }
      }
      const { error } = await supabase.from('profiles').update({ ...formData, avatar_url: avatarUrl }).eq('user_id', user?.id);
      if (error) throw error;
      setProfile({ ...profile!, ...formData, avatar_url: avatarUrl });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      await refreshGlobalProfile();
      toast({ title: "Profil mis à jour !", description: "Vos modifications ont été sauvegardées." });
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // =================== RENDERING ===================

  // Viewing another user → delegate to ProfilePreviewDialog
  if (isViewingOtherUser && viewingUserId) {
    return (
      <div className="h-full bg-secondary">
        <ProfilePreviewDialog userId={viewingUserId} onClose={() => navigate(-1)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full bg-secondary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const periodLabels = { total: 'Totaux', '30days': '30 jours', '7days': '7 jours' };

  return (
    <div className="h-full bg-secondary overflow-y-auto pb-24">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-20 bg-secondary/95 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-11 px-4">
          <div className="w-10" />
          <h1 className="text-[17px] font-semibold text-foreground truncate max-w-[200px]">
            {profile?.display_name || profile?.username || 'Profil'}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 flex items-center justify-center">
                <MoreVertical className="h-5 w-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareProfile(profile?.username || '')}>
                Partager le profil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-5 pt-4">
        {/* ===== IDENTITY SECTION ===== */}
        <div className="flex items-center gap-4 px-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-20 w-20 ring-2 ring-border shadow-lg">
              <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/40">
                {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {profile?.is_premium && (
              <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-green-500 border-2 border-secondary flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const file = await selectFromGallery();
                  if (file) handleAvatarChange({ target: { files: [file] } } as any);
                } catch (error) {
                  toast({ title: "Erreur", description: "Impossible d'accéder à la galerie", variant: "destructive" });
                }
              }}
              disabled={cameraLoading}
              className="absolute bottom-0 left-0 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[20px] font-bold text-foreground truncate">
                {profile?.display_name || profile?.username}
              </h2>
              {profile?.is_premium && <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
            </div>
            <p className="text-[14px] text-muted-foreground">@{profile?.username}</p>
            {profile?.age && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{profile.age} ans</p>
            )}
            {/* Sports badges inline */}
            <div className="mt-1">
              <SportsBadges
                runningRecords={profile?.running_records}
                cyclingRecords={profile?.cycling_records}
                swimmingRecords={profile?.swimming_records}
                triathlonRecords={profile?.triathlon_records}
                walkingRecords={profile?.walking_records}
              />
            </div>
          </div>
        </div>

        {/* ===== FOLLOWS + MESSAGE ROW ===== */}
        <div className="px-4">
          <div className="bg-card rounded-[10px] overflow-hidden flex items-center">
            <button
              onClick={() => { setFollowDialogType('followers'); setShowFollowDialog(true); }}
              className="flex-1 py-3 text-center active:bg-secondary/60 transition-colors border-r border-border/50"
            >
              <p className="text-[18px] font-bold text-foreground leading-none">{followerCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Abonnés</p>
            </button>
            <button
              onClick={() => { setFollowDialogType('following'); setShowFollowDialog(true); }}
              className="flex-1 py-3 text-center active:bg-secondary/60 transition-colors border-r border-border/50"
            >
              <p className="text-[18px] font-bold text-foreground leading-none">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Suivis</p>
            </button>
            {!isViewingOtherUser && !subscriptionInfo?.subscribed && (
              <button
                onClick={() => navigate('/subscription')}
                className="flex-1 py-3 text-center active:bg-secondary/60 transition-colors"
              >
                <Crown className="h-5 w-5 text-yellow-500 mx-auto" />
                <p className="text-[10px] text-muted-foreground mt-1 font-medium uppercase tracking-wide">Premium</p>
              </button>
            )}
          </div>
        </div>

        {/* ===== BIO ===== */}
        {profile?.bio && (
          <div className="px-4">
            <p className="text-[15px] text-foreground leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* ===== PERIOD TABS ===== */}
        <div className="px-4">
          <div className="bg-card rounded-[10px] p-1 flex gap-1">
            {(['total', '30days', '7days'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-colors ${
                  periodFilter === period
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground active:bg-secondary'
                }`}
              >
                {periodLabels[period]}
              </button>
            ))}
          </div>
        </div>

        {/* ===== STATS LIST (iOS Inset Grouped) ===== */}
        <div className="px-4">
          <IOSListGroup>
            <IOSListItem
              icon={Calendar}
              iconBgColor="bg-primary"
              title="Séances créées"
              value={String(sessionsCreatedCount)}
              onClick={() => navigate('/my-sessions')}
            />
            <IOSListItem
              icon={Route}
              iconBgColor="bg-green-500"
              title="Itinéraires créés"
              value={String(routesCreatedCount)}
              onClick={() => navigate('/my-sessions')}
            />
            <IOSListItem
              icon={Trophy}
              iconBgColor="bg-orange-500"
              title="Séances rejointes"
              value={String(sessionsJoinedCount)}
              showSeparator={false}
            />
          </IOSListGroup>
        </div>

        {/* ===== RECORDS (clickable) ===== */}
        <div className="px-4">
          <IOSListGroup>
            <IOSListItem
              icon={Award}
              iconBgColor="bg-yellow-500"
              title="Records sportifs"
              onClick={() => setShowRecordsDialog(true)}
              showSeparator={false}
            />
          </IOSListGroup>
        </div>

        {/* ===== CLASSEMENT, BADGES, ACTIVITÉS ===== */}
        <div className="px-4">
          <ProfileStatsGroup
            userId={user?.id || ''}
            onSettingsClick={() => setShowSettingsDialog(true)}
            onInfoClick={() => setIsEditing(!isEditing)}
          />
        </div>

        {/* ===== STRAVA ===== */}
        <StravaConnect profile={profile} isOwnProfile={!isViewingOtherUser} onProfileUpdate={fetchProfile} />

        {/* ===== RECENT ACTIVITIES BUTTON ===== */}
        <div className="px-4">
          <button
            onClick={() => setShowRecentActivities(true)}
            className="w-full bg-card rounded-[10px] flex items-center gap-3 px-4 py-3.5 active:bg-secondary transition-colors"
          >
            <div className="h-[30px] w-[30px] rounded-[7px] bg-blue-500 flex items-center justify-center">
              <Clock className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="flex-1 text-left text-[17px] text-foreground">Séances récentes</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </button>
        </div>

        {/* ===== ADMIN PREMIUM (creator only) ===== */}
        {user?.email === 'ferdinand.froidefont@gmail.com' && (
          <div className="px-4">
            <IOSListGroup>
              <IOSListItem
                icon={Crown}
                iconBgColor="bg-yellow-500"
                title="Gestion Premium"
                subtitle="Offrir ou retirer des abonnements"
                onClick={() => setShowAdminPremium(true)}
                showSeparator={false}
              />
            </IOSListGroup>
          </div>
        )}

        {/* ===== EDITING FORM (inline, own profile) ===== */}
        {isEditing && (
          <div className="px-4">
            <div className="bg-card rounded-[10px] overflow-hidden">
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Pseudo</label>
                  <Input value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Nom d'affichage</label>
                  <Input value={formData.display_name || ''} onChange={e => setFormData({ ...formData, display_name: e.target.value })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Âge</label>
                  <Input type="number" value={formData.age || ''} onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || null })} className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Téléphone</label>
                  <Input value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="06 12 34 56 78" className="h-11 rounded-[8px]" />
                </div>
                <div>
                  <label className="text-[13px] text-muted-foreground mb-1 block">Bio</label>
                  <Input value={formData.bio || ''} onChange={e => setFormData({ ...formData, bio: e.target.value })} placeholder="Décrivez vos records, vos objectifs..." className="h-11 rounded-[8px]" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={updateProfile} disabled={loading} className="flex-1 h-11 rounded-[8px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setAvatarFile(null); setAvatarPreview(""); setFormData(profile || {}); }} className="flex-1 h-11 rounded-[8px]">
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== DIALOGS ===== */}
      <FollowDialog open={showFollowDialog} onOpenChange={setShowFollowDialog} type={followDialogType} followerCount={followerCount} followingCount={followingCount} targetUserId={viewingUserId || undefined} />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} initialSearch={settingsFocus} />
      <ReportUserDialog isOpen={showReportDialog} onClose={() => setShowReportDialog(false)} reportedUserId={viewingUserId || ""} reportedUsername={profile?.username || ""} />
      <ImageCropEditor open={showCropEditor} onClose={() => setShowCropEditor(false)} imageSrc={originalImageSrc} onCropComplete={handleCropComplete} />
      <AdminPremiumManager open={showAdminPremium} onOpenChange={setShowAdminPremium} />

      {/* Records Dialog */}
      <Dialog open={showRecordsDialog} onOpenChange={setShowRecordsDialog}>
        <DialogContent className="sm:max-w-md p-0 max-h-[80vh] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Records sportifs
            </h3>
            <PersonalRecords records={{
              running_records: profile?.running_records,
              cycling_records: profile?.cycling_records,
              swimming_records: profile?.swimming_records,
              triathlon_records: profile?.triathlon_records,
              walking_records: profile?.walking_records,
            }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Activities Dialog */}
      <Dialog open={showRecentActivities} onOpenChange={setShowRecentActivities}>
        <DialogContent className="sm:max-w-md p-0 max-h-[85vh] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Séances récentes
            </h3>
            <RecentActivities userId={user?.id || ''} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for avatar */}
      <input id="avatar-upload" type="file" accept="image/*" capture="environment" onChange={handleAvatarChange} className="hidden" />
    </div>
  );
};

export default Profile;
