import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineStatus } from "./OnlineStatus";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReportUserDialog } from "./ReportUserDialog";
import { useToast } from "@/hooks/use-toast";
import { Search, User, UserPlus, UserCheck, Lock, MessageCircle, Users, Copy, UserMinus, Flag, MoreVertical, ArrowLeft } from "lucide-react";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  follower_count?: number;
  following_count?: number;
}

interface Club {
  id: string;
  group_name: string;
  group_description: string | null;
  group_avatar_url: string | null;
  club_code: string;
  created_by: string;
  member_count?: number;
  is_member?: boolean;
}

interface UniversalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartConversation?: (userId: string) => void;
  onJoinClub?: (clubId: string) => void;
  initialTab?: 'profiles' | 'clubs' | 'strava' | '';
}

export const UniversalSearchDialog = ({ 
  open, 
  onOpenChange, 
  onStartConversation,
  onJoinClub,
  initialTab = ''
}: UniversalSearchDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'profiles' | 'clubs' | 'strava' | ''>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileResults, setProfileResults] = useState<Profile[]>([]);
  const [clubResults, setClubResults] = useState<Club[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [areFriends, setAreFriends] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState<boolean | null>(null);

  // Check Strava connection status
  const checkStravaConnection = async () => {
    if (!user) return;

    console.log('🔍 Checking Strava connection for user:', user.id);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('strava_connected, strava_access_token, strava_user_id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 Profile data:', {
        strava_connected: profile?.strava_connected,
        has_access_token: !!profile?.strava_access_token,
        strava_user_id: profile?.strava_user_id,
        error
      });

      if (error) {
        console.error('Error fetching profile:', error);
        setIsStravaConnected(false);
        return;
      }

      const connected = profile?.strava_connected && profile?.strava_access_token ? true : false;
      console.log('🔍 Final connection status:', connected);
      setIsStravaConnected(connected);
    } catch (error) {
      console.error('Error checking Strava connection:', error);
      setIsStravaConnected(false);
    }
  };

  // Load Strava friends
  const loadStravaFriends = async () => {
    if (!user) return;

    console.log('🔍 Loading Strava friends for user:', user.id);

    try {
      setLoading(true);
      
      // First check if Strava is connected
      await checkStravaConnection();
      
      console.log('🔍 Strava connection status:', isStravaConnected);
      
      // Use the edge function to get real Strava friends
      const { data, error } = await supabase.functions.invoke('get-strava-friends');

      console.log('🔍 Edge function response:', { data, error });

      if (error) {
        console.error('Error calling get-strava-friends:', error);
        setProfileResults([]);
        return;
      }

      if (data?.error === 'Strava not connected') {
        console.log('🔍 Edge function says Strava not connected');
        setIsStravaConnected(false);
        setProfileResults([]);
        return;
      }

      if (data?.error === 'Profile not found') {
        console.log('🔍 Edge function says profile not found');
        setIsStravaConnected(false);
        setProfileResults([]);
        return;
      }

      if (data?.friends) {
        console.log('🔍 Found Strava friends:', data.friends.length);
        setProfileResults(data.friends);
        setIsStravaConnected(true);
      } else {
        console.log('🔍 No friends in response');
        setProfileResults([]);
      }

    } catch (error: any) {
      console.error('Error loading Strava friends:', error);
      setProfileResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const searchProfiles = async () => {
    if (!searchQuery.trim()) {
      setProfileResults([]);
      return;
    }

    try {
      const { data: searchData, error: searchError } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', user?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .eq('is_private', false)
        .limit(20);

      if (searchError) throw searchError;
      const userIds = searchData?.map(item => item.user_id) || [];
      
      if (userIds.length === 0) {
        setProfileResults([]);
        return;
      }

      // Get full profiles using the safe function
      const { data: profiles, error: profilesError } = await supabase.rpc('get_safe_public_profiles', {
        profile_user_ids: userIds
      });

      if (profilesError) throw profilesError;

      // Load follower counts for each profile
      const profilesWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: followerData } = await supabase.rpc('get_follower_count', { 
            profile_user_id: profile.user_id 
          });
          const { data: followingData } = await supabase.rpc('get_following_count', { 
            profile_user_id: profile.user_id 
          });
          
          return {
            ...profile,
            is_private: false, // These are already filtered as public
            follower_count: followerData || 0,
            following_count: followingData || 0
          };
        })
      );

      setProfileResults(profilesWithStats);
    } catch (error: any) {
      console.error('Error searching users:', error);
      setProfileResults([]);
    }
  };

  // Search for clubs by exact code
  const searchClubs = async () => {
    if (!searchQuery.trim()) {
      setClubResults([]);
      return;
    }

    try {
      // Search by exact club code
      const { data, error } = await supabase
        .from('conversations')
        .select('id, group_name, group_description, group_avatar_url, club_code, created_by')
        .eq('is_group', true)
        .eq('club_code', searchQuery.toUpperCase())
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // Check if user is already a member and get member count
        const clubsWithStats = await Promise.all(
          data.map(async (club) => {
            // Get member count
            const { count: memberCount } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', club.id);

            // Check if user is already a member
            const { data: memberData } = await supabase
              .from('group_members')
              .select('id')
              .eq('conversation_id', club.id)
              .eq('user_id', user?.id)
              .single();

            return {
              ...club,
              member_count: memberCount || 0,
              is_member: !!memberData
            };
          })
        );

        setClubResults(clubsWithStats);
      } else {
        setClubResults([]);
      }
    } catch (error: any) {
      console.error('Error searching clubs:', error);
      setClubResults([]);
    }
  };

  // Join a club
  const handleJoinClub = async (club: Club) => {
    if (!user || club.is_member) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          conversation_id: club.id,
          user_id: user.id,
          is_admin: false
        }]);

      if (error) throw error;

      // Update local state
      setClubResults(prev => 
        prev.map(c => 
          c.id === club.id 
            ? { ...c, is_member: true, member_count: (c.member_count || 0) + 1 }
            : c
        )
      );

      toast({
        title: "Succès !",
        description: `Vous avez rejoint le club "${club.group_name}"`
      });

      if (onJoinClub) {
        onJoinClub(club.id);
      }
    } catch (error: any) {
      console.error('Error joining club:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rejoindre le club",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy club code to clipboard
  const copyClubCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Code copié !",
        description: "Le code du club a été copié dans le presse-papiers"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le code",
        variant: "destructive"
      });
    }
  };

  // Check follow status and friendship
  const checkFollowStatus = async (userId: string) => {
    if (!user) return;

    try {
      // Check follow status
      const { data, error } = await supabase
        .from('user_follows')
        .select('id, status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (data) {
        setFollowStatus(data.status);
        setIsFollowing(data.status === 'accepted');
      } else {
        setFollowStatus(null);
        setIsFollowing(false);
      }

      // Check if they are friends
      const { data: friendsData } = await supabase.rpc('are_users_friends', {
        user1_id: user.id,
        user2_id: userId
      });
      
      setAreFriends(friendsData || false);
    } catch (error: any) {
      setFollowStatus(null);
      setIsFollowing(false);
      setAreFriends(false);
    }
  };

  // Check blocked status
  const checkBlockedStatus = async (userId: string) => {
    if (!user) return;

    try {
      const { data: blockedData } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();
      
      setIsBlocked(!!blockedData);
    } catch (error) {
      console.error('Error checking blocked status:', error);
      setIsBlocked(false);
    }
  };

  // Block user
  const handleBlockUser = async () => {
    if (!user || !selectedProfile) return;

    try {
      setLoading(true);
      
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: selectedProfile.user_id
        });

      if (blockError) throw blockError;

      // Remove follow relationships
      await supabase
        .from('user_follows')
        .delete()
        .or(`and(follower_id.eq.${user.id},following_id.eq.${selectedProfile.user_id}),and(follower_id.eq.${selectedProfile.user_id},following_id.eq.${user.id})`);

      setIsBlocked(true);
      setIsFollowing(false);
      setFollowStatus(null);
      setAreFriends(false);
      
      toast({
        title: "Utilisateur bloqué",
        description: "Cette personne ne peut plus vous contacter ni voir vos séances",
      });

    } catch (error: any) {
      console.error('Block user error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de bloquer cet utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Unblock user
  const handleUnblockUser = async () => {
    if (!user || !selectedProfile) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', selectedProfile.user_id);

      if (error) throw error;

      setIsBlocked(false);
      toast({
        title: "Utilisateur débloqué",
        description: "Cette personne peut maintenant vous contacter à nouveau",
      });

    } catch (error: any) {
      console.error('Unblock user error:', error);
      toast({
        title: "Erreur", 
        description: "Impossible de débloquer cet utilisateur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Follow/unfollow user
  const toggleFollow = async () => {
    if (!user || !selectedProfile) return;

    setLoading(true);
    try {
      if (followStatus === 'accepted') {
        // Unfollow - marquer comme "unfollowed" au lieu de supprimer
        const { error } = await supabase
          .from('user_follows')
          .update({ status: 'unfollowed' })
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id);

        if (error) throw error;
        
        setFollowStatus('unfollowed');
        setIsFollowing(false);
        setAreFriends(false);
        
        toast({ title: "Succès", description: "Vous ne suivez plus cet utilisateur" });
      } else if (followStatus === 'pending' || followStatus === 'unfollowed') {
        // Cancel pending request ou annuler un unfollowed
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id);

        if (error) throw error;
        
        setFollowStatus(null);
        setIsFollowing(false);
        
        const message = followStatus === 'pending' 
          ? "Demande de suivi annulée" 
          : "Relation supprimée";
        toast({ title: "Succès", description: message });
      } else {
        // Send follow request ou réactiver une relation précédente
        
        // D'abord vérifier s'il y a une relation précédente
        const { data: existingFollow } = await supabase
          .from('user_follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', selectedProfile.user_id)
          .maybeSingle();

        if (existingFollow && existingFollow.status === 'unfollowed') {
          // Réactiver une relation précédemment acceptée
          const { error } = await supabase
            .from('user_follows')
            .update({ status: 'accepted' })
            .eq('follower_id', user.id)
            .eq('following_id', selectedProfile.user_id);

          if (error) throw error;

          setFollowStatus('accepted');
          setIsFollowing(true);
          
          const { data: friendsData } = await supabase.rpc('are_users_friends', {
            user1_id: user.id,
            user2_id: selectedProfile.user_id
          });
          setAreFriends(friendsData || false);
          
          toast({ 
            title: "Réabonnement réussi", 
            description: "Vous suivez de nouveau cet utilisateur" 
          });
        } else {
          // Nouvelle relation - vérifier si le profil est privé
          // Toutes les demandes de suivi nécessitent une confirmation
          const initialStatus = 'pending';
          
          const { error } = await supabase
            .from('user_follows')
            .insert([{
              follower_id: user.id,
              following_id: selectedProfile.user_id,
              status: initialStatus
            }]);

          if (error) throw error;
          
          setFollowStatus(initialStatus);
          setIsFollowing(false);
          
          toast({ 
            title: "Demande envoyée", 
            description: "Votre demande de suivi a été envoyée" 
          });
        }
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast({ 
        title: "Erreur", 
        description: "Impossible de modifier le suivi", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Search when query changes or load Strava friends
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (activeTab === 'profiles') {
        searchProfiles();
      } else if (activeTab === 'clubs') {
        searchClubs();
      } else if (activeTab === 'strava') {
        loadStravaFriends();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeTab]);

  // Load Strava friends immediately when switching to Strava tab
  useEffect(() => {
    if (activeTab === 'strava' && open) {
      loadStravaFriends();
    }
  }, [activeTab, open]);

  // Check follow status when profile is selected
  useEffect(() => {
    if (selectedProfile) {
      checkFollowStatus(selectedProfile.user_id);
      checkBlockedStatus(selectedProfile.user_id);
    }
  }, [selectedProfile, user]);

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery("");
    setProfileResults([]);
    setClubResults([]);
    setSelectedProfile(null);
    setSelectedClub(null);
  }, [activeTab]);

  // Update activeTab when initialTab changes
  useEffect(() => {
    if (initialTab !== '') {
      setActiveTab(initialTab);
    }
  }, [initialTab, open]);

  // Profile detail view
  if (selectedProfile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProfile(null)}
                >
                  ←
                </Button>
                Profil utilisateur
              </div>
              
              {/* Menu à trois points */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                  {isBlocked ? (
                    <DropdownMenuItem 
                      onClick={handleUnblockUser}
                      className="text-green-600 hover:bg-green-50 cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Débloquer cet utilisateur
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={handleBlockUser}
                      className="text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Bloquer cet utilisateur
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowReportDialog(true)}
                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Signaler cet utilisateur
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Profile Header */}
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-20">
                <Avatar className="h-20 w-20 mx-auto">
                  <AvatarImage src={selectedProfile.avatar_url || ""} />
                  <AvatarFallback className="text-lg">
                    {(selectedProfile.username || selectedProfile.display_name || "").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {areFriends && <OnlineStatus userId={selectedProfile.user_id} />}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedProfile.username || selectedProfile.display_name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  @{selectedProfile.username}
                </p>
                {selectedProfile.is_private && (
                  <Badge variant="outline" className="mt-1">
                    <Lock className="h-3 w-3 mr-1" />
                    Privé
                  </Badge>
                )}
              </div>

              {/* Stats */}
              {(!selectedProfile.is_private || isFollowing) && (
                <div className="flex justify-center gap-6 py-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedProfile.follower_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Abonnés</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{selectedProfile.following_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Abonnements</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bio */}
            {selectedProfile.bio && !selectedProfile.is_private && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">{selectedProfile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Private account message */}
            {selectedProfile.is_private && !isFollowing && (
              <Card className="border-muted">
                <CardContent className="p-4 text-center">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ce compte est privé. Suivez-le pour voir son contenu.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={toggleFollow}
                disabled={loading}
                variant={isFollowing ? "outline" : "default"}
                className="flex-1"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Suivi
                  </>
                 ) : followStatus === 'pending' ? (
                   <>
                     <UserPlus className="h-4 w-4 mr-2" />
                     En attente
                   </>
                 ) : followStatus === 'unfollowed' ? (
                   <>
                     <UserPlus className="h-4 w-4 mr-2" />
                     Suivre à nouveau
                   </>
                 ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Suivre
                  </>
                )}
              </Button>
              
              {areFriends && onStartConversation && (
                <Button
                  onClick={() => {
                    onStartConversation(selectedProfile.user_id);
                    onOpenChange(false);
                    setSelectedProfile(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
               )}
             </div>
           </div>

           {/* Report Dialog */}
           <ReportUserDialog
             isOpen={showReportDialog}
             onClose={() => setShowReportDialog(false)}
             reportedUserId={selectedProfile.user_id}
             reportedUsername={selectedProfile.username}
           />
         </DialogContent>
       </Dialog>
    );
  }

  // Club detail view
  if (selectedClub) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClub(null)}
              >
                ←
              </Button>
              Détails du club
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Club Header */}
            <div className="text-center space-y-3">
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarImage src={selectedClub.group_avatar_url || ""} />
                <AvatarFallback className="text-lg">
                  <Users className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-lg font-semibold">{selectedClub.group_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedClub.member_count || 0} membre{(selectedClub.member_count || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Club Description */}
            {selectedClub.group_description && (
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">{selectedClub.group_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Club Code (only for creator) */}
            {selectedClub.created_by === user?.id && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Code du club</p>
                      <p className="text-xs text-muted-foreground">Partagez ce code pour inviter des membres</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {selectedClub.club_code}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyClubCode(selectedClub.club_code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {selectedClub.is_member ? (
                <Button disabled className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  Membre du club
                </Button>
              ) : (
                <Button
                  onClick={() => handleJoinClub(selectedClub)}
                  disabled={loading}
                  className="flex-1"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Rejoindre le club
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche
          </DialogTitle>
        </DialogHeader>

        {activeTab === '' ? (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveTab('profiles')}
            >
              <User className="h-5 w-5" />
              <span>Utilisateurs</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveTab('clubs')}
            >
              <Users className="h-5 w-5" />
              <span>Clubs</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setActiveTab('strava')}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
              </svg>
              <span>Strava</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab('')}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>

            <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'profiles' | 'clubs' | 'strava')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profiles" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profils
                </TabsTrigger>
                <TabsTrigger value="clubs" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clubs
                </TabsTrigger>
                <TabsTrigger value="strava" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
                  </svg>
                  Strava
                </TabsTrigger>
              </TabsList>

          <TabsContent value="profiles" className="space-y-4">
            {/* Profile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nom d'utilisateur ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {profileResults.length === 0 && searchQuery && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Aucun utilisateur trouvé
                </p>
              )}
              
              {profileResults.map((profile) => (
                <div
                  key={profile.user_id}
                  onClick={() => setSelectedProfile(profile)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatus userId={profile.user_id} className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {profile.username || profile.display_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                      {profile.is_private && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="clubs" className="space-y-4">
            {/* Club search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Code exact du club (ex: ABC12345)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                className="pl-10 font-mono"
                maxLength={8}
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {clubResults.length === 0 && searchQuery && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Aucun club trouvé avec ce code
                </p>
              )}
              
              {clubResults.map((club) => (
                <div
                  key={club.id}
                  onClick={() => setSelectedClub(club)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={club.group_avatar_url || ""} />
                    <AvatarFallback>
                      <Users className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{club.group_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {club.member_count || 0} membre{(club.member_count || 0) !== 1 ? 's' : ''}
                      {club.is_member && " • Membre"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!searchQuery && (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Entrez le code exact d'un club pour le rejoindre
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les codes de club sont partagés par les créateurs
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="strava" className="space-y-4">
            {/* Strava friends - pas de barre de recherche */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {loading && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Chargement des amis Strava...
                </p>
              )}
              
              {!loading && isStravaConnected === false && (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <svg className="h-8 w-8 text-muted-foreground mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
                    </svg>
                    <p className="text-sm text-muted-foreground">
                      Connectez votre compte Strava pour voir vos amis qui utilisent l'app
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {!loading && isStravaConnected === true && profileResults.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center">
                    <svg className="h-8 w-8 text-muted-foreground mx-auto mb-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
                    </svg>
                    <p className="text-sm text-muted-foreground mb-2">
                      Aucun ami Strava trouvé sur l'app
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vos amis Strava doivent aussi utiliser RunConnect pour apparaître ici
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {profileResults.map((profile) => (
                <div
                  key={profile.user_id}
                  onClick={() => setSelectedProfile(profile)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <OnlineStatus userId={profile.user_id} className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {profile.username || profile.display_name}
                      </p>
                      <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.171"/>
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      @{profile.username} • Connecté via Strava
                    </p>
                  </div>
                </div>
              ))}
            </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};