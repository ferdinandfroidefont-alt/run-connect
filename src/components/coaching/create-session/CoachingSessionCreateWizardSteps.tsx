import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Navigation,
  Search,
  Users,
} from "lucide-react";
import { COACHING_ACTION_BLUE } from "./CoachingCreateSessionSchema";

export type CoachPlanningSport = "running" | "cycling" | "swimming" | "strength";

export type WizardSportEntry = {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  color: string;
  draftSport: CoachPlanningSport;
};

const WIZARD_SPORTS_POPULAR: WizardSportEntry[] = [
  { id: "course", emoji: "🏃", label: "Course", subtitle: "Route · piste", color: "#007AFF", draftSport: "running" },
  { id: "trail", emoji: "⛰️", label: "Trail", subtitle: "Sentiers · dénivelé", color: "#AF52DE", draftSport: "running" },
  { id: "velo", emoji: "🚴", label: "Vélo", subtitle: "Route · endurance", color: "#FF3B30", draftSport: "cycling" },
  { id: "vtt", emoji: "🚵", label: "VTT", subtitle: "Chemins · tout-terrain", color: "#8E6E53", draftSport: "cycling" },
  { id: "bmx", emoji: "🚲", label: "BMX", subtitle: "Piste · park", color: "#FF9500", draftSport: "cycling" },
  { id: "gravel", emoji: "🚴", label: "Gravel", subtitle: "Chemins · gravier", color: "#FFCC00", draftSport: "cycling" },
  { id: "marche", emoji: "🚶", label: "Marche", subtitle: "Marche · trek", color: "#34C759", draftSport: "running" },
];

const WIZARD_SPORTS_OTHER: WizardSportEntry[] = [
  { id: "football", emoji: "⚽", label: "Football", subtitle: "Match · entraînement", color: "#34C759", draftSport: "running" },
  { id: "basket", emoji: "🏀", label: "Basketball", subtitle: "Terrain · match", color: "#FF9500", draftSport: "running" },
  { id: "volley", emoji: "🏐", label: "Volleyball", subtitle: "Indoor · beach", color: "#FFCC00", draftSport: "running" },
  { id: "badminton", emoji: "🏸", label: "Badminton", subtitle: "Simple · double", color: "#34C759", draftSport: "running" },
  { id: "tennis-table", emoji: "🏓", label: "Tennis de table", subtitle: "Loisir · compétition", color: "#FF6B7C", draftSport: "running" },
  { id: "tennis", emoji: "🎾", label: "Tennis", subtitle: "Simple · double", color: "#FF9500", draftSport: "running" },
  { id: "escalade", emoji: "🧗", label: "Escalade", subtitle: "Bloc · voie", color: "#8E8E93", draftSport: "strength" },
  { id: "petanque", emoji: "⚪", label: "Pétanque", subtitle: "Loisir · concours", color: "#C7C7CC", draftSport: "running" },
  { id: "rugby", emoji: "🏉", label: "Rugby", subtitle: "XV · VII", color: "#2D7A33", draftSport: "running" },
  { id: "fitness", emoji: "💪", label: "Fitness", subtitle: "Cardio · renfo", color: "#FF3B30", draftSport: "strength" },
  { id: "yoga", emoji: "🧘", label: "Yoga", subtitle: "Étirements · mobilité", color: "#FF3B30", draftSport: "running" },
  { id: "muscu", emoji: "🏋️", label: "Musculation", subtitle: "Force · hypertrophie", color: "#1C1C1E", draftSport: "strength" },
  { id: "crossfit", emoji: "🔥", label: "CrossFit", subtitle: "WOD · force", color: "#FF9500", draftSport: "strength" },
  { id: "boxe", emoji: "🥊", label: "Boxe", subtitle: "Technique · sparring", color: "#FF3B30", draftSport: "running" },
  { id: "arts-mart", emoji: "🥋", label: "Arts martiaux", subtitle: "Kata · combat", color: "#1C1C1E", draftSport: "running" },
  { id: "golf", emoji: "⛳", label: "Golf", subtitle: "Practice · parcours", color: "#34C759", draftSport: "running" },
  { id: "ski", emoji: "⛷️", label: "Ski", subtitle: "Alpin · rando", color: "#AF52DE", draftSport: "running" },
  { id: "snowboard", emoji: "🏂", label: "Snowboard", subtitle: "Alpin · rando", color: "#AF52DE", draftSport: "running" },
  { id: "rando", emoji: "🥾", label: "Randonnée", subtitle: "Marche · trek", color: "#34C759", draftSport: "running" },
  { id: "natation", emoji: "🏊", label: "Natation", subtitle: "Piscine · eau libre", color: "#5AC8FA", draftSport: "swimming" },
  { id: "kayak", emoji: "🛶", label: "Kayak", subtitle: "Rivière · mer", color: "#5AC8FA", draftSport: "swimming" },
  { id: "surf", emoji: "🏄", label: "Surf", subtitle: "Vagues · technique", color: "#5AC8FA", draftSport: "swimming" },
];

