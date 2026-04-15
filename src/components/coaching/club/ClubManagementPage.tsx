import { Building2, ChevronRight, CopyPlus, EllipsisVertical, FolderPlus, Mail, MessageCircle, Settings, Shield, UserCircle2, UserPlus, Users, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  clubName: string;
  clubLocation?: string | null;
  clubAvatarUrl?: string | null;
  athletesCount: number;
  coachesCount: number;
  groupsCount: number;
  plannedSessionsCount: number;
  validatedSessionsCount: number;
  members: ClubMemberItem[];
  groups: ClubGroupItem[];
  invitations: ClubInvitationItem[];
  onInviteAthlete: () => void;
  onInviteCoach: () => void;
  onCreateGroup: () => void;
  onEditClub: () => void;
  onViewGroups: () => void;
  onOpenMemberProfile: (userId: string) => void;
  onSendMessage: (userId: string) => void;
  onChangeRole: (userId: string, role: ClubRole) => void;
  onRemoveMember: (userId: string) => void;
  onOpenGroup: (groupId: string) => void;
  onEditGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignMembers: (groupId: string) => void;
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
}

function MemberRoleBadge({ role }: { role: ClubRole }) {
  const classes =
    role === "admin"
      ? "bg-blue-600/15 text-blue-700 dark:text-blue-300"
      : role === "coach"
      ? "bg-violet-600/15 text-violet-700 dark:text-violet-300"
      : "bg-emerald-600/12 text-emerald-700 dark:text-emerald-300";
  const label = role === "admin" ? "Admin" : role === "coach" ? "Coach" : "Athlète";
  return <Badge className={cn("border-0 text-[10px] font-semibold", classes)}>{label}</Badge>;
}

function StatusBadge({ status }: { status: ClubStatus | ClubInvitationItem["status"] }) {
  const classes =
    status === "active" || status === "accepted"
      ? "bg-emerald-600/12 text-emerald-700 dark:text-emerald-300"
      : status === "pending"
      ? "bg-orange-500/12 text-orange-700 dark:text-orange-300"
      : "bg-zinc-500/12 text-zinc-700 dark:text-zinc-300";
  const label = status === "active" ? "Actif" : status === "pending" ? "En attente" : status === "accepted" ? "Acceptée" : "Expirée";
  return <Badge className={cn("border-0 text-[10px] font-semibold", classes)}>{label}</Badge>;
}

