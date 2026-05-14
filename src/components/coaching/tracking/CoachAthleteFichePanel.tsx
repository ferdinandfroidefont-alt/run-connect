import { MessageCircle, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { isSameDay } from "date-fns";

const ACTION_BLUE = "#007AFF";
const TRACKING_BG = "#F2F2F7";

const ZONE_CHART_COLOR: Record<number, string> = {
  1: "#8E8E93",
  2: "#007AFF",
  3: "#34C759",
  4: "#FFCC00",
  5: "#FF9500",
  6: "#FF3B30",
};

const ZONE_LABEL_FR: Record<number, string> = {
  1: "Récupération",
  2: "Endurance",
  3: "Endurance active",
  4: "Tempo / seuil",
  5: "Seuil anaérobie",
  6: "VMA",
};

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

function zoneLabelToNum(zone: string): number {
  const m = /^z?(\d)$/i.exec(zone.trim());
  return m ? Math.max(1, Math.min(6, parseInt(m[1], 10))) : 1;
}

export type WeekBarChartDay = {
  dateKey: string;
  dayOfMonth: number;
  dayLetter: string;
  km: number;
  segments: { z: number; pct: number }[];
  hasSession: boolean;
};

export type CoachAthleteSessionCard = {
  dateKey: string;
  dayLabel: string;
  title: string;
  km: number;
  status: "done" | "missed" | "pending" | "none";
  segments: { z: number; pct: number }[];
};

export type CoachAthleteFicheZoneRow = {
  zone: string;
  minPace: string;
  maxPace: string;
};

export type CoachAthleteFichePanelProps = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  subtitle: string;
  onMessage: () => void;
  onViewProfile: () => void;
  onNudgeAthlete?: () => void;
  nudgeLoading?: boolean;
  nudgeDisabled?: boolean;
  weekLabel: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  weekBarDays: WeekBarChartDay[];
  selectedWeekListDayKey: string | null;
  onToggleWeekChartDay: (dateKey: string) => void;
  weekSessionCards: CoachAthleteSessionCard[];
  onSessionCardNavigate: (dateKey: string) => void;
  onOpenSessionDetail: (dateKey: string) => void;
  zones: CoachAthleteFicheZoneRow[];
  recordsFooterLine?: string;
  onManageRecords: () => void;
  onSendSession: () => void;
};

