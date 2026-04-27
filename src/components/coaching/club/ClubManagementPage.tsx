import { Building2, ChevronRight, EllipsisVertical, FolderPlus, MapPin, Settings2, Shield, UserCircle2, UserPlus, Users, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const ROLE_META: Record<ClubRole, { label: string; classes: string }> = {
  admin: { label: "Admin", classes: "bg-primary/10 text-primary" },
  coach: { label: "Coach", classes: "bg-violet-500/10 text-violet-600" },
  athlete: { label: "Athlète", classes: "bg-emerald-500/10 text-emerald-600" },
};

function RoleBadge({ role }: { role: ClubRole }) {
  const meta = ROLE_META[role];
  return <Badge className={cn("border-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.classes)}>{meta.label}</Badge>;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-2">
      <p className="text-[20px] font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

type MemberFilter = "all" | "coach" | "athlete";

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
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const filteredMembers = useMemo(() => {
    if (memberFilter === "all") return members;
    if (memberFilter === "coach") return members.filter((m) => m.role === "coach" || m.role === "admin");
    return members.filter((m) => m.role === "athlete");
  }, [members, memberFilter]);

  const pendingInvites = invitations.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6 pb-8">
      {/* HERO */}
      <div className="flex flex-col items-center pt-2 text-center">
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-primary via-primary/70 to-violet-500 p-[2.5px]">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-secondary">
              {clubAvatarUrl ? (
                <img src={clubAvatarUrl} alt={clubName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Building2 className="h-9 w-9" />
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onEditClub}
            aria-label="Modifier le club"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-foreground text-background shadow-md active:scale-95 transition"
          >
            <WandSparkles className="h-3.5 w-3.5" />
          </button>
        </div>
        <h1 className="mt-3 text-[22px] font-bold leading-tight text-foreground">{clubName}</h1>
        {clubLocation ? (
          <p className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate max-w-[260px]">{clubLocation}</span>
          </p>
        ) : (
          <button onClick={onEditClub} className="mt-1 text-[13px] text-primary underline-offset-2 hover:underline">
            Ajouter une localisation
          </button>
        )}
      </div>

      {/* STATS BAR */}
      <div className="flex items-center rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
        <StatPill value={athletesCount} label="Athlètes" />
        <div className="h-8 w-px bg-border/60" />
        <StatPill value={coachesCount} label="Coachs" />
        <div className="h-8 w-px bg-border/60" />
        <StatPill value={groupsCount} label="Groupes" />
      </div>

      {/* PRIMARY CTAS */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          onClick={onInviteAthlete}
          className="h-12 rounded-2xl text-[14px] font-semibold shadow-sm"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Inviter
        </Button>
        <Button
          variant="secondary"
          onClick={onCreateGroup}
          className="h-12 rounded-2xl text-[14px] font-semibold"
        >
          <FolderPlus className="mr-2 h-4 w-4" />
          Nouveau groupe
        </Button>
      </div>

      {/* MEMBRES */}
      <section>
        <SectionHeader
          title={`Membres · ${members.length}`}
          action={
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-primary" onClick={onInviteCoach}>
              <Shield className="mr-1 h-3.5 w-3.5" /> Inviter coach
            </Button>
          }
        />

        {/* Filter chips */}
        <div className="mb-2 flex gap-1.5 px-1">
          {([
            { id: "all", label: "Tous" },
            { id: "coach", label: "Coachs" },
            { id: "athlete", label: "Athlètes" },
          ] as const).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setMemberFilter(chip.id)}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-semibold transition",
                memberFilter === chip.id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {filteredMembers.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
              <p className="text-[13px] font-medium text-foreground">Aucun membre</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Invitez vos premiers athlètes pour démarrer.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filteredMembers.map((member) => (
                <li key={member.userId} className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-secondary"
                    onClick={() => onOpenMemberProfile(member.userId)}
                  >
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onOpenMemberProfile(member.userId)}
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[14px] font-semibold text-foreground">{member.displayName}</p>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {member.groupLabel || "Sans groupe"}
                    </p>
                  </button>
                  <RoleBadge role={member.role} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => onOpenMemberProfile(member.userId)}>Voir le profil</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendMessage(member.userId)}>Envoyer un message</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, "athlete")}>Définir comme Athlète</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, "coach")}>Définir comme Coach</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, "admin")}>Définir comme Admin</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemoveMember(member.userId)}>
                        Retirer du club
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* GROUPES */}
      <section>
        <SectionHeader
          title={`Groupes · ${groups.length}`}
          action={
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[12px] text-primary" onClick={onCreateGroup}>
              <FolderPlus className="mr-1 h-3.5 w-3.5" /> Créer
            </Button>
          }
        />
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {groups.length === 0 ? (
            <div className="p-6 text-center">
              <FolderPlus className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
              <p className="text-[13px] font-medium text-foreground">Aucun groupe</p>
              <Button variant="secondary" size="sm" className="mt-3 rounded-full" onClick={onCreateGroup}>
                Créer le premier groupe
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {groups.map((group) => (
                <li key={group.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenGroup(group.id)}>
                    <p className="truncate text-[14px] font-semibold text-foreground">{group.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {group.athletesCount} athlète{group.athletesCount > 1 ? "s" : ""}
                      {group.coachName ? ` · Coach ${group.coachName}` : ""}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onOpenGroup(group.id)}>Ouvrir</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditGroup(group.id)}>Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAssignMembers(group.id)}>Assigner des membres</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeleteGroup(group.id)}>
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* INVITATIONS */}
      {invitations.length > 0 && (
        <section>
          <SectionHeader
            title={`Invitations${pendingInvites.length > 0 ? ` · ${pendingInvites.length} en attente` : ""}`}
          />
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <ul className="divide-y divide-border/50">
              {invitations.slice(0, 8).map((invitation) => (
                <li key={invitation.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">{invitation.displayLabel}</p>
                    <p className="truncate text-[11px] text-muted-foreground">Envoyée le {invitation.sentAt}</p>
                  </div>
                  <RoleBadge role={invitation.role} />
                  <Badge
                    className={cn(
                      "border-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      invitation.status === "accepted"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : invitation.status === "pending"
                        ? "bg-orange-500/10 text-orange-600"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {invitation.status === "accepted" ? "Acceptée" : invitation.status === "pending" ? "En attente" : "Expirée"}
                  </Badge>
                  {invitation.status !== "accepted" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onResendInvitation(invitation.id)}>Renvoyer</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onCancelInvitation(invitation.id)}>
                          Annuler
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ACTIVITÉ */}
      <section>
        <SectionHeader title="Activité" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Planifiées</p>
            <p className="mt-1 text-[22px] font-bold text-foreground">{plannedSessionsCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Validées</p>
            <p className="mt-1 text-[22px] font-bold text-foreground">{validatedSessionsCount}</p>
          </div>
        </div>
      </section>

      {/* PARAMÈTRES */}
      <section>
        <SectionHeader title="Paramètres du club" />
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <ul className="divide-y divide-border/50">
            {[
              { label: "Informations du club", icon: Building2 },
              { label: "Rôles et permissions", icon: Shield },
              { label: "Gestion des accès", icon: Users },
              { label: "Identité visuelle", icon: WandSparkles },
              { label: "Communication", icon: Settings2 },
            ].map(({ label, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={onEditClub}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-secondary/60 transition"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