export function ClubManagementPage({
  clubName,
  clubLocation,
  clubAvatarUrl,
  athletesCount,
  coachesCount,
  groupsCount,
  plannedSessionsCount,
  validatedSessionsCount,
  members,
  groups,
  invitations,
  onInviteAthlete,
  onInviteCoach,
  onCreateGroup,
  onEditClub,
  onViewGroups,
  onOpenMemberProfile,
  onSendMessage,
  onChangeRole,
  onRemoveMember,
  onOpenGroup,
  onEditGroup,
  onDeleteGroup,
  onAssignMembers,
  onResendInvitation,
  onCancelInvitation,
}: ClubManagementPageProps) {
  return (
    <div className="space-y-4">
      <div className="ios-card rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-secondary">
            {clubAvatarUrl ? (
              <img src={clubAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary">
                <Building2 className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-foreground">{clubName}</p>
            <p className="truncate text-[12px] text-muted-foreground">{clubLocation || "Localisation à compléter"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{athletesCount} athlètes</Badge>
              <Badge variant="secondary" className="text-[10px]">{coachesCount} coachs</Badge>
              <Badge variant="secondary" className="text-[10px]">{groupsCount} groupes</Badge>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button variant="secondary" className="h-9 rounded-xl text-[12px] font-semibold" onClick={onEditClub}>Modifier</Button>
          <Button variant="secondary" className="h-9 rounded-xl text-[12px] font-semibold" onClick={onInviteAthlete}>Inviter</Button>
          <Button variant="secondary" className="h-9 rounded-xl text-[12px] font-semibold" onClick={onViewGroups}>Groupes</Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Actions rapides</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="h-12 justify-start rounded-xl text-[12px] font-semibold" onClick={onInviteAthlete}><UserPlus className="mr-2 h-4 w-4" />Inviter un athlète</Button>
          <Button variant="secondary" className="h-12 justify-start rounded-xl text-[12px] font-semibold" onClick={onInviteCoach}><Shield className="mr-2 h-4 w-4" />Inviter un coach</Button>
          <Button variant="secondary" className="h-12 justify-start rounded-xl text-[12px] font-semibold" onClick={onCreateGroup}><FolderPlus className="mr-2 h-4 w-4" />Créer un groupe</Button>
          <Button variant="secondary" className="h-12 justify-start rounded-xl text-[12px] font-semibold" onClick={onEditClub}><WandSparkles className="mr-2 h-4 w-4" />Modifier le club</Button>
        </div>
      </div>

      <div className="ios-card rounded-2xl border border-border/70 bg-card p-3">
        <p className="mb-2 text-[13px] font-semibold text-foreground">Membres ({members.length})</p>
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-[13px] font-medium text-foreground">Aucun membre pour le moment</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Invitez votre premier athlète.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {members.slice(0, 8).map((member) => (
              <div key={member.userId} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <button type="button" className="h-10 w-10 overflow-hidden rounded-full bg-secondary" onClick={() => onOpenMemberProfile(member.userId)}>
                  {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><UserCircle2 className="h-5 w-5 text-muted-foreground" /></div>}
                </button>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenMemberProfile(member.userId)}>
                  <p className="truncate text-[13px] font-semibold text-foreground">{member.displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{member.groupLabel || "Sans groupe"}</p>
                </button>
                <div className="flex items-center gap-1">
                  <MemberRoleBadge role={member.role} />
                  <StatusBadge status={member.status} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><EllipsisVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenMemberProfile(member.userId)}>Voir profil</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSendMessage(member.userId)}>Envoyer message</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(member.userId, "athlete")}>Passer Athlète</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(member.userId, "coach")}>Passer Coach</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeRole(member.userId, "admin")}>Passer Admin</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onRemoveMember(member.userId)}>Retirer du club</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ios-card rounded-2xl border border-border/70 bg-card p-3">
        <p className="mb-2 text-[13px] font-semibold text-foreground">Groupes ({groups.length})</p>
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-[13px] font-medium text-foreground">Aucun groupe pour le moment</p>
            <Button variant="secondary" className="mt-2 h-9 rounded-xl text-[12px]" onClick={onCreateGroup}>Créer un groupe</Button>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenGroup(group.id)}>
                  <p className="truncate text-[13px] font-semibold text-foreground">{group.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {group.athletesCount} athlètes{group.coachName ? ` • Coach ${group.coachName}` : ""}
                  </p>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><EllipsisVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenGroup(group.id)}>Ouvrir groupe</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditGroup(group.id)}>Modifier</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssignMembers(group.id)}>Assigner membres</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDeleteGroup(group.id)}>Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ios-card rounded-2xl border border-border/70 bg-card p-3">
        <p className="mb-2 text-[13px] font-semibold text-foreground">Invitations ({invitations.length})</p>
        {invitations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-[13px] font-medium text-foreground">Aucune invitation en cours</p>
            <Button variant="secondary" className="mt-2 h-9 rounded-xl text-[12px]" onClick={onInviteAthlete}>Inviter un membre</Button>
          </div>
        ) : (
          <div className="space-y-1">
            {invitations.slice(0, 8).map((invitation) => (
              <div key={invitation.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{invitation.displayLabel}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{invitation.sentAt}</p>
                </div>
                <MemberRoleBadge role={invitation.role} />
                <StatusBadge status={invitation.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><EllipsisVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onResendInvitation(invitation.id)}>Renvoyer</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onCancelInvitation(invitation.id)}>Annuler</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ios-card rounded-2xl border border-border/70 bg-card p-3">
        <p className="mb-2 text-[13px] font-semibold text-foreground">Paramètres du club</p>
        <div className="space-y-1">
          {[
            "Informations du club",
            "Rôles et permissions",
            "Gestion des accès",
            "Identité visuelle",
            "Paramètres de communication",
          ].map((entry) => (
            <button key={entry} type="button" onClick={onEditClub} className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-left">
              <span className="text-[13px] font-medium text-foreground">{entry}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Athlètes</p>
          <p className="text-[18px] font-bold text-foreground">{athletesCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Coachs</p>
          <p className="text-[18px] font-bold text-foreground">{coachesCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Séances planifiées</p>
          <p className="text-[18px] font-bold text-foreground">{plannedSessionsCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Séances validées</p>
          <p className="text-[18px] font-bold text-foreground">{validatedSessionsCount}</p>
        </div>
      </div>

      <div className="h-2" />
    </div>
  );
}

