import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  Bike,
  Clock3,
  Crosshair,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Flame,
  Gauge,
  GripVertical,
  Leaf,
  Minus,
  MoreHorizontal,
  Plus,
  Ruler,
  Trash2,
  Waves,
  Zap,
} from "lucide-react";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { useAppContext } from "@/contexts/AppContext";
import { useLocation, useNavigate } from "react-router-dom";
import { PlanningHeader } from "@/components/coaching/planning/PlanningHeader";
import { PlanningSearchBar } from "@/components/coaching/planning/PlanningSearchBar";
import { WeekSelectorPremium, type DaySessionSummary } from "@/components/coaching/planning/WeekSelectorPremium";
import { DayPlanningRow } from "@/components/coaching/planning/DayPlanningRow";
import { buildWorkoutSegments, miniProfileZoneColor, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";
import { buildWorkoutHeadline, resolveWorkoutMetrics, workoutAccentColor } from "@/lib/workoutPresentation";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { AppDrawer, type CoachMenuKey } from "@/components/coaching/drawer/AppDrawer";
import { ModelsPage } from "@/components/coaching/models/ModelsPage";
import type { SessionModelItem } from "@/components/coaching/models/types";
import { parseRCC } from "@/lib/rccParser";
import { ClubManagementPage, type ClubMemberItem, type ClubGroupItem, type ClubInvitationItem, type ClubRole } from "@/components/coaching/club/ClubManagementPage";
import { InviteMembersDialog } from "@/components/InviteMembersDialog";
import { WeeklyTrackingView } from "@/components/coaching/WeeklyTrackingView";
import { CoachingDraftsPage, type CoachingDraftListItem } from "@/components/coaching/CoachingDraftsPage";
import { CoachDashboardPage } from "@/components/coaching/dashboard/CoachDashboardPage";
import { AthleteMyPlanView } from "@/components/coaching/athlete-plan/AthleteMyPlanView";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "@/components/coaching/athlete-plan/types";
import { parseSport, sportLabel } from "@/components/coaching/athlete-plan/sportTokens";
import { formatCalendarDistance, isExplicitRestDay, toCalendarSummarySport } from "@/components/coaching/athlete-plan/planUtils";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { buildAthleteIntensityContext } from "@/lib/athleteWorkoutContext";
import { runningRecordsFromPrivateRows, type CoachPrivateRecordRow } from "@/lib/coachPrivateRunningRecords";

type SportType = "running" | "cycling" | "swimming" | "strength";
type BlockType = "warmup" | "interval" | "steady" | "recovery" | "cooldown";
type IntensityMode = "zones" | "rpe";
type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";

type SchemaToolKind = "steady" | "interval" | "pyramid" | "variation" | "libre" | "repetition";
type SchemaDragToolKind = "steady" | "interval" | "pyramid" | "variation";

type SessionBlock = {
  id: string;
  order: number;
  type: BlockType;
  durationSec?: number;
  distanceM?: number;
  paceSecPerKm?: number;
  paceStartSecPerKm?: number;
  paceEndSecPerKm?: number;
  speedKmh?: number;
  powerWatts?: number;
  repetitions?: number;
  blockRepetitions?: number;
  recoveryDurationSec?: number;
  recoveryDistanceM?: number;
  blockRecoveryDurationSec?: number;
  blockRecoveryDistanceM?: number;
  recoveryType?: "walk" | "jog" | "easy";
  intensityMode?: IntensityMode;
  zone?: ZoneKey;
  rpe?: number;
  notes?: string;
};

type TrainingSession = {
  id: string;
  dbId?: string;
  title: string;
  sport: SportType;
  assignedDate: string;
  athleteId?: string;
  athleteIds?: string[];
  groupId?: string;
  sent: boolean;
  blocks: SessionBlock[];
  athleteIntensity?: ReturnType<typeof buildAthleteIntensityContext>;
};

type SessionDraft = Omit<TrainingSession, "id" | "sent">;
type SchemaTooltipState = {
  blockIndex: number;
  anchorX: number;
  anchorTop: number;
  label: string;
};

const SPORTS: Array<{ id: SportType; label: string; emoji: string }> = [
  { id: "running", label: "Course à pied", emoji: "🏃" },
  { id: "cycling", label: "Vélo", emoji: "🚴" },
  { id: "swimming", label: "Natation", emoji: "🏊" },
  { id: "strength", label: "Renforcement", emoji: "💪" },
];

const BLOCK_TYPES: Array<{
  id: BlockType;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
  tone: string;
  iconTone: string;
}> = [
  {
    id: "warmup",
    label: "Échauffement",
    detail: "Montée progressive",
    icon: Flame,
    emoji: "🔥",
    tone: "border-orange-500/25 bg-orange-500/10",
    iconTone: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  },
  {
    id: "interval",
    label: "Intervalle",
    detail: "Effort + récup",
    icon: Zap,
    emoji: "⚡",
    tone: "border-red-500/25 bg-red-500/10",
    iconTone: "bg-red-500/20 text-red-700 dark:text-red-300",
  },
  {
    id: "steady",
    label: "Bloc continu",
    detail: "Effort stable",
    icon: Minus,
    emoji: "➖",
    tone: "border-yellow-500/25 bg-yellow-500/10",
    iconTone: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  },
  {
    id: "recovery",
    label: "Récupération",
    detail: "Facile",
    icon: Waves,
    emoji: "💙",
    tone: "border-blue-500/25 bg-blue-500/10",
    iconTone: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  },
  {
    id: "cooldown",
    label: "Retour au calme",
    detail: "Descente progressive",
    icon: Leaf,
    emoji: "🌿",
    tone: "border-emerald-500/25 bg-emerald-500/10",
    iconTone: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
];

const ADD_BLOCK_CHOICES = [
  ...BLOCK_TYPES,
  {
    id: "pyramid" as const,
    label: "Pyramidal",
    detail: "Montée puis descente",
    icon: Activity,
    emoji: "📈",
    tone: "border-violet-500/25 bg-violet-500/10",
    iconTone: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  },
];

const ZONE_META: Array<{ zone: ZoneKey; label: string; description: string; tone: string }> = [
  { zone: "Z1", label: "Z1", description: "Récupération", tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  { zone: "Z2", label: "Z2", description: "Endurance fondamentale", tone: "bg-primary/12 text-primary" },
  { zone: "Z3", label: "Z3", description: "Endurance active", tone: "bg-green-500/12 text-green-700 dark:text-green-300" },
  { zone: "Z4", label: "Z4", description: "Seuil", tone: "bg-amber-500/12 text-amber-700 dark:text-amber-300" },
  { zone: "Z5", label: "Z5", description: "VO2 max", tone: "bg-orange-500/12 text-orange-700 dark:text-orange-300" },
  { zone: "Z6", label: "Z6", description: "Anaérobie", tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
];

const PREVIEW_ZONE_ORDER = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] as const;

const DISTANCE_KM_WHOLE_OPTIONS = Array.from({ length: 201 }, (_, i) => ({ value: String(i), label: String(i) }));
const DISTANCE_METERS_25_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const meters = i * 25;
  return { value: String(meters), label: String(meters).padStart(3, "0") };
});
const DISTANCE_MI_DEC_OPTIONS = Array.from({ length: 100 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, "0"),
}));
const DISTANCE_METERS_ONLY_25_OPTIONS = Array.from({ length: 401 }, (_, i) => {
  const meters = i * 25;
  return { value: String(meters), label: String(meters) };
});

type CoachClub = { id: string; name: string };
type AthleteEntry = {
  id: string;
  name: string;
  runningRecords?: Record<string, unknown> | null;
  coachRunningRecords?: Record<string, unknown> | null;
};
type GroupEntry = { id: string; name: string };

const athleteIntensityFromRunningRecords = (
  runningRecords?: Record<string, unknown> | null,
  coachRunningRecords?: Record<string, unknown> | null,
) => buildAthleteIntensityContext({ runningRecords: runningRecords ?? null, coachRunningRecords: coachRunningRecords ?? null });

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function secondsToLabel(total: number | undefined) {
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m} min`;
  return `${s} s`;
}

function secondsToTranscriptLabel(total: number | undefined) {
  if (!total || total <= 0) return "";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  if (m > 0) return `${m}'`;
  return `${s}"`;
}

function metersToLabel(distance: number | undefined) {
  if (!distance || distance <= 0) return "";
  return `${Math.round(distance).toLocaleString("fr-FR")} m`;
}

function metersToTranscriptLabel(distanceM?: number) {
  if (!distanceM || distanceM <= 0) return "";
  if (distanceM >= 1000) {
    const km = distanceM / 1000;
    return `${km.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(km) ? 0 : 1, maximumFractionDigits: 1 })}km`;
  }
  return `${Math.round(distanceM)}m`;
}

function paceToLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}'${sec.toString().padStart(2, "0")}''/km`;
}

function paceToTranscriptLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}'${sec.toString().padStart(2, "0")}min/km`;
}

function pacePerKmShortLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const rounded = Math.max(1, Math.round(paceSecPerKm));
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function durationBubbleLabel(totalSec?: number) {
  if (!totalSec || totalSec <= 0) return "";
  if (totalSec < 60) return `${Math.round(totalSec)} secondes`;
  const minutes = Math.round(totalSec / 60);
  return minutes > 1 ? `${minutes} min` : "1 min";
}

function blockBubbleLabel(block: SessionBlock, sport: SportType) {
  const duration = durationBubbleLabel(block.durationSec);
  const distance = simpleBlockDistanceValue(block.distanceM);
  const progressiveTarget =
    block.paceStartSecPerKm && block.paceEndSecPerKm
      ? `${pacePerKmShortLabel(block.paceStartSecPerKm)} -> ${pacePerKmShortLabel(block.paceEndSecPerKm)}`
      : "";
  const runningTarget = progressiveTarget || pacePerKmShortLabel(block.paceSecPerKm);
  const cyclingTarget = block.powerWatts && block.powerWatts > 0 ? `${Math.round(block.powerWatts)} W` : "";
  const genericTarget = block.speedKmh && block.speedKmh > 0 ? `${Math.round(block.speedKmh)} km/h` : "";
  const target = sport === "running" ? runningTarget : sport === "cycling" ? cyclingTarget || runningTarget : genericTarget || runningTarget || cyclingTarget;
  const primary = duration || distance || blockTitle(block.type);
  const main = target ? `${primary} à ${target}` : primary;
  const shouldAppendDistance = Boolean(distance) && distance !== primary;
  return shouldAppendDistance ? `${main} • ${distance}` : main;
}

function compactPaceLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "—";
  const rounded = Math.max(1, Math.round(paceSecPerKm));
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}'${sec.toString().padStart(2, "0")}`;
}

function paceCardLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "—";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}’${sec.toString().padStart(2, "0")}`;
}

function CoachingMetricPill({
  label,
  value,
  placeholder,
  onClick,
}: {
  label: string;
  value?: string;
  placeholder: string;
  onClick: () => void;
}) {
  const hasValue = Boolean(value && value.trim());

  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex w-full items-center justify-center rounded-full border border-slate-200/90 bg-white px-3 py-2 text-center shadow-[0_8px_20px_-18px_rgba(37,99,235,0.6)] transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/45"
      >
        <div className={cn("text-[14px] font-semibold tabular-nums", hasValue ? "text-foreground" : "text-muted-foreground/75")}>
          <span className="truncate">{hasValue ? value : placeholder}</span>
        </div>
      </button>
    </div>
  );
}

function simpleBlockDistanceValue(distanceM?: number) {
  if (!distanceM || distanceM <= 0) return "";
  if (distanceM >= 1000) {
    const km = distanceM / 1000;
    return `${km.toLocaleString("fr-FR", { maximumFractionDigits: distanceM % 1000 === 0 ? 0 : 1 })} km`;
  }
  return `${Math.round(distanceM)} m`;
}

function durationClockLabel(total?: number) {
  if (!total || total <= 0) return "00:00";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function distanceCardLabel(distance?: number) {
  if (!distance || distance <= 0) return "0,00";
  return (distance / 1000).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatZoneBadge(zone?: ZoneKey) {
  if (!zone) return "Zone auto";
  const meta = ZONE_META.find((item) => item.zone === zone);
  return meta ? `${zone} · ${meta.description}` : zone;
}

function isPositive(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function deriveRunningVolume(
  block: SessionBlock,
  changedField: "duration" | "distance" | "pace"
): SessionBlock {
  const next = { ...block };
  const hasDuration = isPositive(next.durationSec);
  const hasDistance = isPositive(next.distanceM);
  const hasPace = isPositive(next.paceSecPerKm);

  if (changedField === "duration") {
    if (hasDistance) next.paceSecPerKm = Math.round((next.durationSec! / next.distanceM!) * 1000);
    else if (hasPace) next.distanceM = Math.max(1, Math.round((next.durationSec! * 1000) / next.paceSecPerKm!));
    return next;
  }

  if (changedField === "distance") {
    if (hasDuration) next.paceSecPerKm = Math.round((next.durationSec! / next.distanceM!) * 1000);
    else if (hasPace) next.durationSec = Math.max(1, Math.round((next.distanceM! * next.paceSecPerKm!) / 1000));
    return next;
  }

  if (hasDuration) next.distanceM = Math.max(1, Math.round((next.durationSec! * next.paceSecPerKm!) / 1000));
  else if (hasDistance) next.durationSec = Math.max(1, Math.round((next.distanceM! * next.paceSecPerKm!) / 1000));
  return next;
}

function isProgressiveBlock(block: SessionBlock) {
  return Boolean(
    block.notes?.includes("[Variation]") ||
      block.notes?.includes("[Progressif]") ||
      block.notes?.includes("[Dégressif]")
  );
}

function deriveProgressiveRunningVolume(
  block: SessionBlock,
  changedField: "duration" | "distance" | "paceStart" | "paceEnd"
): SessionBlock {
  const next = { ...block };
  const hasStartPace = isPositive(next.paceStartSecPerKm);
  const hasEndPace = isPositive(next.paceEndSecPerKm);
  const effectivePace =
    hasStartPace && hasEndPace
      ? Math.max(1, Math.round(((next.paceStartSecPerKm as number) + (next.paceEndSecPerKm as number)) / 2))
      : hasStartPace
        ? (next.paceStartSecPerKm as number)
        : hasEndPace
          ? (next.paceEndSecPerKm as number)
          : undefined;

  if (!effectivePace) return next;
  next.paceSecPerKm = effectivePace;

  if (changedField === "duration" && isPositive(next.durationSec) && !isPositive(next.distanceM)) {
    next.distanceM = Math.max(1, Math.round(((next.durationSec as number) * 1000) / effectivePace));
    return next;
  }
  if (changedField === "distance" && isPositive(next.distanceM) && !isPositive(next.durationSec)) {
    next.durationSec = Math.max(1, Math.round(((next.distanceM as number) * effectivePace) / 1000));
    return next;
  }
  if ((changedField === "paceStart" || changedField === "paceEnd") && isPositive(next.durationSec)) {
    next.distanceM = Math.max(1, Math.round(((next.durationSec as number) * 1000) / effectivePace));
    return next;
  }
  if ((changedField === "paceStart" || changedField === "paceEnd") && isPositive(next.distanceM)) {
    next.durationSec = Math.max(1, Math.round(((next.distanceM as number) * effectivePace) / 1000));
    return next;
  }

  if (isPositive(next.durationSec) && isPositive(next.distanceM)) {
    next.paceSecPerKm = Math.max(1, Math.round(((next.durationSec as number) / (next.distanceM as number)) * 1000));
  } else if (isPositive(next.durationSec)) {
    next.distanceM = Math.max(1, Math.round(((next.durationSec as number) * 1000) / effectivePace));
  } else if (isPositive(next.distanceM)) {
    next.durationSec = Math.max(1, Math.round(((next.distanceM as number) * effectivePace) / 1000));
  }
  return next;
}

function blockTitle(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.id === type)?.label ?? "Bloc";
}

function blockDisplayLabel(block: SessionBlock) {
  if (block.notes?.includes("[Pyramid]")) return "Pyramidal";
  if (isProgressiveBlock(block)) return "Variation";
  if (block.notes?.includes("[Libre]")) return "Libre";
  return blockTitle(block.type);
}

function blockTypeMeta(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.id === type) ?? BLOCK_TYPES[2];
}

function blockSummary(block: SessionBlock) {
  const volume = block.distanceM ? metersToLabel(block.distanceM) : secondsToLabel(block.durationSec);
  const progressiveTarget =
    block.paceStartSecPerKm && block.paceEndSecPerKm
      ? `${paceToLabel(block.paceStartSecPerKm)} → ${paceToLabel(block.paceEndSecPerKm)}`
      : "";
  const target =
    progressiveTarget ||
    (block.paceSecPerKm
      ? paceToLabel(block.paceSecPerKm)
      : block.speedKmh
        ? `${block.speedKmh} km/h`
        : block.powerWatts
          ? `${block.powerWatts} W`
          : "");
  const intensity = block.intensityMode === "rpe"
    ? (block.rpe ? `RPE ${block.rpe}` : "")
    : (block.zone || "");
  if (block.type === "interval") {
    const reps = block.repetitions || 1;
    const series = block.blockRepetitions || 1;
    const rec = block.recoveryDurationSec
      ? `récup ${secondsToLabel(block.recoveryDurationSec)}`
      : block.recoveryDistanceM
      ? `récup ${metersToLabel(block.recoveryDistanceM)}`
      : "";
    const seriesRec = block.blockRecoveryDurationSec
      ? `inter-séries ${secondsToLabel(block.blockRecoveryDurationSec)}`
      : block.blockRecoveryDistanceM
      ? `inter-séries ${metersToLabel(block.blockRecoveryDistanceM)}`
      : "";
    return `${series > 1 ? `${series} x ` : ""}${reps} x ${volume}${target ? ` à ${target}` : ""}${rec ? ` - ${rec}` : ""}${seriesRec ? ` - ${seriesRec}` : ""}${intensity ? ` - ${intensity}` : ""}`;
  }
  if (block.notes?.includes("[Pyramid]")) {
    const steps = Math.max(3, block.repetitions || 5);
    return `${steps} paliers${volume ? ` • ${volume}` : ""}${target ? ` • ${target}` : ""}${intensity ? ` • ${intensity}` : ""}`;
  }
  return `${volume}${target ? ` à ${target}` : ""}${intensity ? ` - ${intensity}` : ""}`;
}

function blockTranscript(block: SessionBlock) {
  const pace = paceToTranscriptLabel(block.paceSecPerKm);
  if (block.type === "interval") {
    const series = Math.max(1, block.blockRepetitions || 1);
    const reps = Math.max(1, block.repetitions || 1);
    const effortVolume = block.distanceM ? metersToTranscriptLabel(block.distanceM) : secondsToTranscriptLabel(block.durationSec);
    const prefix = `${series > 1 ? `${series}x` : ""}${reps}x${effortVolume || "effort"}`;
    return `${prefix}${pace ? ` à ${pace}` : ""}`;
  }
  const volume = block.durationSec ? secondsToTranscriptLabel(block.durationSec) : metersToTranscriptLabel(block.distanceM);
  if (!volume) return blockTitle(block.type);
  return `${volume}${pace ? ` à ${pace}` : ""}`;
}

function blockAccent(type: BlockType) {
  switch (type) {
    case "interval":
      return {
        iconWrap: "bg-[#2563EB]",
        iconColor: "text-white",
        tint: "from-[#2563EB]/14 via-[#2563EB]/8 to-transparent",
      };
    case "warmup":
      return {
        iconWrap: "bg-orange-500",
        iconColor: "text-white",
        tint: "from-orange-500/16 via-orange-500/8 to-transparent",
      };
    case "recovery":
    case "cooldown":
      return {
        iconWrap: "bg-emerald-500",
        iconColor: "text-white",
        tint: "from-emerald-500/16 via-emerald-500/8 to-transparent",
      };
    default:
      return {
        iconWrap: "bg-emerald-500",
        iconColor: "text-white",
        tint: "from-emerald-500/16 via-emerald-500/8 to-transparent",
      };
  }
}

function zoneToPreviewColorClass(zone?: string) {
  const normalized = typeof zone === "string" ? zone.toUpperCase() : "Z3";
  switch (normalized) {
    case "Z1":
      return "bg-[#2563EB]";
    case "Z2":
      return "bg-emerald-500";
    case "Z3":
      return "bg-yellow-400";
    case "Z4":
      return "bg-orange-500";
    case "Z5":
      return "bg-red-500";
    case "Z6":
      return "bg-black";
    default:
      return "bg-yellow-400";
  }
}

function blockGraphColor(type: BlockType, recovery = false) {
  if (recovery) return "hsl(var(--chart-2))";
  if (type === "interval") return "hsl(var(--destructive))";
  if (type === "warmup") return "hsl(var(--chart-3))";
  if (type === "cooldown" || type === "recovery") return "hsl(var(--chart-2))";
  return "hsl(var(--primary))";
}

function computeSessionDistanceKm(blocks: SessionBlock[], sport: SportType) {
  return resolveWorkoutMetrics({ segments: buildWorkoutSegments(blocks, { sport }) }).distanceKm || 0;
}

function createDefaultBlock(type: BlockType, order: number): SessionBlock {
  return {
    id: uid(),
    order,
    type,
    intensityMode: "zones",
  };
}

function paceStringToSecPerKm(pace?: string) {
  if (!pace) return undefined;
  const [min, sec] = pace.split(":").map(Number);
  if (!Number.isFinite(min) || !Number.isFinite(sec)) return undefined;
  return min * 60 + sec;
}

function parseNumericField(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }
  return undefined;
}

function normalizeStoredZone(source: Record<string, unknown>): ZoneKey | undefined {
  const raw =
    typeof source.zone === "string"
      ? source.zone
      : typeof source.intensity === "string"
        ? source.intensity
        : typeof source.effortIntensity === "string"
          ? source.effortIntensity
          : undefined;
  const upper = raw?.toUpperCase();
  return upper && ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"].includes(upper) ? (upper as ZoneKey) : undefined;
}

function mapStoredBlockToSessionBlock(block: unknown, index: number): SessionBlock {
  const source = block as Record<string, unknown>;
  const intensityMode: "rpe" | "zones" = source.intensityMode === "rpe" ? "rpe" : "zones";
  const recoveryType =
    source.recoveryType === "walk" || source.recoveryType === "jog" || source.recoveryType === "easy"
      ? source.recoveryType
      : source.recoveryType === "marche"
        ? "walk"
        : source.recoveryType === "trot"
          ? "jog"
          : source.recoveryType === "statique"
            ? "easy"
            : undefined;

  return {
    id: typeof source.id === "string" ? source.id : uid(),
    order: typeof source.order === "number" ? source.order : index + 1,
    type: (typeof source.type === "string" ? source.type : "steady") as BlockType,
    durationSec: typeof source.durationSec === "number" ? source.durationSec : parseNumericField(source.effortDuration ?? source.duration),
    distanceM: typeof source.distanceM === "number" ? source.distanceM : parseNumericField(source.effortDistance ?? source.distance),
    paceSecPerKm:
      typeof source.paceSecPerKm === "number"
        ? source.paceSecPerKm
        : paceStringToSecPerKm(
            typeof source.effortPace === "string"
              ? source.effortPace
              : typeof source.pace === "string"
                ? source.pace
                : undefined
          ),
    paceStartSecPerKm:
      typeof source.paceStartSecPerKm === "number"
        ? source.paceStartSecPerKm
        : paceStringToSecPerKm(typeof source.paceStart === "string" ? source.paceStart : undefined),
    paceEndSecPerKm:
      typeof source.paceEndSecPerKm === "number"
        ? source.paceEndSecPerKm
        : paceStringToSecPerKm(typeof source.paceEnd === "string" ? source.paceEnd : undefined),
    speedKmh: typeof source.speedKmh === "number" ? source.speedKmh : undefined,
    powerWatts: typeof source.powerWatts === "number" ? source.powerWatts : undefined,
    repetitions: typeof source.repetitions === "number" ? source.repetitions : undefined,
    blockRepetitions: typeof source.blockRepetitions === "number" ? source.blockRepetitions : undefined,
    recoveryDurationSec:
      typeof source.recoveryDurationSec === "number" ? source.recoveryDurationSec : parseNumericField(source.recoveryDuration),
    recoveryDistanceM:
      typeof source.recoveryDistanceM === "number" ? source.recoveryDistanceM : parseNumericField(source.recoveryDistance),
    blockRecoveryDurationSec:
      typeof source.blockRecoveryDurationSec === "number"
        ? source.blockRecoveryDurationSec
        : parseNumericField(source.blockRecoveryDuration),
    blockRecoveryDistanceM:
      typeof source.blockRecoveryDistanceM === "number"
        ? source.blockRecoveryDistanceM
        : parseNumericField(source.blockRecoveryDistance),
    recoveryType,
    intensityMode,
    zone: normalizeStoredZone(source),
    rpe: typeof source.rpe === "number" ? source.rpe : undefined,
    notes: typeof source.notes === "string" ? source.notes : undefined,
  } satisfies SessionBlock;
}

function parsedRccToSessionBlocks(rccCode: string): SessionBlock[] {
  const parsed = parseRCC(rccCode);
  return parsed.blocks.map((block, index) => ({
    id: uid(),
    order: index + 1,
    type: block.type,
    durationSec: block.duration ? block.duration * 60 : undefined,
    distanceM: block.distance ?? undefined,
    paceSecPerKm: paceStringToSecPerKm(block.pace),
    repetitions: block.repetitions ?? undefined,
    recoveryDurationSec: block.recoveryDuration ?? undefined,
    recoveryType:
      block.recoveryType === "marche" ? "walk" : block.recoveryType === "trot" ? "jog" : "easy",
    intensityMode: "zones",
    zone: "Z2",
  }));
}

function emptyDraft(dateIso: string): SessionDraft {
  return {
    title: "",
    sport: "running",
    assignedDate: dateIso,
    blocks: [],
  };
}

function normalizeDraftSport(value: unknown): SportType {
  return value === "cycling" || value === "swimming" || value === "strength" ? value : "running";
}

function draftSessionDateIso(row: Record<string, unknown>, weekStart: Date): string {
  if (typeof row.assignedDate === "string" && row.assignedDate) return row.assignedDate;
  if (typeof row.scheduled_at === "string" && row.scheduled_at) return row.scheduled_at;
  const dayIndex = typeof row.dayIndex === "number" ? row.dayIndex : 0;
  return addDays(weekStart, Math.max(0, Math.min(6, dayIndex))).toISOString();
}

function draftSessionBlocks(row: Record<string, unknown>): SessionBlock[] {
  if (Array.isArray(row.blocks)) {
    return row.blocks.map((block, idx) => mapStoredBlockToSessionBlock(block, idx));
  }
  if (Array.isArray(row.session_blocks)) {
    return row.session_blocks.map((block, idx) => mapStoredBlockToSessionBlock(block, idx));
  }
  const maybeRcc = typeof row.rccCode === "string" ? row.rccCode : typeof row.rcc_code === "string" ? row.rcc_code : "";
  return maybeRcc.trim().length ? parsedRccToSessionBlocks(maybeRcc) : [];
}

const BASE_MODELS: SessionModelItem[] = [
  {
    id: "base-endurance-40",
    source: "base",
    title: "Footing 40 min + 5 x 60m",
    activityType: "running",
    objective: "Z2 endurance",
    rccCode: "15'>5'45, 5x60>3'40 r45>trot, 10'>6'00",
    category: "endurance",
  },
  {
    id: "base-long-90",
    source: "base",
    title: "Sortie longue 1h30",
    activityType: "running",
    objective: "Endurance",
    rccCode: "90'>5'50",
    category: "endurance",
  },
  {
    id: "base-threshold-3x10",
    source: "base",
    title: "3 x 10 min allure seuil",
    activityType: "running",
    objective: "Z4 seuil",
    rccCode: "20'>5'25, 3x10'>4'10 r2'00>trot, 10'>5'50",
    category: "threshold",
  },
  {
    id: "base-vo2-10x400",
    source: "base",
    title: "10 x 400m",
    activityType: "running",
    objective: "VO2",
    rccCode: "15'>5'30, 10x400>3'30 r1'15>trot, 10'>5'55",
    category: "vo2",
  },
  {
    id: "base-recovery-30",
    source: "base",
    title: "Footing léger 30 min",
    activityType: "running",
    objective: "Récup",
    rccCode: "30'>6'05",
    category: "recovery",
  },
];

export function CoachPlanningExperience() {
  const { userProfile } = useUserProfile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActiveCoachingTab =
    location.pathname === "/coaching" || location.pathname.startsWith("/coaching/");
  const { setBottomNavSuppressed } = useAppContext();
  const toast = useEnhancedToast();
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<CoachClub[]>([]);
  const [memberClubIds, setMemberClubIds] = useState<string[]>([]);
  const [athletePlanSessions, setAthletePlanSessions] = useState<AthletePlanSessionModel[]>([]);
  const [prevWeekAthleteKm, setPrevWeekAthleteKm] = useState<number | null>(null);
  const [athletePlanLoading, setAthletePlanLoading] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [isCoachMode, setIsCoachMode] = useState(true);
  const [viewAsAthlete, setViewAsAthlete] = useState(false);
  const [athletes, setAthletes] = useState<AthleteEntry[]>([]);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [activeAthleteId, setActiveAthleteId] = useState<string | undefined>(undefined);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);
  const [coachingTab, setCoachingTab] = useState<"planning" | "create">("planning");
  const [editorTab, setEditorTab] = useState<"build" | "models">("build");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionDraft>(() => emptyDraft(new Date().toISOString()));
  const [blockSheetOpen, setBlockSheetOpen] = useState(false);
  const [blockStep, setBlockStep] = useState<"type" | "config">("type");
  const [blockForm, setBlockForm] = useState<SessionBlock | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [pendingInsertIndex, setPendingInsertIndex] = useState<number | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [schemaDraggingTool, setSchemaDraggingTool] = useState<SchemaDragToolKind | null>(null);
  const [schemaAddMoreOpen, setSchemaAddMoreOpen] = useState(false);
  const [schemaDragPointer, setSchemaDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [schemaDropRatio, setSchemaDropRatio] = useState<number | null>(null);
  const [schemaTooltip, setSchemaTooltip] = useState<SchemaTooltipState | null>(null);
  const [schemaTooltipWidth, setSchemaTooltipWidth] = useState(0);
  const schemaDragFromAddCardStartRef = useRef<{ x: number; y: number } | null>(null);
  const addBlockFromCardGestureMovedRef = useRef(false);
  const schemaTooltipRef = useRef<HTMLDivElement | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelTitle, setWheelTitle] = useState("");
  const [wheelColumns, setWheelColumns] = useState<Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>>([]);
  const [applyWheel, setApplyWheel] = useState<(() => void) | null>(null);
  const [wheelA, setWheelA] = useState("0");
  const [wheelB, setWheelB] = useState("0");
  const [wheelC, setWheelC] = useState("0");
  const wheelARef = useRef("0");
  const wheelBRef = useRef("0");
  const wheelCRef = useRef("0");
  const blockReorderPressTimerRef = useRef<number | null>(null);
  const blockReorderSourceRef = useRef<string | null>(null);
  const setWheelAValue = useCallback((value: string) => {
    wheelARef.current = value;
    setWheelA(value);
  }, []);
  const setWheelBValue = useCallback((value: string) => {
    wheelBRef.current = value;
    setWheelB(value);
  }, []);
  const setWheelCValue = useCallback((value: string) => {
    wheelCRef.current = value;
    setWheelC(value);
  }, []);
  const [wheelUnit, setWheelUnit] = useState("min/km");
  const [savePulse, setSavePulse] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [myModels, setMyModels] = useState<SessionModelItem[]>([]);
  const [clubMembers, setClubMembers] = useState<ClubMemberItem[]>([]);
  const [clubGroupsAdmin, setClubGroupsAdmin] = useState<ClubGroupItem[]>([]);
  const [clubInvitations, setClubInvitations] = useState<ClubInvitationItem[]>([]);
  const [clubLocation, setClubLocation] = useState<string | null>(null);
  const [clubAvatarUrl, setClubAvatarUrl] = useState<string | null>(null);
  const [plannedSessionsCount, setPlannedSessionsCount] = useState(0);
  const [validatedSessionsCount, setValidatedSessionsCount] = useState(0);
  const [trackingSelectedAthleteId, setTrackingSelectedAthleteId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<CoachMenuKey>("planning");
  const [showExitDraftDialog, setShowExitDraftDialog] = useState(false);
  const [pendingDrawerKey, setPendingDrawerKey] = useState<CoachMenuKey | null>(null);
  const [copiedWeekSessions, setCopiedWeekSessions] = useState<TrainingSession[] | null>(null);
  const [copiedFromAthleteId, setCopiedFromAthleteId] = useState<string | null>(null);
  const schemaPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!draft.blocks.length) {
      setSelectedBlockId(null);
      return;
    }
    if (!selectedBlockId || !draft.blocks.some((item) => item.id === selectedBlockId)) {
      setSelectedBlockId(draft.blocks[0].id);
    }
  }, [draft.blocks, selectedBlockId]);

  useEffect(() => {
    if (!schemaTooltipRef.current) return;
    setSchemaTooltipWidth(schemaTooltipRef.current.getBoundingClientRect().width);
  }, [schemaTooltip?.label]);

  useEffect(() => {
    if (!schemaTooltip) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (schemaPreviewRef.current?.contains(target)) return;
      setSchemaTooltip(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [schemaTooltip]);
  const effectiveAthleteMode = !isCoachMode || viewAsAthlete;

  const rotateActiveClub = () => {
    if (!clubs.length) return;
    setActiveClubId((prev) => {
      const currentIndex = clubs.findIndex((club) => club.id === prev);
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % clubs.length;
      return clubs[nextIndex]?.id ?? prev ?? null;
    });
  };

  // MainTabsSwipeHost garde les onglets montés : ne masquer la tab bar que si l’onglet Coaching est réellement visible.
  useEffect(() => {
    const hideTabBar = isActiveCoachingTab && coachingTab === "create";
    setBottomNavSuppressed("coaching-create", hideTabBar);
    return () => setBottomNavSuppressed("coaching-create", false);
  }, [isActiveCoachingTab, coachingTab, setBottomNavSuppressed]);

  useEffect(() => {
    if (!user || !effectiveAthleteMode) return;
    setActiveAthleteId(user.id);
    setActiveGroupId(undefined);
    setActiveMenuKey((prev) => (prev === "my-plan" ? prev : "my-plan"));
  }, [effectiveAthleteMode, user]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from("coaching_templates")
        .select("id, name, objective, activity_type, rcc_code")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false });
      if (ignore) return;
      if (error) {
        toast.error("Impossible de charger les modèles");
        return;
      }
      setMyModels(
        (data || []).map((row) => ({
          id: row.id,
          source: "mine" as const,
          title: row.name,
          activityType: row.activity_type || "running",
          objective: row.objective,
          rccCode: row.rcc_code,
        }))
      );
    };
    void loadTemplates();
    return () => {
      ignore = true;
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    const loadCoachClubs = async () => {
      const { data: memberships } = await supabase
        .from("group_members")
        .select("conversation_id, is_coach")
        .eq("user_id", user.id);
      const allClubIds = Array.from(new Set((memberships || []).map((entry) => entry.conversation_id)));
      setMemberClubIds(allClubIds);
      const coachMemberships = (memberships || []).filter((entry) => entry.is_coach);
      const athleteMemberships = (memberships || []).filter((entry) => !entry.is_coach);
      const isCoach = coachMemberships.length > 0;
      const clubIds = (isCoach ? coachMemberships : athleteMemberships).map((entry) => entry.conversation_id);
      if (!clubIds.length) {
        if (!ignore) {
          setClubs([]);
          setMemberClubIds([]);
          setActiveClubId(null);
          setIsCoachMode(true);
        }
        return;
      }
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, group_name")
        .in("id", clubIds)
        .order("group_name", { ascending: true });
      if (ignore) return;
      const nextClubs = (conversations || []).map((club) => ({
        id: club.id,
        name: club.group_name || "Club",
      }));
      setIsCoachMode(isCoach);
      setClubs(nextClubs);
      setActiveClubId((prev) => prev ?? nextClubs[0]?.id ?? null);
    };
    void loadCoachClubs();
    return () => {
      ignore = true;
    };
  }, [user]);

  useEffect(() => {
    if (!activeClubId) return;
    let ignore = false;
    const loadClubFilters = async () => {
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", activeClubId);
      const memberIds = (members || []).map((m) => m.user_id);
      const [{ data: profiles }, { data: coachPrivateRecords }] = memberIds.length
        ? await Promise.all([
            supabase.from("profiles").select("user_id, display_name, running_records").in("user_id", memberIds),
            user
              ? supabase
                  .from("coach_athlete_private_records")
                  .select("id, athlete_user_id, sport_key, event_label, record_value, note")
                  .eq("club_id", activeClubId)
                  .eq("coach_id", user.id)
                  .in("athlete_user_id", memberIds)
              : Promise.resolve({ data: [], error: null }),
          ])
        : [{ data: [] }, { data: [] }];
      const { data: clubGroups } = await supabase
        .from("club_groups")
        .select("id, name")
        .eq("club_id", activeClubId)
        .order("name", { ascending: true });
      const groupIds = (clubGroups || []).map((group) => group.id);
      const { data: memberships } = groupIds.length
        ? await supabase.from("club_group_members").select("group_id, user_id").in("group_id", groupIds)
        : { data: [] };
      const membersByGroup = (memberships || []).reduce<Record<string, string[]>>((acc, row) => {
        if (!acc[row.group_id]) acc[row.group_id] = [];
        acc[row.group_id].push(row.user_id);
        return acc;
      }, {});
      const privateRowsByAthlete = ((coachPrivateRecords || []) as CoachPrivateRecordRow[]).reduce<Record<string, CoachPrivateRecordRow[]>>((acc, row) => {
        if (!acc[row.athlete_user_id]) acc[row.athlete_user_id] = [];
        acc[row.athlete_user_id].push(row);
        return acc;
      }, {});
      if (ignore) return;
      setAthletes(
        (profiles || []).map((profile) => ({
          id: profile.user_id,
          name: profile.display_name || "Athlète",
          runningRecords:
            profile.running_records && typeof profile.running_records === "object"
              ? (profile.running_records as Record<string, unknown>)
              : null,
          coachRunningRecords: runningRecordsFromPrivateRows(privateRowsByAthlete[profile.user_id] || []),
        }))
      );
      setGroups((clubGroups || []).map((group) => ({ id: group.id, name: group.name })));
      setGroupMembers(membersByGroup);
    };
    void loadClubFilters();
    return () => {
      ignore = true;
    };
  }, [activeClubId, user]);

  useEffect(() => {
    if (!activeClubId) return;
    let ignore = false;
    const loadClubAdmin = async () => {
      const [{ data: clubRow }, { data: groupRows }, { data: gmRows }, { data: invitationRows }] = await Promise.all([
        supabase
          .from("conversations")
          .select("group_name, group_avatar_url, location")
          .eq("id", activeClubId)
          .maybeSingle(),
        supabase.from("club_groups").select("id, name").eq("club_id", activeClubId).order("name", { ascending: true }),
        supabase.from("group_members").select("user_id, is_admin, is_coach").eq("conversation_id", activeClubId),
        supabase
          .from("club_invitations")
          .select("id, invited_user_id, status, created_at")
          .eq("club_id", activeClubId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const memberIds = (gmRows || []).map((m) => m.user_id);
      const invitedIds = (invitationRows || []).map((i) => i.invited_user_id);
      const allProfileIds = Array.from(new Set([...memberIds, ...invitedIds]));
      const { data: profiles } = allProfileIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, display_name, username, avatar_url")
            .in("user_id", allProfileIds)
        : { data: [] as Array<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }> };

      const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));
      const { data: groupMembershipRows } = groupRows?.length
        ? await supabase
            .from("club_group_members")
            .select("group_id, user_id")
            .in("group_id", groupRows.map((g) => g.id))
        : { data: [] as Array<{ group_id: string; user_id: string }> };

      const groupByMember = new Map<string, string>();
      (groupMembershipRows || []).forEach((row) => {
        if (!groupByMember.has(row.user_id)) {
          const group = (groupRows || []).find((g) => g.id === row.group_id);
          if (group) groupByMember.set(row.user_id, group.name);
        }
      });

      const memberItems: ClubMemberItem[] = (gmRows || []).map((member) => {
        const profile = profileById.get(member.user_id);
        const role: ClubRole = member.is_admin ? "admin" : member.is_coach ? "coach" : "athlete";
        return {
          userId: member.user_id,
          displayName: profile?.display_name || profile?.username || "Membre",
          username: profile?.username,
          avatarUrl: profile?.avatar_url,
          role,
          groupLabel: groupByMember.get(member.user_id),
          status: "active",
        };
      });

      const groupItems: ClubGroupItem[] = (groupRows || []).map((group) => {
        const memberIdsInGroup = (groupMembershipRows || []).filter((gm) => gm.group_id === group.id).map((gm) => gm.user_id);
        const coachRef = memberItems.find((item) => memberIdsInGroup.includes(item.userId) && (item.role === "coach" || item.role === "admin"));
        return {
          id: group.id,
          name: group.name,
          athletesCount: memberIdsInGroup.length,
          coachName: coachRef?.displayName,
        };
      });

      const invitationItems: ClubInvitationItem[] = (invitationRows || []).map((inv) => {
        const profile = profileById.get(inv.invited_user_id);
        return {
          id: inv.id,
          displayLabel: profile?.display_name || profile?.username || "Invitation",
          role: "athlete",
          sentAt: format(new Date(inv.created_at), "d MMM", { locale: fr }),
          status: (inv.status as "pending" | "accepted" | "expired") || "pending",
        };
      });

      const weekEnd = addDays(weekAnchor, 7);
      const [{ count: plannedCount }, { data: weekSessions }] = await Promise.all([
        supabase
          .from("coaching_sessions")
          .select("id", { count: "exact", head: true })
          .eq("club_id", activeClubId)
          .gte("scheduled_at", weekAnchor.toISOString())
          .lt("scheduled_at", weekEnd.toISOString()),
        supabase
          .from("coaching_sessions")
          .select("id")
          .eq("club_id", activeClubId)
          .gte("scheduled_at", weekAnchor.toISOString())
          .lt("scheduled_at", weekEnd.toISOString()),
      ]);
      const weekSessionIds = (weekSessions || []).map((s) => s.id);
      const { count: validatedCount } = weekSessionIds.length
        ? await supabase
            .from("coaching_participations")
            .select("id", { count: "exact", head: true })
            .in("coaching_session_id", weekSessionIds)
            .eq("status", "completed")
        : { count: 0 };

      if (ignore) return;
      setClubMembers(memberItems);
      setClubGroupsAdmin(groupItems);
      setClubInvitations(invitationItems);
      setClubLocation(clubRow?.location || null);
      setClubAvatarUrl(clubRow?.group_avatar_url || null);
      setPlannedSessionsCount(plannedCount || 0);
      setValidatedSessionsCount(validatedCount || 0);
    };
    void loadClubAdmin();
    return () => {
      ignore = true;
    };
  }, [activeClubId, weekAnchor]);

  useEffect(() => {
    if (effectiveAthleteMode || !activeClubId || !user) return;
    let ignore = false;
    const loadWeekSessions = async () => {
      setLoading(true);
      const weekEnd = addDays(weekAnchor, 7);
      let query = supabase
        .from("coaching_sessions")
        .select("id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks")
        .eq("club_id", activeClubId)
        .gte("scheduled_at", weekAnchor.toISOString())
        .lt("scheduled_at", weekEnd.toISOString());
      query = query.eq("coach_id", user.id);
      if (activeGroupId) query = query.eq("target_group_id", activeGroupId);
      const { data, error } = await query.order("scheduled_at", { ascending: true });
      if (!ignore) {
        if (error) {
          toast.error("Impossible de charger la semaine");
        } else {
          const mapped = (data || []).map<TrainingSession>((row) => {
            const rawBlocks = Array.isArray(row.session_blocks) ? row.session_blocks : [];
            const blocks = rawBlocks.map(mapStoredBlockToSessionBlock);
            const targetAthletes = Array.isArray(row.target_athletes)
              ? row.target_athletes.filter((value): value is string => typeof value === "string")
              : [];
            const targetAthlete = targetAthletes.length ? targetAthletes[0] : undefined;
            return {
              id: row.id,
              dbId: row.id,
              title: row.title,
              sport: (row.activity_type as SportType) || "running",
              assignedDate: row.scheduled_at,
              athleteId: targetAthlete,
              athleteIds: targetAthletes,
              groupId: row.target_group_id || undefined,
              sent: row.status === "sent",
              blocks,
            };
          });
          setSessions(mapped);
        }
        setLoading(false);
      }
    };
    void loadWeekSessions();
    return () => {
      ignore = true;
    };
  }, [activeClubId, activeAthleteId, activeGroupId, effectiveAthleteMode, user, weekAnchor, toast]);

  const loadAthleteWeek = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user || activeMenuKey !== "my-plan") return;
    if (!memberClubIds.length) {
      setAthletePlanSessions([]);
      setPrevWeekAthleteKm(null);
      setAthletePlanLoading(false);
      return;
    }
    if (!opts?.silent) {
      setAthletePlanLoading(true);
    }
    const weekEnd = addDays(weekAnchor, 7);
    const prevWeekStart = subWeeks(weekAnchor, 1);
    const prevWeekEnd = weekAnchor;
    try {
      const { data: participations, error } = await supabase
        .from("coaching_participations")
        .select(
          "id, coaching_session_id, status, athlete_note, completed_at, scheduled_at, coaching_sessions!inner(id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks, coach_id, club_id, distance_km, objective, coach_notes, default_location_name, description)"
        )
        .eq("user_id", user.id)
        .in("coaching_sessions.club_id", memberClubIds)
        .eq("coaching_sessions.status", "sent")
        .gte("coaching_sessions.scheduled_at", weekAnchor.toISOString())
        .lt("coaching_sessions.scheduled_at", weekEnd.toISOString())
        .order("scheduled_at", { ascending: true, referencedTable: "coaching_sessions" });

      if (error) {
        toast.error("Impossible de charger Mon plan");
        setAthletePlanSessions([]);
        return;
      }

      const rows = (participations || [])
        .map((participation) => {
          const session = Array.isArray(participation.coaching_sessions)
            ? participation.coaching_sessions[0]
            : participation.coaching_sessions;
          if (!session) return null;
          return {
            participation,
            session,
          };
        })
        .filter(Boolean) as Array<{
        participation: {
          id: string;
          coaching_session_id: string;
          status: string | null;
          athlete_note: string | null;
          completed_at: string | null;
          scheduled_at: string | null;
        };
        session: {
          id: string;
          title: string;
          activity_type: string;
          scheduled_at: string;
          target_group_id: string | null;
          session_blocks: unknown;
          coach_id: string;
          club_id: string;
          distance_km: number | null;
          objective: string | null;
          coach_notes: string | null;
          default_location_name: string | null;
          description: string | null;
        };
      }>;

      const coachIds = [...new Set(rows.map((r) => r.session.coach_id))];
      const clubIds = [...new Set(rows.map((r) => r.session.club_id))];

      const [{ data: coachProfiles }, { data: convs }, { data: prevWeekRows }] = await Promise.all([
        coachIds.length
          ? supabase.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", coachIds)
          : Promise.resolve({ data: [] as Array<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }> }),
        clubIds.length
          ? supabase.from("conversations").select("id, group_name").in("id", clubIds)
          : Promise.resolve({ data: [] as Array<{ id: string; group_name: string | null }> }),
         supabase
           .from("coaching_participations")
           .select("coaching_sessions!inner(distance_km)")
           .eq("user_id", user.id)
           .in("coaching_sessions.club_id", memberClubIds)
           .eq("coaching_sessions.status", "sent")
           .gte("coaching_sessions.scheduled_at", prevWeekStart.toISOString())
           .lt("coaching_sessions.scheduled_at", prevWeekEnd.toISOString()),
      ]);

      const coachById = new Map((coachProfiles || []).map((p) => [p.user_id, p]));
      const clubById = new Map((convs || []).map((c) => [c.id, c.group_name || "Club"]));

      const prevKm = (prevWeekRows || []).reduce((acc, row) => {
        const linkedSession = Array.isArray(row.coaching_sessions) ? row.coaching_sessions[0] : row.coaching_sessions;
        const dk = linkedSession?.distance_km;
        return typeof dk === "number" && dk > 0 ? acc + dk : acc;
      }, 0);
      setPrevWeekAthleteKm(prevKm > 0 ? Math.round(prevKm * 10) / 10 : null);

      const mapped: AthletePlanSessionModel[] = rows.map(({ participation, session: row }) => {
        const rawBlocks = Array.isArray(row.session_blocks) ? row.session_blocks : [];
        const blocks = rawBlocks.map(mapStoredBlockToSessionBlock);
        const coach = coachById.get(row.coach_id);
        const coachName = coach?.display_name || coach?.username || "Coach";
        const clubName = clubById.get(row.club_id) || "Club";
        return {
          id: row.id,
          title: row.title,
          sport: parseSport(row.activity_type),
          assignedDate: participation.scheduled_at || row.scheduled_at,
          blocks,
          coachId: row.coach_id,
          coachName,
          coachAvatarUrl: coach?.avatar_url ?? null,
          clubId: row.club_id,
          clubName,
          participationId: participation.id ?? null,
          participationStatus: participation.status ?? null,
          athleteNote: participation.athlete_note ?? null,
          distanceKm: typeof row.distance_km === "number" ? row.distance_km : null,
          objective: row.objective,
          coachNotes: row.coach_notes,
          locationName: row.default_location_name,
          description: row.description,
          hasConflict: false,
            athleteIntensity: athleteIntensityFromRunningRecords((userProfile?.running_records as Record<string, unknown> | null | undefined) ?? null, null),
        };
      });
      setAthletePlanSessions(mapped);
    } finally {
      setAthletePlanLoading(false);
    }
  }, [user, activeMenuKey, memberClubIds, weekAnchor, toast]);

  useEffect(() => {
    void loadAthleteWeek();
  }, [loadAthleteWeek]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return { athletes: [], groups: [] };
    const q = search.toLowerCase();
    return {
      athletes: athletes.filter((a) => a.name.toLowerCase().includes(q)),
      groups: groups.filter((g) => g.name.toLowerCase().includes(q)),
    };
  }, [athletes, groups, search]);

  const filteredSessions = useMemo(
    () => {
      // En mode coach planning : n'afficher des séances QUE si un athlète ou un groupe est sélectionné.
      // Évite la surcharge visuelle (séances de tous les athlètes mélangées).
      if (!effectiveAthleteMode && !activeAthleteId && !activeGroupId) return [];
      return sessions.filter((s) => {
        if (activeAthleteId) {
          const matchesAthleteGroup = !!(s.groupId && groupMembers[s.groupId]?.includes(activeAthleteId));
          const athleteMatches =
            s.athleteId === activeAthleteId ||
            (Array.isArray(s.athleteIds) && s.athleteIds.includes(activeAthleteId)) ||
            matchesAthleteGroup;
          if (!athleteMatches) return false;
        }
        if (activeGroupId && s.groupId !== activeGroupId) return false;
        return true;
      });
    },
    [sessions, activeAthleteId, activeGroupId, effectiveAthleteMode, groupMembers]
  );

  const enrichedFilteredSessions = useMemo(
    () =>
      filteredSessions.map((session) => {
        const directAthlete = session.athleteId ? athletes.find((athlete) => athlete.id === session.athleteId) : undefined;
        const groupAthlete = !directAthlete && activeAthleteId ? athletes.find((athlete) => athlete.id === activeAthleteId) : undefined;
        return {
          ...session,
          athleteIntensity:
            session.athleteIntensity ?? athleteIntensityFromRunningRecords(directAthlete?.runningRecords ?? groupAthlete?.runningRecords ?? null, directAthlete?.coachRunningRecords ?? groupAthlete?.coachRunningRecords ?? null),
        };
      }),
    [filteredSessions, athletes, activeAthleteId]
  );

  const activeAthleteIntensity = useMemo(() => {
    if (effectiveAthleteMode) {
      return athleteIntensityFromRunningRecords((userProfile?.running_records as Record<string, unknown> | null | undefined) ?? null, null);
    }
    const selectedAthlete = activeAthleteId ? athletes.find((athlete) => athlete.id === activeAthleteId) : undefined;
    return athleteIntensityFromRunningRecords(selectedAthlete?.runningRecords ?? null, selectedAthlete?.coachRunningRecords ?? null);
  }, [activeAthleteId, athletes, effectiveAthleteMode, userProfile?.running_records]);

  const previewSegments = useMemo(
    () => buildWorkoutSegments(draft.blocks, { sport: draft.sport, athleteIntensity: activeAthleteIntensity ?? undefined }),
    [draft.blocks, draft.sport, activeAthleteIntensity]
  );
  const previewMetrics = useMemo(() => resolveWorkoutMetrics({ segments: previewSegments }), [previewSegments]);
  const previewBars = useMemo(
    () => renderWorkoutMiniProfile(previewSegments, { sessionSchema: true }),
    [previewSegments]
  );
  const schemaTooltipBlocks = useMemo(() => (draft.blocks.length ? draft.blocks : []), [draft.blocks]);
  const selectedSchemaPreviewIndex = useMemo(() => {
    if (!selectedBlockId || !schemaTooltipBlocks.length || !previewBars.length) return null;
    const selectedDraftIndex = schemaTooltipBlocks.findIndex((block) => block.id === selectedBlockId);
    if (selectedDraftIndex < 0) return null;
    if (schemaTooltipBlocks.length === 1) return 0;
    return Math.round((selectedDraftIndex / (schemaTooltipBlocks.length - 1)) * Math.max(0, previewBars.length - 1));
  }, [previewBars.length, schemaTooltipBlocks, selectedBlockId]);
  const sessionTimeAxisLabels = useMemo(() => {
    const d = Math.max(0, Math.round(previewMetrics.durationMin));
    const end = Math.max(60, Math.ceil(Math.max(1, d) / 15) * 15);
    const labels: string[] = [];
    for (let m = 0; m <= end; m += 15) {
      labels.push(`${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
    }
    return labels;
  }, [previewMetrics.durationMin]);
  const sessionTranscript = useMemo(() => {
    if (!draft.blocks.length) return "Séance vide";
    return draft.blocks.map((block) => blockTranscript(block)).filter(Boolean).join(" + ");
  }, [draft.blocks]);
  const selectedAthlete = useMemo(
    () => (activeAthleteId ? athletes.find((athlete) => athlete.id === activeAthleteId) : undefined),
    [activeAthleteId, athletes]
  );
  const selectedAthleteRunningRefs = useMemo(
    () => activeAthleteIntensity?.coachValidatedRecords ?? activeAthleteIntensity?.athleteRecords ?? null,
    [activeAthleteIntensity]
  );
  const shouldShowAthleteZoneLegend =
    !effectiveAthleteMode &&
    draft.sport === "running" &&
    Boolean(activeAthleteId) &&
    !activeGroupId &&
    Boolean(selectedAthleteRunningRefs?.zones);

  const openCreateForDate = (date: Date) => {
    setEditingSessionId(null);
    setDraft(emptyDraft(date.toISOString()));
    setEditorTab("build");
    setCoachingTab("create");
  };

  const openEditSession = (sessionId: string) => {
    const existing = sessions.find((s) => s.id === sessionId);
    if (!existing) return;
    setEditingSessionId(existing.id);
    setDraft({
      title: existing.title,
      sport: existing.sport,
      assignedDate: existing.assignedDate,
      athleteId: existing.athleteId,
      groupId: existing.groupId,
      blocks: [...existing.blocks].sort((a, b) => a.order - b.order),
    });
    setEditorTab("build");
    setCoachingTab("create");
  };

  const saveSession = async (): Promise<boolean> => {
    if (!draft.blocks.length || !activeClubId || !user) return false;
    const normalizedTitle = draft.title.trim() || "Séance sans titre";
    const totalDistanceKm = computeSessionDistanceKm(draft.blocks, draft.sport);
    const targetAthletes = draft.athleteId ? [draft.athleteId] : activeAthleteId ? [activeAthleteId] : null;
      const dbPayload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: normalizedTitle,
      objective: normalizedTitle,
      activity_type: draft.sport,
      scheduled_at: draft.assignedDate,
      target_group_id: draft.groupId || activeGroupId || null,
      target_athletes: targetAthletes,
      send_mode: draft.groupId || activeGroupId ? "group" : "club",
      status: "draft",
      session_blocks: draft.blocks,
      distance_km: Number.isFinite(totalDistanceKm) && totalDistanceKm > 0 ? totalDistanceKm : null,
    };
    let dbId = editingSessionId;
    if (editingSessionId) {
      const { error } = await supabase.from("coaching_sessions").update(dbPayload).eq("id", editingSessionId);
      if (error) {
        toast.error("Enregistrement impossible", error.message);
        return false;
      }
    } else {
      const { data, error } = await supabase.from("coaching_sessions").insert(dbPayload).select("id").single();
      if (error) {
        toast.error("Création impossible", error.message);
        return false;
      }
      dbId = data.id;
    }
    const payload: TrainingSession = {
      id: dbId ?? uid(),
      dbId: dbId ?? undefined,
      title: normalizedTitle,
      sport: draft.sport,
      assignedDate: draft.assignedDate,
      athleteId: draft.athleteId ?? activeAthleteId,
      groupId: draft.groupId ?? activeGroupId,
      sent: editingSessionId ? sessions.find((s) => s.id === editingSessionId)?.sent ?? false : false,
      blocks: draft.blocks.map((b, idx) => ({ ...b, order: idx + 1 })),
    };
    setSessions((prev) => {
      if (!editingSessionId) return [...prev, payload];
      return prev.map((item) => (item.id === editingSessionId ? payload : item));
    });
    setCoachingTab("planning");
    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 900);
    toast.success("Séance enregistrée");
    return true;
  };

  const removeSession = async (sessionId: string) => {
    const { error } = await supabase.from("coaching_sessions").delete().eq("id", sessionId);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  };

  const duplicateSession = async (session: TrainingSession, targetDate: Date) => {
    if (!activeClubId || !user) return;
    const clonePayload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: `${session.title} (copie)`,
      objective: session.title,
      activity_type: session.sport,
      scheduled_at: targetDate.toISOString(),
      target_group_id: session.groupId || null,
      target_athletes: session.athleteId ? [session.athleteId] : null,
      send_mode: session.groupId ? "group" : "club",
      status: "draft",
      session_blocks: session.blocks,
      distance_km: computeSessionDistanceKm(session.blocks, session.sport) || null,
    };
    const { data, error } = await supabase.from("coaching_sessions").insert(clonePayload).select("id").single();
    if (error) {
      toast.error("Duplication impossible", error.message);
      return;
    }
    setSessions((prev) => [
      ...prev,
      {
        ...session,
        id: data.id,
        dbId: data.id,
        sent: false,
        assignedDate: targetDate.toISOString(),
        blocks: session.blocks.map((b) => ({ ...b, id: uid() })),
      },
    ]);
  };

  const openDraftFromList = async (draftItem: CoachingDraftListItem) => {
    if (!activeClubId || !user) return;
    const weekStart = startOfWeek(new Date(draftItem.week_start), { weekStartsOn: 1 });
    const nextGroupId = draftItem.group_id === "club" ? undefined : draftItem.group_id;
    const draftRows = Array.isArray(draftItem.sessions) ? draftItem.sessions : [];

    const restored = draftRows
      .map((raw, index): TrainingSession | null => {
        if (!raw || typeof raw !== "object") return null;
        const row = raw as Record<string, unknown>;
        const sport = normalizeDraftSport(row.sport ?? row.activityType ?? row.activity_type);
        const blocks = draftSessionBlocks(row).map((block, blockIndex) => ({
          ...block,
          id: typeof block.id === "string" ? block.id : uid(),
          order: blockIndex + 1,
        }));
        const assignedDate = draftSessionDateIso(row, weekStart);
        const athleteId = typeof row.athleteId === "string" ? row.athleteId : undefined;
        const title =
          (typeof row.title === "string" && row.title.trim()) ||
          (typeof row.objective === "string" && row.objective.trim()) ||
          "Séance sans titre";
        return {
          id: `draft-${draftItem.id}-${index}-${uid()}`,
          title,
          sport,
          assignedDate,
          athleteId,
          athleteIds: athleteId ? [athleteId] : undefined,
          groupId: nextGroupId,
          sent: false,
          blocks,
        };
      })
      .filter((item): item is TrainingSession => Boolean(item));

    const weekEnd = addDays(weekStart, 7);
    let cleanup = supabase
      .from("coaching_sessions")
      .delete()
      .eq("club_id", activeClubId)
      .eq("coach_id", user.id)
      .eq("status", "draft")
      .gte("scheduled_at", weekStart.toISOString())
      .lt("scheduled_at", weekEnd.toISOString());
    cleanup = nextGroupId ? cleanup.eq("target_group_id", nextGroupId) : cleanup.is("target_group_id", null);
    await cleanup;

    if (restored.length > 0) {
      const targetAthletes = Array.isArray(draftItem.target_athletes)
        ? draftItem.target_athletes.filter((value): value is string => typeof value === "string")
        : [];
      const insertPayload = restored.map((session) => ({
        club_id: activeClubId,
        coach_id: user.id,
        title: session.title,
        objective: session.title,
        activity_type: session.sport,
        scheduled_at: session.assignedDate,
        target_group_id: nextGroupId ?? null,
        target_athletes: session.athleteId ? [session.athleteId] : targetAthletes.length ? targetAthletes : null,
        send_mode: nextGroupId ? "group" : "club",
        status: "draft",
        session_blocks: session.blocks,
        distance_km: computeSessionDistanceKm(session.blocks, session.sport) || null,
      }));
      const { error } = await supabase.from("coaching_sessions").insert(insertPayload);
      if (error) {
        toast.error("Impossible de reprendre le brouillon", error.message);
        return;
      }
    }

    setWeekAnchor(weekStart);
    setActiveGroupId(nextGroupId);
    setActiveAthleteId(undefined);
    setSessions(restored);
    setActiveMenuKey("planning");
    setCoachingTab("planning");
    toast.success("Brouillon repris");
  };

  const sendSession = async (sessionId: string) => {
    const session = sessions.find((entry) => entry.id === sessionId);
    if (!session || !activeClubId) return;
    const targetIds = new Set<string>();
    if (session.athleteId) {
      targetIds.add(session.athleteId);
    } else if (session.groupId && groupMembers[session.groupId]?.length) {
      groupMembers[session.groupId].forEach((id) => targetIds.add(id));
    } else {
      athletes.forEach((athlete) => targetIds.add(athlete.id));
    }
    const athleteIds = Array.from(targetIds);
    const { error: sendError } = await supabase.from("coaching_sessions").update({ status: "sent" }).eq("id", sessionId);
    if (sendError) {
      toast.error("Envoi impossible", sendError.message);
      return;
    }
    if (athleteIds.length) {
      const { data: existing } = await supabase
        .from("coaching_participations")
        .select("user_id")
        .eq("coaching_session_id", sessionId)
        .in("user_id", athleteIds);
      const existingIds = new Set((existing || []).map((item) => item.user_id));
      const toCreate = athleteIds
        .filter((id) => !existingIds.has(id))
        .map((id) => ({ coaching_session_id: sessionId, user_id: id, status: "sent" }));
      if (toCreate.length) {
        const { error: partError } = await supabase.from("coaching_participations").insert(toCreate);
        if (partError) {
          toast.error("Envoi partiel", partError.message);
          return;
        }
      }
    }
    setSessions((prev) => prev.map((entry) => (entry.id === sessionId ? { ...entry, sent: true } : entry)));
    toast.success("Séance envoyée");
  };

  const unsendSession = async (sessionId: string) => {
    const { error: sessionError } = await supabase.from("coaching_sessions").update({ status: "draft" }).eq("id", sessionId);
    if (sessionError) {
      toast.error("Annulation impossible", sessionError.message);
      return;
    }
    const { error: partError } = await supabase
      .from("coaching_participations")
      .delete()
      .eq("coaching_session_id", sessionId)
      .eq("status", "sent");
    if (partError) {
      toast.error("Annulation partielle", partError.message);
      return;
    }
    setSessions((prev) => prev.map((entry) => (entry.id === sessionId ? { ...entry, sent: false } : entry)));
    toast.success("Envoi annulé");
  };

  const copyAthleteWeek = () => {
    if (!activeAthleteId) return;
      const source = enrichedFilteredSessions
      .filter((session) => session.athleteId === activeAthleteId)
      .map((session) => ({ ...session, blocks: session.blocks.map((b) => ({ ...b })) }));
    if (!source.length) {
      toast.info("Aucune séance à copier pour cet athlète");
      return;
    }
    setCopiedWeekSessions(source);
    setCopiedFromAthleteId(activeAthleteId);
    toast.success("Semaine copiée");
  };

  const pasteAthleteWeek = async () => {
    if (!activeAthleteId || !copiedWeekSessions?.length || !activeClubId || !user) return;
    const copied = copiedWeekSessions;
    for (const session of copied) {
      const payload = {
        club_id: activeClubId,
        coach_id: user.id,
        title: session.title,
        objective: session.title,
        activity_type: session.sport,
        scheduled_at: session.assignedDate,
        target_group_id: session.groupId || null,
        target_athletes: [activeAthleteId],
        send_mode: session.groupId ? "group" : "club",
        status: session.sent ? "sent" : "draft",
        session_blocks: session.blocks,
        distance_km: computeSessionDistanceKm(session.blocks, session.sport) || null,
      };
      const { data, error } = await supabase.from("coaching_sessions").insert(payload).select("id").single();
      if (error) {
        toast.error("Collage impossible", error.message);
        return;
      }
      setSessions((prev) => [
        ...prev,
        {
          ...session,
          id: data.id,
          dbId: data.id,
          athleteId: activeAthleteId,
          blocks: session.blocks.map((b) => ({ ...b, id: uid() })),
        },
      ]);
    }
    toast.success("Semaine collée");
  };

  const createModelFromDraft = async () => {
    if (!user) return;
    const name = window.prompt("Nom du modèle", draft.title || "Nouveau modèle");
    if (!name?.trim()) return;
    const rccCode = window.prompt("Code séance (RCC)", "20'>5'30, 10'>4'20, 10'>5'45");
    if (!rccCode?.trim()) return;
    const payload = {
      coach_id: user.id,
      name: name.trim(),
      objective: draft.title || null,
      activity_type: draft.sport,
      rcc_code: rccCode.trim(),
    };
    const { data, error } = await supabase.from("coaching_templates").insert(payload).select("id").single();
    if (error) {
      toast.error("Création du modèle impossible", error.message);
      return;
    }
    setMyModels((prev) => [
      {
        id: data.id,
        source: "mine",
        title: payload.name,
        objective: payload.objective,
        activityType: payload.activity_type,
        rccCode: payload.rcc_code,
      },
      ...prev,
    ]);
    toast.success("Modèle créé");
  };

  const addModelToPlanning = async (model: SessionModelItem, day: Date, replaceExisting: boolean): Promise<boolean> => {
    if (!activeClubId || !user) return false;
    const dayIso = day.toISOString();
    const existing = sessions.find((session) => isSameDay(new Date(session.assignedDate), day));
    if (existing && replaceExisting) {
      await removeSession(existing.id);
    }
    const blocks = parsedRccToSessionBlocks(model.rccCode);
    const totalDistanceKm = computeSessionDistanceKm(blocks, model.activityType as SportType);
    const targetAthletes = activeAthleteId ? [activeAthleteId] : null;
    const payload = {
      club_id: activeClubId,
      coach_id: user.id,
      title: model.title,
      objective: model.objective || model.title,
      activity_type: model.activityType || "running",
      scheduled_at: dayIso,
      target_group_id: activeGroupId || null,
      target_athletes: targetAthletes,
      send_mode: activeGroupId ? "group" : "club",
      status: "draft",
      session_blocks: blocks,
      distance_km: totalDistanceKm > 0 ? totalDistanceKm : null,
    };
    const { data, error } = await supabase.from("coaching_sessions").insert(payload).select("id").single();
    if (error) {
      toast.error("Ajout au planning impossible", error.message);
      return false;
    }
    const created: TrainingSession = {
      id: data.id,
      dbId: data.id,
      title: model.title,
      sport: (model.activityType as SportType) || "running",
      assignedDate: dayIso,
      athleteId: activeAthleteId,
      groupId: activeGroupId,
      sent: false,
      blocks,
    };
    setSessions((prev) => [...prev.filter((s) => !(replaceExisting && existing && s.id === existing.id)), created]);
    toast.success("Séance ajoutée au planning");
    return true;
  };

  const editModel = (model: SessionModelItem) => {
    setDraft({
      title: model.title,
      sport: (model.activityType as SportType) || "running",
      assignedDate: draft.assignedDate,
      athleteId: activeAthleteId,
      groupId: activeGroupId,
      blocks: parsedRccToSessionBlocks(model.rccCode),
    });
    setEditorTab("build");
  };

  const duplicateModel = async (model: SessionModelItem) => {
    if (model.source !== "mine" || !user) return;
    const payload = {
      coach_id: user.id,
      name: `${model.title} (copie)`,
      objective: model.objective || null,
      activity_type: model.activityType,
      rcc_code: model.rccCode,
    };
    const { data, error } = await supabase.from("coaching_templates").insert(payload).select("id").single();
    if (error) {
      toast.error("Duplication impossible", error.message);
      return;
    }
    setMyModels((prev) => [{ ...model, id: data.id, title: payload.name }, ...prev]);
  };

  const deleteModel = async (model: SessionModelItem) => {
    if (model.source !== "mine") return;
    const { error } = await supabase.from("coaching_templates").delete().eq("id", model.id);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setMyModels((prev) => prev.filter((entry) => entry.id !== model.id));
  };

  const openWheelColumns = (title: string, columns: Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>, onConfirm: () => void) => {
    setWheelTitle(title);
    setWheelColumns(columns);
    setApplyWheel(() => onConfirm);
    setWheelOpen(true);
  };

  const openWheel = (
    title: string,
    items: Array<{ value: string; label: string }>,
    currentValue: string,
    onConfirm: (next: string) => void
  ) => {
    setWheelAValue(currentValue);
    openWheelColumns(title, [{ items, value: currentValue, onChange: setWheelAValue }], () =>
      onConfirm(wheelARef.current)
    );
  };

  const startBlockCreation = (type?: BlockType, existing?: SessionBlock) => {
    const base: SessionBlock = existing ?? createDefaultBlock(type ?? "steady", draft.blocks.length + 1);
    setBlockForm(base);
    setEditingBlockId(existing?.id ?? null);
    setPendingInsertIndex(null);
    setBlockStep(type ? "config" : "type");
    setBlockSheetOpen(true);
  };

  const openInsertBlockPicker = (insertIndex: number) => {
    setPendingInsertIndex(insertIndex);
    setEditingBlockId(null);
    setBlockForm(createDefaultBlock("steady", insertIndex + 1));
    setBlockStep("type");
    setBlockSheetOpen(true);
  };

  const insertDraftBlock = useCallback((block: SessionBlock, insertIndex?: number | null) => {
    setDraft((prev) => {
      const nextBlocks = [...prev.blocks];
      const targetIndex = typeof insertIndex === "number" ? Math.max(0, Math.min(insertIndex, nextBlocks.length)) : nextBlocks.length;
      nextBlocks.splice(targetIndex, 0, block);
      return {
        ...prev,
        blocks: nextBlocks.map((entry, idx) => ({ ...entry, order: idx + 1 })),
      };
    });
  }, []);

  const createQuickSchemaBlock = useCallback((kind: SchemaToolKind): SessionBlock => {
    const nextOrder = draft.blocks.length + 1;
    if (kind === "pyramid") {
      return {
        ...createDefaultBlock("steady", nextOrder),
        repetitions: 5,
        notes: "[Pyramid]",
        zone: "Z4",
      };
    }
    if (kind === "interval" || kind === "repetition") {
      return {
        ...createDefaultBlock("interval", nextOrder),
        zone: "Z5",
      };
    }
    if (kind === "variation") {
      return {
        ...createDefaultBlock("steady", nextOrder),
        notes: "[Variation]",
        zone: "Z2",
        paceStartSecPerKm: 420,
        paceEndSecPerKm: 270,
        paceSecPerKm: 345,
      };
    }
    if (kind === "libre") {
      return { ...createDefaultBlock("steady", nextOrder), notes: "[Libre]" };
    }
    return createDefaultBlock("steady", nextOrder);
  }, [draft.blocks.length]);

  const addQuickSchemaBlock = useCallback(
    (kind: SchemaToolKind) => {
      const block = createQuickSchemaBlock(kind);
      insertDraftBlock(block, null);
      setSelectedBlockId(block.id);
    },
    [createQuickSchemaBlock, insertDraftBlock]
  );

  /** Fin du glisser-déposer : insère le bloc si le relâchement est sur le schéma (géré ici en global, car onPointerUp sur la div ne reçoit pas toujours l’événement, ex. certains cas tactiles). */
  const finalizeSchemaDragAtClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!schemaDraggingTool) return;
      const el = schemaPreviewRef.current;
      if (!el) {
        schemaDragFromAddCardStartRef.current = null;
        setSchemaDraggingTool(null);
        setSchemaDragPointer(null);
        setSchemaDropRatio(null);
        return;
      }
      const bounds = el.getBoundingClientRect();
      const inside =
        clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
      if (inside) {
        const x = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
        const ratio = bounds.width > 0 ? x / bounds.width : 1;
        const insertIndex = Math.max(0, Math.min(draft.blocks.length, Math.round(ratio * draft.blocks.length)));
        const block = createQuickSchemaBlock(schemaDraggingTool);
        insertDraftBlock(block, insertIndex);
        setSelectedBlockId(block.id);
      }
      schemaDragFromAddCardStartRef.current = null;
      setSchemaDraggingTool(null);
      setSchemaDragPointer(null);
      setSchemaDropRatio(null);
    },
    [createQuickSchemaBlock, draft.blocks.length, insertDraftBlock, schemaDraggingTool]
  );

  const handleSchemaDragStart = useCallback((tool: SchemaDragToolKind, event: ReactPointerEvent<HTMLElement>) => {
    schemaDragFromAddCardStartRef.current = { x: event.clientX, y: event.clientY };
    addBlockFromCardGestureMovedRef.current = false;
    setSchemaDraggingTool(tool);
    setSchemaDragPointer({ x: event.clientX, y: event.clientY });
  }, []);

  const handleSchemaPreviewPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!schemaDraggingTool) return;
    const target = schemaPreviewRef.current;
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
    const ratio = bounds.width > 0 ? x / bounds.width : 0;
    setSchemaDragPointer({ x: event.clientX, y: event.clientY });
    setSchemaDropRatio(ratio);
  }, [schemaDraggingTool]);

  useEffect(() => {
    if (!schemaDraggingTool) return;
    const onPointerMove = (event: PointerEvent) => {
      const start = schemaDragFromAddCardStartRef.current;
      if (start) {
        const dist = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (dist > 10) addBlockFromCardGestureMovedRef.current = true;
      }
      setSchemaDragPointer({ x: event.clientX, y: event.clientY });
      const target = schemaPreviewRef.current;
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        setSchemaDropRatio(null);
        return;
      }
      const x = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      setSchemaDropRatio(bounds.width > 0 ? x / bounds.width : 0);
    };
    const onPointerUp = (event: PointerEvent) => {
      finalizeSchemaDragAtClientPoint(event.clientX, event.clientY);
    };
    const onPointerCancel = () => {
      schemaDragFromAddCardStartRef.current = null;
      setSchemaDraggingTool(null);
      setSchemaDragPointer(null);
      setSchemaDropRatio(null);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [schemaDraggingTool, finalizeSchemaDragAtClientPoint]);

  const updateDraftBlock = useCallback((blockId: string, updater: (block: SessionBlock) => SessionBlock) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  }, []);

  const removeDraftBlock = useCallback((blockId: string) => {
    setDraft((prev) => {
      const filtered = prev.blocks.filter((block) => block.id !== blockId);
      return {
        ...prev,
        blocks: filtered.map((block, idx) => ({ ...block, order: idx + 1 })),
      };
    });
    setSelectedBlockId((prevSelected) => (prevSelected === blockId ? null : prevSelected));
  }, []);

  const confirmBlock = () => {
    if (!blockForm) return;
    setDraft((prev) => {
      if (!editingBlockId) {
        const nextBlocks = [...prev.blocks];
        const targetIndex = typeof pendingInsertIndex === "number" ? Math.max(0, Math.min(pendingInsertIndex, nextBlocks.length)) : nextBlocks.length;
        nextBlocks.splice(targetIndex, 0, blockForm);
        return {
          ...prev,
          blocks: nextBlocks.map((block, idx) => ({ ...block, order: idx + 1 })),
        };
      }
      return {
        ...prev,
        blocks: prev.blocks.map((block) => (block.id === editingBlockId ? { ...blockForm, order: block.order } : block)),
      };
    });
    setBlockSheetOpen(false);
    setBlockForm(null);
    setEditingBlockId(null);
    setPendingInsertIndex(null);
  };

  const moveBlockToIndex = useCallback((blockId: string, targetIndex: number) => {
    setDraft((prev) => {
      const index = prev.blocks.findIndex((b) => b.id === blockId);
      const target = Math.max(0, Math.min(targetIndex, prev.blocks.length - 1));
      if (index < 0 || target < 0 || target >= prev.blocks.length) return prev;
      if (index === target) return prev;
      const next = [...prev.blocks];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return { ...prev, blocks: next.map((block, idx) => ({ ...block, order: idx + 1 })) };
    });
  }, []);

  const clearBlockReorderPress = useCallback(() => {
    if (blockReorderPressTimerRef.current !== null) {
      window.clearTimeout(blockReorderPressTimerRef.current);
      blockReorderPressTimerRef.current = null;
    }
    blockReorderSourceRef.current = null;
  }, []);

  const startBlockReorderPress = useCallback((blockId: string) => {
    clearBlockReorderPress();
    blockReorderSourceRef.current = blockId;
    blockReorderPressTimerRef.current = window.setTimeout(() => {
      setDraggedBlockId(blockId);
      setDragOverBlockId(blockId);
    }, 220);
  }, [clearBlockReorderPress]);

  const finishBlockReorder = useCallback(() => {
    clearBlockReorderPress();
    if (draggedBlockId && dragOverBlockId && draggedBlockId !== dragOverBlockId) {
      const targetIndex = draft.blocks.findIndex((block) => block.id === dragOverBlockId);
      if (targetIndex >= 0) moveBlockToIndex(draggedBlockId, targetIndex);
    }
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  }, [clearBlockReorderPress, dragOverBlockId, draggedBlockId, draft.blocks, moveBlockToIndex]);

  const handleBlockReorderPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!draggedBlockId) return;
    const hovered = document.elementFromPoint(event.clientX, event.clientY);
    const overBlock = hovered instanceof HTMLElement ? hovered.closest<HTMLElement>("[data-block-id]") : null;
    const overId = overBlock?.dataset.blockId;
    if (overId) setDragOverBlockId(overId);
  }, [draggedBlockId]);

  const dayIndicatorsByDate = useMemo(() => {
    const map: Record<string, Array<{ color: string }>> = {};
    enrichedFilteredSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      const type = session.blocks[0]?.type;
      const color =
        type === "interval" ? "#EF4444" :
        type === "warmup" ? "#F97316" :
        type === "recovery" ? "#3B82F6" :
        type === "cooldown" ? "#10B981" :
        "#EAB308";
      if (!map[key]) map[key] = [];
      map[key].push({ color });
    });
    return map;
  }, [enrichedFilteredSessions]);

  const daySessionSummaryByDate = useMemo<Record<string, DaySessionSummary>>(() => {
    const groupedByDate = new Map<string, TrainingSession[]>();
    enrichedFilteredSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      if (!groupedByDate.has(key)) groupedByDate.set(key, []);
      groupedByDate.get(key)!.push(session);
    });

    const output: Record<string, DaySessionSummary> = {};
    weekDays.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      const list = groupedByDate.get(key) ?? [];
      if (isExplicitRestDay(list)) {
        output[key] = { sport: "rest", value: "Repos" };
        return;
      }
      const sorted = [...list].sort((a, b) => {
        const metricsA = resolveWorkoutMetrics({ segments: buildWorkoutSegments(a.blocks, { sport: a.sport, athleteIntensity: a.athleteIntensity ?? undefined }) });
        const metricsB = resolveWorkoutMetrics({ segments: buildWorkoutSegments(b.blocks, { sport: b.sport, athleteIntensity: b.athleteIntensity ?? undefined }) });
        const loadA = (metricsA.distanceKm || 0) * 10 + (metricsA.durationMin || 0);
        const loadB = (metricsB.distanceKm || 0) * 10 + (metricsB.durationMin || 0);
        return loadB - loadA;
      });
      const primary = sorted[0];
      const primaryMetrics = resolveWorkoutMetrics({ segments: buildWorkoutSegments(primary.blocks, { sport: primary.sport, athleteIntensity: primary.athleteIntensity ?? undefined }) });
      const totalDistance = sorted.reduce((acc, session) => {
        const metrics = resolveWorkoutMetrics({ segments: buildWorkoutSegments(session.blocks, { sport: session.sport, athleteIntensity: session.athleteIntensity ?? undefined }) });
        return acc + (metrics.distanceKm || 0);
      }, 0);
      const value =
        sorted.length > 1
          ? totalDistance > 0
            ? formatCalendarDistance(totalDistance)
            : primaryMetrics.distanceLabel || primaryMetrics.durationLabel
          : primaryMetrics.distanceLabel || primaryMetrics.durationLabel;
      if (!value) return;
      output[key] = { sport: toCalendarSummarySport(primary.sport), value };
    });

    return output;
  }, [enrichedFilteredSessions, weekDays]);

  const existingSessionsByDay = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    enrichedFilteredSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      map[key] = session.title;
    });
    return map;
  }, [enrichedFilteredSessions]);

  const activeClubName = clubs.find((club) => club.id === activeClubId)?.name;
  const activeAthlete = activeAthleteId ? athletes.find((athlete) => athlete.id === activeAthleteId) : undefined;
  const activeGroup = activeGroupId ? groups.find((group) => group.id === activeGroupId) : undefined;
  const coachName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.email ? user.email.split("@")[0] : "Coach");
  const sectionTitle =
    activeMenuKey === "my-plan"
      ? "Mon plan"
      : activeMenuKey === "planning"
      ? "Planification"
      : activeMenuKey === "tracking"
      ? "Suivi athlète"
      : activeMenuKey === "templates"
      ? "Modèles"
      : activeMenuKey === "club"
      ? "Gérer le club"
      : activeMenuKey === "dashboard"
      ? "Tableau de bord"
      : activeMenuKey === "groups"
      ? "Brouillons"
      : "Coaching";
  const [showCoachRequiredDialog, setShowCoachRequiredDialog] = useState(false);
  const hasCreateDraftWork = useMemo(
    () => Boolean(draft.title.trim()) || draft.blocks.length > 0,
    [draft.blocks.length, draft.title]
  );

  const goToCoachSection = useCallback(
    (key: CoachMenuKey) => {
      setActiveMenuKey(key);
      setDrawerOpen(false);
      if (key === "planning" || key === "my-plan") {
        setViewAsAthlete(key === "my-plan");
        setCoachingTab("planning");
        return;
      }
      if (key === "messages") {
        navigate("/messages");
        return;
      }
      if (key === "settings") {
        navigate("/profile/edit");
        return;
      }
      if (key === "tracking") {
        setTrackingSelectedAthleteId(null);
      }
      setCoachingTab("planning");
    },
    [navigate]
  );

  useEffect(() => {
    const st = location.state as { coachingClubManage?: { clubId: string } } | null | undefined;
    const clubId = st?.coachingClubManage?.clubId;
    if (!clubId || !user) return;
    setActiveClubId(clubId);
    goToCoachSection("club");
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, user, navigate, goToCoachSection]);

  const handleDrawerSelect = (key: CoachMenuKey) => {
    // Athlète sans rôle coach : tous les items "coach" déclenchent une popup d'invitation à créer un club.
    if (!isCoachMode && key !== "my-plan") {
      setDrawerOpen(false);
      setShowCoachRequiredDialog(true);
      return;
    }
    if (coachingTab === "create" && hasCreateDraftWork) {
      setPendingDrawerKey(key);
      setDrawerOpen(false);
      setShowExitDraftDialog(true);
      return;
    }
    goToCoachSection(key);
  };

  const openDirectMessage = async (memberId: string) => {
    if (!user) return;
    try {
      const { getOrCreateDirectConversation } = await import("@/lib/coachingMessaging");
      const conversationId = await getOrCreateDirectConversation(user.id, memberId);
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast.error("Impossible d'ouvrir la conversation");
    }
  };

  const athleteCoachesBrief = useMemo((): AthleteCoachBrief[] => {
    const m = new Map<string, AthleteCoachBrief>();
    athletePlanSessions.forEach((s) => {
      if (!m.has(s.coachId)) {
        m.set(s.coachId, {
          id: s.coachId,
          name: s.coachName,
          sport: sportLabel(s.sport),
          avatarUrl: s.coachAvatarUrl,
          clubName: s.clubName,
        });
      } else {
        const cur = m.get(s.coachId)!;
        const nextSport = sportLabel(s.sport);
        if (cur.sport !== nextSport) {
          m.set(s.coachId, { ...cur, sport: "Plusieurs sports" });
        }
      }
    });
    return Array.from(m.values());
  }, [athletePlanSessions]);

  const confirmAthleteSession = async (s: AthletePlanSessionModel) => {
    if (!s.participationId) {
      toast.error("Synchronisation en cours. Réessayez dans un instant.");
      return;
    }
    const { error } = await supabase.from("coaching_participations").update({ status: "confirmed" }).eq("id", s.participationId);
    if (error) {
      toast.error("Confirmation impossible", error.message);
      return;
    }
    toast.success("Séance confirmée");
    await loadAthleteWeek({ silent: true });
  };

  const completeAthleteSession = async (s: AthletePlanSessionModel) => {
    if (!s.participationId) {
      toast.error("Synchronisation en cours. Réessayez dans un instant.");
      return;
    }
    const { error } = await supabase
      .from("coaching_participations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", s.participationId);
    if (error) {
      toast.error("Mise à jour impossible", error.message);
      return;
    }
    toast.success("Séance enregistrée comme réalisée");
    await loadAthleteWeek({ silent: true });
  };

  const persistAthleteFeedback = async (
    s: AthletePlanSessionModel,
    payload: { note: string; rpe: number | null; felt: "easy" | "ok" | "hard" | null }
  ) => {
    if (!s.participationId) {
      toast.error("Participation introuvable");
      return;
    }
    const { error } = await supabase.from("coaching_participations").update({ athlete_note: payload.note || null }).eq("id", s.participationId);
    if (error) {
      toast.error("Enregistrement impossible", error.message);
      return;
    }
    toast.success("Retour enregistré");
    await loadAthleteWeek({ silent: true });
  };

  const updateMemberRole = async (memberId: string, role: ClubRole) => {
    if (!activeClubId) return;
    const payload = {
      is_admin: role === "admin",
      is_coach: role === "coach" || role === "admin",
    };
    const { error } = await supabase
      .from("group_members")
      .update(payload)
      .eq("conversation_id", activeClubId)
      .eq("user_id", memberId);
    if (error) {
      toast.error("Mise à jour du rôle impossible", error.message);
      return;
    }
    setClubMembers((prev) => prev.map((m) => (m.userId === memberId ? { ...m, role } : m)));
    toast.success("Rôle mis à jour");
  };

  const removeMemberFromClub = async (memberId: string) => {
    if (!activeClubId) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("conversation_id", activeClubId)
      .eq("user_id", memberId);
    if (error) {
      toast.error("Suppression impossible", error.message);
      return;
    }
    setClubMembers((prev) => prev.filter((m) => m.userId !== memberId));
    toast.success("Membre retiré du club");
  };

  const editClubInfo = async () => {
    if (!activeClubId) return;
    const nextName = window.prompt("Nom du club", activeClubName || "RunConnect Club");
    if (!nextName?.trim()) return;
    const nextLocation = window.prompt("Ville / localisation", clubLocation || "") || null;
    const { error } = await supabase
      .from("conversations")
      .update({ group_name: nextName.trim(), location: nextLocation })
      .eq("id", activeClubId);
    if (error) {
      toast.error("Modification impossible", error.message);
      return;
    }
    setClubs((prev) => prev.map((club) => (club.id === activeClubId ? { ...club, name: nextName.trim() } : club)));
    setClubLocation(nextLocation);
    toast.success("Informations du club mises à jour");
  };

  const createGroup = async () => {
    if (!activeClubId) return;
    const name = window.prompt("Nom du groupe", "Nouveau groupe");
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from("club_groups")
      .insert({ club_id: activeClubId, name: name.trim(), color: "#3B82F6" })
      .select("id, name")
      .single();
    if (error) {
      toast.error("Création du groupe impossible", error.message);
      return;
    }
    setGroups((prev) => [...prev, { id: data.id, name: data.name }]);
    setClubGroupsAdmin((prev) => [...prev, { id: data.id, name: data.name, athletesCount: 0 }]);
    toast.success("Groupe créé");
  };

  const deleteGroup = async (groupId: string) => {
    const { error } = await supabase.from("club_groups").delete().eq("id", groupId);
    if (error) {
      toast.error("Suppression du groupe impossible", error.message);
      return;
    }
    setClubGroupsAdmin((prev) => prev.filter((g) => g.id !== groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast.success("Groupe supprimé");
  };

  const resendInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from("club_invitations")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", invitationId);
    if (error) {
      toast.error("Renvoi impossible", error.message);
      return;
    }
    setClubInvitations((prev) => prev.map((inv) => (inv.id === invitationId ? { ...inv, status: "pending" } : inv)));
    toast.success("Invitation renvoyée");
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await supabase.from("club_invitations").delete().eq("id", invitationId);
    if (error) {
      toast.error("Annulation impossible", error.message);
      return;
    }
    setClubInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    toast.success("Invitation annulée");
  };

  const openOrCreateGroupConversation = async (group: {
    id: string;
    name: string;
    avatarUrl: string | null;
    memberIds: string[];
  }) => {
    if (!user || !activeClubId) return;
    const locationMarker = `club-group:${group.id}`;
    try {
      let conversationId: string | null = null;
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("is_group", true)
        .eq("location", locationMarker)
        .maybeSingle();
      if (existing?.id) {
        conversationId = existing.id;
        await supabase
          .from("conversations")
          .update({
            group_name: group.name,
            group_avatar_url: group.avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({
            is_group: true,
            group_name: group.name,
            group_avatar_url: group.avatarUrl,
            created_by: user.id,
            participant_1: user.id,
            participant_2: user.id,
            location: locationMarker,
          })
          .select("id")
          .single();
        if (createError) {
          toast.error("Impossible de créer la conversation groupe", createError.message);
          return;
        }
        conversationId = created.id;
      }
      if (!conversationId) return;

      const targetMemberIds = Array.from(new Set([user.id, ...group.memberIds]));
      const { data: existingMembers } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .in("user_id", targetMemberIds);
      const existingSet = new Set((existingMembers || []).map((entry) => entry.user_id));
      const toInsert = targetMemberIds
        .filter((memberId) => !existingSet.has(memberId))
        .map((memberId) => ({
          conversation_id: conversationId!,
          user_id: memberId,
          is_admin: memberId === user.id,
          is_coach: memberId === user.id,
        }));
      if (toInsert.length) {
        const { error: memberInsertError } = await supabase.from("group_members").insert(toInsert);
        if (memberInsertError) {
          toast.error("Impossible d'ajouter tous les membres au groupe", memberInsertError.message);
          return;
        }
      }
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast.error("Erreur lors de l'ouverture du groupe de discussion");
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-secondary" data-tutorial="tutorial-coaching">
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          headerWrapperClassName="shrink-0 border-b border-border bg-card"
          header={
            <PlanningHeader
              onOpenMenu={() => setDrawerOpen(true)}
              title={sectionTitle}
              subtitle={
                activeMenuKey === "my-plan"
                  ? `Semaine du ${format(weekAnchor, "d", { locale: fr })} au ${format(addDays(weekAnchor, 6), "d MMMM", { locale: fr })}`
                  : undefined
              }
            />
          }
          scrollClassName="bg-secondary"
          footer={
            activeMenuKey === "planning" && !effectiveAthleteMode ? (
              <div className="border-t border-border bg-card px-4 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" className="h-10 rounded-xl" onClick={() => copyAthleteWeek()}>
                    Copier la semaine
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 rounded-xl"
                    onClick={() => void pasteAthleteWeek()}
                    disabled={!copiedWeekSessions?.length || copiedFromAthleteId === activeAthleteId}
                  >
                    Coller la semaine
                  </Button>
                </div>
              </div>
            ) : null
          }
        >
          <div className={cn("space-y-0", activeMenuKey === "planning" ? "pb-0" : "pb-6")}>
            {activeMenuKey === "planning" && clubs.length > 1 && (
              <div className="border-b border-border bg-card">
                <p className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground">Club</p>
                <div className="divide-y divide-border">
                  {clubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setActiveClubId(club.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-[15px] font-medium transition-colors active:bg-secondary/80",
                        activeClubId === club.id ? "bg-primary text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {club.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMenuKey === "planning" && !effectiveAthleteMode && <PlanningSearchBar value={search} onChange={setSearch} />}

            {activeMenuKey === "planning" && !effectiveAthleteMode && (activeAthlete || activeGroup) && (
              <div className="border-b border-border bg-card px-4 py-2">
                {activeAthlete ? (
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
                    <span className="text-[14px] font-medium text-foreground">Athlète sélectionné : {activeAthlete.name}</span>
                    <button
                      type="button"
                      className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setActiveAthleteId(undefined)}
                      aria-label="Désélectionner l'athlète"
                    >
                      ×
                    </button>
                  </div>
                ) : activeGroup ? (
                  <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2">
                    <span className="text-[14px] font-medium text-foreground">Groupe sélectionné : {activeGroup.name}</span>
                    <button
                      type="button"
                      className="text-[13px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setActiveGroupId(undefined)}
                      aria-label="Désélectionner le groupe"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {activeMenuKey === "planning" && !effectiveAthleteMode && (searchResults.athletes.length > 0 || searchResults.groups.length > 0) && (
              <div className="divide-y divide-border border-b border-border bg-card">
                {searchResults.groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-secondary/80"
                    onClick={() => {
                      setActiveGroupId(group.id);
                      setActiveAthleteId(undefined);
                    }}
                  >
                    <span className="text-[15px] font-medium text-foreground">{group.name}</span>
                    <span className="text-[13px] text-muted-foreground">Groupe</span>
                  </button>
                ))}
                {searchResults.athletes.map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-secondary/80"
                    onClick={() => {
                      setActiveAthleteId(athlete.id);
                      setActiveGroupId(undefined);
                    }}
                  >
                    <span className="text-[15px] font-medium text-foreground">{athlete.name}</span>
                    <span className="text-[13px] text-muted-foreground">Athlète</span>
                  </button>
                ))}
              </div>
            )}

            {activeMenuKey === "my-plan" ? (
              <AthleteMyPlanView
                loading={athletePlanLoading}
                weekDays={weekDays}
                weekStart={weekAnchor}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onPreviousWeek={() => setWeekAnchor((current) => subWeeks(current, 1))}
                onNextWeek={() => setWeekAnchor((current) => addWeeks(current, 1))}
                sessions={athletePlanSessions}
                prevWeekPlannedKm={prevWeekAthleteKm}
                coaches={athleteCoachesBrief}
                onConfirmSession={confirmAthleteSession}
                onCompleteSession={completeAthleteSession}
                onMessageCoach={(id) => void openDirectMessage(id)}
                onPersistSessionFeedback={persistAthleteFeedback}
                onOpenCoaches={() => document.getElementById("athlete-coaches-block")?.scrollIntoView({ behavior: "smooth" })}
                onOpenMessages={() => navigate("/messages")}
                onOpenPastSessions={() => setWeekAnchor(startOfWeek(subWeeks(new Date(), 3), { weekStartsOn: 1 }))}
                onOpenCalendar={() => toast.info("Vue calendrier complet", "Cette navigation arrive bientôt.")}
                navigateProfile={(userId) => navigate(`/profile/${userId}`)}
              />
            ) : activeMenuKey === "planning" ? (
              <>
                <WeekSelectorPremium
                  weekStart={weekAnchor}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onPreviousWeek={() => setWeekAnchor((current) => subWeeks(current, 1))}
                  onNextWeek={() => setWeekAnchor((current) => addWeeks(current, 1))}
                  indicatorsByDate={dayIndicatorsByDate}
                  sessionSummaryByDate={daySessionSummaryByDate}
                  showLegend
                />

                <div className="flex flex-col border-t border-border">
                  {weekDays.map((day) => {
                const daySessions = enrichedFilteredSessions.filter((session) => isSameDay(new Date(session.assignedDate), day));
                const session = daySessions[0];
                const isSelectedDay = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                const normalizedSegments = session
                  ? buildWorkoutSegments(session.blocks, {
                      sport: session.sport,
                      athleteIntensity: session.athleteIntensity ?? undefined,
                    })
                  : [];
                const sportHint: "running" | "cycling" | "swimming" | "strength" | "other" | undefined = session
                  ? session.sport === "cycling"
                    ? "cycling"
                    : session.sport === "swimming"
                      ? "swimming"
                      : session.sport === "strength"
                        ? "strength"
                        : session.sport === "running"
                          ? "running"
                          : "other"
                  : undefined;
                const workoutMetrics = session
                  ? resolveWorkoutMetrics({
                      segments: normalizedSegments,
                    })
                  : null;
                const summary = session
                  ? {
                      title: buildWorkoutHeadline({ title: session.title, segments: normalizedSegments, sport: sportHint }),
                      subtitle: session.title,
                      duration: workoutMetrics?.durationLabel,
                      distance: workoutMetrics?.distanceLabel,
                      intensityLabel: [workoutMetrics?.intensityLabel, workoutMetrics?.feedbackLabel].filter(Boolean).join(" • "),
                      miniProfile: renderWorkoutMiniProfile(normalizedSegments),
                      isRestDay: isExplicitRestDay([session]),
                      sportHint,
                    }
                  : undefined;
                const accentColor = workoutAccentColor(normalizedSegments, sportHint, summary?.isRestDay);
                return (
                  <DayPlanningRow
                    key={day.toISOString()}
                    dayLabel={format(day, "EEEE", { locale: fr })}
                    dateLabel={format(day, "d MMM", { locale: fr })}
                    isSelected={isSelectedDay}
                    session={summary}
                    isSent={session?.sent}
                    accentColor={accentColor}
                    onAdd={() => openCreateForDate(day)}
                    onOpen={session ? () => openEditSession(session.id) : undefined}
                    onEdit={session ? () => openEditSession(session.id) : undefined}
                    onSend={
                      session
                        ? () => void (session.sent ? unsendSession(session.id) : sendSession(session.id))
                        : undefined
                    }
                    onDuplicate={session ? () => void duplicateSession(session, addDays(day, 1)) : undefined}
                    onDelete={session ? () => void removeSession(session.id) : undefined}
                    onUnsend={session ? () => void unsendSession(session.id) : undefined}
                    allowSessionActions={!effectiveAthleteMode}
                  />
                );
                  })}
                </div>
              </>
            ) : activeMenuKey === "dashboard" ? (
              activeClubId ? (
                <CoachDashboardPage
                  clubId={activeClubId}
                  onOpenLateAthletes={() => {
                    setActiveMenuKey("tracking");
                    setTrackingSelectedAthleteId(null);
                  }}
                  onOpenMessages={() => navigate("/messages")}
                  onOpenPlanning={() => {
                    setActiveMenuKey("planning");
                    setCoachingTab("planning");
                  }}
                  onOpenTemplates={() => {
                    setActiveMenuKey("templates");
                    setCoachingTab("planning");
                  }}
                />
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Tableau de bord</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher le dashboard.</p>
                </div>
              )
            ) : activeMenuKey === "tracking" ? (
              activeClubId ? (
                <WeeklyTrackingView
                  clubId={activeClubId}
                  onClose={() => undefined}
                  selectedAthleteId={trackingSelectedAthleteId}
                  onSelectAthlete={setTrackingSelectedAthleteId}
                />
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Suivi athlète</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher le suivi.</p>
                </div>
              )
            ) : activeMenuKey === "templates" ? (
              <ModelsPage
                weekDays={weekDays}
                existingSessionsByDay={existingSessionsByDay}
                myModels={myModels}
                baseModels={BASE_MODELS}
                onCreateModel={() => void createModelFromDraft()}
                onAddToPlanning={(model, day, replaceExisting) => void addModelToPlanning(model, day, replaceExisting)}
                onEditModel={editModel}
                onDuplicateModel={(model) => void duplicateModel(model)}
                onDeleteModel={(model) => void deleteModel(model)}
              />
            ) : activeMenuKey === "groups" ? (
              activeClubId ? (
                <CoachingDraftsPage
                  clubId={activeClubId}
                  onOpenDraft={(draftItem) => void openDraftFromList(draftItem)}
                />
              ) : (
                <div className="border-b border-border bg-secondary/30 px-4 py-6">
                  <p className="text-[16px] font-semibold text-foreground">Brouillons</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Sélectionnez un club pour afficher les brouillons.</p>
                </div>
              )
            ) : activeMenuKey === "club" ? (
              <ClubManagementPage
                clubName={activeClubName || "RunConnect Club"}
                clubLocation={clubLocation}
                clubAvatarUrl={clubAvatarUrl}
                athletesCount={clubMembers.filter((m) => m.role === "athlete").length}
                coachesCount={clubMembers.filter((m) => m.role === "coach" || m.role === "admin").length}
                groupsCount={clubGroupsAdmin.length}
                plannedSessionsCount={plannedSessionsCount}
                validatedSessionsCount={validatedSessionsCount}
                members={clubMembers}
                groups={clubGroupsAdmin}
                invitations={clubInvitations}
                onInviteAthlete={() => setInviteDialogOpen(true)}
                onInviteCoach={() => setInviteDialogOpen(true)}
                onCreateGroup={() => void createGroup()}
                onEditClub={() => void editClubInfo()}
                onViewGroups={() => setActiveMenuKey("groups")}
                onOpenMemberProfile={(userId) => navigate(`/profile/${userId}`)}
                onSendMessage={(userId) => void openDirectMessage(userId)}
                onChangeRole={(userId, role) => void updateMemberRole(userId, role)}
                onRemoveMember={(userId) => void removeMemberFromClub(userId)}
                onOpenGroup={() => setActiveMenuKey("groups")}
                onEditGroup={() => setActiveMenuKey("groups")}
                onDeleteGroup={(groupId) => void deleteGroup(groupId)}
                onAssignMembers={() => setActiveMenuKey("groups")}
                onResendInvitation={(invitationId) => void resendInvitation(invitationId)}
                onCancelInvitation={(invitationId) => void cancelInvitation(invitationId)}
              />
            ) : (
              <div className="border-b border-border bg-secondary/30 px-4 py-6">
                <p className="text-[16px] font-semibold text-foreground">
                  {(activeMenuKey as string) === "dashboard" && "Tableau de bord coach"}
                  {activeMenuKey === "athletes" && "Athlètes"}
                  {(activeMenuKey as string) === "groups" && "Groupes"}
                  {(activeMenuKey as string) === "tracking" && "Suivi athlète"}
                  {activeMenuKey === "library" && "Bibliothèque de séances"}
                  {(activeMenuKey as string) === "templates" && "Modèles"}
                  {(activeMenuKey as string) === "club" && "Gérer le club"}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Section prête dans le drawer coach. La navigation latérale est active et ce module peut être enrichi ensuite.
                </p>
              </div>
            )}
          </div>
        </IosFixedPageHeaderShell>
      </div>

      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeKey={activeMenuKey}
        onSelect={handleDrawerSelect}
        coachName={coachName}
        clubName={activeClubName}
        clubAvatarUrl={clubAvatarUrl}
        userMode={effectiveAthleteMode ? "athlete" : "coach"}
        otherClubsCount={Math.max(clubs.length - 1, 0)}
        onPressClubSwitcher={rotateActiveClub}
      />

      <AlertDialog open={showCoachRequiredDialog} onOpenChange={setShowCoachRequiredDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vous n'êtes pas coach dans ce club</AlertDialogTitle>
            <AlertDialogDescription>
              Cette section est réservée aux coachs. Créez votre propre club pour devenir coach et accéder à la planification, au suivi et aux groupes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Plus tard</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCoachRequiredDialog(false);
                navigate("/messages?createClub=1");
              }}
            >
              Créer un club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitDraftDialog} onOpenChange={setShowExitDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enregistrer le brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta séance en cours n&apos;est pas encore enregistrée. Tu peux la reprendre plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                const nextKey = pendingDrawerKey;
                setPendingDrawerKey(null);
                setShowExitDraftDialog(false);
                if (nextKey) {
                  goToCoachSection(nextKey);
                } else {
                  setCoachingTab("planning");
                }
              }}
            >
              Quitter sans enregistrer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const saved = await saveSession();
                if (!saved) return;
                const nextKey = pendingDrawerKey;
                setPendingDrawerKey(null);
                setShowExitDraftDialog(false);
                if (nextKey) {
                  goToCoachSection(nextKey);
                } else {
                  setCoachingTab("planning");
                }
              }}
            >
              Enregistrer et quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteMembersDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clubId={activeClubId || undefined}
      />

      {coachingTab === "create" && (
        <div className="fixed inset-0 z-[120] flex min-h-0 flex-col overflow-hidden bg-secondary">
          <IosFixedPageHeaderShell
            className="min-h-0 h-full"
            headerWrapperClassName="shrink-0 border-b border-border bg-card"
            header={
              <div className="pt-[var(--safe-area-top)]">
                <IosPageHeaderBar
                  left={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[16px] font-medium text-primary"
                      onClick={() => {
                        if (hasCreateDraftWork) {
                          setPendingDrawerKey("planning");
                          setShowExitDraftDialog(true);
                          return;
                        }
                        setCoachingTab("planning");
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Retour
                    </button>
                  }
                  title="Créer une séance"
                  right={
                    editorTab === "build" ? (
                      <button
                        type="button"
                        onClick={() => void saveSession()}
                        disabled={draft.blocks.length === 0}
                        className={cn(
                          "text-[16px] font-semibold",
                          draft.blocks.length ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        Enregistrer
                      </button>
                    ) : (
                      <span className="inline-block w-14" aria-hidden />
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2 px-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setEditorTab("build")}
                    className={cn(
                      "rounded-xl py-2 text-center text-[13px] font-semibold transition-colors",
                      editorTab === "build" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    Construire
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("models")}
                    className={cn(
                      "rounded-xl py-2 text-center text-[13px] font-semibold transition-colors",
                      editorTab === "models" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                    )}
                  >
                    Modèles
                  </button>
                </div>
              </div>
            }
            scrollClassName="bg-secondary pb-24"
            footer={
              editorTab === "build" && (
                <div className="border-t border-border bg-card px-4 py-3 pb-[max(0.9rem,var(--safe-area-bottom))]">
                  <button
                    type="button"
                    className={cn(
                      "mb-2 inline-flex h-8 w-full items-center rounded-full border border-slate-200 bg-white px-3 text-left text-[12px] font-medium text-foreground shadow-[0_10px_26px_-24px_rgba(15,23,42,0.45)]",
                      savePulse && "animate-pulse"
                    )}
                    title={sessionTranscript}
                  >
                    <span className="truncate">{sessionTranscript}</span>
                  </button>
                  <Button
                    onClick={() => void saveSession()}
                    className="h-11 w-full rounded-xl text-[15px] font-semibold"
                    disabled={draft.blocks.length === 0}
                  >
                    Enregistrer la séance
                  </Button>
                </div>
              )
            }
          >
            {editorTab === "build" ? (
              <div className="space-y-4 px-4 pb-6">
                <div
                  className="ios-card -mx-4 overflow-hidden border-x-0 border-border/70 bg-secondary/35 shadow-[var(--shadow-card)] sm:mx-0 sm:rounded-2xl sm:border-x"
                >
                  <div className="space-y-3 px-4 py-3">
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Nom de la séance"
                      className="h-11 rounded-2xl border-border bg-white text-[15px] dark:bg-card"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {SPORTS.map((sport) => (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, sport: sport.id }))}
                          className={cn(
                            "flex h-14 items-center justify-center rounded-2xl border transition-all",
                            draft.sport === sport.id
                              ? "border-primary/70 bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                              : "border-border/80 bg-white text-foreground dark:bg-card"
                          )}
                          title={sport.label}
                          aria-label={sport.label}
                        >
                          <span className="text-[24px] leading-none" aria-hidden="true">
                            {sport.emoji}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="ios-card -mx-4 overflow-hidden border-x-0 border-border/70 bg-secondary/35 shadow-[var(--shadow-card)] sm:mx-0 sm:rounded-2xl sm:border-x"
                >
                  <div className="space-y-3 px-4 py-3">
                    <p className="text-[14px] font-semibold text-foreground">Schéma de séance</p>
                    <div className="flex gap-1.5">
                      <div
                        className="flex h-[96px] w-5 shrink-0 flex-col border-r border-slate-200/60 pt-1.5 pb-2.5 pr-1 text-[8px] font-bold leading-none"
                        aria-hidden
                      >
                        <div className="grid min-h-0 w-full flex-1 grid-rows-6">
                          {(["Z6", "Z5", "Z4", "Z3", "Z2", "Z1"] as const).map((z) => (
                            <div key={z} className="flex min-h-0 items-center justify-end">
                              <span className="text-right" style={{ color: miniProfileZoneColor(z) }}>
                                {z}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          ref={schemaPreviewRef}
                          onPointerMove={handleSchemaPreviewPointerMove}
                          onPointerDown={(event) => {
                            if (event.target === event.currentTarget) {
                              setSchemaTooltip(null);
                            }
                          }}
                          className={cn(
                            "relative",
                            schemaDraggingTool ? "cursor-copy rounded-md ring-2 ring-[#2563EB]/35" : ""
                          )}
                          title={schemaDraggingTool ? "Placez le bloc sur le schéma" : undefined}
                        >
                          <MiniWorkoutProfile
                            blocks={previewBars}
                            variant="premiumCompact"
                            barHeightScale={1}
                            zoneBandMode
                            selectedBlockIndex={selectedSchemaPreviewIndex}
                            onBackgroundTap={() => setSchemaTooltip(null)}
                            onBlockTap={({ index, anchorX, anchorTop }) => {
                              if (!schemaTooltipBlocks.length) return;
                              const mappedDraftIndex =
                                schemaTooltipBlocks.length <= 1 || previewBars.length <= 1
                                  ? 0
                                  : Math.round((index / Math.max(1, previewBars.length - 1)) * (schemaTooltipBlocks.length - 1));
                              const block = schemaTooltipBlocks[Math.max(0, Math.min(schemaTooltipBlocks.length - 1, mappedDraftIndex))];
                              if (!block) return;
                              setSelectedBlockId(block.id);
                              setSchemaTooltip({
                                blockIndex: index,
                                anchorX,
                                anchorTop,
                                label: blockBubbleLabel(block, draft.sport),
                              });
                            }}
                            className="h-[96px] w-full"
                          />
                          {schemaTooltip ? (
                            <div
                              ref={schemaTooltipRef}
                              className="pointer-events-none absolute z-20 max-w-[16rem] rounded-full bg-slate-950/88 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(2,6,23,0.95)] backdrop-blur-[2px]"
                              style={{
                                left: (() => {
                                  const containerWidth = schemaPreviewRef.current?.clientWidth ?? 0;
                                  const maxLeft = Math.max(8, containerWidth - schemaTooltipWidth - 8);
                                  const preferred = schemaTooltip.anchorX - schemaTooltipWidth / 2;
                                  return Math.max(8, Math.min(preferred, maxLeft));
                                })(),
                                top: Math.max(4, schemaTooltip.anchorTop - 8),
                                transform: "translateY(-100%)",
                              }}
                            >
                              {schemaTooltip.label}
                              <span
                                aria-hidden
                                className="absolute h-2.5 w-2.5 rotate-45 bg-slate-950/88"
                                style={{
                                  left: (() => {
                                    const containerWidth = schemaPreviewRef.current?.clientWidth ?? 0;
                                    const maxLeft = Math.max(8, containerWidth - schemaTooltipWidth - 8);
                                    const preferred = schemaTooltip.anchorX - schemaTooltipWidth / 2;
                                    const bubbleLeft = Math.max(8, Math.min(preferred, maxLeft));
                                    const arrow = schemaTooltip.anchorX - bubbleLeft - 5;
                                    return Math.max(8, Math.min(arrow, Math.max(8, schemaTooltipWidth - 14)));
                                  })(),
                                  bottom: -4,
                                }}
                              />
                            </div>
                          ) : null}
                          {schemaDropRatio != null ? (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-y-2.5 w-1 rounded-full bg-[#2563EB] shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                              style={{ left: `calc(${Math.max(0, Math.min(100, schemaDropRatio * 100))}% - 2px)` }}
                            />
                          ) : null}
                        </div>
                        <div className="mt-1 flex min-h-[14px] justify-between gap-0.5 pl-0.5 text-[7px] font-semibold tabular-nums text-slate-500 sm:text-[8px]">
                          {sessionTimeAxisLabels.map((t) => (
                            <span key={t} className="min-w-0 max-w-[3rem] flex-1 truncate text-center text-[#2563EB]/70">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="mb-2 mt-5 text-[12px] font-semibold text-slate-600">Ajouter un bloc</p>
                    <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(
                        [
                          {
                            key: "steady" as const,
                            title: "Continu",
                            mini: (
                              <svg viewBox="0 0 88 36" className="h-11 w-full max-w-[4.5rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
                                <rect x="8" y="12" width="72" height="12" rx="4" fill="#10B981" fillOpacity="0.92" />
                              </svg>
                            ),
                          },
                          {
                            key: "interval" as const,
                            title: "Intervalle",
                            mini: (
                              <svg viewBox="0 0 88 36" className="h-11 w-full max-w-[4.5rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
                                <rect x="6" y="6" width="16" height="24" rx="2" fill="#EF4444" fillOpacity="0.96" />
                                <rect x="26" y="22" width="16" height="8" rx="2" fill="#2563EB" fillOpacity="0.92" />
                                <rect x="46" y="6" width="16" height="24" rx="2" fill="#EF4444" fillOpacity="0.96" />
                                <rect x="66" y="22" width="16" height="8" rx="2" fill="#2563EB" fillOpacity="0.92" />
                              </svg>
                            ),
                          },
                          {
                            key: "pyramid" as const,
                            title: "Pyramide",
                            mini: (
                              <svg viewBox="0 0 88 36" className="h-11 w-full max-w-[4.5rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
                                <rect x="8" y="14" width="10" height="16" rx="1.5" fill="#F97316" fillOpacity="0.9" />
                                <rect x="22" y="10" width="10" height="20" rx="1.5" fill="#EF4444" fillOpacity="0.93" />
                                <rect x="36" y="4" width="12" height="26" rx="2" fill="#000000" fillOpacity="0.95" />
                                <rect x="52" y="10" width="10" height="20" rx="1.5" fill="#EF4444" fillOpacity="0.93" />
                                <rect x="66" y="14" width="10" height="16" rx="1.5" fill="#F97316" fillOpacity="0.9" />
                              </svg>
                            ),
                          },
                        ] as const
                      ).map((card) => (
                        <div
                          key={card.key}
                          role="button"
                          tabIndex={0}
                          onPointerDown={(e) => handleSchemaDragStart(card.key, e)}
                          onClick={() => {
                            if (addBlockFromCardGestureMovedRef.current) {
                              addBlockFromCardGestureMovedRef.current = false;
                              return;
                            }
                            addQuickSchemaBlock(card.key);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              addQuickSchemaBlock(card.key);
                            }
                          }}
                          className="group flex aspect-square w-[4.75rem] shrink-0 cursor-grab flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white select-none touch-none transition hover:border-[#2563EB]/45 active:cursor-grabbing sm:w-20"
                        >
                          <div className="pointer-events-none flex min-h-0 flex-1 items-center justify-center p-1.5">
                            {card.mini}
                          </div>
                          <p className="shrink-0 px-1 pb-1.5 text-center text-[11px] font-bold leading-tight text-foreground sm:text-xs">{card.title}</p>
                        </div>
                      ))}

                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Variation — glisser vers le schéma pour placer"
                        onPointerDown={(e) => handleSchemaDragStart("variation", e)}
                        onClick={() => {
                          if (addBlockFromCardGestureMovedRef.current) {
                            addBlockFromCardGestureMovedRef.current = false;
                            return;
                          }
                          addQuickSchemaBlock("variation");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            addQuickSchemaBlock("variation");
                          }
                        }}
                        className="group flex aspect-square w-[4.75rem] shrink-0 cursor-grab flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white select-none touch-none transition hover:border-[#2563EB]/45 active:cursor-grabbing sm:w-20"
                      >
                        <div className="pointer-events-none flex min-h-0 flex-1 items-center justify-center p-1.5">
                          <svg viewBox="0 0 88 36" className="h-11 w-full max-w-[4.5rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
                            <rect x="8" y="22" width="14" height="8" rx="2" fill="#2563EB" fillOpacity="0.9" />
                            <rect x="26" y="16" width="14" height="14" rx="2" fill="#10B981" fillOpacity="0.92" />
                            <rect x="44" y="10" width="14" height="20" rx="2" fill="#FACC15" fillOpacity="0.94" />
                            <rect x="62" y="4" width="14" height="26" rx="2" fill="#F97316" fillOpacity="0.95" />
                          </svg>
                        </div>
                        <p className="shrink-0 px-1 pb-1.5 text-center text-[11px] font-bold leading-tight text-foreground sm:text-xs">
                          Variation
                        </p>
                      </div>

                    </div>
                    {schemaDraggingTool && schemaDragPointer ? (
                      <div
                        className="pointer-events-none fixed z-[120] rounded-full border border-[#2563EB]/45 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] shadow-lg"
                        style={{ left: schemaDragPointer.x + 10, top: schemaDragPointer.y + 10 }}
                      >
                        {schemaDraggingTool === "steady"
                          ? "Continu"
                          : schemaDraggingTool === "interval"
                            ? "Intervalle"
                            : schemaDraggingTool === "pyramid"
                              ? "Pyramide"
                              : "Variation"}
                      </div>
                    ) : null}
                </div>
                </div>

                  {draft.blocks.length > 0 ? (
                    <div className="mt-3 -mx-4 space-y-2 sm:mx-0">
                      {draft.blocks.map((block, index) => {
                        const label = blockDisplayLabel(block);
                        const isDragged = draggedBlockId === block.id;
                        const isDropTarget = dragOverBlockId === block.id;
                        const isSelected = selectedBlockId === block.id;
                        const typeMeta = blockTypeMeta(block.type);
                        const accents = blockAccent(block.type);
                        const intervalRepetitions = Math.max(1, (block.repetitions || 1) * (block.blockRepetitions || 1));

                        return (
                          <div key={block.id} className="relative">
                            <div
                              data-block-id={block.id}
                              className={cn(
                                "ios-card relative rounded-none border-x-0 border-border/80 bg-card pl-12 pr-3 py-3 shadow-[var(--shadow-card)] transition-all sm:rounded-[20px] sm:border-x",
                                isDropTarget || isSelected ? "border-[#2563EB]/60 bg-[#2563EB]/[0.04]" : "",
                                isDragged && "opacity-70"
                              )}
                              onClick={() => setSelectedBlockId(block.id)}
                              onPointerMove={handleBlockReorderPointerMove}
                              onPointerUp={finishBlockReorder}
                              onPointerCancel={finishBlockReorder}
                            >
                              <button
                                type="button"
                                aria-label={`Déplacer ${label}`}
                                className={cn(
                                  "absolute inset-y-2 left-2 inline-flex w-8 items-center justify-center rounded-xl border border-white/60 text-white touch-none shadow-[0_8px_18px_-12px_rgba(0,0,0,0.45)]",
                                  accents.iconWrap
                                )}
                                onPointerDown={() => startBlockReorderPress(block.id)}
                                onPointerUp={finishBlockReorder}
                                onPointerCancel={finishBlockReorder}
                              >
                                <GripVertical className={cn("h-5 w-5", accents.iconColor)} />
                              </button>
                              <div className={cn("pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-100", accents.tint)} />
                              {index < draft.blocks.length - 1 ? (
                                <span
                                  aria-hidden
                                  className="absolute -bottom-8 left-1/2 h-8 w-[3px] -translate-x-1/2 rounded-full bg-[#2563EB]/55"
                                />
                              ) : null}

                              <div className="relative mb-3 flex items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/60 text-white shadow-[0_8px_18px_-12px_rgba(0,0,0,0.45)]",
                                    accents.iconWrap
                                  )}
                                  aria-hidden
                                >
                                  <typeMeta.icon className={cn("h-4 w-4", accents.iconColor)} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[14px] font-bold uppercase tracking-[0.06em] text-foreground">
                                      {label}
                                    </p>
                                    {block.type === "interval" ? (
                                      <span className="rounded-full bg-[#2563EB]/12 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                                        x{intervalRepetitions}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[12px] text-muted-foreground">
                                    {index + 1}. {blockSummary(block)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Ajouter un bloc après ${label}`}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-primary"
                                    onClick={() => openInsertBlockPicker(index + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Supprimer ${label}`}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-white text-red-500"
                                    onClick={() => removeDraftBlock(block.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {block.type === "interval" ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <CoachingMetricPill
                                      label="Blocs"
                                      value={`${block.blockRepetitions ?? 1}`}
                                      placeholder="1"
                                      onClick={() =>
                                        openWheel(
                                          "Blocs",
                                          Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                                          String(block.blockRepetitions ?? 1),
                                          (next) => updateDraftBlock(block.id, (current) => ({ ...current, blockRepetitions: Number(next) }))
                                        )
                                      }
                                    />
                                    <CoachingMetricPill
                                      label="Répétitions"
                                      value={`${block.repetitions ?? 1}`}
                                      placeholder="1"
                                      onClick={() =>
                                        openWheel(
                                          "Répétitions",
                                          Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                                          String(block.repetitions ?? 1),
                                          (next) => updateDraftBlock(block.id, (current) => ({ ...current, repetitions: Number(next) }))
                                        )
                                      }
                                    />
                                    <CoachingMetricPill
                                      label="RPE"
                                      value={block.rpe ? `${block.rpe}/10` : ""}
                                      placeholder="8"
                                      onClick={() =>
                                        openWheel(
                                          "RPE",
                                          Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                                          String(block.rpe ?? 8),
                                          (next) => updateDraftBlock(block.id, (current) => ({ ...current, rpe: Number(next) }))
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-1.5">
                                    <CoachingMetricPill
                                      label="Distance"
                                      value={simpleBlockDistanceValue(block.distanceM)}
                                      placeholder="250"
                                      onClick={() => {
                                        const meters = block.distanceM || 0;
                                        const wholeKm = Math.floor(meters / 1000);
                                        const remMeters = Math.max(0, meters - wholeKm * 1000);
                                        setWheelAValue(String(wholeKm));
                                        setWheelBValue(String(Math.round(remMeters / 25) * 25));
                                        setWheelUnit("km");
                                        openWheelColumns(
                                          "Distance du bloc",
                                          [
                                            { items: DISTANCE_KM_WHOLE_OPTIONS, value: String(wholeKm), onChange: setWheelAValue, suffix: "km" },
                                            { items: DISTANCE_METERS_25_OPTIONS, value: String(Math.round(remMeters / 25) * 25), onChange: setWheelBValue, suffix: "m" },
                                          ],
                                          () => {
                                            const next = (Number.parseInt(wheelARef.current, 10) || 0) * 1000 + (Number.parseInt(wheelBRef.current, 10) || 0);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, distanceM: next }, "distance")
                                                : { ...current, distanceM: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Temps"
                                      value={block.durationSec ? secondsToLabel(block.durationSec) : ""}
                                      placeholder="45"
                                      onClick={() => {
                                        const total = block.durationSec || 0;
                                        const nextA = String(Math.floor(total / 3600));
                                        const nextB = String(Math.floor((total % 3600) / 60));
                                        const nextC = String(total % 60);
                                        setWheelAValue(nextA);
                                        setWheelBValue(nextB);
                                        setWheelCValue(nextC);
                                        openWheelColumns(
                                          "Durée du bloc",
                                          [
                                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                          ],
                                          () => {
                                            const next =
                                              Number.parseInt(wheelARef.current, 10) * 3600 +
                                              Number.parseInt(wheelBRef.current, 10) * 60 +
                                              Number.parseInt(wheelCRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, durationSec: next }, "duration")
                                                : { ...current, durationSec: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Allure"
                                      value={block.paceSecPerKm ? compactPaceLabel(block.paceSecPerKm) : ""}
                                      placeholder="4'30"
                                      onClick={() => {
                                        const pace = block.paceSecPerKm || 270;
                                        setWheelAValue(String(Math.floor(pace / 60)));
                                        setWheelBValue(String(pace % 60));
                                        setWheelUnit("min/km");
                                        openWheelColumns(
                                          "Allure du bloc",
                                          [
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(Math.floor(pace / 60)), onChange: setWheelAValue, suffix: "'" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(pace % 60), onChange: setWheelBValue, suffix: "''" },
                                          ],
                                          () => {
                                            const next = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, paceSecPerKm: next }, "pace")
                                                : { ...current, paceSecPerKm: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <CoachingMetricPill
                                      label="Récup effort"
                                      value={block.blockRecoveryDurationSec ? secondsToLabel(block.blockRecoveryDurationSec) : ""}
                                      placeholder="60"
                                      onClick={() => {
                                        const total = block.blockRecoveryDurationSec || 0;
                                        const nextA = String(Math.floor(total / 3600));
                                        const nextB = String(Math.floor((total % 3600) / 60));
                                        const nextC = String(total % 60);
                                        setWheelAValue(nextA);
                                        setWheelBValue(nextB);
                                        setWheelCValue(nextC);
                                        openWheelColumns(
                                          "Récupération entre blocs",
                                          [
                                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                          ],
                                          () => {
                                            const next =
                                              Number.parseInt(wheelARef.current, 10) * 3600 +
                                              Number.parseInt(wheelBRef.current, 10) * 60 +
                                              Number.parseInt(wheelCRef.current, 10);
                                            updateDraftBlock(block.id, (current) => ({ ...current, blockRecoveryDurationSec: next }));
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Récup série"
                                      value={block.recoveryDurationSec ? secondsToLabel(block.recoveryDurationSec) : ""}
                                      placeholder="30"
                                      onClick={() => {
                                        const total = block.recoveryDurationSec || 0;
                                        const nextA = String(Math.floor(total / 3600));
                                        const nextB = String(Math.floor((total % 3600) / 60));
                                        const nextC = String(total % 60);
                                        setWheelAValue(nextA);
                                        setWheelBValue(nextB);
                                        setWheelCValue(nextC);
                                        openWheelColumns(
                                          "Récupération entre répétitions",
                                          [
                                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                          ],
                                          () => {
                                            const next =
                                              Number.parseInt(wheelARef.current, 10) * 3600 +
                                              Number.parseInt(wheelBRef.current, 10) * 60 +
                                              Number.parseInt(wheelCRef.current, 10);
                                            updateDraftBlock(block.id, (current) => ({ ...current, recoveryDurationSec: next }));
                                          }
                                        );
                                      }}
                                    />
                                  </div>

                                </div>
                              ) : block.notes?.includes("[Pyramid]") ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <CoachingMetricPill
                                      label="Allure"
                                      value={block.paceSecPerKm ? compactPaceLabel(block.paceSecPerKm) : ""}
                                      placeholder="5'30"
                                      onClick={() => {
                                        const pace = block.paceSecPerKm || 330;
                                        setWheelAValue(String(Math.floor(pace / 60)));
                                        setWheelBValue(String(pace % 60));
                                        setWheelUnit("min/km");
                                        openWheelColumns(
                                          "Allure du bloc",
                                          [
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(Math.floor(pace / 60)), onChange: setWheelAValue, suffix: "'" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(pace % 60), onChange: setWheelBValue, suffix: "''" },
                                          ],
                                          () => {
                                            const next = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, paceSecPerKm: next }, "pace")
                                                : { ...current, paceSecPerKm: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Distance"
                                      value={simpleBlockDistanceValue(block.distanceM)}
                                      placeholder="5"
                                      onClick={() => {
                                        const meters = block.distanceM || 0;
                                        const wholeKm = Math.floor(meters / 1000);
                                        const remMeters = Math.max(0, meters - wholeKm * 1000);
                                        setWheelAValue(String(wholeKm));
                                        setWheelBValue(String(Math.round(remMeters / 25) * 25));
                                        setWheelUnit("km");
                                        openWheelColumns(
                                          "Distance du bloc",
                                          [
                                            { items: DISTANCE_KM_WHOLE_OPTIONS, value: String(wholeKm), onChange: setWheelAValue, suffix: "km" },
                                            { items: DISTANCE_METERS_25_OPTIONS, value: String(Math.round(remMeters / 25) * 25), onChange: setWheelBValue, suffix: "m" },
                                          ],
                                          () => {
                                            const next = (Number.parseInt(wheelARef.current, 10) || 0) * 1000 + (Number.parseInt(wheelBRef.current, 10) || 0);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, distanceM: next }, "distance")
                                                : { ...current, distanceM: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Temps"
                                      value={block.durationSec ? secondsToLabel(block.durationSec) : ""}
                                      placeholder="30"
                                      onClick={() => {
                                        const total = block.durationSec || 0;
                                        const nextA = String(Math.floor(total / 3600));
                                        const nextB = String(Math.floor((total % 3600) / 60));
                                        const nextC = String(total % 60);
                                        setWheelAValue(nextA);
                                        setWheelBValue(nextB);
                                        setWheelCValue(nextC);
                                        openWheelColumns(
                                          "Durée du bloc",
                                          [
                                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                          ],
                                          () => {
                                            const next =
                                              Number.parseInt(wheelARef.current, 10) * 3600 +
                                              Number.parseInt(wheelBRef.current, 10) * 60 +
                                              Number.parseInt(wheelCRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveRunningVolume({ ...current, durationSec: next }, "duration")
                                                : { ...current, durationSec: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 gap-2">
                                    <CoachingMetricPill
                                      label="Paliers"
                                      value={`${block.repetitions ?? 5}`}
                                      placeholder="5"
                                      onClick={() =>
                                        openWheel(
                                          "Paliers",
                                          Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                                          String(block.repetitions ?? 5),
                                          (next) => updateDraftBlock(block.id, (current) => ({ ...current, repetitions: Number(next) }))
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              ) : isProgressiveBlock(block) ? (
                                <div className="space-y-2">
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <CoachingMetricPill
                                      label="Allure début"
                                      value={block.paceStartSecPerKm ? compactPaceLabel(block.paceStartSecPerKm) : ""}
                                      placeholder="5'30"
                                      onClick={() => {
                                        const pace = block.paceStartSecPerKm || block.paceSecPerKm || 330;
                                        setWheelAValue(String(Math.floor(pace / 60)));
                                        setWheelBValue(String(pace % 60));
                                        setWheelUnit("min/km");
                                        openWheelColumns(
                                          "Allure de début",
                                          [
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(Math.floor(pace / 60)), onChange: setWheelAValue, suffix: "'" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(pace % 60), onChange: setWheelBValue, suffix: "''" },
                                          ],
                                          () => {
                                            const next = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveProgressiveRunningVolume({ ...current, paceStartSecPerKm: next }, "paceStart")
                                                : { ...current, paceStartSecPerKm: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Allure finale"
                                      value={block.paceEndSecPerKm ? compactPaceLabel(block.paceEndSecPerKm) : ""}
                                      placeholder="4'45"
                                      onClick={() => {
                                        const pace = block.paceEndSecPerKm || block.paceSecPerKm || 285;
                                        setWheelAValue(String(Math.floor(pace / 60)));
                                        setWheelBValue(String(pace % 60));
                                        setWheelUnit("min/km");
                                        openWheelColumns(
                                          "Allure finale",
                                          [
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(Math.floor(pace / 60)), onChange: setWheelAValue, suffix: "'" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(pace % 60), onChange: setWheelBValue, suffix: "''" },
                                          ],
                                          () => {
                                            const next = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveProgressiveRunningVolume({ ...current, paceEndSecPerKm: next }, "paceEnd")
                                                : { ...current, paceEndSecPerKm: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="RPE"
                                      value={block.rpe ? `${block.rpe}/10` : ""}
                                      placeholder="7"
                                      onClick={() =>
                                        openWheel(
                                          "RPE",
                                          Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                                          String(block.rpe ?? 7),
                                          (next) => updateDraftBlock(block.id, (current) => ({ ...current, rpe: Number(next), intensityMode: "rpe" }))
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <CoachingMetricPill
                                      label="Distance"
                                      value={simpleBlockDistanceValue(block.distanceM)}
                                      placeholder="5"
                                      onClick={() => {
                                        const meters = block.distanceM || 0;
                                        const wholeKm = Math.floor(meters / 1000);
                                        const remMeters = Math.max(0, meters - wholeKm * 1000);
                                        setWheelAValue(String(wholeKm));
                                        setWheelBValue(String(Math.round(remMeters / 25) * 25));
                                        setWheelUnit("km");
                                        openWheelColumns(
                                          "Distance du bloc",
                                          [
                                            { items: DISTANCE_KM_WHOLE_OPTIONS, value: String(wholeKm), onChange: setWheelAValue, suffix: "km" },
                                            { items: DISTANCE_METERS_25_OPTIONS, value: String(Math.round(remMeters / 25) * 25), onChange: setWheelBValue, suffix: "m" },
                                          ],
                                          () => {
                                            const next = (Number.parseInt(wheelARef.current, 10) || 0) * 1000 + (Number.parseInt(wheelBRef.current, 10) || 0);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveProgressiveRunningVolume({ ...current, distanceM: next }, "distance")
                                                : { ...current, distanceM: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                    <CoachingMetricPill
                                      label="Temps"
                                      value={block.durationSec ? secondsToLabel(block.durationSec) : ""}
                                      placeholder="30"
                                      onClick={() => {
                                        const total = block.durationSec || 0;
                                        const nextA = String(Math.floor(total / 3600));
                                        const nextB = String(Math.floor((total % 3600) / 60));
                                        const nextC = String(total % 60);
                                        setWheelAValue(nextA);
                                        setWheelBValue(nextB);
                                        setWheelCValue(nextC);
                                        openWheelColumns(
                                          "Durée du bloc",
                                          [
                                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                          ],
                                          () => {
                                            const next =
                                              Number.parseInt(wheelARef.current, 10) * 3600 +
                                              Number.parseInt(wheelBRef.current, 10) * 60 +
                                              Number.parseInt(wheelCRef.current, 10);
                                            updateDraftBlock(block.id, (current) =>
                                              draft.sport === "running"
                                                ? deriveProgressiveRunningVolume({ ...current, durationSec: next }, "duration")
                                                : { ...current, durationSec: next }
                                            );
                                          }
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-1.5">
                                  <CoachingMetricPill
                                    label="Allure"
                                    value={block.paceSecPerKm ? compactPaceLabel(block.paceSecPerKm) : ""}
                                    placeholder="5'30"
                                    onClick={() => {
                                      const pace = block.paceSecPerKm || 330;
                                      setWheelAValue(String(Math.floor(pace / 60)));
                                      setWheelBValue(String(pace % 60));
                                      setWheelUnit("min/km");
                                      openWheelColumns(
                                        "Allure du bloc",
                                        [
                                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(Math.floor(pace / 60)), onChange: setWheelAValue, suffix: "'" },
                                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: String(pace % 60), onChange: setWheelBValue, suffix: "''" },
                                        ],
                                        () => {
                                          const next = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                                          updateDraftBlock(block.id, (current) =>
                                            draft.sport === "running"
                                              ? deriveRunningVolume({ ...current, paceSecPerKm: next }, "pace")
                                              : { ...current, paceSecPerKm: next }
                                          );
                                        }
                                      );
                                    }}
                                  />
                                  <CoachingMetricPill
                                    label="Distance"
                                    value={simpleBlockDistanceValue(block.distanceM)}
                                    placeholder="5"
                                    onClick={() => {
                                      const meters = block.distanceM || 0;
                                      const wholeKm = Math.floor(meters / 1000);
                                      const remMeters = Math.max(0, meters - wholeKm * 1000);
                                      setWheelAValue(String(wholeKm));
                                      setWheelBValue(String(Math.round(remMeters / 25) * 25));
                                      setWheelUnit("km");
                                      openWheelColumns(
                                        "Distance du bloc",
                                        [
                                          { items: DISTANCE_KM_WHOLE_OPTIONS, value: String(wholeKm), onChange: setWheelAValue, suffix: "km" },
                                          { items: DISTANCE_METERS_25_OPTIONS, value: String(Math.round(remMeters / 25) * 25), onChange: setWheelBValue, suffix: "m" },
                                        ],
                                        () => {
                                          const next = (Number.parseInt(wheelARef.current, 10) || 0) * 1000 + (Number.parseInt(wheelBRef.current, 10) || 0);
                                          updateDraftBlock(block.id, (current) =>
                                            draft.sport === "running"
                                              ? deriveRunningVolume({ ...current, distanceM: next }, "distance")
                                              : { ...current, distanceM: next }
                                          );
                                        }
                                      );
                                    }}
                                  />
                                  <CoachingMetricPill
                                    label="Temps"
                                    value={block.durationSec ? secondsToLabel(block.durationSec) : ""}
                                    placeholder="30"
                                    onClick={() => {
                                      const total = block.durationSec || 0;
                                      const nextA = String(Math.floor(total / 3600));
                                      const nextB = String(Math.floor((total % 3600) / 60));
                                      const nextC = String(total % 60);
                                      setWheelAValue(nextA);
                                      setWheelBValue(nextB);
                                      setWheelCValue(nextC);
                                      openWheelColumns(
                                        "Durée du bloc",
                                        [
                                          { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                                        ],
                                        () => {
                                          const next =
                                            Number.parseInt(wheelARef.current, 10) * 3600 +
                                            Number.parseInt(wheelBRef.current, 10) * 60 +
                                            Number.parseInt(wheelCRef.current, 10);
                                          updateDraftBlock(block.id, (current) =>
                                            draft.sport === "running"
                                              ? deriveRunningVolume({ ...current, durationSec: next }, "duration")
                                              : { ...current, durationSec: next }
                                          );
                                        }
                                      );
                                    }}
                                  />
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {shouldShowAthleteZoneLegend ? (
                    <div className="mt-2 rounded-xl border border-slate-100 bg-white/95 px-2.5 py-2">
                      <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                        Légende zones {selectedAthlete?.name ?? "athlète"}
                      </p>
                      <div className="overflow-x-auto">
                        <div className="inline-flex min-w-full items-center gap-3 whitespace-nowrap text-[12px] text-foreground">
                          {PREVIEW_ZONE_ORDER.map((zone) => {
                            const range = selectedAthleteRunningRefs?.zones?.[zone];
                            if (!range) return null;
                            return (
                              <span key={`zone-legend-inline-${zone}`} className="inline-flex items-center gap-1.5">
                                <span className={cn("h-2.5 w-2.5 rounded-full", zoneToPreviewColorClass(zone))} />
                                <span className="font-semibold">{zone}</span>
                                <span className="text-muted-foreground">
                                  {compactPaceLabel(range.maxPace)}-{compactPaceLabel(range.minPace)}/km
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
              </div>
            ) : (
              <ModelsPage
                weekDays={weekDays}
                existingSessionsByDay={existingSessionsByDay}
                myModels={myModels}
                baseModels={BASE_MODELS}
                onCreateModel={() => void createModelFromDraft()}
                onAddToPlanning={async (model, day, replaceExisting) => {
                  const ok = await addModelToPlanning(model, day, replaceExisting);
                  if (ok) setCoachingTab("planning");
                }}
                onEditModel={(model) => {
                  editModel(model);
                }}
                onDuplicateModel={(model) => void duplicateModel(model)}
                onDeleteModel={(model) => void deleteModel(model)}
              />
            )}
          </IosFixedPageHeaderShell>
        </div>
      )}

      <Sheet open={blockSheetOpen} onOpenChange={setBlockSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex h-[78dvh] flex-col overflow-hidden rounded-t-[20px] border-border bg-card p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted" />
            <p className="text-center text-[17px] font-semibold text-foreground">
              {blockStep === "type" ? "Choisir un type de bloc" : "Configurer le bloc"}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {blockStep === "type" ? (
              <div className="space-y-2 px-4 py-4">
              {ADD_BLOCK_CHOICES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left transition-transform active:scale-[0.99]",
                    entry.tone
                  )}
                  onClick={() => {
                    if (!blockForm) return;
                    const nextOrder = (pendingInsertIndex ?? draft.blocks.length) + 1;
                    if (entry.id === "steady") {
                      insertDraftBlock(createDefaultBlock("steady", nextOrder), pendingInsertIndex);
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    if (entry.id === "interval") {
                      insertDraftBlock(createDefaultBlock("interval", nextOrder), pendingInsertIndex);
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    if (entry.id === "warmup") {
                      insertDraftBlock(createDefaultBlock("warmup", nextOrder), pendingInsertIndex);
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    if (entry.id === "cooldown") {
                      insertDraftBlock(createDefaultBlock("cooldown", nextOrder), pendingInsertIndex);
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    if (entry.id === "recovery") {
                      insertDraftBlock(createDefaultBlock("recovery", nextOrder), pendingInsertIndex);
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    if (entry.id === "pyramid") {
                      insertDraftBlock(
                        {
                          ...createDefaultBlock("steady", nextOrder),
                          repetitions: 5,
                          notes: "[Pyramid]",
                          zone: "Z4",
                        },
                        pendingInsertIndex
                      );
                      setBlockSheetOpen(false);
                      setBlockForm(null);
                      setPendingInsertIndex(null);
                      return;
                    }
                    setBlockForm({ ...blockForm, type: entry.id });
                    setBlockStep("config");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", entry.iconTone)}>
                      <entry.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-foreground">
                        {entry.emoji} {entry.label}
                      </p>
                      <p className="text-[12px] text-muted-foreground">{entry.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
              </div>
            ) : blockForm ? (
              <div className="space-y-3 px-4 py-4">
                {(() => {
                const hasDuration = isPositive(blockForm.durationSec);
                const hasDistance = isPositive(blockForm.distanceM);
                const hasPace = isPositive(blockForm.paceSecPerKm);
                const computedPace =
                  hasDuration && hasDistance
                    ? Math.round((blockForm.durationSec! / blockForm.distanceM!) * 1000)
                    : undefined;
                const paceDelta =
                  hasPace && computedPace ? Math.abs((blockForm.paceSecPerKm as number) - computedPace) : 0;
                const hasVolumeConflict = hasDuration && hasDistance && hasPace && paceDelta > 8;
                return (
                  <>
              {(() => {
                const meta = blockTypeMeta(blockForm.type);
                const guidance =
                  blockForm.type === "warmup"
                    ? "Pose le rythme de départ avec une montée progressive et lisible."
                    : blockForm.type === "interval"
                      ? "Cadre l’effort, les répétitions et la récupération dans une seule fiche."
                      : blockForm.type === "cooldown"
                        ? "Termine la séance avec un retour au calme simple et propre."
                        : blockForm.type === "recovery"
                          ? "Garde un bloc facile pour faire redescendre la charge."
                          : "Crée un bloc stable avec un volume clair et une intensité nette.";

                return (
                  <div className={cn("rounded-[28px] border p-4 shadow-[0_18px_42px_-30px_hsl(var(--foreground)/0.2)]", meta.tone)}>
                    <div className="flex items-start gap-3">
                      <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_12px_28px_-20px_hsl(var(--foreground)/0.3)]", meta.iconTone)}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[17px] font-semibold text-foreground">
                              {meta.emoji} {meta.label}
                            </p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">{meta.detail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBlockStep("type")}
                            className="rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-[12px] font-medium text-primary shadow-[0_10px_20px_-18px_hsl(var(--foreground)/0.35)]"
                          >
                            Changer
                          </button>
                        </div>
                        <div className="mt-3 rounded-[20px] border border-border/60 bg-background/90 px-4 py-3">
                          <p className="text-[13px] leading-relaxed text-foreground">{guidance}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="rounded-[30px] border border-border/80 bg-card p-3 shadow-[0_20px_44px_-30px_hsl(var(--foreground)/0.24)]">
                <div className="overflow-hidden rounded-[24px] border border-border/80 bg-background">
                  <button
                    type="button"
                    className="flex min-h-[84px] w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/35"
                    onClick={() => {
                      const derivedPace =
                        blockForm.durationSec && blockForm.distanceM && blockForm.distanceM > 0
                          ? Math.round((blockForm.durationSec / blockForm.distanceM) * 1000)
                          : undefined;
                      setWheelUnit("min/km");
                      const pace = blockForm.paceSecPerKm || derivedPace || 330;
                      const nextA = String(Math.floor(pace / 60));
                      const nextB = String(pace % 60);
                      setWheelAValue(nextA);
                      setWheelBValue(nextB);
                      openWheelColumns(
                        "Allure moyenne estimée",
                        [
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextA, onChange: setWheelAValue, suffix: "'" },
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "''" },
                          { items: [{ value: "min/km", label: "/km" }, { value: "min/mi", label: "/mi" }, { value: "s/100", label: "/100m" }], value: wheelUnit, onChange: setWheelUnit },
                        ],
                        () => {
                          const unit = wheelUnit;
                          if (unit === "s/100") {
                            const sec100 = Number.parseInt(wheelARef.current, 10);
                            const pacePerKm = sec100 * 10;
                            setBlockForm((prev) => {
                              if (!prev) return prev;
                              const draftNext = { ...prev, paceSecPerKm: pacePerKm, powerWatts: undefined };
                              return draft.sport === "running" ? deriveRunningVolume(draftNext, "pace") : draftNext;
                            });
                            return;
                          }
                          const secBase = Number.parseInt(wheelARef.current, 10) * 60 + Number.parseInt(wheelBRef.current, 10);
                          const pacePerKm = unit === "min/mi" ? Math.round(secBase / 1.609344) : secBase;
                          setBlockForm((prev) => {
                            if (!prev) return prev;
                            const draftNext = { ...prev, paceSecPerKm: pacePerKm, powerWatts: undefined };
                            return draft.sport === "running" ? deriveRunningVolume(draftNext, "pace") : draftNext;
                          });
                        }
                      );
                    }}
                  >
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Gauge className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-medium text-foreground">Allure</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-right text-[18px] font-semibold tabular-nums text-foreground">
                        {paceCardLabel(
                          blockForm.paceSecPerKm ||
                            (blockForm.durationSec && blockForm.distanceM && blockForm.distanceM > 0
                              ? Math.round((blockForm.durationSec / blockForm.distanceM) * 1000)
                              : undefined)
                        )}
                        <span className="ml-1 text-[15px] font-medium text-muted-foreground">
                          {draft.sport === "swimming" ? "/100m" : "/km"}
                        </span>
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>

                  <div className="mx-4 h-px bg-border/70" aria-hidden />

                  <button
                    type="button"
                    className="flex min-h-[84px] w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/35"
                    onClick={() => {
                      const meters = blockForm.distanceM || 0;
                      let selectedUnit: "km" | "mi" = wheelUnit === "mi" ? "mi" : "km";
                      let nextA = "0";
                      let nextB = "0";
                      if (draft.sport === "swimming") {
                        const snapped = Math.max(0, Math.round(meters / 25) * 25);
                        nextA = String(snapped);
                        nextB = "0";
                        setWheelUnit("m");
                      } else if (selectedUnit === "mi") {
                        const miles = meters / 1609.344;
                        const wholeMi = Math.floor(miles);
                        const decMi = Math.max(0, Math.min(99, Math.round((miles - wholeMi) * 100)));
                        nextA = String(wholeMi);
                        nextB = String(decMi);
                      } else {
                        selectedUnit = "km";
                        const wholeKm = Math.floor(meters / 1000);
                        const remMeters = Math.max(0, meters - wholeKm * 1000);
                        const snapped = Math.min(975, Math.max(0, Math.round(remMeters / 25) * 25));
                        nextA = String(wholeKm);
                        nextB = String(snapped);
                        setWheelUnit("km");
                      }
                      setWheelAValue(nextA);
                      setWheelBValue(nextB);
                      openWheelColumns(
                        "Distance",
                        draft.sport === "swimming"
                          ? [{ items: DISTANCE_METERS_ONLY_25_OPTIONS, value: nextA, onChange: setWheelAValue, suffix: "m" }]
                          : selectedUnit === "mi"
                            ? [
                                { items: DISTANCE_KM_WHOLE_OPTIONS, value: nextA, onChange: setWheelAValue, suffix: "mi" },
                                { items: DISTANCE_MI_DEC_OPTIONS, value: nextB, onChange: setWheelBValue },
                                { items: [{ value: "km", label: "km" }, { value: "mi", label: "mi" }], value: wheelUnit, onChange: setWheelUnit },
                              ]
                            : [
                                { items: DISTANCE_KM_WHOLE_OPTIONS, value: nextA, onChange: setWheelAValue, suffix: "km" },
                                { items: DISTANCE_METERS_25_OPTIONS, value: nextB, onChange: setWheelBValue, suffix: "m" },
                                { items: [{ value: "km", label: "km" }, { value: "mi", label: "mi" }], value: wheelUnit, onChange: setWheelUnit },
                              ],
                        () => {
                          let next = 0;
                          if (draft.sport === "swimming") {
                            next = Math.max(0, Number.parseInt(wheelARef.current, 10) || 0);
                          } else if (wheelUnit === "mi") {
                            const wholeMi = Math.max(0, Number.parseInt(wheelARef.current, 10) || 0);
                            const decMi = Math.max(0, Math.min(99, Number.parseInt(wheelBRef.current, 10) || 0));
                            next = Math.round((wholeMi + decMi / 100) * 1609.344);
                          } else {
                            const wholeKm = Math.max(0, Number.parseInt(wheelARef.current, 10) || 0);
                            const remMeters = Math.min(975, Math.max(0, Number.parseInt(wheelBRef.current, 10) || 0));
                            next = wholeKm * 1000 + remMeters;
                          }
                          setBlockForm((prev) => {
                            if (!prev) return prev;
                            const nextDistance = Number.isFinite(next) ? next : 0;
                            const draftNext = { ...prev, distanceM: nextDistance };
                            return draft.sport === "running" ? deriveRunningVolume(draftNext, "distance") : draftNext;
                          });
                        }
                      );
                    }}
                  >
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Ruler className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-medium text-foreground">Distance</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-right text-[18px] font-semibold tabular-nums text-foreground">
                        {draft.sport === "swimming"
                          ? Math.round(blockForm.distanceM || 0).toLocaleString("fr-FR")
                          : distanceCardLabel(blockForm.distanceM)}
                        <span className="ml-1 text-[15px] font-medium text-muted-foreground">
                          {draft.sport === "swimming" ? "m" : "km"}
                        </span>
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>

                  <div className="mx-4 h-px bg-border/70" aria-hidden />

                  <button
                    type="button"
                    className="flex min-h-[84px] w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/35"
                    onClick={() => {
                      const total = blockForm.durationSec || 0;
                      const nextA = String(Math.floor(total / 3600));
                      const nextB = String(Math.floor((total % 3600) / 60));
                      const nextC = String(total % 60);
                      setWheelAValue(nextA);
                      setWheelBValue(nextB);
                      setWheelCValue(nextC);
                      openWheelColumns(
                        "Durée",
                        [
                          { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                          { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                        ],
                        () => {
                          const next =
                            Number.parseInt(wheelARef.current, 10) * 3600 +
                            Number.parseInt(wheelBRef.current, 10) * 60 +
                            Number.parseInt(wheelCRef.current, 10);
                          setBlockForm((prev) => {
                            if (!prev) return prev;
                            const draftNext = { ...prev, durationSec: next };
                            return draft.sport === "running" ? deriveRunningVolume(draftNext, "duration") : draftNext;
                          });
                        }
                      );
                    }}
                  >
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Clock3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-medium text-foreground">Temps</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-right text-[18px] font-semibold tabular-nums text-foreground">{durationClockLabel(blockForm.durationSec)}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </div>

                {hasVolumeConflict && draft.sport === "running" ? (
                  <p className="mt-2 px-1 text-[11px] text-chart-3">
                    Valeurs incohérentes: l’allure est automatiquement ajustée selon durée + distance.
                  </p>
                ) : null}

                <div className="mt-4 rounded-[24px] border border-primary/10 bg-primary/5 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Crosshair className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] text-foreground">Zone estimée</p>
                      <p className="mt-0.5 text-[18px] font-semibold text-foreground">
                        {formatZoneBadge(blockForm.zone)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {blockForm.type === "interval" && (
                <div className="rounded-[28px] border border-border/80 bg-card p-3 shadow-[0_18px_40px_-30px_hsl(var(--foreground)/0.22)]">
                  <div className="mb-3 px-1">
                    <p className="text-[17px] font-semibold text-foreground">Intervalles</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Réglage rapide des répétitions et de la récupération.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="h-14 justify-start rounded-[18px] border border-border/70 bg-background px-4 text-[14px] font-semibold shadow-none"
                      onClick={() =>
                        openWheel(
                          "Répétitions",
                          Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
                          String(blockForm.repetitions || 1),
                          (next) => setBlockForm((prev) => (prev ? { ...prev, repetitions: Number(next) } : prev))
                        )
                      }
                    >
                      Répétitions · {blockForm.repetitions || 1}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-14 justify-start rounded-[18px] border border-border/70 bg-background px-4 text-[14px] font-semibold shadow-none"
                      onClick={() => {
                        const total = blockForm.recoveryDurationSec || 0;
                        const nextA = String(Math.floor(total / 3600));
                        const nextB = String(Math.floor((total % 3600) / 60));
                        const nextC = String(total % 60);
                        setWheelAValue(nextA);
                        setWheelBValue(nextB);
                        setWheelCValue(nextC);
                        openWheelColumns(
                          "Récupération",
                          [
                            { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: nextA, onChange: setWheelAValue, suffix: "h" },
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextB, onChange: setWheelBValue, suffix: "m" },
                            { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: nextC, onChange: setWheelCValue, suffix: "s" },
                          ],
                          () => {
                            const next =
                              Number.parseInt(wheelARef.current, 10) * 3600 +
                              Number.parseInt(wheelBRef.current, 10) * 60 +
                              Number.parseInt(wheelCRef.current, 10);
                            setBlockForm((prev) => (prev ? { ...prev, recoveryDurationSec: next } : prev));
                          }
                        );
                      }}
                    >
                      Récup · {secondsToLabel(blockForm.recoveryDurationSec) || "Aucune"}
                    </Button>
                  </div>
                </div>
              )}

                  </>
                );
              })()}

              <div className="rounded-[28px] border border-border/80 bg-card p-4 shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.2)]">
                <div className="mb-3">
                  <p className="text-[17px] font-semibold text-foreground">Intensité</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Choisis une zone cardio ou un ressenti RPE pour ce bloc.</p>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-1 rounded-[18px] bg-secondary/55 p-1">
                  <button
                    type="button"
                    className={cn(
                      "rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition-all",
                      (blockForm.intensityMode ?? "zones") === "zones"
                        ? "bg-card text-foreground shadow-[0_10px_22px_-18px_hsl(var(--foreground)/0.35)]"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setBlockForm((prev) => (prev ? { ...prev, intensityMode: "zones" } : prev))}
                  >
                    Mode zone
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-[14px] px-3 py-2.5 text-[13px] font-semibold transition-all",
                      (blockForm.intensityMode ?? "zones") === "rpe"
                        ? "bg-card text-foreground shadow-[0_10px_22px_-18px_hsl(var(--foreground)/0.35)]"
                        : "text-muted-foreground"
                    )}
                    onClick={() => setBlockForm((prev) => (prev ? { ...prev, intensityMode: "rpe" } : prev))}
                  >
                    Mode RPE
                  </button>
                </div>

                {(blockForm.intensityMode ?? "zones") === "zones" ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {ZONE_META.map((zone) => (
                      <button
                        key={zone.zone}
                        type="button"
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-all",
                          blockForm.zone === zone.zone ? "border-primary bg-primary/10 shadow-[0_10px_24px_-18px_hsl(var(--primary)/0.8)]" : "border-border bg-secondary/35"
                        )}
                        onClick={() => setBlockForm((prev) => (prev ? { ...prev, zone: zone.zone } : prev))}
                      >
                        <p className="text-[13px] font-semibold text-foreground">{zone.label}</p>
                        <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{zone.description}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2 min-[360px]:grid-cols-10">
                      {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
                        const selected = (blockForm.rpe ?? 3) === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setBlockForm((prev) => (prev ? { ...prev, rpe: value } : prev))}
                            className={cn(
                              "flex h-11 items-center justify-center rounded-2xl border text-[18px] font-semibold tabular-nums transition-all",
                              selected ? "border-primary bg-primary text-primary-foreground shadow-[0_14px_30px_-20px_hsl(var(--primary)/0.95)]" : "border-border bg-secondary/30 text-foreground"
                            )}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-[15px] text-muted-foreground">
                      {(blockForm.rpe ?? 3) <= 3 ? "Facile" : (blockForm.rpe ?? 3) <= 6 ? "Modéré" : (blockForm.rpe ?? 3) <= 8 ? "Soutenu" : "Très intense"}
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={confirmBlock} className="h-11 w-full rounded-xl text-[15px] font-semibold">
                Valider le bloc
              </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <WheelValuePickerModal
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        title={wheelTitle}
        columns={wheelColumns}
        onConfirm={() => {
          applyWheel?.();
          setWheelOpen(false);
        }}
      />
    </>
  );
}

