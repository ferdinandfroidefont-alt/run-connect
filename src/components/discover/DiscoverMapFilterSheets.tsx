import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ACTIVITY_TYPES } from "@/hooks/useDiscoverFeed";
import { ACTION_BLUE } from "@/components/discover/DiscoverChromeShell";
import { DiscoverMaquetteSheet } from "@/components/discover/DiscoverMaquetteSheet";
import {
  MaquetteSheetCard,
  MaquetteFilterRow,
  MaquetteFilterRowDivider,
} from "@/components/discover/DiscoverMaquetteFilterParts";
import {
  getActivityEmoji,
  getDiscoverSportTileHex,
} from "@/lib/discoverSessionVisual";
import {
  MAQUETTE_CLUBS,
  MAQUETTE_HORAIRES,
  MAQUETTE_NIVEAUX,
  MAQUETTE_TYPES_SEANCE,
  MAQUETTE_VISIBILITES,
  type MaquetteUiClubId,
} from "@/lib/discoverMaquetteUiData";

export type DiscoverFilterPanel =
  | null
  | "main"
  | "sport"
  | "rayon"
  | "type"
  | "date"
  | "niveau"
  | "horaire"
  | "club"
  | "visibilite";

type DiscoverMapFilterSheetsProps = {
  panel: DiscoverFilterPanel;
  onSetPanel: (p: DiscoverFilterPanel) => void;
  maxDistance: number;
  setMaxDistance: (km: number) => void;
  selectedActivities: string[];
  toggleActivity: (id: string) => void;
  toggleAllActivities: () => void;
};

function sportSummary(selected: string[]): { emoji: string; color: string; label: string } {
  if (selected.length === 0)
    return { emoji: "🏃", color: "#8E8E93", label: "Aucune discipline" };
  if (selected.length === ACTIVITY_TYPES.length)
    return { emoji: "✨", color: "#8E8E93", label: "Tous sports" };
  if (selected.length === 1) {
    const v = selected[0];
    return {
      emoji: getActivityEmoji(v),
      color: getDiscoverSportTileHex(v),
      label: ACTIVITY_TYPES.find((a) => a.value === v)?.label ?? v,
    };
  }
  return {
    emoji: "🏃",
    color: ACTION_BLUE,
    label: `${selected.length} disciplines`,
  };
}

type UiMaquetteState = {
  typeId: (typeof MAQUETTE_TYPES_SEANCE)[number]["id"];
  dateLabel: string;
  niveauId: (typeof MAQUETTE_NIVEAUX)[number]["id"];
  horaireId: (typeof MAQUETTE_HORAIRES)[number]["id"];
  visibiliteId: (typeof MAQUETTE_VISIBILITES)[number]["id"];
  clubIds: MaquetteUiClubId[];
};

const initialUi = (): UiMaquetteState => ({
  typeId: "all",
  dateLabel: format(new Date(), "EEE. d MMM", { locale: fr }),
  niveauId: "all",
  horaireId: "all",
  visibiliteId: "toutes",
  clubIds: ["all"],
});

