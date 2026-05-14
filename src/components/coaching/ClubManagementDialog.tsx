import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { IOSListGroup, IOSListItem } from "@/components/ui/ios-list-item";
import { CoachingFullscreenHeader } from "./CoachingFullscreenHeader";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { InviteMembersDialog } from "@/components/InviteMembersDialog";
import { ImageCropEditor } from "@/components/ImageCropEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Copy,
  Camera,
  UserPlus,
  GraduationCap,
  Trash2,
  Pencil,
  FileText,
  Crown,
  Check,
  MoreHorizontal,
  Share2,
  Image as ImageIcon,
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

type MemberFilter = "all" | "coaches" | "admins";

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

  // Edit sheets
  const [editField, setEditField] = useState<null | "name" | "description">(null);
  const [tempValue, setTempValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  // Avatar
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Invite
  const [showInvite, setShowInvite] = useState(false);

  // Filter
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  // Code copy feedback
  const [codeCopied, setCodeCopied] = useState(false);

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
          if (a.is_coach && !b.is_coach) return -1;
          if (!a.is_coach && b.is_coach) return 1;
          return (a.username || "").localeCompare(b.username || "");
        });

      setMembers(merged);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (isOpen) {
      void loadClubInfo();
      void loadMembers();
    }
  }, [isOpen, clubId, loadClubInfo, loadMembers]);

  // Open edit sheet
  const openEdit = (field: "name" | "description") => {
    setTempValue(field === "name" ? clubName : clubDescription);
    setEditField(field);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editField) return;
    if (editField === "name" && !tempValue.trim()) return;
    setSavingField(true);
    const payload =
      editField === "name"
        ? { group_name: tempValue.trim() }
        : { group_description: tempValue.trim() || null };
    const { error } = await supabase.from("conversations").update(payload).eq("id", clubId);
    setSavingField(false);
    if (!error) {
      if (editField === "name") setClubName(tempValue.trim());
      else setClubDescription(tempValue.trim());
      setEditField(null);
      onClubUpdated();
      toast({ title: editField === "name" ? "Nom mis à jour" : "Description mise à jour" });
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
      setCodeCopied(true);
      toast({ title: "Code copié !" });
      setTimeout(() => setCodeCopied(false), 1800);
    } catch { /* ignore */ }
  };

  // Share code (Web Share API fallback)
  const shareCode = async () => {
    const shareData = {
      title: `Rejoindre ${clubName}`,
      text: `Rejoins le club « ${clubName} » sur RunConnect avec le code : ${clubCode}`,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copyCode();
    } catch { /* user cancelled */ }
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

  // Stats
  const stats = useMemo(() => {
    const coaches = members.filter((m) => m.is_coach).length;
    const admins = members.filter((m) => m.is_admin).length;
    return { total: members.length, coaches, admins };
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (memberFilter === "coaches") return members.filter((m) => m.is_coach);
    if (memberFilter === "admins") return members.filter((m) => m.is_admin);
    return members;
  }, [members, memberFilter]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent fullScreen hideCloseButton className="flex min-h-0 flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Gérer le club</DialogTitle>
          <IosFixedPageHeaderShell
            className="min-h-0 flex-1"
            contentTopOffsetPx={0}
            headerWrapperClassName="shrink-0"
            header={
              <>
                <div
                  className="bg-white dark:bg-card"
                  style={{ height: "max(env(safe-area-inset-top, 0px), 12px)" }}
                  aria-hidden="true"
                />
                <CoachingFullscreenHeader title="Gérer le club" onBack={onClose} />
              </>
            }
            scrollClassName="bg-secondary/40"
          >
            {/* ============ HÉRO ============ */}
            <div className="relative px-ios-4 pt-6 pb-5">
              {/* Glow décoratif */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-2xl"
              />
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  {/* Anneau gradient */}
                  <div className="rounded-full bg-gradient-to-br from-primary/60 via-primary/30 to-primary/10 p-[2.5px] shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.45)]">
                    <Avatar className="h-24 w-24 border-2 border-card">
                      <AvatarImage src={clubAvatarUrl} />
                      <AvatarFallback className="bg-card">
                        <Users className="h-9 w-9 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => document.getElementById("mgmt-avatar-upload")?.click()}
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card transition-transform active:scale-95"
                      aria-label="Changer la photo"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                  <input id="mgmt-avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                </div>
                <h1 className="mt-3 text-center text-[24px] font-bold tracking-tight text-foreground">
                  {clubName || "Club"}
                </h1>
                {clubDescription && (
                  <p className="mt-1 max-w-[280px] text-center text-[14px] leading-snug text-muted-foreground">
                    {clubDescription}
                  </p>
                )}
              </div>

              {/* Stats inline */}
              <div className="relative mt-5 flex items-stretch overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
                <StatCell label="Membres" value={stats.total} />
                <div className="my-3 w-px bg-border/70" />
                <StatCell label="Coachs" value={stats.coaches} />
                <div className="my-3 w-px bg-border/70" />
                <StatCell label="Admins" value={stats.admins} />
              </div>

              {/* CTA principaux */}
              {isAdmin && (
                <div className="relative mt-3 grid grid-cols-2 gap-2.5">
                  <Button
                    onClick={() => setShowInvite(true)}
                    className="h-11 rounded-2xl text-[14px] font-semibold shadow-sm"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Inviter
                  </Button>
                  <Button
                    onClick={shareCode}
                    variant="secondary"
                    className="h-11 rounded-2xl bg-card text-[14px] font-semibold shadow-sm hover:bg-card/80"
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Partager
                  </Button>
                </div>
              )}
            </div>

            {/* ============ CODE D'INVITATION ============ */}
            {isAdmin && clubCode && (
              <div className="px-ios-4 pb-1">
                <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Code d'invitation
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left shadow-[var(--shadow-card)] transition active:scale-[0.99]"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      {codeCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[20px] font-bold tracking-[0.18em] text-foreground">
                        {clubCode}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {codeCopied ? "Copié dans le presse-papier" : "Appuyez pour copier le code"}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ============ INFORMATIONS ============ */}
            {isAdmin && (
              <IOSListGroup header="INFORMATIONS" className="px-ios-4">
                <IOSListItem
                  icon={Pencil}
                  iconBgColor="bg-blue-500"
                  title="Nom du club"
                  value={clubName}
                  onClick={() => openEdit("name")}
                  showSeparator
                />
                <IOSListItem
                  icon={FileText}
                  iconBgColor="bg-emerald-500"
                  title="Description"
                  value={clubDescription || "Aucune"}
                  onClick={() => openEdit("description")}
                  showSeparator
                />
                <IOSListItem
                  icon={ImageIcon}
                  iconBgColor="bg-violet-500"
                  title="Photo du club"
                  onClick={() => document.getElementById("mgmt-avatar-upload")?.click()}
                  showSeparator={false}
                />
              </IOSListGroup>
            )}

            {/* ============ MEMBRES ============ */}
            <div className="px-ios-4 pt-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Membres ({stats.total})
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-primary active:opacity-60"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Inviter
                  </button>
                )}
              </div>

              {/* Filtres en chips */}
              {stats.total > 3 && (
                <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
                  <FilterChip active={memberFilter === "all"} onClick={() => setMemberFilter("all")}>
                    Tous · {stats.total}
                  </FilterChip>
                  <FilterChip active={memberFilter === "coaches"} onClick={() => setMemberFilter("coaches")}>
                    Coachs · {stats.coaches}
                  </FilterChip>
                  <FilterChip active={memberFilter === "admins"} onClick={() => setMemberFilter("admins")}>
                    Admins · {stats.admins}
                  </FilterChip>
                </div>
              )}

              {/* Liste */}
              <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-card)]">
                {loading && members.length === 0 ? (
                  <div className="divide-y divide-border/60">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                          <div className="h-2.5 w-1/4 animate-pulse rounded bg-secondary" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[14px] text-muted-foreground">Aucun membre dans cette catégorie</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredMembers.map((member) => (
                      <MemberRow
                        key={member.user_id}
                        member={member}
                        isSelf={member.user_id === user?.id}
                        canManage={isAdmin && member.user_id !== user?.id}
                        onToggleCoach={() => toggleCoach(member.user_id, member.is_coach)}
                        onRemove={() => setMemberToRemove(member)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ============ ZONE DANGER ============ */}
            {isAdmin && (
              <div className="px-ios-4 pt-5">
                <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-destructive/80">
                  Zone danger
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteClub(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-left transition active:scale-[0.99]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground shadow-sm">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-destructive">Supprimer le club</p>
                    <p className="mt-0.5 text-[12px] text-destructive/70">
                      Action irréversible. Tous les membres et messages seront perdus.
                    </p>
                  </div>
                </button>
              </div>
            )}

            <div className="h-12" />
          </IosFixedPageHeaderShell>
        </DialogContent>
      </Dialog>

      {/* Invite */}
      <InviteMembersDialog
        open={showInvite}
        onOpenChange={setShowInvite}
        clubId={clubId}
        stackNested
        onMemberInvited={() => void loadMembers()}
      />

      {/* Edit field sheet */}
      <Sheet open={!!editField} onOpenChange={(o) => !o && setEditField(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl border-0 px-5 pb-6 pt-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden />
          <SheetHeader className="text-left">
            <SheetTitle className="text-[18px]">
              {editField === "name" ? "Nom du club" : "Description"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {editField === "description" ? (
              <Textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="Décrivez votre club en quelques mots…"
                className="min-h-[100px] resize-none rounded-2xl"
                maxLength={200}
                autoFocus
              />
            ) : (
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="Nom du club"
                maxLength={50}
                autoFocus
              />
            )}
            <p className="mt-1.5 px-1 text-right text-[11px] text-muted-foreground">
              {tempValue.length}/{editField === "description" ? 200 : 50}
            </p>
          </div>
          <SheetFooter className="mt-4 flex-row gap-2">
            <Button variant="secondary" className="flex-1 h-11 rounded-2xl" onClick={() => setEditField(null)}>
              Annuler
            </Button>
            <Button
              className="flex-1 h-11 rounded-2xl"
              onClick={saveEdit}
              disabled={savingField || (editField === "name" && !tempValue.trim())}
            >
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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

/* ---------------- sous-composants ---------------- */

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-3">
      <span className="text-[22px] font-bold leading-none tracking-tight text-foreground">{value}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function MemberRow({
  member,
  isSelf,
  canManage,
  onToggleCoach,
  onRemove,
}: {
  member: GroupMember;
  isSelf: boolean;
  canManage: boolean;
  onToggleCoach: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || ""} />
          <AvatarFallback className="bg-secondary text-[13px] font-semibold">
            {(member.username || "?")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {member.is_admin && (
          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-card">
            <Crown className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {member.username || member.display_name}
          </p>
          {isSelf && <span className="text-[12px] text-muted-foreground">(vous)</span>}
        </div>
        <div className="mt-1 flex items-center gap-1">
          {member.is_admin && (
            <Badge className="border-0 bg-primary/12 px-1.5 py-0 text-[10px] font-semibold text-primary">
              Admin
            </Badge>
          )}
          {member.is_coach && (
            <Badge className="border-0 bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-600">
              Coach
            </Badge>
          )}
          {!member.is_admin && !member.is_coach && (
            <Badge className="border-0 bg-secondary px-1.5 py-0 text-[10px] font-semibold text-muted-foreground">
              Athlète
            </Badge>
          )}
        </div>
      </div>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onToggleCoach}>
              <GraduationCap className="mr-2 h-4 w-4" />
              {member.is_coach ? "Retirer le rôle coach" : "Promouvoir coach"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Retirer du club
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
