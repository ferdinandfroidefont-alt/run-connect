import { format, parseISO } from "date-fns";
import type { AthletePlanSessionModel, AthleteWeekSummary } from "./types";
import { sportLabel } from "./sportTokens";
import type { SessionBlockLite } from "./sessionBlockTypes";

export function secondsToLabel(total: number | undefined) {
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

export function metersToLabel(distance: number | undefined) {
  if (!distance || distance <= 0) return "";
  if (distance >= 1000) return `${(distance / 1000).toFixed(distance % 1000 === 0 ? 0 : 1)} km`;
  return `${distance} m`;
}

function paceToLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

export function blockSummary(block: SessionBlockLite) {
  const volume = block.distanceM ? metersToLabel(block.distanceM) : secondsToLabel(block.durationSec);
  const target =
    block.paceSecPerKm ? paceToLabel(block.paceSecPerKm) :
    block.speedKmh ? `${block.speedKmh} km/h` :
    block.powerWatts ? `${block.powerWatts} W` : "";
  const intensity = block.intensityMode === "rpe"
    ? (block.rpe ? `RPE ${block.rpe}` : "")
    : (block.zone || "");
  if (block.type === "interval") {
    const reps = block.repetitions || 1;
    const rec = block.recoveryDurationSec
      ? `récup ${secondsToLabel(block.recoveryDurationSec)}`
      : block.recoveryDistanceM
      ? `récup ${metersToLabel(block.recoveryDistanceM)}`
      : "";
    return `${reps} × ${volume}${target ? ` à ${target}` : ""}${rec ? ` — ${rec}` : ""}${intensity ? ` — ${intensity}` : ""}`;
  }
  return `${volume}${target ? ` à ${target}` : ""}${intensity ? ` — ${intensity}` : ""}`;
}

export function sessionStructureHint(s: AthletePlanSessionModel): string {
  if (!s.blocks.length) return "";
  const parts = s.blocks
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(blockSummary);
  return parts.join(" · ");
}

export function sessionVolumeLabel(s: AthletePlanSessionModel): string {
  const durationSec = s.blocks.reduce((acc, b) => acc + (b.durationSec || 0) * (b.repetitions || 1), 0);
  const distanceM = s.blocks.reduce((acc, b) => acc + (b.distanceM || 0) * (b.repetitions || 1), 0);
  if (s.distanceKm != null && s.distanceKm > 0) return `${Math.round(s.distanceKm * 10) / 10} km`;
  if (distanceM > 0) return metersToLabel(distanceM);
  if (durationSec > 0) return secondsToLabel(durationSec);
  return "";
}

export function mapParticipationToUiStatus(
  status: string | null | undefined,
  hasConflict: boolean
): "planned" | "confirmed" | "done" | "missed" | "conflict" {
  if (hasConflict) return "conflict";
  if (!status) return "planned";
  if (status === "completed") return "done";
  if (status === "missed") return "missed";
  if (status === "confirmed" || status === "scheduled") return "confirmed";
  return "planned";
}

export function kmForSession(s: AthletePlanSessionModel): number {
  if (s.distanceKm != null && s.distanceKm > 0) return s.distanceKm;
  const distanceM = s.blocks.reduce((acc, b) => acc + (b.distanceM || 0) * (b.repetitions || 1), 0);
  return distanceM / 1000;
}

function markConflicts(sessions: AthletePlanSessionModel[]): AthletePlanSessionModel[] {
  const byDay = new Map<string, AthletePlanSessionModel[]>();
  sessions.forEach((s) => {
    const key = format(parseISO(s.assignedDate), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  });
  const conflictIds = new Set<string>();
  byDay.forEach((list) => {
    if (list.length < 2) return;
    const sorted = [...list].sort(
      (a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = new Date(sorted[i].assignedDate).getTime();
      const b = new Date(sorted[i + 1].assignedDate).getTime();
      const diffMin = Math.abs(b - a) / 60000;
      if (diffMin < 150) {
        conflictIds.add(sorted[i].id);
        conflictIds.add(sorted[i + 1].id);
      }
    }
  });
  return sessions.map((s) => (conflictIds.has(s.id) ? { ...s, hasConflict: true } : s));
}

export function applyConflictFlags(sessions: AthletePlanSessionModel[]): AthletePlanSessionModel[] {
  return markConflicts(sessions.map((s) => ({ ...s, hasConflict: false })));
}

export function buildWeekSummary(
  sessions: AthletePlanSessionModel[],
  prevWeekPlannedKm: number | null
): AthleteWeekSummary {
  const plannedKm = Math.round(sessions.reduce((acc, s) => acc + kmForSession(s), 0) * 10) / 10;
  const completedKm = Math.round(
    sessions
      .filter((s) => s.participationStatus === "completed")
      .reduce((acc, s) => acc + kmForSession(s), 0) * 10
  ) / 10;
  const plannedSessions = sessions.length;
  const confirmedSessions = sessions.filter((s) =>
    ["confirmed", "scheduled", "completed"].includes(s.participationStatus || "")
  ).length;
  const coachIds = new Set(sessions.map((s) => s.coachId));
  const activeCoaches = coachIds.size;

  let trendLabel = "—";
  let trendTone: AthleteWeekSummary["trendTone"] = "neutral";
  if (prevWeekPlannedKm != null && prevWeekPlannedKm > 0) {
    const pct = Math.round(((plannedKm - prevWeekPlannedKm) / prevWeekPlannedKm) * 100);
    if (pct >= 8) {
      trendLabel = `+${pct}% vs semaine dernière`;
      trendTone = "busy";
    } else if (pct <= -8) {
      trendLabel = `Semaine allégée (${pct}%)`;
      trendTone = "light";
    } else {
      trendLabel = `${pct >= 0 ? "+" : ""}${pct}% vs semaine dernière`;
      trendTone = "neutral";
    }
  } else if (plannedKm >= 70) {
    trendLabel = "Semaine chargée";
    trendTone = "busy";
  } else if (plannedKm > 0 && plannedKm < 25) {
    trendLabel = "Semaine légère";
    trendTone = "light";
  }

  const bySportMap = new Map<string, { planned: number; done: number; sessions: number; doneSessions: number }>();
  sessions.forEach((s) => {
    const key = s.sport;
    if (!bySportMap.has(key)) {
      bySportMap.set(key, { planned: 0, done: 0, sessions: 0, doneSessions: 0 });
    }
    const row = bySportMap.get(key)!;
    row.planned += kmForSession(s);
    row.sessions += 1;
    if (s.participationStatus === "completed") {
      row.done += kmForSession(s);
      row.doneSessions += 1;
    }
  });

  const bySport = Array.from(bySportMap.entries()).map(([sport, v]) => {
    const label = sportLabel(sport as AthletePlanSessionModel["sport"]);
    const kmP = Math.round(v.planned * 10) / 10;
    const kmD = Math.round(v.done * 10) / 10;
    const isKmSport = sport === "running" || sport === "cycling" || sport === "swimming";
    if (isKmSport) {
      return {
        sport: sport as AthletePlanSessionModel["sport"],
        label,
        volumeText: `${kmD} / ${kmP} km`,
      };
    }
    return {
      sport: sport as AthletePlanSessionModel["sport"],
      label,
      volumeText: `${v.doneSessions} / ${v.sessions} séances`,
    };
  });

  return {
    plannedKm,
    completedKm,
    plannedSessions,
    confirmedSessions,
    activeCoaches,
    trendLabel,
    trendTone,
    bySport,
  };
}

export function dayConflictMessage(sessions: AthletePlanSessionModel[], day: Date): string | null {
  const key = format(day, "yyyy-MM-dd");
  const list = sessions.filter((s) => format(parseISO(s.assignedDate), "yyyy-MM-dd") === key);
  const hasConflict = list.some((s) => s.hasConflict);
  if (!hasConflict || list.length < 2) return null;
  return `${list.length} séances proches aujourd’hui`;
}
