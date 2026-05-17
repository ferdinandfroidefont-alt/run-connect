import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, ChevronRight, Filter, MessageSquare, Plus, Search } from "lucide-react";
import type { SavedSessionSnapshot } from "@/lib/savedSessionsStorage";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { getActivityEmoji, getDiscoverSportTileClass } from "@/lib/discoverSessionVisual";
import { cn } from "@/lib/utils";

export type MySessionsMaquetteFilterId = "toutes" | "venir" | "ok" | "enregistrees" | "draft";

const ACTION_BLUE = "#007AFF";

const FILTER_CHIPS: { id: MySessionsMaquetteFilterId; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "venir", label: "À venir" },
  { id: "ok", label: "Confirmées" },
  { id: "enregistrees", label: "Enregistrées" },
  { id: "draft", label: "Brouillon" },
];

export type MySessionsHomeRow = {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  pace_general?: string | null;
  pace_unit?: string | null;
  distance_km?: number | null;
  organizer_id?: string;
  location_name?: string;
};

type ParticipationInfo = {
  validation_status: string | null;
  confirmed_by_gps: boolean | null;
  confirmed_by_creator: boolean | null;
};

function formatSessionDateLine(session: MySessionsHomeRow, variant: "upcoming" | "weekPast"): string {
  const d = new Date(session.scheduled_at);
  const timeStr = format(d, "HH:mm", { locale: fr });
  const t = (session.activity_type ?? "").toLowerCase();
  const isBike =
    t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel");

  if (variant === "upcoming") {
    let dayLabel: string;
    if (isToday(d)) dayLabel = "Aujourd'hui";
    else if (isTomorrow(d)) dayLabel = "Demain";
    else {
      dayLabel = format(d, "EEE", { locale: fr }).replace(/\.$/, "");
      dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
    }
    return `${dayLabel} · ${timeStr}`;
  }

  let dayLabel = format(d, "EEE", { locale: fr }).replace(/\.$/, "");
  dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

  const pace = session.pace_general?.trim();
  if (pace) {
    const suffix = isBike ? " km/h" : "/km";
    return `${dayLabel} · ${pace}${suffix}`;
  }
  if (session.distance_km != null && Number.isFinite(Number(session.distance_km))) {
    const km = Number(session.distance_km);
    const dist = km >= 10 ? km.toFixed(1) : km.toFixed(2);
    return `${dayLabel} · ${dist} km`;
  }
  return `${dayLabel} · ${timeStr}`;
}

function sessionIsFromTodayOrLater(scheduledAt: string): boolean {
  return new Date(scheduledAt) >= startOfDay(new Date());
}

function MaquetteSessionRow({
  session,
  dateLine,
  showUpcomingDot,
  onClick,
}: {
  session: MySessionsHomeRow;
  dateLine: string;
  showUpcomingDot: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2.5 flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:opacity-90"
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl leading-none text-white shadow-sm",
          getDiscoverSportTileClass(session.activity_type),
        )}
        aria-hidden
      >
        {getActivityEmoji(session.activity_type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-[#0A0F1F]">{session.title}</p>
        <p className="text-[13px] text-[#8E8E93]">{dateLine}</p>
      </div>
      {showUpcomingDot ? (
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: ACTION_BLUE }} aria-hidden />
      ) : null}
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
    </button>
  );
}