export const ALL_WIZARD_SPORTS = [...WIZARD_SPORTS_POPULAR, ...WIZARD_SPORTS_OTHER];

export function defaultWizardSportIdForDraftSport(sport: CoachPlanningSport): string {
  if (sport === "cycling") return "velo";
  if (sport === "swimming") return "natation";
  if (sport === "strength") return "fitness";
  return "course";
}

export function buildCoachSessionHeadline(wizardSportId: string, locationLine: string): string {
  const meta = ALL_WIZARD_SPORTS.find((s) => s.id === wizardSportId);
  const loc = locationLine.split(",")[0]?.trim() || "Lieu à préciser";
  return meta ? `${meta.label} à ${loc}` : `Séance à ${loc}`;
}

function chunkWeeks<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 7) {
    rows.push(items.slice(i, i + 7));
  }
  return rows;
}

/** Maquette `NewSessionWizard` · étape 1 */
export function CoachingWizardStep1Location({
  location,
  locationConfirmed,
  onLocationChange,
  onConfirmToggle,
  onUseApproxLocation,
}: {
  location: string;
  locationConfirmed: boolean;
  onLocationChange: (value: string) => void;
  onConfirmToggle: () => void;
  onUseApproxLocation: () => void;
}) {
  return (
    <>
      <h1
        className="mt-0 font-black tracking-[-0.04em] text-[#0A0F1F]"
        style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}
      >
        Où ça se passe ?
      </h1>
      <p className="mt-1.5 text-base leading-snug text-[#8E8E93]">
        Cherche un parc, une rue, ou pose un point sur la carte.
      </p>

      <div
        className="mt-5 flex items-center gap-2 rounded-full bg-white px-[18px] py-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      >
        <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.4} />
        <input
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Adresse, parc, lieu..."
          className="min-w-0 flex-1 truncate bg-transparent text-[16px] font-semibold text-[#0A0F1F] outline-none placeholder:text-[#C7C7CC]"
        />
      </div>

      <div className="mt-3 flex gap-2.5">
        <button
          type="button"
          onClick={onUseApproxLocation}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-3 transition-transform active:scale-[0.97]"
          style={{ background: COACHING_ACTION_BLUE, padding: "12px" }}
        >
          <Navigation className="h-4 w-4 text-white" strokeWidth={2.6} />
          <span className="text-[15px] font-bold text-white">Ma position</span>
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-3 transition-transform active:scale-[0.97]"
          style={{ border: `1.5px solid ${COACHING_ACTION_BLUE}`, padding: "12px" }}
        >
          <Compass className="h-4 w-4" color={COACHING_ACTION_BLUE} strokeWidth={2.6} />
          <span className="text-[15px] font-bold" style={{ color: COACHING_ACTION_BLUE }}>
            Centrer la carte
          </span>
        </button>
      </div>

      {location ? (
        <div
          className="mt-4 flex items-center gap-3 p-3"
          style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
            style={{ background: "#E5F0FF" }}
          >
            <MapPin className="h-5 w-5" color={COACHING_ACTION_BLUE} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="m-0 text-[11px] font-extrabold tracking-[0.1em]"
              style={{ color: COACHING_ACTION_BLUE }}
            >
              LIEU SÉLECTIONNÉ
            </p>
            <p
              className="mb-0 mt-0.5 truncate text-[15px] font-bold text-[#0A0F1F]"
              title={location}
            >
              {location}
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirmToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ background: locationConfirmed ? COACHING_ACTION_BLUE : "#E5E5EA" }}
          >
            <Check className="h-4 w-4" color={locationConfirmed ? "white" : "#8E8E93"} strokeWidth={3} />
          </button>
        </div>
      ) : null}
    </>
  );
}

