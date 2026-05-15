import { EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClubSettingsMaquetteView,
  type ClubMaquetteMember,
  type ClubMaquettePendingInvite,
  type ClubMaquetteTrainingGroup,
  type ClubSettingsMaquetteVariant,
} from "@/components/club/ClubSettingsMaquetteView";

export type ClubRole = "admin" | "coach" | "athlete";
export type ClubStatus = "active" | "pending";

export interface ClubMemberItem {
  userId: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  role: ClubRole;
  groupLabel?: string;
  status: ClubStatus;
}

export interface ClubGroupItem {
  id: string;
  name: string;
  athletesCount: number;
  coachName?: string;
  /** Couleur tuile groupe (club_groups.color) */
  color?: string;
}

export interface ClubInvitationItem {
  id: string;
  displayLabel: string;
  role: ClubRole;
  sentAt: string;
  status: "pending" | "accepted" | "expired";
}

interface ClubManagementPageProps {
  variant: ClubSettingsMaquetteVariant;
  clubName: string;
  clubCreatedBy?: string | null;
  clubDescription?: string | null;
  clubLocation?: string | null;
  clubAvatarUrl?: string | null;
  /** ISO created_at conversation — « Depuis yyyy » */
  clubCreatedAt?: string | null;
  coachesCount: number;
  trainingGroups: ClubGroupItem[];
  members: ClubMemberItem[];
  invitations: ClubInvitationItem[];
  currentUserId?: string | null;
  /** Créateur du club — zone rouge Supprimer */
  isClubOwner: boolean;
  notificationsMuted: boolean;
  onToggleNotifications: () => void;
  onInviteAthlete: () => void;
  onInviteCoach: () => void;
  onEditClub: () => void;
  onOpenMemberProfile: (userId: string) => void;
  onSendMessage: (userId: string) => void;
  onChangeRole: (userId: string, role: ClubRole) => void;
  onRemoveMember: (userId: string) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onShareClubCode?: () => void;
  onDeleteClub?: () => void;
  onCreateTrainingGroup?: () => void;
  onOpenTrainingGroup?: (groupId: string) => void;
  onClubStatistics?: () => void;
  onClubShop?: () => void;
  onReportClub?: () => void;
  /** Vue athlète — quitter le club */
  onLeaveClub?: () => void;
}

function clubInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "RC";
}

