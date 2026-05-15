import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { getActivityEmoji, getDiscoverSportTileClass } from "@/lib/discoverSessionVisual";
import { cn } from "@/lib/utils";

const ACTION_BLUE = "#007AFF";
const BG = "#F2F2F7";
const BORDER = "#E5E5EA";

export type MySessionsSessionPickerMode = "comment" | "confirm";

export type MySessionsPickerSessionRow = {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  organizer_id?: string;
  current_participants?: number | null;
  pace_general?: string | null;
  pace_unit?: string | null;
  distance_km?: number | null;
};

function formatSubtitle(session: MySessionsPickerSessionRow): string {
  const d = new Date(session.scheduled_at);
  const t = (session.activity_type ?? "").toLowerCase();
  const isBike =
    t.includes("velo") || t.includes("vtt") || t.includes("bike") || t.includes("cycl") || t.includes("gravel");

  const timeStr = format(d, "HH:mm", { locale: fr });
  const isPast = d.getTime() < Date.now();

  if (!isPast) {
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
    return `${dayLabel} · ${dist.replace(".", ",")} km`;
  }
  return `${dayLabel} · ${timeStr}`;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="m-0 pb-1.5 pl-7 pt-5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#8E8E93]"
      style={{ marginBottom: 2 }}
    >
      {label}
    </p>
  );
}

function FormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl bg-white"
      style={{ boxShadow: "0 0.5px 0 rgba(0,0,0,0.05)" }}
    >
      {children}
    </div>
  );
}

/** Sélection d'une séance — aligné maquette RunConnect (17).jsx SessionPickerPage */
export function MySessionsSessionPicker(props: {
  mode: MySessionsSessionPickerMode;
  sessions: MySessionsPickerSessionRow[];
  viewerUserId?: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  onPick: (session: MySessionsPickerSessionRow) => void;
}) {
  const { mode, sessions, viewerUserId, title, subtitle, onBack, onPick } = props;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: BG }}>
      <div
        className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]"
        style={{ background: "white", borderBottom: `1px solid ${BORDER}` }}
      >
        <button type="button" onClick={onBack} className="flex shrink-0 items-center active:opacity-70">
          <ChevronLeft className="h-6 w-6" color={ACTION_BLUE} strokeWidth={2.6} />
          <span
            className="text-[17px] font-medium tracking-tight"
            style={{ color: ACTION_BLUE, letterSpacing: "-0.01em" }}
          >
            Séances
          </span>
        </button>
        <h1
          className="min-w-0 flex-1 truncate px-2 text-center text-[17px] font-extrabold tracking-tight text-[#0A0F1F]"
          style={{ letterSpacing: "-0.01em", margin: 0 }}
        >
          {title}
        </h1>
        <div className="shrink-0" style={{ width: 80 }} aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <p
          className="m-0 px-5 pb-2 pt-3.5 text-[13.5px] font-medium leading-snug tracking-tight text-[#8E8E93]"
          style={{ letterSpacing: "-0.01em" }}
        >
          {subtitle}
        </p>

        <SectionHeader label="Mes séances récentes" />

        {sessions.length === 0 ? (
          <div className="mx-4 rounded-2xl bg-white px-4 py-10 text-center shadow-[0_0.5px_0_rgba(0,0,0,0.05)]">
            <p className="text-[15px] font-semibold text-[#0A0F1F]">
              {mode === "comment" ? "Aucune séance passée" : "Aucune séance éligible"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8E8E93]">
              {mode === "comment"
                ? "Les séances terminées apparaîtront ici pour discussion."
                : "Les séances des dernières 24 h (créées ou rejointes) sont disponibles pour confirmer ta présence."}
            </p>
          </div>
        ) : (
          <FormCard>
            {sessions.map((s, i) => {
              const isCreator = Boolean(viewerUserId && s.organizer_id === viewerUserId);
              const count = s.current_participants ?? 0;
              return (
                <div key={s.id}>
                  {i > 0 ? <div className="h-px bg-[#E5E5EA]" style={{ marginLeft: 70 }} /> : null}
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[#F8F8F8]"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl leading-none text-white shadow-sm",
                        getDiscoverSportTileClass(s.activity_type),
                      )}
                      aria-hidden
                    >
                      {getActivityEmoji(s.activity_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[15.5px] font-extrabold tracking-tight text-[#0A0F1F]"
                        style={{ letterSpacing: "-0.02em", margin: 0 }}
                      >
                        {s.title}
                      </p>
                      <p
                        className="truncate text-[13px] font-medium text-[#8E8E93]"
                        style={{ margin: 0, marginTop: 1 }}
                      >
                        {formatSubtitle(s)}
                      </p>
                      {mode === "confirm" && isCreator ? (
                        <div
                          className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider"
                          style={{
                            background: `${ACTION_BLUE}1A`,
                            color: ACTION_BLUE,
                          }}
                        >
                          Créateur · {count} pers.
                        </div>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#C7C7CC]" aria-hidden />
                  </button>
                </div>
              );
            })}
          </FormCard>
        )}
      </div>
    </div>
  );
}
