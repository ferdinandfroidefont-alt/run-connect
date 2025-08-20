import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Settings, 
  Crown, 
  Calendar, 
  UserPlus, 
  UserMinus, 
  Trash2, 
  Search,
  AlertTriangle
} from "lucide-react";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface GroupMember extends Profile {
  is_admin: boolean;
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
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
      const { data: memberIds } = await supabase
        .from('group_members')
        .select('user_id, is_admin, joined_at')
        .eq('conversation_id', conversationId);

      if (memberIds && memberIds.length > 0) {
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', memberIds.map(m => m.user_id));

        const membersWithProfiles = memberIds.map(member => {
          const profile = memberProfiles?.find(p => p.user_id === member.user_id);
          return {
            ...profile,
            is_admin: member.is_admin,
            joined_at: member.joined_at
          } as GroupMember;
        }).filter(m => m.user_id);

        // Sort members: admins first, then by display name
        membersWithProfiles.sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          return (a.username || a.display_name || '').localeCompare(
            b.username || b.display_name || ''
          );
        });

        setMembers(membersWithProfiles);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les membres du club",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMemberClick = (member: GroupMember) => {
    if (member.user_id === user?.id) return; // Don't show preview for self
    
    setSelectedUserId(member.user_id);
    setShowProfilePreview(true);
  };

  // Search for users to invite
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      // Get current group members to exclude them
      const memberIds = members.map(m => m.user_id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .not('user_id', 'in', `(${memberIds.join(',')})`)
        .limit(10);

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
      const { error } = await supabase
        .from('group_members')
        .insert([{
          conversation_id: conversationId,
          user_id: userId,
          is_admin: false
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Membre ajouté au club avec succès"
      });

      setSearchQuery("");
      setSearchResults([]);
      setShowInviteDialog(false);
      loadGroupMembers();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter ce membre",
        variant: "destructive"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Remove member from group
  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

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
      await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete messages
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations du club
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-12 w-12">
                <AvatarImage src={groupAvatarUrl || ""} />
                <AvatarFallback>
                  <Users className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{groupName}</h3>
                {groupDescription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {groupDescription}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {members.length} membre{members.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Members List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Membres du club</h4>
                <div className="flex gap-2">
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Inviter
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onEditGroup();
                      }}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Gérer
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                      <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                        <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                        member.user_id === user?.id 
                          ? 'bg-muted/30' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="relative">
                        <Avatar 
                          className="h-10 w-10 cursor-pointer"
                          onClick={() => handleMemberClick(member)}
                        >
                          <AvatarImage src={member.avatar_url || ""} />
                          <AvatarFallback>
                            {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {member.is_admin && (
                          <div className="absolute -top-1 -right-1 bg-primary rounded-full p-1">
                            <Crown className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {member.username || member.display_name}
                            {member.user_id === user?.id && (
                              <span className="text-muted-foreground"> (vous)</span>
                            )}
                          </p>
                          {member.is_admin && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          @{member.username}
                        </p>
                      </div>

                      {/* Remove member button for admins */}
                      {isAdmin && member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMemberToDelete(member);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {isAdmin && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteGroupDialog(true)}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer le club
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Preview Dialog */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={() => {
          setShowProfilePreview(false);
          setSelectedUserId(null);
        }}
      />

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
                className="pl-9"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {searchResults.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
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
                      disabled={inviteLoading}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Inviter
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteDialog(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="flex-1"
              >
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};