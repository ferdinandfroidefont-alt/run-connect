import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Camera,
  ChevronRight,
  Flag,
  Gift,
  LogOut,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Maquette RunConnect (16) · Paramètres club — vue coach / vue athlète */

export type ClubSettingsMaquetteVariant = "admin" | "athlete";

export interface ClubMaquetteMember {
  userId: string;
  displayName: string;
  /** Ligne 2 type maquette (@pseudo) — sinon libellé de rôle court */
  subtitle?: string | null;
  chipRole: "admin" | "coach" | "athlete";
  avatarUrl?: string | null;
  isYou?: boolean;
}

export interface ClubMaquettePendingInvite {
  id: string;
  initials: string;
  name: string;
  sub: string;
}

export interface ClubMaquetteTrainingGroup {
  id: string;
  name: string;
  athletesCount: number;
  /** Couleur tuile (hex) */
  color: string;
}

const ACTION_BLUE = "#007AFF";
const HAIRLINE = "#E5E5EA";
const LABEL_GRAY = "#8E8E93";
const PRIMARY_TEXT = "#0A0F1F";

const ROLE_META: Record<
  ClubMaquetteMember["chipRole"],
  { label: string; color: string; bg: string }
> = {
  admin: { label: "Admin", color: "#FF2D55", bg: "#FF2D5520" },
  coach: { label: "Coach", color: "#5856D6", bg: "#5856D620" },
  athlete: { label: "Athlète", color: "#8E8E93", bg: "#8E8E9320" },
};

const GROUP_EMOJIS = ["🏃", "⭐", "😎", "🌱", "⚡", "🎯", "💪", "🔥"];

function emojiForGroupId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GROUP_EMOJIS[h % GROUP_EMOJIS.length];
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function gradientForClub(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const h2 = (h + 42) % 360;
  return `linear-gradient(135deg, hsl(${h}, 82%, 52%), hsl(${h2}, 68%, 46%))`;
}

function SectionHeader({ label }: { label: string }) {
  const trimmed = label.trim();
  if (!trimmed) return null;
  return (
    <p
      className="mb-1.5 mt-[22px] px-7 text-[12.5px] font-bold uppercase leading-none tracking-[0.05em]"
      style={{ color: LABEL_GRAY }}
    >
      {trimmed}
    </p>
  );
}

function FormCard({ children, padding }: { children: ReactNode; padding?: boolean }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl bg-card"
      style={{
        boxShadow: "0 0.5px 0 rgba(0,0,0,0.05)",
        padding: padding ? "14px 16px" : 0,
      }}
    >
      {children}
    </div>
  );
}

function FormRowDivider({ ml }: { ml: number }) {
  return <div className="h-px" style={{ marginLeft: ml, background: HAIRLINE }} />;
}

function RoleChip({ role }: { role: ClubMaquetteMember["chipRole"] }) {
  const meta = ROLE_META[role] ?? ROLE_META.athlete;
  return (
    <div
      className="shrink-0 text-[11px] font-extrabold uppercase tracking-[-0.01em]"
      style={{
        padding: "3px 9px",
        background: meta.bg,
        color: meta.color,
        borderRadius: 9999,
      }}
    >
      {meta.label}
    </div>
  );
}

function IOSToggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="relative shrink-0 transition-colors"
      style={{
        width: 51,
        height: 31,
        borderRadius: 9999,
        background: on ? "#34C759" : "#E9E9EB",
        padding: 2,
      }}
      aria-pressed={on}
    >
      <div
        style={{
          width: 27,
          height: 27,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.06)",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </button>
  );
}

function ClubStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-[13px] font-semibold" style={{ color: LABEL_GRAY }}>
      <span style={{ color: PRIMARY_TEXT, fontWeight: 800 }}>{value}</span> {label}
    </span>
  );
}