function WizardSportList({
  sports,
  selectedId,
  onSelect,
}: {
  sports: WizardSportEntry[];
  selectedId: string;
  onSelect: (entry: WizardSportEntry) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.06)]"
    >
      {sports.map((sp, i) => {
        const sel = selectedId === sp.id;
        return (
          <div key={sp.id}>
            {i > 0 ? <div className="ml-[68px] h-px bg-[#E5E5EA]" /> : null}
            <button
              type="button"
              onClick={() => onSelect(sp)}
              className="flex w-full items-center gap-3 px-4 py-3 active:bg-[#F2F2F7]"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] text-[22px]"
                style={{ background: sp.color }}
              >
                {sp.emoji}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="mb-0 mt-0 text-[18px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">{sp.label}</p>
                <p className="mb-0 mt-0.5 text-sm text-[#8E8E93]">{sp.subtitle}</p>
              </div>
              {sel ? <Check className="h-5 w-5 shrink-0" color={COACHING_ACTION_BLUE} strokeWidth={3} /> : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Maquette · étape 2 */
export function CoachingWizardStep2Sport({
  wizardSportId,
  onSelectSport,
}: {
  wizardSportId: string;
  onSelectSport: (entry: WizardSportEntry) => void;
}) {
  const [search, setSearch] = useState("");

  const { popMatch, otherMatch } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (sp: WizardSportEntry) =>
      !q || sp.label.toLowerCase().includes(q) || sp.subtitle.toLowerCase().includes(q);
    return {
      popMatch: WIZARD_SPORTS_POPULAR.filter(matches),
      otherMatch: WIZARD_SPORTS_OTHER.filter(matches),
    };
  }, [search]);

  return (
    <>
      <h1 className="mt-0 font-black tracking-[-0.04em] text-[#0A0F1F]" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
        Quel sport ?
      </h1>
      <p className="mt-1.5 text-base text-[#8E8E93]">On adapte les blocs et l&apos;allure en conséquence.</p>

      <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-[18px] py-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <Search className="h-4 w-4 shrink-0 text-[#8E8E93]" strokeWidth={2.4} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un sport..."
          className="min-w-0 flex-1 bg-transparent text-base font-medium text-[#0A0F1F] outline-none placeholder:text-[#C7C7CC]"
        />
      </div>

      {popMatch.length > 0 ? (
        <>
          <p
            className="mb-2.5 mt-[22px] text-[13px] font-extrabold tracking-[0.12em] text-[#8E8E93]"
          >
            POPULAIRES
          </p>
          <WizardSportList sports={popMatch} selectedId={wizardSportId} onSelect={onSelectSport} />
        </>
      ) : null}

      {otherMatch.length > 0 ? (
        <>
          <p
            className="mb-2.5 mt-[22px] text-[13px] font-extrabold tracking-[0.12em] text-[#8E8E93]"
          >
            AUTRES SPORTS
          </p>
          <WizardSportList sports={otherMatch} selectedId={wizardSportId} onSelect={onSelectSport} />
        </>
      ) : null}

      {popMatch.length === 0 && otherMatch.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-[15px] text-[#8E8E93]">Aucun sport trouvé</p>
        </div>
      ) : null}
    </>
  );
}

const CAL_DOW = ["L", "M", "M", "J", "V", "S", "D"];
const QUICK_TIMES = ["07:00", "12:00", "18:30", "20:00"];

/** Maquette · étape 3 */
export function CoachingWizardStep3DateTime({
  calendarMonth,
  onPrevMonth,
  onNextMonth,
  assignedDateIso,
  onSelectCalendarDay,
  timeHHmm,
  onSelectQuickTime,
  onTimeRowClick,
}: {
  calendarMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  assignedDateIso: string;
  onSelectCalendarDay: (day: Date) => void;
  timeHHmm: string;
  onSelectQuickTime: (t: string) => void;
  onTimeRowClick: () => void;
}) {
  const monthLabel = format(calendarMonth, "LLLL yyyy", { locale: fr });
  const capitalMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const weeks = chunkWeeks(gridDays);
  const selected = new Date(assignedDateIso);

  const [hh, mm] = timeHHmm.split(":").map(Number);
  const endH = (hh + 1) % 24;
  const endStr = `${String(endH).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

  return (
    <>
      <div
        className="p-4"
        style={{
          background: "white",
          borderRadius: 18,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#0A0F1F]">{capitalMonth}</span>
          <div className="flex items-center gap-1">
            <button type="button" className="p-1" onClick={onPrevMonth} aria-label="Mois précédent">
              <ChevronLeft className="h-5 w-5" color={COACHING_ACTION_BLUE} strokeWidth={2.6} />
            </button>
            <button type="button" className="p-1" onClick={onNextMonth} aria-label="Mois suivant">
              <ChevronRight className="h-5 w-5" color={COACHING_ACTION_BLUE} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {CAL_DOW.map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-xs font-semibold text-[#8E8E93]">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((row) => (
          <div key={row[0].toISOString()} className="grid grid-cols-7 py-1">
            {row.map((day) => {
              const inMonth = isSameMonth(day, calendarMonth);
              const sel = isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => inMonth && onSelectCalendarDay(day)}
                  className="flex items-center justify-center py-1.5 disabled:cursor-default"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center text-[17px] font-bold"
                    style={{
                      borderRadius: "50%",
                      background: sel ? COACHING_ACTION_BLUE : "transparent",
                      color: sel ? "white" : !inMonth ? "#C7C7CC" : "#0A0F1F",
                    }}
                  >
                    {format(day, "d")}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p
        className="mb-2.5 mt-[22px] text-[13px] font-extrabold tracking-[0.1em] text-[#8E8E93]"
      >
        HEURE DE DÉPART
      </p>
      <button
        type="button"
        onClick={onTimeRowClick}
        className="flex w-full items-center justify-between p-4 text-left active:bg-[#F8F8F8]"
        style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <span className="text-lg font-bold text-[#0A0F1F]">Heure</span>
        <div
          className="rounded-[9px] px-3.5 py-2 text-[17px] font-bold tabular-nums text-[#0A0F1F]"
          style={{ background: "#F2F2F7" }}
        >
          {timeHHmm}
        </div>
      </button>

      <p className="mt-2.5 text-[13px] leading-snug text-[#8E8E93]">
        Fin estimée à {endStr} (estimation provisoire) — basé sur tes records.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_TIMES.map((t) => {
          const sel = timeHHmm === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelectQuickTime(t)}
              className="transition-transform active:scale-[0.96]"
              style={{
                background: sel ? COACHING_ACTION_BLUE : "white",
                color: sel ? "white" : "#0A0F1F",
                borderRadius: 9999,
                padding: "10px 20px",
                fontSize: 16,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                boxShadow: sel ? "0 2px 8px rgba(0,122,255,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
                border: "none",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Maquette · étape 5 (aperçu / options — CTA final géré par le parent) */
export function CoachingWizardStep5Final({
  wizardSportId,
  locationLine,
  assignedDateIso,
  timeHHmm,
}: {
  wizardSportId: string;
  locationLine: string;
  assignedDateIso: string;
  timeHHmm: string;
}) {
  const sportData = ALL_WIZARD_SPORTS.find((s) => s.id === wizardSportId);
  const dayName = format(new Date(assignedDateIso), "EEEE", { locale: fr });

  const [visibility, setVisibility] = useState<"amis" | "club" | "public">("amis");

  return (
    <>
      <h1 className="mt-0 font-black tracking-[-0.04em] text-[#0A0F1F]" style={{ fontSize: 36, lineHeight: 1.05, margin: 0 }}>
        Tout est prêt.
      </h1>
      <p className="mt-1.5 text-base text-[#8E8E93]">Booste pour multiplier ta visibilité.</p>

      <div
        className="relative mt-5 overflow-hidden"
        style={{
          height: 220,
          borderRadius: 18,
          background: "linear-gradient(135deg, #6B8E4E 0%, #8AA56B 30%, #B5C495 60%, #D4D8A8 100%)",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: "translate(-50%, -100%)" }}
        >
          <div
            className="flex items-center justify-center text-[30px]"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: sportData?.color || COACHING_ACTION_BLUE,
              border: "3px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            {sportData?.emoji || "🏃"}
          </div>
          <div
            className="-mt-0.5 mx-auto"
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: `14px solid ${sportData?.color || COACHING_ACTION_BLUE}`,
            }}
          />
        </div>
      </div>

      <div
        className="mt-4 p-4"
        style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <p
          className="m-0 text-xs font-extrabold tracking-[0.12em]"
          style={{ color: COACHING_ACTION_BLUE }}
        >
          {(sportData?.label ?? "Séance").toUpperCase()}
        </p>
        <h2
          className="mb-0 mt-1 text-[26px] font-black tracking-[-0.02em] text-[#0A0F1F]"
        >
          {dayName} · {timeHHmm}
        </h2>
        <p className="mb-0 mt-1.5 text-[15px] leading-snug text-[#8E8E93]">{locationLine} · Club</p>
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center gap-3 p-4 active:bg-[#F8F8F8]"
        style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#5AC8FA]">
          <Camera className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="mb-0 text-[17px] font-bold text-[#0A0F1F]">Ajouter une photo</p>
          <p className="mb-0 mt-0.5 text-[13px] text-[#8E8E93]">Optionnel · JPG, PNG ou WebP, max 5 Mo</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
      </button>

      <button
        type="button"
        className="mt-3 flex w-full items-center gap-3 p-4 active:opacity-90"
        style={{
          background: "#F2F2F7",
          borderRadius: 16,
        }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#AF52DE]">
          <MapPin className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="mb-0 text-[17px] font-bold text-[#0A0F1F]">Choisir un itinéraire</p>
          <p className="mb-0 mt-0.5 text-[13px] text-[#8E8E93]">Auto-remplir distance et D+</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" />
      </button>

      <div
        className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_0.5px_rgba(0,0,0,0.06)]"
      >
        <button
          type="button"
          onClick={() => setVisibility("amis")}
          className="flex w-full items-center gap-3 p-4 active:bg-[#F8F8F8]"
          style={{ background: visibility === "amis" ? "#E5F0FF" : "transparent" }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#34C759]">
            <Users className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mb-0 text-[17px] font-bold text-[#0A0F1F]">Amis uniquement</p>
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                style={{ background: "#D4F4DC", color: "#1F8F3B" }}
              >
                Recommandé
              </span>
            </div>
            <p className="mb-0 mt-0.5 text-[13px] text-[#8E8E93]">Réservé au club sur RunConnect</p>
          </div>
          {visibility === "amis" ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={3} /> : null}
        </button>

        <div className="ml-[68px] h-px bg-[#E5E5EA]" />

        <button
          type="button"
          onClick={() => setVisibility("club")}
          className="flex w-full items-center gap-3 p-4 active:bg-[#F8F8F8]"
          style={{ background: visibility === "club" ? "#E5F0FF" : "transparent" }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#007AFF]">
            <Users className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="mb-0 text-[17px] font-bold text-[#0A0F1F]">Tout le club</p>
            <p className="mb-0 mt-0.5 text-[13px] text-[#8E8E93]">Visible par les membres du club</p>
          </div>
          {visibility === "club" ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={3} /> : null}
        </button>

        <div className="ml-[68px] h-px bg-[#E5E5EA]" />

        <button
          type="button"
          onClick={() => setVisibility("public")}
          className="flex w-full items-center gap-3 p-4 active:bg-[#F8F8F8]"
          style={{ background: visibility === "public" ? "#E5F0FF" : "transparent" }}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#8E8E93]">
            <Users className="h-5 w-5 text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="mb-0 text-[17px] font-bold text-[#0A0F1F]">Public</p>
            <p className="mb-0 mt-0.5 text-[13px] text-[#8E8E93]">Apparaît sur la carte découverte</p>
          </div>
          {visibility === "public" ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={3} /> : null}
        </button>
      </div>
    </>
  );
}