export function ClubManagementPage({
  variant,
  clubName,
  clubCreatedBy,
  clubDescription,
  clubLocation,
  clubAvatarUrl,
  clubCreatedAt,
  coachesCount,
  trainingGroups,
  members,
  invitations,
  currentUserId,
  isClubOwner,
  notificationsMuted,
  onToggleNotifications,
  onInviteAthlete,
  onInviteCoach,
  onEditClub,
  onOpenMemberProfile,
  onSendMessage,
  onChangeRole,
  onRemoveMember,
  onResendInvitation,
  onCancelInvitation,
  onShareClubCode,
  onDeleteClub,
  onCreateTrainingGroup,
  onOpenTrainingGroup,
  onClubStatistics,
  onClubShop,
  onReportClub,
  onLeaveClub,
}: ClubManagementPageProps) {
  const [memberListExpanded, setMemberListExpanded] = useState(false);

  useEffect(() => {
    setMemberListExpanded(false);
  }, [variant, members.length, clubName]);

  const showCoachChrome = variant === "admin";

  const sortedMembers = useMemo(() => {
    const copy = [...members];
    copy.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (a.role !== "admin" && b.role === "admin") return 1;
      if ((a.role === "coach" || a.role === "admin") && b.role === "athlete") return -1;
      if (a.role === "athlete" && (b.role === "coach" || b.role === "admin")) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
    return copy;
  }, [members]);

  const maquetteMembers: ClubMaquetteMember[] = useMemo(() => {
    return sortedMembers.map((m) => {
      const handle = m.username ? `@${m.username}` : undefined;
      const subtitle = handle || m.groupLabel || undefined;
      return {
        userId: m.userId,
        displayName: m.displayName,
        subtitle,
        chipRole: m.role,
        avatarUrl: m.avatarUrl,
        isYou: currentUserId ? m.userId === currentUserId : false,
      };
    });
  }, [sortedMembers, currentUserId]);

  const groupsUi: ClubMaquetteTrainingGroup[] = useMemo(() => {
    return trainingGroups.map((g) => ({
      id: g.id,
      name: g.name,
      athletesCount: g.athletesCount,
      color: g.color || "#5856D6",
    }));
  }, [trainingGroups]);

  const pendingInvites: ClubMaquettePendingInvite[] = useMemo(() => {
    return invitations
      .filter((i) => i.status === "pending")
      .slice(0, 12)
      .map((i) => ({
        id: i.id,
        initials: i.displayLabel
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "?",
        name: i.displayLabel,
        sub: `Invitation · envoyée le ${i.sentAt}`,
      }));
  }, [invitations]);

  const bioParts = [clubDescription?.trim(), clubLocation?.trim()].filter(Boolean);
  const bio = bioParts.length ? bioParts.join("\n") : "Club RunConnect";

  const foundedLabel = clubCreatedAt
    ? format(new Date(clubCreatedAt), "yyyy", { locale: fr })
    : null;

  return (
    <ClubSettingsMaquetteView
      variant={variant}
      clubName={clubName}
      clubAvatarUrl={clubAvatarUrl}
      clubInitials={clubInitialsFromName(clubName)}
      bio={bio}
      statsMembers={members.length}
      statsCoaches={coachesCount}
      foundedLabel={foundedLabel}
      members={maquetteMembers}
      totalMemberCount={members.length}
      memberPreviewCount={4}
      membersExpanded={memberListExpanded || variant === "admin"}
      onExpandMembers={variant === "athlete" && maquetteMembers.length > 4 ? () => setMemberListExpanded(true) : undefined}
      trainingGroups={groupsUi}
      onOpenTrainingGroup={onOpenTrainingGroup}
      onCreateTrainingGroup={showCoachChrome ? onCreateTrainingGroup : undefined}
      notificationsMuted={notificationsMuted}
      onToggleNotifications={onToggleNotifications}
      showCoachChrome={showCoachChrome}
      isClubOwner={isClubOwner}
      onEditClubPhoto={showCoachChrome ? onEditClub : undefined}
      onMemberPress={(userId) => onOpenMemberProfile(userId)}
      renderMemberTrailing={
        showCoachChrome
          ? (row) =>
              row.userId !== currentUserId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Actions membre">
                      <EllipsisVertical className="h-4 w-4 text-[#C7C7CC]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => onOpenMemberProfile(row.userId)}>Voir le profil</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSendMessage(row.userId)}>Envoyer un message</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onChangeRole(row.userId, "athlete")}>Définir comme Athlète</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(row.userId, "coach")}>Définir comme Coach</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(row.userId, "admin")}>Définir comme Admin</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemoveMember(row.userId)}>
                      Retirer du club
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null
          : undefined
      }
      onInviteMembers={showCoachChrome ? () => onInviteAthlete() : undefined}
      onManageRoles={showCoachChrome ? onEditClub : undefined}
      onClubStatistics={showCoachChrome ? onClubStatistics : undefined}
      onClubShop={showCoachChrome ? onClubShop : undefined}
      onShareClub={onShareClubCode}
      onReportClub={onReportClub}
      onLeaveClub={onLeaveClub}
      onDeleteClub={showCoachChrome && isClubOwner ? onDeleteClub : undefined}
      pendingInvites={showCoachChrome ? pendingInvites : []}
      onPendingPrimary={(id) => onResendInvitation(id)}
      onPendingSecondary={(id) => onCancelInvitation(id)}
    />
  );
}

export type { ClubMaquetteNextEvent, ClubSettingsMaquetteVariant } from "@/components/club/ClubSettingsMaquetteView";
