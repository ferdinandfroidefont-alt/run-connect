import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Settings,
  Crown,
  Calendar,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Trash2,
  Search,
  AlertTriangle,
  Copy,
  GraduationCap } from
"lucide-react";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { CoachingTab } from "./coaching/CoachingTab";
import { ClubGroupsManager } from "./coaching/ClubGroupsManager";
import { CoachBadge } from "./coaching/CoachBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface GroupMember extends Profile {
  is_admin: boolean;
  is_coach: boolean;
  joined_at: string;
}

interface ClubInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupDescription: string | null;
  groupAvatarUrl: string | null;
  isAdmin: boolean;
  clubCode: string;
  createdBy: string;
  onEditGroup: () => void;
}

export const ClubInfoDialog = ({
  isOpen,
  onClose,
  conversationId,
  groupName,
  groupDescription,
  groupAvatarUrl,
  isAdmin,
  clubCode,
  createdBy,
  onEditGroup
}: ClubInfoDialogProps) => {
  console.log('🔍 GroupInfoDialog render - DEBUGGING:');
  console.log('- isOpen:', isOpen);
  console.log('- conversationId:', conversationId);
  console.log('- groupName:', groupName);
  console.log('- groupDescription:', groupDescription);
  console.log('- groupAvatarUrl:', groupAvatarUrl);
  console.log('- isAdmin:', isAdmin);
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);

  // Load group members
  const loadGroupMembers = async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      console.log('🔍 Loading members for conversation:', conversationId);

      const { data: memberIds, error: memberError } = await supabase.
      from('group_members').
      select('user_id, is_admin, is_coach, joined_at').
      eq('conversation_id', conversationId);

      console.log('📊 Member IDs result:', { memberIds, memberError });

      if (memberError) {
        console.error('Error fetching member IDs:', memberError);
        throw memberError;
      }

      if (memberIds && memberIds.length > 0) {
        const { data: memberProfiles, error: profileError } = await supabase.
        from('profiles').
        select('user_id, username, display_name, avatar_url').
        in('user_id', memberIds.map((m) => m.user_id));

        console.log('👥 Member profiles result:', { memberProfiles, profileError });

        if (profileError) {
          console.error('Error fetching member profiles:', profileError);
          throw profileError;
        }

        const membersWithProfiles = memberIds.map((member) => {
          const profile = memberProfiles?.find((p) => p.user_id === member.user_id);
          return {
            ...profile,
            is_admin: member.is_admin,
            is_coach: member.is_coach || false,
            joined_at: member.joined_at
          } as GroupMember;
        }).filter((m) => m.user_id);

        // Sort members: admins first, then by display name
        membersWithProfiles.sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          return (a.username || a.display_name || '').localeCompare(
            b.username || b.display_name || ''
          );
        });

        console.log('✅ Final members with profiles:', membersWithProfiles);
        setMembers(membersWithProfiles);
      } else {
        console.log('⚠️ No members found for this club');
        setMembers([]);
      }
    } catch (error) {
      console.error('❌ Error loading group members:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres du club",
        variant: "destructive"
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle coach status
  const toggleCoach = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.
      from('group_members').
      update({ is_coach: !currentStatus }).
      eq('conversation_id', conversationId).
      eq('user_id', memberId);
      if (error) throw error;
      toast({
        title: !currentStatus ? "Coach promu !" : "Rôle coach retiré"
      });
      loadGroupMembers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  // Check if current user is coach
  const currentUserIsCoach = members.some(
    (m) => m.user_id === user?.id && (m.is_coach || m.is_admin)
  ) || createdBy === user?.id;

  const handleMemberClick = (member: GroupMember) => {
    navigateToProfile(member.user_id);
  };

  // Search for users to invite
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Get current group members to exclude them
      const memberIds = members.map((m) => m.user_id);

      const { data, error } = await supabase.
      from('profiles').
      select('user_id, username, display_name, avatar_url').
      or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`).
      not('user_id', 'in', `(${memberIds.join(',')})`).
      limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Invite user to group
  const inviteUser = async (userId: string) => {
    setInviteLoading(true);
    try {
      const { error } = await supabase.
      from('club_invitations').
      insert([{
        club_id: conversationId,
        inviter_id: user?.id,
        invited_user_id: userId
      }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Invitation envoyée avec succès"
      });

      setSearchQuery("");
      setSearchResults([]);
      setShowInviteDialog(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Information",
          description: "Cet utilisateur a déjà été invité",
          variant: "default"
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Impossible d'envoyer l'invitation",
          variant: "destructive"
        });
      }
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove member from group
  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase.
      from('group_members').
      delete().
      eq('conversation_id', conversationId).
      eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Membre retiré du club"
      });

      setMemberToDelete(null);
      setShowDeleteDialog(false);
      loadGroupMembers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de retirer ce membre",
        variant: "destructive"
      });
    }
  };

  // Delete entire group
  const deleteGroup = async () => {
    try {
      // Delete group members first
      await supabase.
      from('group_members').
      delete().
      eq('conversation_id', conversationId);

      // Delete messages
      await supabase.
      from('messages').
      delete().
      eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase.
      from('conversations').
      delete().
      eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Club supprimé avec succès"
      });

      setShowDeleteGroupDialog(false);
      onClose();
      // Refresh parent component
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le club",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const debounce = setTimeout(searchUsers, 300);
      return () => clearTimeout(debounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, members]);

  useEffect(() => {
    if (isOpen) {
      loadGroupMembers();
    }
  }, [isOpen, conversationId]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0">
          {/* iOS Navigation Bar */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]">

              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px]">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              Informations du club
            </span>
            <div className="min-w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto p-4">

          <div className="space-y-2">
            {/* Group Header — Enhanced */}
            <div className="flex flex-col items-center text-center py-4">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarImage src={groupAvatarUrl || ""} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {(groupName || "C").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-[20px] font-bold text-foreground">{groupName}</h2>
              {groupDescription && (
                <p className="text-[13px] text-muted-foreground mt-1 max-w-[260px]">{groupDescription}</p>
              )}
              {/* Mini stats row */}
              <div className="flex gap-5 mt-4">
                <div className="text-center">
                  <span className="text-[17px] font-semibold text-foreground">{members.length}</span>
                  <p className="text-[10px] text-muted-foreground">Membres</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-[17px] font-semibold text-foreground">
                    {members.filter(m => m.is_coach).length}
                  </span>
                  <p className="text-[10px] text-muted-foreground">Coachs</p>
                </div>
              </div>
            </div>

            {/* Club Code - only visible to creator */}
            {createdBy === user?.id && clubCode && (
              <div className="bg-card rounded-[10px] p-3 flex items-center justify-between mb-2" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
                <div>
                  <p className="text-[11px] text-muted-foreground">Code du club</p>
                  <p className="text-[15px] font-mono font-semibold text-foreground">{clubCode}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(clubCode);
                    toast({ title: "Code copié !" });
                  }}
                  className="text-primary active:opacity-70"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
            )}


            {/* Tabs: Members, Coaching & Groups */}
            <Tabs defaultValue="coaching" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="members" className="flex-1 gap-1">
                  <Users className="h-4 w-4" />
                  Membres
                </TabsTrigger>
                <TabsTrigger value="coaching" className="flex-1 gap-1">
                  <GraduationCap className="h-4 w-4" />
                  Entraînements
                </TabsTrigger>
                {currentUserIsCoach &&
                  <TabsTrigger value="groups" className="flex-1 gap-1">
                    <Users className="h-4 w-4" />
                    Groupes
                  </TabsTrigger>
                  }
              </TabsList>

              <TabsContent value="members" className="mt-3">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Membres du club</h4>
                    <div className="flex gap-2">
                      {isAdmin &&
                        <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Inviter
                        </Button>
                        }
                      {isAdmin &&
                        <Button variant="outline" size="sm" onClick={onEditGroup}>
                          <Settings className="h-4 w-4 mr-1" />
                          Gérer
                        </Button>
                        }
                    </div>
                  </div>

                  {loading ?
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) =>
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                            <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                          </div>
                        </div>
                      )}
                    </div> :

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {members.map((member) =>
                      <div
                        key={member.user_id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        member.user_id === user?.id ? 'bg-muted/30' : 'hover:bg-muted/50'}`
                        }>

                          <div className="relative">
                            <Avatar
                            className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigateToProfile(member.user_id)}>

                              <AvatarImage src={member.avatar_url || ""} />
                              <AvatarFallback>
                                {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {member.is_admin &&
                          <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                                <Crown className="h-3 w-3 text-primary-foreground" />
                              </div>
                          }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-medium text-sm truncate">
                                {member.username || member.display_name}
                                {member.user_id === user?.id &&
                              <span className="text-muted-foreground"> (vous)</span>
                              }
                              </p>
                              {member.is_admin &&
                            <Badge variant="secondary" className="text-xs px-1 py-0">Admin</Badge>
                            }
                              {member.is_coach && <CoachBadge />}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            {isAdmin && member.user_id !== user?.id &&
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCoach(member.user_id, member.is_coach)}
                            title={member.is_coach ? "Retirer le rôle coach" : "Promouvoir coach"}>

                                <GraduationCap className={`h-4 w-4 ${member.is_coach ? 'text-amber-500' : 'text-muted-foreground'}`} />
                              </Button>
                          }
                            {isAdmin && member.user_id !== user?.id &&
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMemberToDelete(member);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive hover:text-destructive">

                                <UserMinus className="h-4 w-4" />
                              </Button>
                          }
                          </div>
                        </div>
                      )}
                    </div>
                    }
                </div>
              </TabsContent>

              <TabsContent value="coaching" className="mt-3">
                <CoachingTab clubId={conversationId} isCoach={currentUserIsCoach} />
              </TabsContent>

              {currentUserIsCoach &&
                <TabsContent value="groups" className="mt-3">
                  <ClubGroupsManager clubId={conversationId} />
                </TabsContent>
                }
            </Tabs>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isAdmin &&
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteGroupDialog(true)}
                  className="flex-1">

                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer le club
                </Button>
                }
              <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1">

                Fermer
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={closeProfilePreview} />


      {/* Invite Members Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Inviter des membres
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des utilisateurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9" />

            </div>

            {searchResults.length > 0 &&
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((profile) =>
              <div
                key={profile.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">

                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(profile.username || profile.display_name || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {profile.display_name || profile.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    </div>
                    <Button
                  size="sm"
                  onClick={() => inviteUser(profile.user_id)}
                  disabled={inviteLoading}>

                      <UserPlus className="h-4 w-4 mr-1" />
                      Inviter
                    </Button>
                  </div>
              )}
              </div>
            }

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="flex-1">

                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Retirer ce membre ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToDelete?.display_name || memberToDelete?.username}</strong> du club ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && removeMember(memberToDelete.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer le club ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le club <strong>{groupName}</strong> ? 
              Tous les messages et membres seront supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">

              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>);

};