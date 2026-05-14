import type { ReactNode } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Maquettes 19–20 · écran club (admin vs athlète) — specs apple-screens ScreenClubSettings */

export type ClubSettingsMaquetteVariant = "admin" | "athlete";

function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0] + p[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function MaquetteGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <div className="mb-6 px-4">
      {title ? (
        <div className="px-4 pb-1.5 text-[13px] font-normal uppercase leading-none tracking-[0.3px] text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[10px] bg-card shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">{children}</div>
      {footer ? <div className="mt-1.5 px-4 text-[13px] leading-snug text-muted-foreground">{footer}</div> : null}
    </div>
  );
}

function ChevronSmall() {
  return <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[hsl(var(--muted-foreground)/0.45)]" strokeWidth={2} />;
}

const iconInvite = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </svg>
);
const iconCoach = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 21a8 8 0 1116 0M10 13a4 4 0 100-8 4 4 0 000 8z" />
    <path d="M19 7l1.5 1.5L23 6" />
  </svg>
);
const iconLink = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5" />
  </svg>
);

const settingIcons: Record<string, ReactNode> = {
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  lock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  program: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" />
      <path d="M14 4l6 6-9 9H5v-6l9-9z" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  ),
  export: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
    </svg>
  ),
};

export interface ClubMaquetteMember {
  userId: string;
  displayName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  isYou?: boolean;
  isAdminStar?: boolean;
}

export interface ClubMaquettePendingInvite {
  id: string;
  initials: string;
  name: string;
  sub: string;
}

export interface ClubMaquetteNextEvent {
  title: string;
  detail?: string;
  place?: string;
}

export interface ClubSettingsMaquetteViewProps {
  variant: ClubSettingsMaquetteVariant;
  clubName: string;
  clubTag: string;
  clubAvatarUrl?: string | null;
  subtitleLine: string;
  statsMembers: number;
  statsCoaches: number;
  statsPrograms: number;
  nextEvent?: ClubMaquetteNextEvent | null;
  members: ClubMaquetteMember[];
  totalMemberCount: number;
  pendingInvites?: ClubMaquettePendingInvite[];
  /** Row actions admin — retourne le menu d’actions (···) */
  renderMemberTrailing?: (member: ClubMaquetteMember) => ReactNode;
  onMemberRowClick?: (userId: string) => void;
  onViewAllMembers?: () => void;
  /** Actions rapides (admin) */
  onQuickInvite?: () => void;
  onQuickAddCoach?: () => void;
  onQuickShareLink?: () => void;
  /** Réglages (lignes cliquables) */
  onAdminSettingInfos?: () => void;
  onAdminSettingPrivacy?: () => void;
  onAdminSettingNotifications?: () => void;
  onAdminSettingCalendar?: () => void;
  onAdminSettingPrograms?: () => void;
  onAdminCoAdmins?: () => void;
  onAdminExport?: () => void;
  onAdminArchive?: () => void;
  onAdminDelete?: () => void;
  /** Athlète */
  athleteNotificationsOn?: boolean;
  onAthleteToggleNotifications?: () => void;
  onAthleteCalendar?: () => void;
  onAthletePrograms?: () => void;
  onAthleteLeaveClub?: () => void;
  onPendingPrimary?: (invitationId: string) => void;
  onPendingSecondary?: (invitationId: string) => void;
  /** Conversation (ex. Messages) — rangée type Réglages iOS */
  conversationMute?: { muted: boolean; onToggle: () => void };
  className?: string;
}

