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
  ArrowLeft,
  Copy,
  Share2,
  GraduationCap,
  UserPlus,
  Search,
  MoreHorizontal,
  AlertTriangle,
  UserMinus,
  Bell,
  BellOff,
  LogOut,
  Trash2,
  Building2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { useProfileNavigation } from "@/hooks/useProfileNavigation";
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
  /** True quand la conversation est un vrai club (avec code d'invitation). False = simple groupe. */
  isClub?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  /** Après suppression du club (admin) ou départ (membre), pour rafraîchir la liste sans recharger la page. */
  onClubLeftOrDeleted?: () => void;
  /** Ouvre l’onglet Coaching « Gérer le club » pour ce conversation id (coachs / admins). */
  onOpenManageClubInCoaching?: () => void;
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
  isClub = true,
  isMuted = false,
  onToggleMute,
  onClubLeftOrDeleted,
  onOpenManageClubInCoaching,
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
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showLeaveClubDialog, setShowLeaveClubDialog] = useState(false);

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
      let query = supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);
      if (memberIds.length > 0) {
        query = query.not('user_id', 'in', `(${memberIds.join(',')})`);
      }
      const { data, error } = await query;
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
      toast({ title: isClub ? "Membre retiré du club" : "Membre retiré du groupe" });
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
      onClubLeftOrDeleted?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de supprimer le club", variant: "destructive" });
    }
  };

  const leaveClub = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: isClub ? "Club quitté" : "Groupe quitté", description: isClub ? "Vous avez quitté le club" : "Vous avez quitté le groupe" });
      setShowLeaveClubDialog(false);
      onClubLeftOrDeleted?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Erreur", description: "Impossible de quitter", variant: "destructive" });
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
    if (isOpen) {
      setMemberSearchQuery("");
      loadGroupMembers();
    }
  }, [isOpen, conversationId]);

  const memberCount = members.length;
  const filteredMembers = members.filter((m) => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.display_name || "").toLowerCase().includes(q) ||
      (m.username || "").toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (member: GroupMember) => {
    if (member.user_id === createdBy || member.is_admin) {
      return <Badge className="bg-primary/12 text-primary border-0 text-[11px] px-1.5 py-0">Admin</Badge>;
    }
    if (member.is_coach) {
      return <Badge className="bg-secondary text-foreground border-0 text-[11px] px-1.5 py-0">Coach</Badge>;
    }
    return <Badge className="bg-muted text-muted-foreground border-0 text-[11px] px-1.5 py-0">Athlète</Badge>;
  };

  const createdDate = createdAt ? format(new Date(createdAt), "d MMMM yyyy", { locale: fr }) : null;

  const entityLabel = isClub ? "club" : "groupe";
  const showManageClubCoaching =
    isClub && currentUserIsCoach && Boolean(onOpenManageClubInCoaching);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col p-0 gap-0 bg-background">
          {/* iOS Navigation Bar */}
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 pt-[max(0.75rem,var(--safe-area-top))] flex items-center shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-0.5 text-primary text-[16px] min-w-[70px] font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px] font-normal">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              {isClub ? "Profil du club" : "Profil du groupe"}
            </span>
            <div className="min-w-[70px]" />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-5 pb-8">

              {/* 1️⃣ Header premium */}
              <div className="bg-card border-b border-border px-4 pt-6 pb-5">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-3 ring-4 ring-primary/10">
                    <AvatarImage src={groupAvatarUrl || ""} />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">
                      {(groupName || "C").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-[22px] font-bold text-foreground">{groupName}</h2>
                  
                  {/* Role badge - only for clubs */}
                  {isClub && (
                    <div className="mt-1.5">
                      {currentUserIsCoach ? (
                        <Badge className="bg-primary/12 text-primary border-0 text-[12px] px-2 py-0.5">
                          Coach principal
                        </Badge>
                      ) : (
                        <Badge className="bg-secondary text-foreground border-0 text-[12px] px-2 py-0.5">
                          Membre
                        </Badge>
                      )}
                    </div>
                  )}

                  {groupDescription && (
                    <p className="text-[13px] text-muted-foreground mt-2 max-w-[280px]">{groupDescription}</p>
                  )}

                  <p className="text-[12px] text-muted-foreground mt-2">
                    {memberCount} membre{memberCount > 1 ? 's' : ''}
                    {createdDate && ` · Créé le ${createdDate}`}
                  </p>
                </div>
              </div>

              {/* Membres */}
              <div className="mx-4">
                <div className="bg-card rounded-[10px] overflow-hidden border border-border shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-border/50 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un membre…"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="h-9 border-border/80 pl-8 text-[14px]"
                      />
                    </div>
                    {isAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5 px-3"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowInviteDialog(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="text-[13px]">Inviter</span>
                      </Button>
                    )}
                  </div>

                  {loading ? (
                    <div className="space-y-3 p-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
                          <div className="flex-1">
                            <div className="mb-1 h-4 w-2/3 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                      {memberSearchQuery.trim()
                        ? "Aucun membre ne correspond à votre recherche"
                        : "Aucun membre pour le moment"}
                    </p>
                  ) : (
                    <div>
                      {filteredMembers.map((member, index) => (
                        <div key={member.user_id}>
                          <div className="flex items-center gap-3 px-4 py-3">
                            <Avatar
                              className="h-11 w-11 cursor-pointer transition-opacity hover:opacity-80"
                              onClick={() => navigateToProfile(member.user_id)}
                            >
                              <AvatarImage src={member.avatar_url || ""} />
                              <AvatarFallback className="text-sm">
                                {(member.username || member.display_name || "").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-[15px] font-semibold text-foreground">
                                  {member.display_name || member.username}
                                  {member.user_id === user?.id && (
                                    <span className="font-normal text-muted-foreground"> (vous)</span>
                                  )}
                                </p>
                              </div>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <p className="text-[12px] text-muted-foreground">@{member.username}</p>
                                {getRoleBadge(member)}
                              </div>
                            </div>

                            {isAdmin && member.user_id !== user?.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => toggleCoach(member.user_id, member.is_coach)}>
                                    <GraduationCap className="mr-2 h-4 w-4" />
                                    {member.is_coach ? "Retirer coach" : "Promouvoir coach"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setMemberToDelete(member);
                                      setShowDeleteDialog(true);
                                    }}
                                  >
                                    <UserMinus className="mr-2 h-4 w-4" />
                                    Retirer du {entityLabel}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          {index < filteredMembers.length - 1 && (
                            <div className="ml-[68px] h-px bg-border/50" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Code d'invitation — clubs uniquement */}
              {isClub && clubCode && (
                <div className="mx-4">
                  <div className="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[24px] font-bold tracking-[0.15em] text-foreground">
                          {clubCode}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Partagez ce code pour inviter des membres
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(clubCode);
                            toast({ title: "Code copié !" });
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary active:opacity-70"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleShare}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary active:opacity-70"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications & actions */}
              <div className="mx-4">
                <div className="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm">
                  {onToggleMute && (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={`flex h-[30px] w-[30px] items-center justify-center rounded-[7px] ${isMuted ? "bg-muted" : "bg-primary"}`}
                      >
                        {isMuted ? (
                          <BellOff className="h-[18px] w-[18px] text-muted-foreground" />
                        ) : (
                          <Bell className="h-[18px] w-[18px] text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[15px] text-foreground">Mettre en sourdine</p>
                        <p className="text-[12px] text-muted-foreground">
                          {isMuted ? "Notifications désactivées" : "Notifications actives"}
                        </p>
                      </div>
                      <Switch checked={isMuted} onCheckedChange={onToggleMute} />
                    </div>
                  )}

                  {onToggleMute && <div className="h-px bg-border/50" />}

                  {showManageClubCoaching && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenManageClubInCoaching?.()}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                      >
                        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-primary/12">
                          <Building2 className="h-[18px] w-[18px] text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[15px] text-foreground">Gérer le club</p>
                          <p className="text-[12px] text-muted-foreground">
                            Membres, groupes et coaching dans l&apos;espace Coaching
                          </p>
                        </div>
                      </button>
                      <div className="h-px bg-border/50" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      isAdmin ? setShowDeleteGroupDialog(true) : setShowLeaveClubDialog(true)
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                  >
                    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-destructive/15">
                      {isAdmin ? (
                        <Trash2 className="h-[18px] w-[18px] text-destructive" />
                      ) : (
                        <LogOut className="h-[18px] w-[18px] text-destructive" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-foreground">
                        {isAdmin ? `Supprimer le ${entityLabel}` : `Quitter le ${entityLabel}`}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {isAdmin
                          ? isClub
                            ? "Supprime définitivement le club et tout son contenu"
                            : "Supprime définitivement le groupe et tout son contenu"
                          : isClub
                            ? "Vous ne recevrez plus les messages de ce club"
                            : "Vous ne recevrez plus les messages de ce groupe"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Preview */}
      <ProfilePreviewDialog
        userId={showProfilePreview ? selectedUserId : null}
        onClose={closeProfilePreview}
      />

      {/* Inviter — plein écran */}
      <Dialog
        open={showInviteDialog}
        onOpenChange={(open) => {
          setShowInviteDialog(open);
          if (!open) {
            setSearchQuery("");
            setSearchResults([]);
          }
        }}
      >
        <DialogContent fullScreen hideCloseButton className="flex flex-col gap-0 bg-background p-0">
          <div className="sticky top-0 z-10 flex shrink-0 items-center border-b border-border bg-card px-4 py-3 pt-[max(0.75rem,var(--safe-area-top))]">
            <button
              type="button"
              onClick={() => {
                setShowInviteDialog(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="flex min-w-[70px] items-center gap-0.5 text-[16px] font-medium text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-[15px] font-normal">Retour</span>
            </button>
            <span className="flex-1 text-center text-[17px] font-semibold text-foreground">
              Inviter des membres
            </span>
            <div className="min-w-[70px]" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher des utilisateurs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((profile) => (
                  <div
                    key={profile.user_id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback>
                        {(profile.username || "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {profile.display_name || profile.username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{profile.username}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => inviteUser(profile.user_id)}
                      disabled={inviteLoading}
                    >
                      Inviter
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                Aucun résultat
              </p>
            ) : (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                Tapez un nom ou un nom d&apos;utilisateur pour inviter quelqu&apos;un.
              </p>
            )}
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
              Êtes-vous sûr de vouloir retirer{" "}
              <strong>{memberToDelete?.display_name || memberToDelete?.username}</strong> du {entityLabel} ?
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
              Supprimer le {entityLabel} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement {isClub ? "le club" : "le groupe"}{" "}
              <strong>{groupName}</strong> ? Tous les messages et membres seront supprimés.
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

      {/* Quitter le club / groupe */}
      <AlertDialog open={showLeaveClubDialog} onOpenChange={setShowLeaveClubDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Quitter le {entityLabel} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter {isClub ? "le club" : "le groupe"}{" "}
              <strong>{groupName}</strong> ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={leaveClub}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