function SessionMiniBar({ segments, barHeight }: { segments: { z: number; pct: number }[]; barHeight: number }) {
  if (!segments.length) return null;
  return (
    <div className="flex w-full flex-col-reverse overflow-hidden rounded-md" style={{ height: barHeight }}>
      {segments.map((seg, i) => (
        <div
          key={`${seg.z}-${i}`}
          style={{
            height: `${seg.pct}%`,
            minHeight: seg.pct > 0 ? 2 : 0,
            background: `linear-gradient(180deg, ${ZONE_CHART_COLOR[seg.z]} 0%, ${ZONE_CHART_COLOR[seg.z]}E0 100%)`,
          }}
        />
      ))}
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
  weekBarDays,
  selectedWeekListDayKey,
  onToggleWeekChartDay,
  weekSessionCards,
  onSessionCardNavigate,
  onOpenSessionDetail,
  zones,
  recordsFooterLine,
  onManageRecords,
  onSendSession,
}: CoachAthleteFichePanelProps) {
  const hue = avatarHueFromUserId(userId);
  const initials = initialsFromName(displayName);
  const today = new Date();
  const maxKm = Math.max(...weekBarDays.map((d) => d.km), 1);
  const MAX_BAR_H = 88;
  const MIN_VISIBLE_H = 4;

  const selectedBarDay = selectedWeekListDayKey
    ? weekBarDays.find((d) => d.dateKey === selectedWeekListDayKey)
    : undefined;
  const sessionsCount = weekSessionCards.length;

  const filteredCards = selectedWeekListDayKey
    ? weekSessionCards.filter((c) => c.dateKey === selectedWeekListDayKey)
    : weekSessionCards;

  const selectedEmptyRest =
    selectedWeekListDayKey &&
    selectedBarDay &&
    !selectedBarDay.hasSession;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      style={{ background: TRACKING_BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{
              width: 72,
              height: 72,
              border: "2px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              background: avatarUrl ? undefined : `hsl(${hue}, 85%, 52%)`,
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[18px] font-bold text-white">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className="truncate"
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: "#0A0F1F",
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {displayName}
            </h1>
            <p style={{ fontSize: 14, color: "#8E8E93", marginTop: 4, marginBottom: 0 }}>{subtitle}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onMessage}
            className="flex items-center justify-center gap-1.5 active:scale-[0.98]"
            style={{
              background: "#0A0F1F",
              borderRadius: 12,
              padding: "13px 8px",
            }}
          >
            <MessageCircle className="h-4 w-4 text-white" strokeWidth={2.4} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>Message</span>
          </button>
          <button
            type="button"
            onClick={onViewProfile}
            className="flex items-center justify-center active:scale-[0.98]"
            style={{
              background: "white",
              borderRadius: 12,
              padding: "13px 8px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px #E5E5EA",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0A0F1F", letterSpacing: "-0.01em" }}>Voir profil</span>
          </button>
          {onNudgeAthlete ? (
            <button
              type="button"
              disabled={nudgeDisabled || nudgeLoading}
              onClick={onNudgeAthlete}
              className="flex items-center justify-center active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
              style={{
                background: "#FFA88E",
                borderRadius: 12,
                padding: "13px 8px",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}>
                {nudgeLoading ? "…" : "Relancer"}
              </span>
            </button>
          ) : (
            <div aria-hidden className="rounded-[12px]" style={{ background: "transparent" }} />
          )}
        </div>

        <div className="mb-3 mt-7 flex items-center justify-between">
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#8E8E93",
              letterSpacing: "0.08em",
            }}
          >
            CETTE SEMAINE
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="p-1 active:opacity-70" aria-label="Semaine précédente" onClick={onPreviousWeek}>
              <ChevronLeft className="h-4 w-4" color={ACTION_BLUE} strokeWidth={2.6} />
            </button>
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#0A0F1F",
                letterSpacing: "0.04em",
              }}
            >
              {weekLabel}
            </p>
            <button type="button" className="p-1 active:opacity-70" aria-label="Semaine suivante" onClick={onNextWeek}>
              <ChevronRight className="h-4 w-4" color={ACTION_BLUE} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        <div
          className="flex gap-1.5 px-1"
          style={{
            background: "white",
            borderRadius: 16,
            padding: "16px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
          }}
        >
          {weekBarDays.map((d) => {
            const isSel = selectedWeekListDayKey === d.dateKey;
            const dayDate = new Date(d.dateKey + "T12:00:00");
            const isToday = isSameDay(dayDate, today);
            const barHeight = d.km > 0 ? Math.max(14, (d.km / maxKm) * MAX_BAR_H) : 0;
            const segments = d.km > 0 ? d.segments : [];

            return (
              <button
                key={d.dateKey}
                type="button"
                onClick={() => onToggleWeekChartDay(d.dateKey)}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 active:scale-95"
                style={{ paddingTop: 4, paddingBottom: 2 }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isToday ? ACTION_BLUE : "#0A0F1F",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {d.dayOfMonth}
                </span>
                <div className="flex w-full flex-col-reverse items-stretch justify-end" style={{ height: MAX_BAR_H }}>
                  {d.km > 0 ? (
                    <div
                      className="flex w-full flex-col-reverse overflow-hidden"
                      style={{
                        height: barHeight,
                        borderRadius: 6,
                        boxShadow: isSel ? `0 0 0 2px white, 0 0 0 4px ${ACTION_BLUE}` : "none",
                      }}
                    >
                      {segments.map((zone, i) => (
                        <div
                          key={`${d.dateKey}-z-${i}`}
                          style={{
                            background: `linear-gradient(180deg, ${ZONE_CHART_COLOR[zone.z]} 0%, ${ZONE_CHART_COLOR[zone.z]}E0 100%)`,
                            height: `${zone.pct}%`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        height: MIN_VISIBLE_H,
                        background: isSel ? ACTION_BLUE : "#E5E5EA",
                        borderRadius: 9999,
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isToday ? ACTION_BLUE : "#8E8E93",
                    letterSpacing: "0.02em",
                  }}
                >
                  {d.dayLetter}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          {selectedWeekListDayKey === null ? (
            <>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                SÉANCES DE LA SEMAINE · {sessionsCount}
              </p>
              {sessionsCount === 0 ? (
                <div
                  className="p-5 text-center"
                  style={{
                    background: "white",
                    borderRadius: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                  }}
                >
                  <p style={{ fontSize: 15, color: "#8E8E93" }}>Aucune séance programmée</p>
                </div>
              ) : (
                weekSessionCards.map((card) => (
                  <div
                    key={card.dateKey}
                    className="flex overflow-hidden rounded-2xl bg-white active:opacity-95"
                    style={{
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSessionCardNavigate(card.dateKey)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-3 p-4 pr-2">
                        <div className="flex h-[52px] w-6 shrink-0 flex-col justify-end">
                          <SessionMiniBar segments={card.segments} barHeight={Math.max(40, (card.km / maxKm) * 52)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#8E8E93",
                              letterSpacing: "0.06em",
                              margin: 0,
                            }}
                          >
                            {card.dayLabel.toUpperCase()}
                          </p>
                          <p
                            style={{
                              fontSize: 17,
                              fontWeight: 800,
                              color: "#0A0F1F",
                              letterSpacing: "-0.02em",
                              marginTop: 4,
                              marginBottom: 0,
                            }}
                          >
                            {card.title}
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#8E8E93", marginTop: 4, marginBottom: 0 }}>
                            {card.km > 0 ? `${card.km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : "—"} ·{" "}
                            {card.status === "done"
                              ? "Fait"
                              : card.status === "missed"
                                ? "Non fait"
                                : card.status === "pending"
                                  ? "En attente"
                                  : "—"}
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="flex w-11 shrink-0 items-center justify-center border-l border-[#F2F2F7] active:bg-[#F8F8F8]"
                      aria-label="Détail de la séance"
                      onClick={() => onOpenSessionDetail(card.dateKey)}
                    >
                      <ChevronRight className="h-5 w-5 text-[#C7C7CC]" strokeWidth={2} />
                    </button>
                  </div>
                ))
              )}
            </>
          ) : selectedBarDay?.hasSession && filteredCards[0] ? (
            <>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                JOUR SÉLECTIONNÉ
              </p>
              <div
                className="flex overflow-hidden rounded-2xl bg-white active:opacity-95"
                style={{
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSessionCardNavigate(filteredCards[0].dateKey)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-3 p-4 pr-2">
                    <div className="flex h-[52px] w-6 shrink-0 flex-col justify-end">
                      <SessionMiniBar
                        segments={filteredCards[0].segments}
                        barHeight={Math.max(40, (filteredCards[0].km / maxKm) * 52)}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#8E8E93",
                          letterSpacing: "0.06em",
                          margin: 0,
                        }}
                      >
                        {filteredCards[0].dayLabel.toUpperCase()}
                      </p>
                      <p
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#0A0F1F",
                          letterSpacing: "-0.02em",
                          marginTop: 4,
                          marginBottom: 0,
                        }}
                      >
                        {filteredCards[0].title}
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#8E8E93", marginTop: 4, marginBottom: 0 }}>
                        {filteredCards[0].km > 0
                          ? `${filteredCards[0].km.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`
                          : "—"}{" "}
                        ·{" "}
                        {filteredCards[0].status === "done"
                          ? "Fait"
                          : filteredCards[0].status === "missed"
                            ? "Non fait"
                            : filteredCards[0].status === "pending"
                              ? "En attente"
                              : "—"}
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex w-11 shrink-0 items-center justify-center border-l border-[#F2F2F7] active:bg-[#F8F8F8]"
                  aria-label="Détail de la séance"
                  onClick={() => onOpenSessionDetail(filteredCards[0].dateKey)}
                >
                  <ChevronRight className="h-5 w-5 text-[#C7C7CC]" strokeWidth={2} />
                </button>
              </div>
            </>
          ) : selectedEmptyRest ? (
            <div
              className="p-4"
              style={{
                background: "white",
                borderRadius: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#8E8E93",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                JOUR SÉLECTIONNÉ
              </p>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#0A0F1F",
                  letterSpacing: "-0.02em",
                  margin: 0,
                }}
              >
                Aucune séance ·{" "}
                {selectedBarDay
                  ? new Date(selectedBarDay.dateKey + "T12:00:00").toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : ""}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mb-3 mt-7 flex items-center justify-between">
          <p
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#8E8E93",
              letterSpacing: "0.08em",
            }}
          >
            ZONES D&apos;ENTRAÎNEMENT · COURSE
          </p>
          <button type="button" onClick={onManageRecords} className="active:opacity-70">
            <span style={{ fontSize: 15, fontWeight: 700, color: ACTION_BLUE, letterSpacing: "-0.01em" }}>
              Modifier records
            </span>
          </button>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
          }}
        >
          {zones.length ? (
            zones.map((row, i) => {
              const zn = zoneLabelToNum(row.zone);
              const zc = ZONE_CHART_COLOR[zn];
              const paceLeft = row.minPace.replace(/\/km\s*$/i, "").trim();
              const paceRight = row.maxPace.replace(/\/km\s*$/i, "").trim();
              return (
                <div key={row.zone}>
                  {i > 0 ? <div className="ml-4 h-px bg-[#E5E5EA]" /> : null}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `${zc}1A`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: zc,
                          fontVariantNumeric: "tabular-nums",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        Z{zn}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#0A0F1F",
                          margin: 0,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {ZONE_LABEL_FR[zn] ?? row.zone}
                      </p>
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#0A0F1F",
                        margin: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {paceLeft} – {paceRight} /km
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-5 text-center text-[15px]" style={{ color: "#8E8E93" }}>
              Ajoute un record (profil ou privé coach) pour calculer les zones.
            </div>
          )}
        </div>

        {recordsFooterLine ? (
          <p style={{ fontSize: 13, color: "#8E8E93", marginTop: 8, lineHeight: 1.4 }}>{recordsFooterLine}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[#E5E5EA] bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onSendSession}
          className="flex w-full items-center justify-center gap-2 active:scale-[0.99]"
          style={{
            background: ACTION_BLUE,
            borderRadius: 14,
            padding: "14px",
            boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)",
          }}
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.8} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "white", letterSpacing: "-0.01em" }}>
            Envoyer une nouvelle séance
          </span>
        </button>
      </div>
    </div>
  );
}

export { avatarHueFromUserId };