export function ClubSettingsMaquetteView({
  variant,
  clubName,
  clubTag,
  clubAvatarUrl,
  subtitleLine,
  statsMembers,
  statsCoaches,
  statsPrograms,
  nextEvent,
  members,
  totalMemberCount,
  pendingInvites = [],
  renderMemberTrailing,
  onMemberRowClick,
  onViewAllMembers,
  onQuickInvite,
  onQuickAddCoach,
  onQuickShareLink,
  onAdminSettingInfos,
  onAdminSettingPrivacy,
  onAdminSettingNotifications,
  onAdminSettingCalendar,
  onAdminSettingPrograms,
  onAdminCoAdmins,
  onAdminExport,
  onAdminArchive,
  onAdminDelete,
  athleteNotificationsOn = true,
  onAthleteToggleNotifications,
  onAthleteCalendar,
  onAthletePrograms,
  onAthleteLeaveClub,
  onPendingPrimary,
  onPendingSecondary,
  conversationMute,
  className,
}: ClubSettingsMaquetteViewProps) {
  const isAdmin = variant === "admin";
  const displayedMembers = members;

  return (
    <div className={cn("pb-24 pt-0", className)}>
      {/* Hero — club crest + name (mockup: 88×88, radius 22) */}
      <div className="px-4 pb-[18px] text-center">
        <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-[30px] font-bold tracking-[0.02em] text-white shadow-[0_8px_24px_-6px_rgba(10,132,255,0.45)]">
          {clubAvatarUrl ? (
            <img src={clubAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-[system-ui]">{clubTag.slice(0, 3).toUpperCase()}</span>
          )}
        </div>
        <div className="mt-3 font-[system-ui] text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">{clubName}</div>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{subtitleLine}</div>

        <div className="mx-auto mt-[14px] flex max-w-[320px] items-stretch justify-center gap-[22px]">
          <div className="text-center">
            <div className="font-[system-ui] text-[22px] font-bold leading-none tracking-[-0.02em] text-foreground">{statsMembers}</div>
            <div className="mt-px text-[11px] text-muted-foreground">Membres</div>
          </div>
          <div className="w-px shrink-0 bg-border" />
          <div className="text-center">
            <div className="font-[system-ui] text-[22px] font-bold leading-none tracking-[-0.02em] text-foreground">{statsCoaches}</div>
            <div className="mt-px text-[11px] text-muted-foreground">Coachs</div>
          </div>
          <div className="w-px shrink-0 bg-border" />
          <div className="text-center">
            <div className="font-[system-ui] text-[22px] font-bold leading-none tracking-[-0.02em] text-foreground">{statsPrograms}</div>
            <div className="mt-px text-[11px] text-muted-foreground">Programmes</div>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto mt-[14px] inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-[5px] text-[12px] font-semibold tracking-[-0.01em]",
            isAdmin ? "bg-[rgba(10,132,255,0.12)] text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {isAdmin ? <>★ Vous êtes administrateur</> : <>Vous êtes athlète membre</>}
        </div>
      </div>

      {conversationMute ? (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={conversationMute.onToggle}
            className="flex w-full items-center gap-3 rounded-[10px] bg-card px-3 py-2.5 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] active:opacity-90"
          >
            <div className="text-[15px] font-medium text-foreground">Sourdine</div>
            <div className="min-w-0 flex-1 text-[12px] text-muted-foreground">
              {conversationMute.muted ? "Conversations masquées" : "Notifications normales"}
            </div>
            <MaquetteToggle on={!conversationMute.muted} />
          </button>
        </div>
      ) : null}

      {isAdmin && (onQuickInvite || onQuickAddCoach || onQuickShareLink) && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onQuickInvite}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-2 py-3 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform"
            >
              <span className="text-primary">{iconInvite}</span>
              <span className="text-[11px] font-semibold tracking-[-0.01em] text-foreground">Inviter</span>
            </button>
            <button
              type="button"
              onClick={onQuickAddCoach}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-2 py-3 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform"
            >
              <span className="text-primary">{iconCoach}</span>
              <span className="text-[11px] font-semibold tracking-[-0.01em] text-foreground">Ajouter coach</span>
            </button>
            <button
              type="button"
              onClick={onQuickShareLink}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-card px-2 py-3 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform"
            >
              <span className="text-primary">{iconLink}</span>
              <span className="text-[11px] font-semibold tracking-[-0.01em] text-foreground">Lien partage</span>
            </button>
          </div>
        </div>
      )}

      {nextEvent ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-[14px] bg-card p-[14px] text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)] active:opacity-90"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,69,58,0.12)] text-[#ff453a]">
              <Calendar className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-[0.3px] text-muted-foreground">Prochain événement</div>
              <div className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">{nextEvent.title}</div>
              {nextEvent.detail || nextEvent.place ? (
                <div className="mt-px text-[12px] text-muted-foreground">
                  {[nextEvent.place, nextEvent.detail].filter(Boolean).join(" · ")}
                </div>
              ) : null}
            </div>
            <ChevronSmall />
          </button>
        </div>
      ) : null}

      <MaquetteGroup title={isAdmin ? `Membres · ${totalMemberCount}` : "Coachs & athlètes"}>
        {displayedMembers.map((m, i) => {
          const last = i === displayedMembers.length - 1;
          const hue = hueFromId(m.userId);
          return (
            <div
              key={m.userId}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5",
                !last && "border-b border-border/60"
              )}
            >
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold text-white"
                style={{ backgroundColor: m.avatarUrl ? undefined : `hsl(${hue}, 85%, 52%)` }}
                onClick={() => onMemberRowClick?.(m.userId)}
                aria-label={m.displayName}
              >
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : initialsFromName(m.displayName)}
              </button>
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onMemberRowClick?.(m.userId)}
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[16px] font-medium tracking-[-0.02em] text-foreground">
                  {m.displayName}
                  {m.isYou ? (
                    <span className="rounded px-1.5 py-px text-[10px] font-semibold text-muted-foreground bg-muted">VOUS</span>
                  ) : null}
                  {m.isAdminStar ? <span className="text-[12px] text-[#ff9500]">★</span> : null}
                </div>
                <div className="text-[13px] text-muted-foreground">{m.roleLabel}</div>
              </button>
              {isAdmin ? (
                (renderMemberTrailing?.(m) ?? <span className="pb-1 text-[18px] tracking-[2px] text-muted-foreground/40">···</span>)
              ) : (
                <ChevronSmall />
              )}
            </div>
          );
        })}
      </MaquetteGroup>

      {!isAdmin && onViewAllMembers && totalMemberCount > members.length ? (
        <div className="-mt-4 px-4 pb-2">
          <button type="button" onClick={onViewAllMembers} className="py-2 pl-1 text-[13px] font-normal text-primary">
            Voir tous les membres ({totalMemberCount}) <span className="inline opacity-70">›</span>
          </button>
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <MaquetteGroup title="Paramètres du club">
            <MaquetteSettingRow
              iconKey="edit"
              label="Infos du club"
              sub="Nom, ville, disciplines, photo"
              onClick={onAdminSettingInfos}
            />
            <MaquetteSettingRow
              iconKey="lock"
              label="Confidentialité"
              sub="Public · ouvert sur invitation"
              onClick={onAdminSettingPrivacy}
            />
            <MaquetteSettingRow
              iconKey="bell"
              label="Notifications"
              sub="Annonces, nouvelles séances"
              onClick={onAdminSettingNotifications}
            />
            <MaquetteSettingRow
              iconKey="calendar"
              label="Calendrier club"
              sub="Événements à venir"
              onClick={onAdminSettingCalendar}
            />
            <MaquetteSettingRow
              iconKey="program"
              label="Programmes partagés"
              sub="Programmes actifs"
              last
              onClick={onAdminSettingPrograms}
            />
          </MaquetteGroup>

          {pendingInvites.length > 0 ? (
            <MaquetteGroup title="Demandes en attente">
              {pendingInvites.map((p, idx) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    idx < pendingInvites.length - 1 && "border-b border-border/60"
                  )}
                >
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
              ))}
            </MaquetteGroup>
          ) : null}

          {(onAdminCoAdmins || onAdminExport || onAdminArchive || onAdminDelete) ? (
            <MaquetteGroup title="Zone administrateur">
              {onAdminCoAdmins ? (
                <MaquetteSettingRow
                  iconKey="shield"
                  label="Co-administrateurs"
                  sub="Gérer les rôles"
                  last={!onAdminExport && !onAdminArchive && !onAdminDelete}
                  onClick={onAdminCoAdmins}
                />
              ) : null}
              {onAdminExport ? (
                <MaquetteSettingRow
                  iconKey="export"
                  label="Exporter les données"
                  sub="Membres, séances, statistiques"
                  last={!onAdminArchive && !onAdminDelete}
                  onClick={onAdminExport}
                />
              ) : null}
              {onAdminArchive ? (
                <MaquetteDangerRow label="Archiver le club" onClick={onAdminArchive} last={!onAdminDelete} />
              ) : null}
              {onAdminDelete ? (
                <MaquetteDangerRow label="Supprimer le club" destructive last onClick={onAdminDelete} />
              ) : null}
            </MaquetteGroup>
          ) : null}
        </>
      ) : (
        <MaquetteGroup title="Adhésion">
          <MaquetteSettingRow
            iconKey="bell"
            label="Notifications du club"
            sub={athleteNotificationsOn ? "Activées" : "Désactivées"}
            trailing={
              onAthleteToggleNotifications ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAthleteToggleNotifications();
                  }}
                  className="shrink-0"
                  aria-label="Notifications"
                >
                  <MaquetteToggle on={athleteNotificationsOn} />
                </button>
              ) : undefined
            }
          />
          <MaquetteSettingRow
            iconKey="calendar"
            label="Calendrier des événements"
            sub="À venir"
            onClick={onAthleteCalendar}
          />
          <MaquetteSettingRow iconKey="program" label="Programmes partagés" sub="Disponibles" onClick={onAthletePrograms} />
          <MaquetteDangerRow label="Quitter le club" destructive last onClick={onAthleteLeaveClub} />
        </MaquetteGroup>
      )}
    </div>
  );
}