export function MySessionsHomeMaquette(props: {
  loading: boolean;
  listFilter: MySessionsMaquetteFilterId;
  onListFilterChange: (f: MySessionsMaquetteFilterId) => void;
  searchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  weeklyKm: number;
  weeklySessionCount: number;
  weeklyGoalKm: number;
  upcomingRows: MySessionsHomeRow[];
  pastThisWeekRows: MySessionsHomeRow[];
  /** Séances déjà passées (filtre Toutes). */
  terminatedRows: MySessionsHomeRow[];
  onSessionClick: (s: MySessionsHomeRow) => void;
  onOpenCreate: () => void;
  /** Bloc actions maquette (17) — affiché sous « Cette semaine » ; omit pour masquer */
  onOpenCommentPicker?: () => void;
  onOpenConfirmPicker?: () => void;
  savedSessions?: SavedSessionSnapshot[];
  onSavedSessionClick?: (s: SavedSessionSnapshot) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setHeaderScrolled(el.scrollTop > 4);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const progressPct =
    props.weeklyGoalKm > 0 ? Math.min(100, Math.round((props.weeklyKm / props.weeklyGoalKm) * 100)) : 0;

  const skeleton = props.loading;

  const confirmedCombined =
    props.listFilter === "ok" ? [...props.upcomingRows, ...props.pastThisWeekRows] : [];

  return (
    <div ref={scrollRef} className="ios-scroll-region min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-ios-6">
      {/* Sticky header — aligné maquette RunConnect (2).jsx SeancesPage */}
      <div
        className="sticky top-0 z-50 transition-all duration-200 ease-out"
        style={{
          background: headerScrolled ? "rgba(242, 242, 247, 0.72)" : "hsl(var(--muted))",
          backdropFilter: headerScrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: headerScrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: headerScrolled ? "0.5px solid rgba(0, 0, 0, 0.08)" : "0.5px solid transparent",
        }}
      >
        <div className="px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center justify-between gap-3">
            <h1
              className="font-display truncate leading-none tracking-[-0.04em] text-[#0A0F1F]"
              style={{ fontSize: "40px", fontWeight: 900 }}
            >
              Mes séances
            </h1>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                aria-label="Rechercher ou filtrer"
                className="flex h-9 w-9 items-center justify-center"
                onClick={props.onToggleSearch}
              >
                <Filter className="h-5 w-5" color={ACTION_BLUE} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                aria-label="Créer une séance"
                className="flex h-9 w-9 items-center justify-center"
                onClick={props.onOpenCreate}
              >
                <Plus className="h-7 w-7" color={ACTION_BLUE} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {props.searchOpen ? (
        <div className="px-5 pb-2 pt-1">
          <div className="flex items-center gap-2 rounded-xl bg-[#E5E5EA] px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.5} aria-hidden />
            <input
              value={props.searchQuery}
              onChange={(e) => props.onSearchQueryChange(e.target.value)}
              placeholder="Rechercher une séance…"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
            />
          </div>
        </div>
      ) : null}

      <main className="px-5 pb-8 pt-3">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {FILTER_CHIPS.map((f) => {
            const active = props.listFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => props.onListFilterChange(f.id)}
                className="flex-shrink-0 rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors"
                style={{
                  background: active ? ACTION_BLUE : "white",
                  color: active ? "white" : "#0A0F1F",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {skeleton ? (
          <div className="mt-4 space-y-3">
            <div className="h-36 animate-pulse rounded-2xl bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
          </div>
        ) : props.listFilter === "draft" ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-14 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-[17px] font-semibold text-[#0A0F1F]">Aucun brouillon</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#8E8E93]">
              Les séances sont enregistrées dès leur création. Les brouillons coaching restent dans l’onglet
              Coaching.
            </p>
          </div>
        ) : props.listFilter === "enregistrees" ? (
          (props.savedSessions?.length ?? 0) === 0 ? (
            <div
              className="mt-16 flex flex-col items-center justify-center px-8 text-center"
            >
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F2F7]">
                <Bookmark className="h-7 w-7 text-[#8E8E93]" strokeWidth={2.2} />
              </div>
              <p className="text-[17px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]">
                Aucune séance enregistrée
              </p>
              <p className="mt-1.5 text-[14px] font-medium leading-snug text-[#8E8E93]">
                Enregistre des publications d&apos;autres coureurs pour les retrouver ici.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 mt-5 flex items-center justify-between">
                <h2 className="text-[20px] font-bold tracking-[-0.02em] text-[#0A0F1F]">
                  Séances enregistrées
                </h2>
                <span className="text-[13px] font-extrabold text-[#8E8E93]">
                  {props.savedSessions!.length}
                </span>
              </div>
              {props.savedSessions!.map((s) => {
                const d = new Date(s.scheduled_at);
                const day = format(d, "EEE", { locale: fr }).replace(/\.$/, "");
                const dayCap = day.charAt(0).toUpperCase() + day.slice(1);
                const dateLine = `${dayCap} · ${format(d, "HH:mm", { locale: fr })}`;
                const organizerName = s.organizer_display || s.organizer_username || "Organisateur";
                const initials = (organizerName.split(/\s+/).map((w) => w[0]).join("") || "?")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => props.onSavedSessionClick?.(s)}
                    className="mb-2.5 w-full rounded-2xl bg-white p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.05)] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl text-white shadow-sm",
                          getDiscoverSportTileClass(s.activity_type),
                        )}
                      >
                        {getActivityEmoji(s.activity_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15.5px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]">
                          {s.title}
                        </p>
                        <p className="truncate text-[13px] font-semibold text-[#8E8E93]">
                          {s.description || s.location_name || dateLine} · {dateLine}
                        </p>
                      </div>
                      <Bookmark
                        className="h-5 w-5 shrink-0 text-[#007AFF]"
                        strokeWidth={2.2}
                        fill={ACTION_BLUE}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-[#E5E5EA] pt-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#007AFF] text-[10px] font-black text-white">
                        {initials}
                      </div>
                      <span className="truncate text-[13px] font-semibold text-[#8E8E93]">
                        {organizerName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </>
          )
        ) : (
          <>
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <p className="text-[13px] font-medium text-[#8E8E93]">Cette semaine</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-[32px] font-extrabold leading-none text-[#0A0F1F]">
                  {props.weeklyKm.toFixed(1)}
                </p>
                <p className="text-[15px] font-medium text-[#8E8E93]">
                  km · {props.weeklySessionCount} séance{props.weeklySessionCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F2F2F7]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: ACTION_BLUE,
                  }}
                />
              </div>
              <p className="mt-1.5 text-[12px] text-[#8E8E93]">
                {props.weeklyGoalKm > 0
                  ? `${progressPct}% de ton objectif hebdo (${props.weeklyGoalKm} km)`
                  : "Fixe un objectif kilométrique hebdo dans ton profil pour suivre ta progression."}
              </p>
            </div>

            {props.onOpenCommentPicker && props.onOpenConfirmPicker ? (
              <div
                className="mt-3 overflow-hidden rounded-2xl bg-white"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                }}
              >
                <div className="grid grid-cols-2 divide-x divide-[#E5E5EA]">
                  <button
                    type="button"
                    onClick={props.onOpenCommentPicker}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 transition-colors active:bg-[#F8F8F8]"
                  >
                    <div
                      className="flex items-center justify-center rounded-xl text-white"
                      style={{
                        width: 38,
                        height: 38,
                        background: ACTION_BLUE,
                        boxShadow: `0 3px 10px ${ACTION_BLUE}40`,
                      }}
                      aria-hidden
                    >
                      <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2.4} />
                    </div>
                    <span
                      className="text-center text-[14px] font-extrabold tracking-tight text-[#0A0F1F]"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      Commenter une séance
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={props.onOpenConfirmPicker}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 transition-colors active:bg-[#F8F8F8]"
                  >
                    <div
                      className="flex items-center justify-center rounded-xl text-white"
                      style={{
                        width: 38,
                        height: 38,
                        background: "#34C759",
                        boxShadow: "0 3px 10px rgba(52,199,89,0.35)",
                      }}
                      aria-hidden
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </div>
                    <span
                      className="text-center text-[14px] font-extrabold tracking-tight text-[#0A0F1F]"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      Confirmer une séance
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {props.listFilter === "ok" ? (
              <>
                <h2 className="mb-3 mt-6 text-[20px] font-bold text-[#0A0F1F]">Confirmées</h2>
                {confirmedCombined.length === 0 ? (
                  <p className="pb-2 text-[15px] text-[#8E8E93]">Aucune séance dans cette vue.</p>
                ) : (
                  confirmedCombined.map((session) => {
                    const upcoming = sessionIsFromTodayOrLater(session.scheduled_at);
                    return (
                      <MaquetteSessionRow
                        key={session.id}
                        session={session}
                        dateLine={formatSessionDateLine(session, upcoming ? "upcoming" : "weekPast")}
                        showUpcomingDot={upcoming}
                        onClick={() => props.onSessionClick(session)}
                      />
                    );
                  })
                )}
              </>
            ) : props.listFilter === "venir" ? (
              <>
                <h2 className="mb-3 mt-6 text-[20px] font-bold text-[#0A0F1F]">À venir</h2>
                {props.upcomingRows.length === 0 ? (
                  <p className="pb-2 text-[15px] text-[#8E8E93]">Rien à venir pour le moment.</p>
                ) : (
                  props.upcomingRows.map((session) => (
                    <MaquetteSessionRow
                      key={session.id}
                      session={session}
                      dateLine={formatSessionDateLine(session, "upcoming")}
                      showUpcomingDot
                      onClick={() => props.onSessionClick(session)}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <h2 className="mb-3 mt-6 text-[20px] font-bold text-[#0A0F1F]">Terminées</h2>
                {props.terminatedRows.length === 0 ? (
                  <p className="pb-2 text-[15px] text-[#8E8E93]">Aucune séance terminée pour le moment.</p>
                ) : (
                  props.terminatedRows.map((session) => (
                    <MaquetteSessionRow
                      key={session.id}
                      session={session}
                      dateLine={formatSessionDateLine(session, "weekPast")}
                      showUpcomingDot={false}
                      onClick={() => props.onSessionClick(session)}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function participationConfirmed(
  session: Pick<MySessionsHomeRow, "organizer_id">,
  userId: string | undefined,
  row?: ParticipationInfo | null,
): boolean {
  if (!userId) return false;
  if (session.organizer_id === userId) return true;
  if (!row) return false;
  return (
    row.validation_status === "validated" ||
    row.confirmed_by_gps === true ||
    row.confirmed_by_creator === true
  );
}
