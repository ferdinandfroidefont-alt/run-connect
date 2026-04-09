import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { ImageCropEditor } from "@/components/ImageCropEditor";
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
  Users,
  Crown,
  Copy,
  Camera,
  UserPlus,
  UserMinus,
  GraduationCap,
  Trash2,
  Search,
  Pencil,
  FileText,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

interface ClubManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  onClubUpdated: () => void;
}

export const ClubManagementDialog = ({
  isOpen,
  onClose,
  clubId,
  onClubUpdated,
}: ClubManagementDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [clubName, setClubName] = useState("");
  const [clubDescription, setClubDescription] = useState("");
  const [clubAvatarUrl, setClubAvatarUrl] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempDesc, setTempDesc] = useState("");

  // Avatar
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Invite
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  // Confirm dialogs
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const [showDeleteClub, setShowDeleteClub] = useState(false);

  const isAdmin = createdBy === user?.id;

  // Load club info
  const loadClubInfo = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("group_name, group_description, group_avatar_url, club_code, created_by")
      .eq("id", clubId)
      .single();
    if (data) {
      setClubName(data.group_name || "");
      setClubDescription(data.group_description || "");
      setClubAvatarUrl(data.group_avatar_url || "");
      setClubCode(data.club_code || "");
      setCreatedBy(data.created_by || "");
    }
  }, [clubId]);

  // Load members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: memberIds } = await supabase
        .from("group_members")
        .select("user_id, is_admin, is_coach, joined_at")
        .eq("conversation_id", clubId);

      if (!memberIds?.length) { setMembers([]); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", memberIds.map((m) => m.user_id));

      const merged = memberIds
        .map((m) => {
          const p = profiles?.find((pr) => pr.user_id === m.user_id);
          return { ...p, is_admin: m.is_admin, is_coach: m.is_coach || false, joined_at: m.joined_at } as GroupMember;
        })
        .filter((m) => m.user_id)
        .sort((a, b) => {
          if (a.is_admin && !b.is_admin) return -1;
          if (!a.is_admin && b.is_admin) return 1;
          return (a.username || "").localeCompare(b.username || "");
        });

      setMembers(merged);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (isOpen) {
      loadClubInfo();
      loadMembers();
    }
  }, [isOpen, clubId]);

  // Save name
  const saveName = async () => {
    if (!tempName.trim()) return;
    const { error } = await supabase.from("conversations").update({ group_name: tempName.trim() }).eq("id", clubId);
    if (!error) {
      setClubName(tempName.trim());
      setEditingName(false);
      onClubUpdated();
      toast({ title: "Nom mis à jour" });
    }
  };

  // Save description
  const saveDesc = async () => {
    const { error } = await supabase.from("conversations").update({ group_description: tempDesc.trim() || null }).eq("id", clubId);
    if (!error) {
      setClubDescription(tempDesc.trim());
      setEditingDesc(false);
      onClubUpdated();
      toast({ title: "Description mise à jour" });
    }
  };

  // Avatar select
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setSelectedImage(ev.target?.result as string); setShowImageCrop(true); };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (blob: Blob) => {
    if (!user) return;
    const filename = `${user.id}/club/${clubId}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(filename, blob, { contentType: "image/jpeg", upsert: true });
    if (upErr) return;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filename);
    await supabase.from("conversations").update({ group_avatar_url: publicUrl }).eq("id", clubId);
    setClubAvatarUrl(publicUrl);
    setShowImageCrop(false);
    setSelectedImage(null);
    onClubUpdated();
    toast({ title: "Photo mise à jour" });
  };

  // Copy code
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(clubCode);
      toast({ title: "Code copié !" });
    } catch { /* ignore */ }
  };

  // Toggle coach
  const toggleCoach = async (memberId: string, current: boolean) => {
    await supabase.from("group_members").update({ is_coach: !current }).eq("conversation_id", clubId).eq("user_id", memberId);
    toast({ title: !current ? "Coach promu !" : "Rôle coach retiré" });
    loadMembers();
  };

  // Remove member
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    await supabase.from("group_members").delete().eq("conversation_id", clubId).eq("user_id", memberToRemove.user_id);
    toast({ title: "Membre retiré" });
    setMemberToRemove(null);
    loadMembers();
  };

  // Search users for invite
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const memberIds = members.map((m) => m.user_id);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .not("user_id", "in", `(${memberIds.join(",")})`)
        .limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, members]);

  const inviteUser = async (profile: Profile) => {
    const { error } = await supabase.from("club_invitations").insert([{ club_id: clubId, inviter_id: user?.id, invited_user_id: profile.user_id }]);
    if (error?.code === "23505") {
      toast({ title: "Déjà invité" });
    } else if (!error) {
      toast({ title: "Invitation envoyée", description: `à ${profile.username || profile.display_name}` });
      setSearchQuery("");
      setSearchResults([]);
      setShowInvite(false);
    }
  };

  // Delete club
  const deleteClub = async () => {
    await supabase.from("group_members").delete().eq("conversation_id", clubId);
    await supabase.from("messages").delete().eq("conversation_id", clubId);
    await supabase.from("conversations").delete().eq("id", clubId);
    toast({ title: "Club supprimé" });
    setShowDeleteClub(false);
    onClose();
    window.location.reload();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Gérer le club</DialogTitle>
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            header={<CoachingFullscreenHeader title="Gérer le club" onBack={onClose} />}
            scrollClassName="bg-secondary py-4"
          >
            {/* Club avatar + name header */}
            <div className="flex flex-col items-center gap-2 pb-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={clubAvatarUrl} />
                  <AvatarFallback><Users className="h-8 w-8" /></AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("mgmt-avatar-upload")?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
                <input id="mgmt-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </div>
              <p className="text-[20px] font-bold text-foreground">{clubName}</p>
              {clubDescription && <p className="max-w-[260px] text-center text-[13px] text-muted-foreground">{clubDescription}</p>}
            </div>

            {/* INFORMATIONS */}
            {isAdmin && (
              <IOSListGroup header="INFORMATIONS" className="px-ios-4">
                {editingName ? (
                  <div className="flex items-center gap-2 bg-card px-ios-4 py-2.5">
                    <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="flex-1" autoFocus maxLength={50} />
                    <Button size="sm" onClick={saveName} disabled={!tempName.trim()}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <IOSListItem
                    icon={Pencil}
                    iconBgColor="bg-blue-500"
                    title="Nom du club"
                    value={clubName}
                    onClick={() => { setTempName(clubName); setEditingName(true); }}
                    showSeparator={true}
                  />
                )}

                {editingDesc ? (
                  <div className="flex items-center gap-2 bg-card px-ios-4 py-2.5">
                    <Input value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} className="flex-1" autoFocus maxLength={200} placeholder="Description..." />
                    <Button size="sm" onClick={saveDesc}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <IOSListItem
                    icon={FileText}
                    iconBgColor="bg-green-500"
                    title="Description"
                    value={clubDescription || "Aucune"}
                    onClick={() => { setTempDesc(clubDescription); setEditingDesc(true); }}
                    showSeparator={false}
                  />
                )}
              </IOSListGroup>
            )}

            {/* CODE D'INVITATION */}
            {isAdmin && clubCode && (
              <IOSListGroup header="CODE D'INVITATION" className="px-ios-4">
                <IOSListItem
                  icon={Copy}
                  iconBgColor="bg-indigo-500"
                  title={clubCode}
                  subtitle="Appuyer pour copier"
                  onClick={copyCode}
                  showChevron={false}
                  showSeparator={false}
                />
              </IOSListGroup>
            )}

            {/* MEMBRES */}
            <IOSListGroup header={`MEMBRES (${members.length})`} className="px-ios-4">
              {isAdmin && (
                <IOSListItem
                  icon={UserPlus}
                  iconBgColor="bg-blue-500"
                  title="Inviter des membres"
                  onClick={() => setShowInvite(true)}
                  showSeparator={members.length > 0}
                />
              )}
              {members.map((member, idx) => (
                <div key={member.user_id} className="relative">
                  <div className="flex items-center gap-2.5 bg-card px-ios-4 py-2.5">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={member.avatar_url || ""} />
                      <AvatarFallback>{(member.username || "?")[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[17px] leading-snug text-foreground">
                          {member.username || member.display_name}
                        </p>
                        {member.user_id === user?.id && (
                          <span className="text-[13px] text-muted-foreground">(vous)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {member.is_admin && <Badge className="border-0 bg-primary/12 text-primary text-[11px] px-1.5 py-0">Admin</Badge>}
                        {member.is_coach && <Badge className="border-0 bg-amber-500/15 text-amber-600 text-[11px] px-1.5 py-0">Coach</Badge>}
                      </div>
                    </div>
                    {isAdmin && member.user_id !== user?.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggleCoach(member.user_id, member.is_coach)}
                          className={cn("rounded-ios-md p-2 active:bg-secondary/80", member.is_coach ? "text-amber-500" : "text-muted-foreground")}
                        >
                          <GraduationCap className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(member)}
                          className="rounded-ios-md p-2 text-destructive active:bg-secondary/80"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {idx < members.length - 1 && (
                    <div className="absolute bottom-0 left-[54px] right-0 h-px bg-border" />
                  )}
                </div>
              ))}
            </IOSListGroup>

            {/* ZONE DANGER */}
            {isAdmin && (
              <IOSListGroup header="ZONE DANGER" className="px-ios-4">
                <IOSListItem
                  icon={Trash2}
                  iconBgColor="bg-destructive"
                  iconColor="text-white"
                  title="Supprimer le club"
                  onClick={() => setShowDeleteClub(true)}
                  showChevron={false}
                  showSeparator={false}
                />
              </IOSListGroup>
            )}

            <div className="h-8" />
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>

      {/* Invite overlay */}
      {showInvite && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 pt-20">
          <div className="mx-4 w-full max-w-md rounded-ios-lg bg-background p-ios-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold">Inviter des membres</h3>
              <button type="button" onClick={() => { setShowInvite(false); setSearchQuery(""); setSearchResults([]); }}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un utilisateur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" autoFocus />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {searchResults.map((p) => (
                <div key={p.user_id} onClick={() => inviteUser(p)} className="flex cursor-pointer items-center gap-3 rounded-ios-md p-2.5 active:bg-secondary/80">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url || ""} />
                    <AvatarFallback>{(p.username || "?")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[15px] font-medium">{p.username || p.display_name}</p>
                    <p className="text-[13px] text-muted-foreground">@{p.username}</p>
                  </div>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="py-4 text-center text-[15px] text-muted-foreground">Aucun résultat</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirm */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.username || memberToRemove?.display_name} sera retiré du club.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive text-destructive-foreground">
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete club confirm */}
      <AlertDialog open={showDeleteClub} onOpenChange={setShowDeleteClub}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le club ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les membres, messages et séances seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={deleteClub} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image crop */}
      <ImageCropEditor
        open={showImageCrop}
        imageSrc={selectedImage || ""}
        onCropComplete={handleCroppedImage}
        onClose={() => { setShowImageCrop(false); setSelectedImage(null); }}
      />
    </>
  );
};