function MaquetteSettingRow({
  iconKey,
  label,
  sub,
  last,
  trailing,
  onClick,
}: {
  iconKey: keyof typeof settingIcons;
  label: string;
  sub?: string;
  last?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[rgba(10,132,255,0.12)] text-primary">
        {settingIcons[iconKey]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-medium tracking-[-0.02em] text-foreground">{label}</div>
        {sub ? <div className="text-[12px] text-muted-foreground leading-snug">{sub}</div> : null}
      </div>
      {trailing ?? <ChevronSmall />}
    </>
  );
  const cls = cn("flex min-h-[48px] items-center gap-3 px-4 py-2.5 text-left", !last && "border-b border-border/60");
  if (onClick) {
    return (
      <button type="button" className={cn(cls, "w-full active:bg-muted/60")} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
}

function MaquetteDangerRow({
  label,
  destructive,
  last,
  onClick,
}: {
  label: string;
  destructive?: boolean;
  last?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-4 py-[13px] text-left text-[16px] font-medium tracking-[-0.02em] active:bg-muted/60",
        !last && "border-b border-border/60",
        destructive ? "text-[#ff453a]" : "text-primary"
      )}
    >
      {label}
    </button>
  );
}

function MaquetteToggle({ on }: { on: boolean }) {
  return (
    <div
      className="relative h-[31px] w-[51px] shrink-0 rounded-2xl transition-colors"
      style={{ background: on ? "#34c759" : "#e9e9eb" }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-[left]"
        style={{ width: 27, height: 27, left: on ? 22 : 2 }}
      />
    </div>
  );
}
