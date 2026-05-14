import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type WeekFicheCell = "ok" | "rest" | "miss" | "today" | "planned";

function avatarHueFromUserId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hues = [350, 207, 199, 280, 32, 24];
  return hues[h % hues.length];
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[parts.length - 1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

/** Maquette 18 · Fiche athlète (RunConnect iOS) — couleurs grille */
const FICHE_CELL: Record<
  WeekFicheCell,
  { className: string; symbol: string; aria: string }
> = {
  ok: { className: "bg-[#1FB386] text-white border-0", symbol: "✓", aria: "Séance réalisée" },
  miss: { className: "bg-[#FF4D1A] text-white border-0", symbol: "✕", aria: "Non réalisée" },
  rest: {
    className: "bg-[rgba(118,118,128,0.14)] text-[#636366] dark:text-muted-foreground border-0",
    symbol: "–",
    aria: "Repos ou aucune séance",
  },
  today: { className: "bg-foreground text-background border-0", symbol: "●", aria: "Aujourd'hui" },
  planned: {
    className:
      "bg-card text-[#636366] dark:text-muted-foreground border-[1.5px] border-[rgba(60,60,67,0.22)] dark:border-border shadow-none",
    symbol: "○",
    aria: "Prévu",
  },
};

export type CoachAthleteFicheRecordRow = {
  label: string;
  value: string;
  /** Sous-titre type maquette : « Z3 · 4:27/km » */
  meta?: string | null;
};

export type CoachAthleteFichePanelProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  subtitle: string;
  onMessage: () => void;
  onViewProfile: () => void;
  /** Rappel push ciblé (maquette « Relancer ») */
  onNudgeAthlete?: () => void;
  nudgeLoading?: boolean;
  nudgeDisabled?: boolean;
  weekLabel: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  weekCells: WeekFicheCell[];
  weekDayLabels: string[];
  selectedDayIndex: number;
  onSelectDayIndex: (index: number) => void;
  recordRows: CoachAthleteFicheRecordRow[];
  recordsFooter?: string;
  onManageRecords: () => void;
  zones: { zone: string; minPace: string; maxPace: string; dotClass: string }[];
  onSendSession: () => void;
  sessionTitle?: string;
  sessionDetail?: string;
  sessionStatusLabel?: string;
  onOpenSessionDetail?: () => void;
};

function MaquetteCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[16px] border border-border/70 bg-card px-3.5 py-3.5 shadow-none dark:border-border/80",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CoachAthleteFichePanel({
  userId,
  displayName,
  avatarUrl,
  subtitle,
  onMessage,
  onViewProfile,
  onNudgeAthlete,
  nudgeLoading,
  nudgeDisabled,
  weekLabel,
  onPreviousWeek,
  onNextWeek,
  weekCells,
  weekDayLabels,
  selectedDayIndex,
  onSelectDayIndex,
  recordRows,
  recordsFooter,
  onManageRecords,
  zones,
  onSendSession,
  sessionTitle,
  sessionDetail,
  sessionStatusLabel,
  onOpenSessionDetail,
}: CoachAthleteFichePanelProps) {
  const hue = avatarHueFromUserId(userId);
  const initials = initialsFromName(displayName);

  return (
    <div className="min-w-0 bg-[var(--ios-grouped-bg)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="px-5 pb-1 pt-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-white dark:ring-card">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[22px] font-semibold text-white"
                style={{ backgroundColor: `hsl(${hue},85%,52%)` }}
              >
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-display text-[24px] font-bold leading-[1.1] tracking-[-0.04em] text-foreground">
              {displayName}
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={onMessage}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-foreground text-[13px] font-bold text-background shadow-none active:opacity-90"
          >
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
            Message
          </button>
          <button
            type="button"
            onClick={onViewProfile}
            className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-[12px] border-[1.5px] border-border/80 bg-card text-[13px] font-bold text-foreground shadow-none active:bg-muted/40"
          >
            Voir profil
          </button>
          {onNudgeAthlete ? (
            <button
              type="button"
              disabled={nudgeDisabled || nudgeLoading}
              onClick={onNudgeAthlete}
              className="flex h-11 shrink-0 items-center justify-center rounded-[12px] bg-[#FF4D1A] px-3.5 text-[13px] font-bold text-white shadow-none active:opacity-90 disabled:pointer-events-none disabled:opacity-45"
            >
              {nudgeLoading ? "…" : "Relancer"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 px-5">
        <div className="flex min-w-0 items-end justify-between gap-2 pb-2">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Cette semaine</p>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#0066CC] active:opacity-70"
              aria-label="Semaine précédente"
              onClick={onPreviousWeek}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="max-w-[128px] truncate text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
              {weekLabel}
            </span>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#0066CC] active:opacity-70"
              aria-label="Semaine suivante"
              onClick={onNextWeek}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekCells.map((cell, i) => {
            const meta = FICHE_CELL[cell];
            const selected = i === selectedDayIndex;
            return (
              <button
                key={`${weekDayLabels[i] ?? i}-${i}`}
                type="button"
                aria-label={`${weekDayLabels[i] ?? ""} ${meta.aria}`}
                onClick={() => onSelectDayIndex(i)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-[10px] text-[16px] font-bold transition-transform active:scale-[0.97]",
                  meta.className,
                  selected &&
                    "ring-2 ring-[#0066CC] ring-offset-[3px] ring-offset-[var(--ios-grouped-bg)] dark:ring-offset-background"
                )}
              >
                {meta.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {sessionTitle ? (
        <div className="mt-5 px-5">
          <MaquetteCard>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Jour sélectionné</p>
            <p className="mt-1 text-[16px] font-bold tracking-[-0.03em] text-foreground">{sessionTitle}</p>
            {sessionDetail ? <p className="mt-0.5 text-[13px] text-muted-foreground">{sessionDetail}</p> : null}
            {sessionStatusLabel ? (
              <p className="mt-2 text-[12px] font-medium text-muted-foreground">{sessionStatusLabel}</p>
            ) : null}
            {onOpenSessionDetail ? (
              <button
                type="button"
                onClick={onOpenSessionDetail}
                className="mt-2 text-[14px] font-semibold text-[#0066CC] active:opacity-70"
              >
                Détail de la séance
              </button>
            ) : null}
          </MaquetteCard>
        </div>
      ) : null}

      <div className="mt-5 px-5">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Records personnels</p>
          <button type="button" className="handoff-ios-link text-[13px] font-semibold" onClick={onManageRecords}>
            Modifier
          </button>
        </div>
        <MaquetteCard className="py-0">
          {recordRows.length ? (
            recordRows.map((row, idx) => (
              <div
                key={`${row.label}-${idx}`}
                className={cn(
                  "flex items-center justify-between gap-3 py-2.5",
                  idx < recordRows.length - 1 && "border-b border-border/60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-bold tracking-[-0.02em] text-foreground">{row.label}</p>
                  {row.meta ? <p className="mt-0.5 text-[11px] text-muted-foreground">{row.meta}</p> : null}
                </div>
                <span className="shrink-0 font-mono text-[16px] font-bold tabular-nums text-foreground">{row.value}</span>
              </div>
            ))
          ) : (
            <div className="py-5 text-center text-[14px] text-muted-foreground">Aucun record renseigné</div>
          )}
        </MaquetteCard>
        {recordsFooter ? <p className="mt-2 px-0.5 text-[12px] leading-snug text-muted-foreground">{recordsFooter}</p> : null}
        <button
          type="button"
          onClick={onManageRecords}
          className="mt-2 flex w-full items-center justify-center py-2.5 text-[15px] font-semibold text-[#0066CC] active:opacity-70"
        >
          Ajouter ou modifier un record
        </button>
      </div>

      <div className="mt-4 px-5">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Zones d&apos;entraînement (course)
        </p>
        <MaquetteCard className="py-0">
          {zones.length ? (
            zones.map((z, idx) => (
              <div
                key={z.zone}
                className={cn(
                  "flex items-center gap-3 py-2.5",
                  idx < zones.length - 1 && "border-b border-border/60"
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", z.dotClass)} />
                <span className="w-9 shrink-0 text-[15px] font-bold text-foreground">{z.zone}</span>
                <span className="min-w-0 flex-1 text-right text-[14px] text-muted-foreground">
                  {z.minPace} → {z.maxPace}
                </span>
              </div>
            ))
          ) : (
            <div className="py-5 text-center text-[14px] text-muted-foreground">
              Ajoute un record (profil ou privé coach) pour calculer les zones.
            </div>
          )}
        </MaquetteCard>
      </div>

      <div className="mt-5 px-5">
        <button
          type="button"
          onClick={onSendSession}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[#FF4D1A] text-[15px] font-bold tracking-[-0.02em] text-white shadow-[0_10px_28px_rgba(255,77,26,0.35)] active:opacity-92"
        >
          <Plus className="h-4 w-4 stroke-[2.6px]" stroke="currentColor" aria-hidden />
          Envoyer une nouvelle séance
        </button>
      </div>
    </div>
  );
}

export { avatarHueFromUserId };
