import { EllipsisVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  type ClubMaquetteNextEvent,
  type ClubMaquettePendingInvite,
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
  /** Créateur du club (fondateur) — étoile ★ maquette */
  clubCreatedBy?: string | null;
  clubDescription?: string | null;
  clubLocation?: string | null;
  clubAvatarUrl?: string | null;
  coachesCount: number;
  groupsCount: number;
  members: ClubMemberItem[];
  invitations: ClubInvitationItem[];
  nextEvent?: ClubMaquetteNextEvent | null;
  currentUserId?: string | null;
  onInviteAthlete: () => void;
  onInviteCoach: () => void;
  onEditClub: () => void;
  onViewGroups: () => void;
  onOpenMemberProfile: (userId: string) => void;
  onSendMessage: (userId: string) => void;
  onChangeRole: (userId: string, role: ClubRole) => void;
  onRemoveMember: (userId: string) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  onShareClubCode?: () => void;
  onAdminArchive?: () => void;
  onAdminDeleteClub?: () => void;
  onAdminExport?: () => void;
  /** Vue athlète — quitter le club */
  onLeaveClub?: () => void;
}

function clubTagFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "RC";
}

function roleLabel(role: ClubRole, userId: string, createdBy?: string | null): string {
  if (role === "admin") return userId === createdBy ? "Coach principal" : "Administrateur";
  if (role === "coach") return "Coach";
  return "Athlète";
}

export function ClubManagementPage({
  variant,
  clubName,
  clubCreatedBy,
  clubDescription,
  clubLocation,
  clubAvatarUrl,
  coachesCount,
  groupsCount,
  members,
  invitations,
  nextEvent,
  currentUserId,
  onInviteAthlete,
  onInviteCoach,
  onEditClub,
  onViewGroups,
  onOpenMemberProfile,
  onSendMessage,
  onChangeRole,
  onRemoveMember,
  onResendInvitation,
  onCancelInvitation,
  onShareClubCode,
  onAdminArchive,
  onAdminDeleteClub,
  onAdminExport,
  onLeaveClub,
}: ClubManagementPageProps) {
  const [memberListExpanded, setMemberListExpanded] = useState(false);

  useEffect(() => {
    setMemberListExpanded(false);
  }, [variant, members.length, clubName]);

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
      const rl = roleLabel(m.role, m.userId, clubCreatedBy);
      return {
        userId: m.userId,
        displayName: m.displayName,
        roleLabel: m.groupLabel ? `${rl} · ${m.groupLabel}` : rl,
        avatarUrl: m.avatarUrl,
        isYou: currentUserId ? m.userId === currentUserId : false,
        isAdminStar: Boolean(clubCreatedBy && m.userId === clubCreatedBy),
      };
    });
  }, [sortedMembers, currentUserId, clubCreatedBy]);

  const maquetteMembersVisible =
    variant === "athlete" && !memberListExpanded ? maquetteMembers.slice(0, 4) : maquetteMembers;

  const pendingInvites: ClubMaquettePendingInvite[] = useMemo(() => {
    return invitations
      .filter((i) => i.status === "pending")
      .slice(0, 6)
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

  const subtitleParts = [clubDescription?.trim(), clubLocation?.trim()].filter(Boolean);
  const subtitleLine = subtitleParts.length ? subtitleParts.join(" · ") : "Club RunConnect";

  const tag = clubTagFromName(clubName);

  return (
    <ClubSettingsMaquetteView
      variant={variant}
      clubName={clubName}
      clubTag={tag}
      clubAvatarUrl={clubAvatarUrl}
      subtitleLine={subtitleLine}
      statsMembers={members.length}
      statsCoaches={coachesCount}
      statsPrograms={groupsCount}
      nextEvent={nextEvent}
      members={maquetteMembersVisible}
      totalMemberCount={members.length}
      pendingInvites={variant === "admin" ? pendingInvites : []}
      onQuickInvite={variant === "admin" ? onInviteAthlete : undefined}
      onQuickAddCoach={variant === "admin" ? onInviteCoach : undefined}
      onQuickShareLink={variant === "admin" ? onShareClubCode : undefined}
      onMemberRowClick={onOpenMemberProfile}
      onViewAllMembers={variant === "athlete" && maquetteMembers.length > 4 ? () => setMemberListExpanded(true) : undefined}
      renderMemberTrailing={
        variant === "admin"
          ? (m) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" aria-label="Actions membre">
                    <EllipsisVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onOpenMemberProfile(m.userId)}>Voir le profil</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSendMessage(m.userId)}>Envoyer un message</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onChangeRole(m.userId, "athlete")}>Définir comme Athlète</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeRole(m.userId, "coach")}>Définir comme Coach</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChangeRole(m.userId, "admin")}>Définir comme Admin</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemoveMember(m.userId)}>
                    Retirer du club
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          : undefined
      }
      onAdminSettingInfos={variant === "admin" ? onEditClub : undefined}
      onAdminSettingPrivacy={variant === "admin" ? onEditClub : undefined}
      onAdminSettingNotifications={variant === "admin" ? onEditClub : undefined}
      onAdminSettingCalendar={variant === "admin" ? onViewGroups : undefined}
      onAdminSettingPrograms={variant === "admin" ? onViewGroups : undefined}
      onAdminCoAdmins={variant === "admin" ? onEditClub : undefined}
      onAdminExport={variant === "admin" ? onAdminExport : undefined}
      onAdminArchive={variant === "admin" ? onAdminArchive : undefined}
      onAdminDelete={variant === "admin" ? onAdminDeleteClub : undefined}
      onPendingPrimary={(id) => onResendInvitation(id)}
      onPendingSecondary={(id) => onCancelInvitation(id)}
      athleteNotificationsOn
      onAthleteCalendar={variant === "athlete" ? onViewGroups : undefined}
      onAthletePrograms={variant === "athlete" ? onViewGroups : undefined}
      onAthleteLeaveClub={variant === "athlete" ? onLeaveClub : undefined}
    />
  );
}

export type { ClubMaquetteNextEvent, ClubSettingsMaquetteVariant } from "@/components/club/ClubSettingsMaquetteView";