function DiscoverMaquetteDatePicker({
  selectedDay,
  onSelect,
}: {
  selectedDay: Date;
  onSelect: (d: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDay));
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
  const calendarEnd = new Date(monthEnd);
  const endDow = monthEnd.getDay();
  if (endDow < 6) calendarEnd.setDate(calendarEnd.getDate() + (6 - endDow));

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"];

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7]"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-5 w-5" color={ACTION_BLUE} strokeWidth={2.4} />
        </button>
        <p className="text-[17px] font-bold capitalize text-[#0A0F1F]">
          {format(viewMonth, "MMMM yyyy", { locale: fr })}
        </p>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7]"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-5 w-5" color={ACTION_BLUE} strokeWidth={2.4} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-center text-[13px] font-medium text-[#8E8E93]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const muted = !isSameMonth(day, viewMonth);
          const isSel = isSameDay(day, selectedDay);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.getTime()}
              type="button"
              className="flex items-center justify-center py-2"
              onClick={() => !muted && onSelect(day)}
            >
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[16px] font-semibold"
                style={{
                  background: isSel ? ACTION_BLUE : "transparent",
                  color: isSel ? "white" : muted ? "#C7C7CC" : isToday ? "#0A0F1F" : ACTION_BLUE,
                }}
              >
                {format(day, "d")}
                {isToday ? (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                    style={{ background: "#34C759" }}
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DiscoverMapFilterSheets({
  panel,
  onSetPanel,
  maxDistance,
  setMaxDistance,
  selectedActivities,
  toggleActivity,
  toggleAllActivities,
}: DiscoverMapFilterSheetsProps) {
  const [ui, setUi] = useState(initialUi);
  const [pickedDate, setPickedDate] = useState(() => new Date());

  const typeRow = useMemo(
    () => MAQUETTE_TYPES_SEANCE.find((t) => t.id === ui.typeId) ?? MAQUETTE_TYPES_SEANCE[0],
    [ui.typeId],
  );
  const niveauRow = useMemo(
    () => MAQUETTE_NIVEAUX.find((n) => n.id === ui.niveauId) ?? MAQUETTE_NIVEAUX[0],
    [ui.niveauId],
  );
  const horaireRow = useMemo(
    () => MAQUETTE_HORAIRES.find((h) => h.id === ui.horaireId) ?? MAQUETTE_HORAIRES[0],
    [ui.horaireId],
  );
  const visRow = useMemo(
    () =>
      MAQUETTE_VISIBILITES.find((v) => v.id === ui.visibiliteId) ?? MAQUETTE_VISIBILITES[0],
    [ui.visibiliteId],
  );

  const sport = sportSummary(selectedActivities);

  const nbClubs =
    ui.clubIds.includes("all") || ui.clubIds.length === 0 ? 0 : ui.clubIds.length;

  const close = () => onSetPanel(null);

  const setClubIds = (updater: (prev: MaquetteUiClubId[]) => MaquetteUiClubId[]) => {
    setUi((s) => ({ ...s, clubIds: updater(s.clubIds) }));
  };

  return (
    <>
      <DiscoverMaquetteSheet
        open={panel === "main"}
        onClose={close}
        title="Filtres"
        subtitle="Affine ta recherche de séances"
        titleId="discover-mqt-filters-main-title"
        variant="tall"
      >
        <MaquetteSheetCard>
          <MaquetteFilterRow
            emoji={sport.emoji}
            color={sport.color}
            title="Sport"
            subtitle={sport.label}
            chevron
            onClick={() => onSetPanel("sport")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="📍"
            color="#34C759"
            title="Rayon"
            subtitle={`${maxDistance} km`}
            chevron
            onClick={() => onSetPanel("rayon")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="🏆"
            color="#FF9500"
            title="Type de séance"
            subtitle={typeRow.label}
            chevron
            onClick={() => onSetPanel("type")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="📅"
            color={ACTION_BLUE}
            title="Date"
            subtitle={ui.dateLabel}
            chevron
            onClick={() => onSetPanel("date")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="📊"
            color={niveauRow.color}
            title="Niveau"
            subtitle={
              ui.niveauId === "all" && "sub" in niveauRow && niveauRow.sub
                ? niveauRow.sub
                : niveauRow.label
            }
            chevron
            onClick={() => onSetPanel("niveau")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="⏰"
            color={horaireRow.color}
            title="Créneau"
            subtitle={horaireRow.sub ?? horaireRow.label}
            chevron
            onClick={() => onSetPanel("horaire")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="🏟️"
            color={ACTION_BLUE}
            title="Club"
            subtitle={nbClubs === 0 ? "Tous les clubs" : `${nbClubs} sélectionné(s)`}
            chevron
            onClick={() => onSetPanel("club")}
          />
          <MaquetteFilterRowDivider />
          <MaquetteFilterRow
            emoji="👥"
            color={visRow.color}
            title="Visibilité"
            subtitle={visRow.sub ?? visRow.label}
            chevron
            onClick={() => onSetPanel("visibilite")}
          />
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "sport"}
        onClose={() => onSetPanel("main")}
        title="Sport"
        subtitle="Affinez par discipline"
        titleId="discover-mqt-filters-sport-title"
        variant="tall"
      >
        <MaquetteSheetCard>
          <MaquetteFilterRow
            emoji="✨"
            color="#8E8E93"
            title="Tous sports"
            subtitle="Toutes disciplines"
            selected={selectedActivities.length === ACTIVITY_TYPES.length}
            onClick={() => toggleAllActivities()}
          />
          {ACTIVITY_TYPES.map((a) => (
            <div key={a.value}>
              <MaquetteFilterRowDivider />
              <MaquetteFilterRow
                emoji={getActivityEmoji(a.value)}
                color={getDiscoverSportTileHex(a.value)}
                title={a.label}
                selected={selectedActivities.includes(a.value)}
                onClick={() => toggleActivity(a.value)}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "rayon"}
        onClose={() => onSetPanel("main")}
        title="Rayon"
        subtitle="Distance maximale autour de ta position"
        titleId="discover-mqt-filters-rayon-title"
      >
        <MaquetteSheetCard>
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <span className="text-[17px] font-bold text-[#0A0F1F]">Distance max</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value, 10) || 1)}
                className="h-9 w-16 rounded-[8px] border border-[#E5E5EA] bg-white text-right text-[15px] text-[#0A0F1F]"
                min={1}
                max={100}
              />
              <span className="text-[15px] text-[#8E8E93]">km</span>
            </div>
          </div>
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "type"}
        onClose={() => onSetPanel("main")}
        title="Type de séance"
        subtitle="Footing, fractionné, etc."
        titleId="discover-mqt-filters-type-title"
      >
        <MaquetteSheetCard>
          {MAQUETTE_TYPES_SEANCE.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={t.emoji}
                color={t.color}
                title={t.label}
                selected={ui.typeId === t.id}
                onClick={() => {
                  setUi((s) => ({ ...s, typeId: t.id }));
                  onSetPanel("main");
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "date"}
        onClose={() => onSetPanel("main")}
        title="Date"
        subtitle="Jour des séances sur la carte"
        titleId="discover-mqt-filters-date-title"
      >
        <DiscoverMaquetteDatePicker
          selectedDay={pickedDate}
          onSelect={(d) => {
            setPickedDate(d);
            setUi((s) => ({
              ...s,
              dateLabel: format(d, "EEE. d MMM", { locale: fr }),
            }));
            onSetPanel("main");
          }}
        />
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "niveau"}
        onClose={() => onSetPanel("main")}
        title="Niveau"
        subtitle="Difficulté minimale (1 à 6)"
        titleId="discover-mqt-filters-niveau-title"
      >
        <MaquetteSheetCard>
          {MAQUETTE_NIVEAUX.map((n, i) => (
            <div key={n.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={n.emoji}
                color={n.color}
                title={n.label}
                subtitle={"sub" in n ? n.sub : undefined}
                selected={ui.niveauId === n.id}
                onClick={() => {
                  setUi((s) => ({ ...s, niveauId: n.id }));
                  onSetPanel("main");
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "horaire"}
        onClose={() => onSetPanel("main")}
        title="Créneau"
        subtitle="Plage horaire sur la journée"
        titleId="discover-mqt-filters-horaire-title"
      >
        <MaquetteSheetCard>
          {MAQUETTE_HORAIRES.map((h, i) => (
            <div key={h.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={h.emoji}
                color={h.color}
                title={h.label}
                subtitle={h.sub}
                selected={ui.horaireId === h.id}
                onClick={() => {
                  setUi((s) => ({ ...s, horaireId: h.id }));
                  onSetPanel("main");
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "club"}
        onClose={() => onSetPanel("main")}
        title="Club"
        subtitle="Filtrer par une ou plusieurs équipes"
        titleId="discover-mqt-filters-club-title"
        footer={
          <button
            type="button"
            onClick={() => onSetPanel("main")}
            className="w-full rounded-full py-3.5 text-[17px] font-bold text-white"
            style={{ background: ACTION_BLUE }}
          >
            Terminé
          </button>
        }
      >
        <MaquetteSheetCard>
          {MAQUETTE_CLUBS.map((c, i) => (
            <div key={c.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={c.emoji}
                color={c.color}
                title={c.label}
                subtitle={"sub" in c ? c.sub : undefined}
                badge={"badge" in c ? c.badge : undefined}
                selected={
                  c.id === "all"
                    ? ui.clubIds.includes("all")
                    : !ui.clubIds.includes("all") && ui.clubIds.includes(c.id)
                }
                onClick={() => {
                  if (c.id === "all") setClubIds(() => ["all"]);
                  else {
                    setClubIds((prev) => {
                      const without = prev.filter((x) => x !== "all");
                      if (without.includes(c.id)) {
                        const next = without.filter((x) => x !== c.id);
                        return next.length === 0 ? ["all"] : next;
                      }
                      return [...without, c.id];
                    });
                  }
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>

      <DiscoverMaquetteSheet
        open={panel === "visibilite"}
        onClose={() => onSetPanel("main")}
        title="Visibilité"
        subtitle="Carte complète ou focus sur tes amis"
        titleId="discover-mqt-filters-vis-title"
      >
        <MaquetteSheetCard>
          {MAQUETTE_VISIBILITES.map((v, i) => (
            <div key={v.id}>
              {i > 0 && <MaquetteFilterRowDivider />}
              <MaquetteFilterRow
                emoji={v.emoji}
                color={v.color}
                title={v.label}
                subtitle={v.sub}
                selected={ui.visibiliteId === v.id}
                onClick={() => {
                  setUi((s) => ({ ...s, visibiliteId: v.id }));
                  onSetPanel("main");
                }}
              />
            </div>
          ))}
        </MaquetteSheetCard>
      </DiscoverMaquetteSheet>
    </>
  );
}
