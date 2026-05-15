import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  GraduationCap,
  Search,
  AlertTriangle,
  UserMinus,
  EllipsisVertical,
  Loader2,
} from "lucide-react";
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
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ClubSettingsMaquetteView, type ClubMaquetteMember, type ClubMaquetteTrainingGroup } from "@/components/club/ClubSettingsMaquetteView";

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
  onEditClub?: () => void;
  /** Après suppression du club (admin) ou départ (membre), pour rafraîchir la liste sans recharger la page. */
  onClubLeftOrDeleted?: () => void;
  /** Libellé du bouton retour (défaut : Messages). */
  dismissBackLabel?: string;
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
  dismissBackLabel = "Messages",
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
  const [showLeaveClubDialog, setShowLeaveClubDialog] = useState(false);
  const [clubTrainingGroups, setClubTrainingGroups] = useState<ClubMaquetteTrainingGroup[]>([]);
  const [memberListExpanded, setMemberListExpanded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMemberListExpanded(false);
  }, [isOpen, conversationId]);

  useEffect(() => {
    if (!isOpen || !conversationId || !isClub) {
      setClubTrainingGroups([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: rows, error } = await supabase
        .from("club_groups")
        .select("id, name, color")
        .eq("club_id", conversationId)
        .order("name");
      if (error || !rows?.length) {
        if (!cancelled) setClubTrainingGroups([]);
        return;
      }
      const ids = rows.map((r) => r.id);
      const { data: gm } = ids.length
        ? await supabase.from("club_group_members").select("group_id").in("group_id", ids)
        : { data: [] as { group_id: string }[] };
      const counts = new Map<string, number>();
      (gm || []).forEach((r) => {
        counts.set(r.group_id, (counts.get(r.group_id) || 0) + 1);
      });
      if (!cancelled) {
        setClubTrainingGroups(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            athletesCount: counts.get(r.id) || 0,
            color: r.color || "#5856D6",
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, conversationId, isClub]);

  const createTrainingGroupFromDialog = async () => {
    if (!conversationId || !isClub) return;
    const name = window.prompt("Nom du groupe", "Nouveau groupe");
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from("club_groups")
      .insert({ club_id: conversationId, name: name.trim(), color: "#3B82F6" })
      .select("id, name, color")
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setClubTrainingGroups((prev) => [
      ...prev,
      { id: data.id, name: data.name, athletesCount: 0, color: data.color || "#3B82F6" },
    ]);
    toast({ title: "Groupe créé" });
  };

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
    if (isOpen) void loadGroupMembers();
  }, [isOpen, conversationId]);

  const memberCount = members.length;
  const coachesCount = useMemo(() => members.filter((m) => m.is_coach || m.is_admin).length, [members]);
  const maquetteVariant = currentUserIsCoach ? "admin" : "athlete";
  const createdDate = createdAt ? format(new Date(createdAt), "d MMMM yyyy", { locale: fr }) : null;
  const entityLabel = isClub ? "club" : "groupe";

  const sortedMembers = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      if (a.is_coach && !b.is_coach) return -1;
      if (!a.is_coach && b.is_coach) return 1;
      return (a.display_name || a.username || "").localeCompare(b.display_name || b.username || "");
    });
    return copy;
  }, [members]);

  const roleLabelForMember = (m: GroupMember) => {
    if (m.is_admin) return m.user_id === createdBy ? "Coach principal" : "Administrateur";
    if (m.is_coach) return "Coach";
    return "Athlète";
  };

  const maquetteMembers: ClubMaquetteMember[] = sortedMembers.map((m) => ({
    userId: m.user_id,
    displayName: m.display_name || m.username || "Membre",
    subtitle: m.username ? `@${m.username}` : roleLabelForMember(m),
    chipRole: m.is_admin ? "admin" : m.is_coach ? "coach" : "athlete",
    avatarUrl: m.avatar_url,
    isYou: m.user_id === user?.id,
  }));

  const bio =
    [groupDescription?.trim(), createdDate ? `Créé le ${createdDate}` : null].filter(Boolean).join("\n") ||
    (isClub ? "Club RunConnect" : "Groupe");

  const foundedLabel = createdAt ? format(new Date(createdAt), "yyyy", { locale: fr }) : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex flex-col gap-0 bg-background p-0">
          <div className="sticky top-0 z-10 shrink-0 border-b border-[#E5E5EA] bg-card">
            <div
              className="bg-card"
              style={{ height: "max(env(safe-area-inset-top, 0px), 12px)" }}
              aria-hidden="true"
            />
            <IosPageHeaderBar
              leadingBack={{ onClick: onClose, label: dismissBackLabel }}
              title="Paramètres"
              titleClassName="text-[17px] font-extrabold tracking-[-0.01em]"
              right={
                currentUserIsCoach ? (
                  <button
                    type="button"
                    className="border-0 bg-transparent px-1 text-[17px] font-bold leading-none text-[#007AFF] active:opacity-60 dark:text-primary"
                    onClick={() => onEditClub?.()}
                  >
                    Modifier
                  </button>
                ) : (
                  <button
                    type="button"
                    className="border-0 bg-transparent px-1 text-[17px] font-normal leading-none text-[#007AFF] active:opacity-60 dark:text-primary"
                    onClick={() => void handleShare()}
                  >
                    Partager
                  </button>
                )
              }
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto apple-grouped-bg">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Chargement" />
              </div>
            ) : (
              <ClubSettingsMaquetteView
                variant={maquetteVariant}
                clubName={groupName}
                clubAvatarUrl={groupAvatarUrl}
                bio={bio}
                statsMembers={memberCount}
                statsCoaches={coachesCount}
                foundedLabel={foundedLabel}
                members={maquetteMembers}
                totalMemberCount={memberCount}
                memberPreviewCount={4}
                membersExpanded={memberListExpanded || maquetteVariant === "admin"}
                onExpandMembers={
                  maquetteVariant === "athlete" && sortedMembers.length > 4
                    ? () => setMemberListExpanded(true)
                    : undefined
                }
                trainingGroups={clubTrainingGroups}
                onOpenTrainingGroup={() =>
                  toast({
                    title: "Groupes d'entraînement",
                    description: "Ouvre Coaching depuis le menu pour gérer les groupes en détail.",
                  })
                }
                onCreateTrainingGroup={
                  currentUserIsCoach && isClub ? () => void createTrainingGroupFromDialog() : undefined
                }
                notificationsMuted={isMuted}
                onToggleNotifications={() => onToggleMute?.()}
                showCoachChrome={currentUserIsCoach}
                isClubOwner={isAdmin}
                onEditClubPhoto={currentUserIsCoach ? () => onEditClub?.() : undefined}
                onMemberPress={(userId) => navigateToProfile(userId)}
                omitTrainingGroupsSection={!isClub}
                renderMemberTrailing={
                  currentUserIsCoach
                    ? (row) =>
                        row.userId !== user?.id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Actions">
                                <EllipsisVertical className="h-4 w-4 text-[#C7C7CC]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => {
                                  const member = members.find((mm) => mm.user_id === row.userId);
                                  if (member) void toggleCoach(member.user_id, member.is_coach);
                                }}
                              >
                                <GraduationCap className="mr-2 h-4 w-4" />
                                {members.find((mm) => mm.user_id === row.userId)?.is_coach
                                  ? "Retirer coach"
                                  : "Promouvoir coach"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  const member = members.find((mm) => mm.user_id === row.userId);
                                  if (member) {
                                    setMemberToDelete(member);
                                    setShowDeleteDialog(true);
                                  }
                                }}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Retirer du {entityLabel}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null
                    : undefined
                }
                onInviteMembers={
                  currentUserIsCoach && isClub
                    ? () => {
                        setSearchQuery("");
                        setSearchResults([]);
                        setShowInviteDialog(true);
                      }
                    : undefined
                }
                onManageRoles={() => onEditClub?.()}
                onClubStatistics={() => toast({ title: "Statistiques", description: "À venir dans une prochaine version." })}
                onClubShop={() => toast({ title: "Boutique du club", description: "Bientôt disponible." })}
                onShareClub={() => void handleShare()}
                onReportClub={() =>
                  window.confirm(
                    "Signaler ce club ? Notre équipe examinera votre signalement sous 24h."
                  )
                    ? toast({ title: "Signalement envoyé", description: "Merci pour votre retour." })
                    : undefined
                }
                onLeaveClub={() => setShowLeaveClubDialog(true)}
                onDeleteClub={isAdmin ? () => setShowDeleteGroupDialog(true) : undefined}
              />
            )}
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
          <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-card">
            <div
              className="bg-white dark:bg-card"
              style={{ height: "max(env(safe-area-inset-top, 0px), 12px)" }}
              aria-hidden="true"
            />
            <div className="flex items-center px-4 py-3">
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