function ClubActionRow({
  icon,
  iconBg,
  label,
  subtitle,
  labelColor = PRIMARY_TEXT,
  onClick,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  subtitle?: string;
  labelColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]/80 dark:active:bg-muted/50"
    >
      <div
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: labelColor }}>
          {label}
        </p>
        {subtitle ? (
          <p className="m-0 mt-px text-[13px] font-medium" style={{ color: LABEL_GRAY }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
    </button>
  );
}

export interface ClubSettingsMaquetteViewProps {
  variant: ClubSettingsMaquetteVariant;
  clubName: string;
  clubAvatarUrl?: string | null;
  /** Initiales centre avatar si pas d’image */
  clubInitials?: string;
  /** Texte sous le nom (bio / création) — maquette: paragraphe 14px */
  bio: string;
  statsMembers: number;
  statsCoaches: number;
  /** Affiché après les stats : « Depuis {foundedLabel} » */
  foundedLabel?: string | null;
  members: ClubMaquetteMember[];
  totalMemberCount: number;
  /** Nombre de lignes membres avant expansion (maquette : 4) */
  memberPreviewCount?: number;
  membersExpanded?: boolean;
  onExpandMembers?: () => void;
  trainingGroups: ClubMaquetteTrainingGroup[];
  onOpenTrainingGroup?: (groupId: string) => void;
  onCreateTrainingGroup?: () => void;
  /** Sourdine : activée = toggle vert ON */
  notificationsMuted: boolean;
  onToggleNotifications?: () => void;
  /** Coach / staff : sections et chrome admin */
  showCoachChrome: boolean;
  /** Créateur du club — « Supprimer » vs « Quitter » pour les autres */
  isClubOwner: boolean;
  onEditClubPhoto?: () => void;
  onMemberPress?: (userId: string) => void;
  renderMemberTrailing?: (member: ClubMaquetteMember) => ReactNode;
  /** Bloc administration coach */
  onInviteMembers?: () => void;
  onManageRoles?: () => void;
  onClubStatistics?: () => void;
  onClubShop?: () => void;
  onShareClub?: () => void;
  /** Si absent, la ligne « Signaler » est masquée */
  onReportClub?: () => void;
  onLeaveClub?: () => void;
  onDeleteClub?: () => void;
  pendingInvites?: ClubMaquettePendingInvite[];
  onPendingPrimary?: (invitationId: string) => void;
  onPendingSecondary?: (invitationId: string) => void;
  /** Masque tout le bloc « Groupes d'entraînement » (ex. conversation hors club structuré) */
  omitTrainingGroupsSection?: boolean;
  className?: string;
}

export function ClubSettingsMaquetteView({
  variant,
  clubName,
  clubAvatarUrl,
  clubInitials,
  bio,
  statsMembers,
  statsCoaches,
  foundedLabel,
  members,
  totalMemberCount,
  memberPreviewCount = 4,
  membersExpanded = false,
  onExpandMembers,
  trainingGroups,
  onOpenTrainingGroup,
  onCreateTrainingGroup,
  notificationsMuted,
  onToggleNotifications,
  showCoachChrome,
  isClubOwner,
  onEditClubPhoto,
  onMemberPress,
  renderMemberTrailing,
  onInviteMembers,
  onManageRoles,
  onClubStatistics,
  onClubShop,
  onShareClub,
  onReportClub,
  onLeaveClub,
  onDeleteClub,
  pendingInvites = [],
  onPendingPrimary,
  onPendingSecondary,
  omitTrainingGroupsSection = false,
  className,
}: ClubSettingsMaquetteViewProps) {
  const initials = (clubInitials || initialsFromName(clubName)).slice(0, 3).toUpperCase();
  const gradient = gradientForClub(clubName);
  const visibleMembers = membersExpanded ? members : members.slice(0, memberPreviewCount);
  const canExpand = !membersExpanded && totalMemberCount > memberPreviewCount;

  const showAdministration = showCoachChrome && (onInviteMembers || onManageRoles || onClubStatistics || onClubShop);

  const dangerDelete = variant === "admin" && isClubOwner ? onDeleteClub : undefined;
  const dangerLeave = dangerDelete ? undefined : onLeaveClub;

  return (
    <div
      className={cn("pb-8", className)}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Hero */}
      <div className="flex flex-col items-center px-5 pb-2 pt-5">
        <div className="relative">
          <div
            className="flex items-center justify-center text-white"
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              background: clubAvatarUrl ? undefined : gradient,
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              border: "3px solid white",
              boxShadow: "0 8px 24px rgba(10,132,255,0.25)",
              overflow: "hidden",
            }}
          >
            {clubAvatarUrl ? (
              <img src={clubAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {showCoachChrome && onEditClubPhoto ? (
            <button
              type="button"
              className="absolute flex items-center justify-center transition-transform active:scale-95"
              style={{
                bottom: -2,
                right: -2,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: ACTION_BLUE,
                border: "3px solid white",
                boxShadow: "0 2px 8px rgba(0,122,255,0.35)",
              }}
              aria-label="Modifier la photo du club"
              onClick={onEditClubPhoto}
            >
              <Camera className="h-4 w-4 text-white" strokeWidth={2.4} />
            </button>
          ) : null}
        </div>
        <h2
          className="mt-3 text-center"
          style={{
            fontSize: 26,
            fontWeight: 900,
            color: PRIMARY_TEXT,
            letterSpacing: "-0.03em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {clubName}
        </h2>
        <p
          className="mt-2 px-3 text-center"
          style={{
            fontSize: 14,
            color: "#3C3C43",
            fontWeight: 500,
            lineHeight: 1.35,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {bio}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <ClubStat value={statsMembers} label="membres" />
          <span style={{ color: "#C7C7CC" }}>·</span>
          <ClubStat value={statsCoaches} label="coachs" />
          {foundedLabel ? (
            <>
              <span style={{ color: "#C7C7CC" }}>·</span>
              <span className="text-[13px] font-semibold" style={{ color: LABEL_GRAY }}>
                Depuis {foundedLabel}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Membres */}
      <SectionHeader label={`Membres (${totalMemberCount})`} />
      <FormCard>
        {visibleMembers.map((m, i) => (
          <div key={m.userId}>
            {i > 0 ? <FormRowDivider ml={60} /> : null}
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]/80 dark:active:bg-muted/50"
              onClick={() => onMemberPress?.(m.userId)}
            >
              <div
                className="flex shrink-0 items-center justify-center overflow-hidden text-[15px] font-extrabold tracking-[-0.02em] text-white"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  backgroundColor: m.avatarUrl ? undefined : `hsl(${hueFromId(m.userId)}, 85%, 52%)`,
                }}
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsFromName(m.displayName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: PRIMARY_TEXT,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {m.displayName}
                  {m.isYou ? (
                    <span className="text-[13px] font-medium" style={{ color: LABEL_GRAY }}>
                      {" "}
                      · Toi
                    </span>
                  ) : null}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontSize: 13,
                    color: LABEL_GRAY,
                    margin: 0,
                    marginTop: 1,
                    fontWeight: 500,
                  }}
                >
                  {m.subtitle || ROLE_META[m.chipRole].label}
                </p>
              </div>
              <RoleChip role={m.chipRole} />
              {showCoachChrome && !m.isYou ? (
                (renderMemberTrailing?.(m) ?? <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />)
              ) : null}
            </button>
          </div>
        ))}
        {canExpand && onExpandMembers ? (
          <>
            <FormRowDivider ml={16} />
            <button
              type="button"
              onClick={onExpandMembers}
              className="w-full py-3 text-center active:bg-[#F8F8F8]/80 dark:active:bg-muted/50"
            >
              <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ color: ACTION_BLUE }}>
                Voir les {totalMemberCount} membres
              </span>
            </button>
          </>
        ) : null}
      </FormCard>

      {/* Invitations (données réelles, hors maquette statique mais même carte) */}
      {showCoachChrome && pendingInvites.length > 0 ? (
        <>
          <SectionHeader label="Invitations" />
          <FormCard>
            {pendingInvites.map((p, idx) => (
              <div key={p.id}>
                {idx > 0 ? <FormRowDivider ml={60} /> : null}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-muted-foreground">
                    {p.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-medium tracking-[-0.02em] text-foreground">{p.name}</div>
                    <div className="text-[12px] text-muted-foreground">{p.sub}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onPendingSecondary?.(p.id)}
                      className="h-[30px] whitespace-nowrap rounded-[15px] bg-muted px-3 text-[13px] font-medium text-foreground active:scale-95"
                    >
                      Refuser
                    </button>
                    <button
                      type="button"
                      onClick={() => onPendingPrimary?.(p.id)}
                      className="h-[30px] whitespace-nowrap rounded-[15px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground active:scale-95"
                    >
                      Accepter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </FormCard>
        </>
      ) : null}

      {/* Groupes d'entraînement */}
      {!omitTrainingGroupsSection ? (
        <>
          <SectionHeader label="Groupes d'entraînement" />
          <FormCard>
            {trainingGroups.map((g, i) => (
              <div key={g.id}>
                {i > 0 ? <FormRowDivider ml={60} /> : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]/80 dark:active:bg-muted/50"
                  onClick={() => onOpenTrainingGroup?.(g.id)}
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-xl text-[18px]"
                    style={{
                      width: 40,
                      height: 40,
                      background: g.color,
                      boxShadow: `0 2px 6px ${g.color}40`,
                    }}
                  >
                    {emojiForGroupId(g.id)}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: PRIMARY_TEXT,
                        letterSpacing: "-0.01em",
                        margin: 0,
                      }}
                    >
                      {g.name}
                    </p>
                    <p className="m-0 mt-px text-[13px] font-medium" style={{ color: LABEL_GRAY }}>
                      {g.athletesCount} membres
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
                </button>
              </div>
            ))}
            {showCoachChrome && onCreateTrainingGroup ? (
              <>
                {trainingGroups.length > 0 ? <FormRowDivider ml={60} /> : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]/80 dark:active:bg-muted/50"
                  onClick={onCreateTrainingGroup}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "#F2F2F7",
                      border: "1.5px dashed #C7C7CC",
                    }}
                  >
                    <Plus className="h-5 w-5" color={ACTION_BLUE} strokeWidth={2.6} />
                  </div>
                  <span
                    className="flex-1 text-left text-[16px] font-bold tracking-[-0.01em]"
                    style={{ color: ACTION_BLUE }}
                  >
                    Créer un groupe
                  </span>
                </button>
              </>
            ) : null}
          </FormCard>
        </>
      ) : null}

      {/* Préférences */}
      <SectionHeader label="Préférences" />
      <FormCard padding>
        <div className="flex items-center gap-3">
          <div
            className="flex shrink-0 items-center justify-center rounded-md"
            style={{ width: 30, height: 30, background: "#FF9500" }}
          >
            <Bell className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
          </div>
          <span className="flex-1 text-[17px] font-semibold tracking-[-0.01em]" style={{ color: PRIMARY_TEXT }}>
            Notifications en sourdine
          </span>
          <IOSToggle on={notificationsMuted} onChange={() => onToggleNotifications?.()} />
        </div>
        <p className="m-0 mt-2.5 text-[13px] font-medium leading-snug" style={{ color: LABEL_GRAY }}>
          {notificationsMuted
            ? "Tu ne recevras pas de notifications pour ce club."
            : "Tu reçois les nouvelles séances, messages et annonces."}
        </p>
      </FormCard>

      {/* Administration */}
      {showAdministration ? (
        <>
          <SectionHeader label="Administration" />
          <FormCard>
            {onInviteMembers ? (
              <>
                <ClubActionRow
                  icon={<UserPlus className="h-5 w-5 text-white" strokeWidth={2.4} />}
                  iconBg={ACTION_BLUE}
                  label="Inviter des membres"
                  subtitle="Athlètes, coachs ou parents"
                  onClick={onInviteMembers}
                />
                {onManageRoles || onClubStatistics || onClubShop ? <FormRowDivider ml={60} /> : null}
              </>
            ) : null}
            {onManageRoles ? (
              <>
                <ClubActionRow
                  icon={<Users className="h-5 w-5 text-white" strokeWidth={2.4} />}
                  iconBg="#5856D6"
                  label="Gérer les rôles"
                  subtitle="Athlète · Coach · Admin"
                  onClick={onManageRoles}
                />
                {onClubStatistics || onClubShop ? <FormRowDivider ml={60} /> : null}
              </>
            ) : null}
            {onClubStatistics ? (
              <>
                <ClubActionRow
                  icon={<BarChart3 className="h-5 w-5 text-white" strokeWidth={2.4} />}
                  iconBg="#34C759"
                  label="Statistiques du club"
                  onClick={onClubStatistics}
                />
                {onClubShop ? <FormRowDivider ml={60} /> : null}
              </>
            ) : null}
            {onClubShop ? (
              <ClubActionRow
                icon={<Gift className="h-5 w-5 text-white" strokeWidth={2.4} />}
                iconBg="#FF9500"
                label="Boutique du club"
                subtitle="Équipements, abonnements"
                onClick={onClubShop}
              />
            ) : null}
          </FormCard>
        </>
      ) : null}

      {/* Actions générales */}
      {onShareClub || onReportClub ? (
        <>
          <SectionHeader label=" " />
          <FormCard>
            {onShareClub ? (
              <>
                <ClubActionRow
                  icon={<Share2 className="h-5 w-5" strokeWidth={2.4} style={{ color: PRIMARY_TEXT }} />}
                  iconBg="#F2F2F7"
                  label="Partager le club"
                  labelColor={PRIMARY_TEXT}
                  onClick={onShareClub}
                />
                {onReportClub ? <FormRowDivider ml={60} /> : null}
              </>
            ) : null}
            {onReportClub ? (
              <ClubActionRow
                icon={<Flag className="h-5 w-5 text-[#FF9500]" strokeWidth={2.4} />}
                iconBg="#FF950020"
                label="Signaler un problème"
                labelColor="#FF9500"
                onClick={onReportClub}
              />
            ) : null}
          </FormCard>
        </>
      ) : null}

      {/* Zone rouge */}
      {dangerDelete || dangerLeave ? (
        <>
          <SectionHeader label=" " />
          <FormCard>
            {dangerDelete ? (
              <ClubActionRow
                icon={<Trash2 className="h-5 w-5 text-[#FF3B30]" strokeWidth={2.4} />}
                iconBg="#FF3B3020"
                label="Supprimer le club"
                subtitle="Action irréversible"
                labelColor="#FF3B30"
                onClick={dangerDelete}
              />
            ) : dangerLeave ? (
              <ClubActionRow
                icon={<LogOut className="h-5 w-5 text-[#FF3B30]" strokeWidth={2.4} />}
                iconBg="#FF3B3020"
                label="Quitter le club"
                labelColor="#FF3B30"
                onClick={dangerLeave}
              />
            ) : null}
          </FormCard>
        </>
      ) : null}
    </div>
  );
}

/** Conservé pour compat imports (écran coaching — événement optionnel) */
export interface ClubMaquetteNextEvent {
  title: string;
  detail?: string;
  place?: string;
}
