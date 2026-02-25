import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  ArrowLeft,
  Copy,
  Share2,
  Crown,
  GraduationCap,
  UserPlus,
  Search,
  MoreHorizontal,
  Settings,
  Shield,
  Trash2,
  AlertTriangle,
  UserMinus,
} from "lucide-react";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
import { CoachBadge } from "./coaching/CoachBadge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface ClubProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  groupName: string;
  groupDescription: string | null;
  groupAvatarUrl: string | null;
  isAdmin: boolean;
  clubCode: string;
  createdBy: string;
  createdAt?: string;
  onEditGroup: () => void;
  onOpenCoachView?: () => void;
}

export const ClubProfileDialog = ({
  isOpen,
  onClose,
  conversationId,
  groupName,
  groupDescription,
  groupAvatarUrl,
  isAdmin,
  clubCode,
  createdBy,
  createdAt,
  onEditGroup,
  onOpenCoachView,
}: ClubProfileDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedUserId, showProfilePreview, navigateToProfile, closeProfilePreview } = useProfileNavigation();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);

  const loadGroupMembers = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const { data: memberIds, error: memberError } = await supabase
        .from('group_members')
        .select('user_id, is_admin, is_coach, joined_at')
        .eq('conversation_id', conversationId);

      if (memberError) throw memberError;

      if (memberIds && memberIds.length > 0) {
        const { data: memberProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', memberIds.map((m) => m.user_id));

        if (profileError) throw profileError;

        const membersWithProfiles = memberIds.map((member) => {
          const profile = memberProfiles?.find((p) => p.user_id === member.user_id);
          return {
            ...profile,
            is_admin: member.is_admin,
            is_coach: member.is_coach || false,
            joined_at: member.joined_at,
          } as GroupMember;
        }).filter((m) => m.user_id);

        membersWithProfiles.sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          if (a.is_coach && !b.is_coach) return -1;
          if (!a.is_coach && b.is_coach) return 1;
          return (a.username || a.display_name || '').localeCompare(b.username || b.display_name || '');
        });

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const currentUserIsCoach = members.some(
    (m) => m.user_id === user?.id && (m.is_coach || m.is_admin)
  ) || createdBy === user?.id;

  const currentUserMember = members.find((m) => m.user_id === user?.id);

  const searchUsers = async () => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const memberIds = members.map((m) => m.user_id);
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

  const inviteUser = async (userId: string) => {
    setInviteLoading(true);
    try {
      const { error } = await supabase
        .from('club_invitations')
        .insert([{ club_id: conversationId, inviter_id: user?.id, invited_user_id: userId }]);
      if (error) throw error;
      toast({ title: "Invitation envoyée !" });
      setSearchQuery(""); setSearchResults([]); setShowInviteDialog(false);
    } catch (error: any) {
      if (error.code === '23505') {
        toast({ title: "Déjà invité", description: "Cet utilisateur a déjà été invité" });
      } else {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const toggleCoach = async (memberId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_coach: !currentStatus })
        .eq('conversation_id', conversationId)
        .eq('user_id', memberId);
      if (error) throw error;
      toast({ title: !currentStatus ? "Coach promu !" : "Rôle coach retiré" });
      loadGroupMembers();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
      toast({ title: "Membre retiré du club" });
      setMemberToDelete(null); setShowDeleteDialog(false);
      loadGroupMembers();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de retirer ce membre", variant: "destructive" });
    }
  };

  const deleteGroup = async () => {
    try {
      await supabase.from('group_members').delete().eq('conversation_id', conversationId);
      await supabase.from('messages').delete().eq('conversation_id', conversationId);
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) throw error;
      toast({ title: "Club supprimé" });
      setShowDeleteGroupDialog(false);
      onClose();
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de supprimer le club", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rejoins ${groupName}`,
          text: `Rejoins le club ${groupName} avec le code : ${clubCode}`,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(clubCode);
      toast({ title: "Code copié !" });
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
    if (isOpen) loadGroupMembers();
  }, [isOpen, conversationId]);

  const coachCount = members.filter((m) => m.is_coach).length;
  const memberCount = members.length;

  const getRoleBadge = (member: GroupMember) => {
    if (member.user_id === createdBy || member.is_admin) {
      return <Badge className="bg-purple-500/15 text-purple-600 border-0 text-[11px] px-1.5 py-0">Admin</Badge>;
    }
    if (member.is_coach) {
      return <Badge className="bg-blue-500/15 text-blue-600 border-0 text-[11px] px-1.5 py-0">Coach</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0 text-[11px] px-1.5 py-0">Athlète</Badge>;
  };

  const createdDate = createdAt ? format(new Date(createdAt), "d MMMM yyyy", { locale: fr }) : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0 bg-secondary">
          {/* iOS Navigation Bar */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-0.5 text-primary text-[17px] min-w-[70px]"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px]">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              Profil du club
            </span>
            <div className="min-w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 pb-8">

              {/* 1️⃣ Header premium */}
              <div className="bg-gradient-to-b from-primary/5 to-card px-4 pt-6 pb-5">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-3 ring-4 ring-primary/10">
                    <AvatarImage src={groupAvatarUrl || ""} />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                      {(groupName || "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-[22px] font-bold text-foreground">{groupName}</h2>
                  
                  {/* Role badge */}
                  <div className="mt-1.5">
                    {currentUserIsCoach ? (
                      <Badge className="bg-purple-500/15 text-purple-600 border-0 text-[12px] px-2 py-0.5">
                        🟣 Coach principal
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-600 border-0 text-[12px] px-2 py-0.5">
                        🔵 Membre
                      </Badge>
                    )}
                  </div>

                  {groupDescription && (
                    <p className="text-[13px] text-muted-foreground mt-2 max-w-[280px]">{groupDescription}</p>
                  )}

                  <p className="text-[12px] text-muted-foreground mt-2">
                    {memberCount} membre{memberCount > 1 ? 's' : ''}
                    {createdDate && ` · Créé le ${createdDate}`}
                  </p>
                </div>
              </div>

              {/* 2️⃣ Code d'invitation */}
              {clubCode && (
                <div className="mx-4">
                  <div className="bg-card rounded-[10px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
                    <div className="px-4 py-2.5 border-b border-border/50">
                      <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                        🔐 Code d'invitation
                      </p>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[24px] font-mono font-bold text-foreground tracking-[0.15em]">
                          {clubCode}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Partagez ce code pour inviter des membres
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(clubCode);
                            toast({ title: "Code copié !" });
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary active:opacity-70"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleShare}
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-primary/10 text-primary active:opacity-70"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3️⃣ Section Membres */}
              <div className="mx-4">
                <div className="bg-card rounded-[10px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
                  <div className="px-4 py-2.5 border-b border-border/50">
                    <p className="text-[13px] font-semibold text-foreground">
                      👥 Membres ({memberCount})
                    </p>
                  </div>
                  
                  {loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-11 w-11 bg-muted rounded-full animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-muted rounded animate-pulse mb-1 w-2/3" />
                            <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {members.map((member, index) => (
                        <div key={member.user_id}>
                          <div className="flex items-center gap-3 px-4 py-3">
                            <Avatar
                              className="h-11 w-11 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => navigateToProfile(member.user_id)}
                            >
                              <AvatarImage src={member.avatar_url || ""} />
                              <AvatarFallback className="text-sm">
                                {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-[15px] text-foreground truncate">
                                  {member.display_name || member.username}
                                  {member.user_id === user?.id && (
                                    <span className="text-muted-foreground font-normal"> (vous)</span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[12px] text-muted-foreground">@{member.username}</p>
                                {getRoleBadge(member)}
                              </div>
                            </div>
                            
                            {/* Admin: manage button */}
                            {isAdmin && member.user_id !== user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => toggleCoach(member.user_id, member.is_coach)}>
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    {member.is_coach ? "Retirer coach" : "Promouvoir coach"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => { setMemberToDelete(member); setShowDeleteDialog(true); }}
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Retirer du club
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {index < members.length - 1 && (
                            <div className="h-px bg-border/50 ml-[68px]" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4️⃣ Section Admin - uniquement si créateur */}
              {isAdmin && (
                <div className="mx-4">
                  <div className="bg-card rounded-[10px] overflow-hidden" style={{ boxShadow: '0 1px 3px hsl(0 0% 0% / 0.04)' }}>
                    <div className="px-4 py-2.5 border-b border-border/50">
                      <p className="text-[13px] font-semibold text-foreground">
                        ⚙️ Gestion avancée
                      </p>
                    </div>

                    <button
                      onClick={() => setShowInviteDialog(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-[15px] text-foreground">Inviter des membres</span>
                    </button>
                    <div className="h-px bg-border/50 ml-[60px]" />

                    {currentUserIsCoach && onOpenCoachView && (
                      <>
                        <button
                          onClick={() => { onClose(); setTimeout(() => onOpenCoachView?.(), 150); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                        >
                          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-[15px] text-foreground">Gestion coaching</span>
                        </button>
                        <div className="h-px bg-border/50 ml-[60px]" />
                      </>
                    )}

                    <button
                      onClick={() => { onClose(); setTimeout(() => onEditGroup(), 150); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Settings className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-[15px] text-foreground">Paramètres du club</span>
                    </button>
                    <div className="h-px bg-border/50 ml-[60px]" />

                    <button
                      onClick={() => {}}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                    >
                      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="text-[15px] text-foreground">Confidentialité</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5️⃣ Supprimer le club - discret en bas */}
              {isAdmin && (
                <div className="mx-4 pt-4">
                  <button
                    onClick={() => setShowDeleteGroupDialog(true)}
                    className="w-full text-center text-[13px] text-destructive active:opacity-70"
                  >
                    Supprimer le club
                  </button>
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Preview */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={closeProfilePreview}
      />

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <h3 className="text-[17px] font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Inviter des membres
            </h3>
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
                  <div key={profile.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>{(profile.username || "").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{profile.display_name || profile.username}</p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                    <Button size="sm" onClick={() => inviteUser(profile.user_id)} disabled={inviteLoading}>
                      Inviter
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => { setShowInviteDialog(false); setSearchQuery(""); setSearchResults([]); }} className="w-full">
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Retirer ce membre ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer <strong>{memberToDelete?.display_name || memberToDelete?.username}</strong> du club ?
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

      {/* Delete Group Dialog */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer le club ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le club <strong>{groupName}</strong> ?
              Tous les messages et membres seront supprimés.
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
