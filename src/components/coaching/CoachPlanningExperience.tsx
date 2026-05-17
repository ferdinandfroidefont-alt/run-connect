import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { addDays, addWeeks, format, getISOWeek, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  Bike,
  CalendarDays,
  Check,
  Clock3,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Dumbbell,
  Flame,
  Gauge,
  GripVertical,
  Leaf,
  Lock,
  Minus,
  MoreHorizontal,
  Plus,
  Ruler,
  Settings,
  Trash2,
  Waves,
  X,
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
import { DayPlanningRow, MonPlanSchemaBars } from "@/components/coaching/planning/DayPlanningRow";
import { buildWorkoutSegments, renderWorkoutMiniProfile } from "@/lib/workoutVisualization";
import { buildWorkoutHeadline, resolveWorkoutMetrics, workoutAccentColor } from "@/lib/workoutPresentation";
import { MiniWorkoutProfile } from "@/components/coaching/MiniWorkoutProfile";
import { AppDrawer, type CoachMenuKey } from "@/components/coaching/drawer/AppDrawer";
import { ModelsPage } from "@/components/coaching/models/ModelsPage";
import type { SessionModelItem } from "@/components/coaching/models/types";
import { parseRCC } from "@/lib/rccParser";
import {
  ClubManagementPage,
  type ClubMemberItem,
  type ClubGroupItem,
  type ClubInvitationItem,
  type ClubRole,
  type ClubSettingsMaquetteVariant,
} from "@/components/coaching/club/ClubManagementPage";
import { InviteMembersDialog } from "@/components/InviteMembersDialog";
import { ClubProfileDialog } from "@/components/ClubProfileDialog";
import { WeeklyTrackingView } from "@/components/coaching/WeeklyTrackingView";
import { CoachingDraftsPage, type CoachingDraftListItem } from "@/components/coaching/CoachingDraftsPage";
import { CoachDashboardPage } from "@/components/coaching/dashboard/CoachDashboardPage";
import { CoachingRolePill } from "@/components/coaching/handoff/CoachingRolePill";
import { CoachPlanificationLanding, type CoachUpcomingSessionRow, type LandingAthleteCard } from "@/components/coaching/handoff/CoachPlanificationLanding";
import { CoachPlanificationMonthCalendar, type PlanCalendarSession, type PlanCalendarAthlete } from "@/components/coaching/planning/CoachPlanificationMonthCalendar";
import { Group } from "@/components/apple/Group";
import type { AthleteCoachBrief, AthletePlanSessionModel } from "@/components/coaching/athlete-plan/types";
import { parseSport, sportLabel } from "@/components/coaching/athlete-plan/sportTokens";
import {
  formatCalendarDistance,
  isExplicitRestDay,
  mapParticipationToUiStatus,
  toCalendarSummarySport,
} from "@/components/coaching/athlete-plan/planUtils";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { buildAthleteIntensityContext } from "@/lib/athleteWorkoutContext";
import { runningRecordsFromPrivateRows, type CoachPrivateRecordRow } from "@/lib/coachPrivateRunningRecords";
import { PLANIFIER_MAQUETTE_GROUPED_BG, planifierMaquetteFontStackStyle } from "@/lib/coachingPlanifierMaquette";

/** Timeline Mon plan / programmer : semaines à partir de la semaine ISO courante uniquement (sans passé), défilement vers les suivantes. */
const COACHING_TIMELINE_WEEK_COUNT = 13;

/** Plage type maquette `MonPlanTimeline` · RunConnect (7).jsx (`27 AVR - 3 MAI`). */
function formatMaquetteMonPlanWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const piece = (d: Date) =>
    format(d, "d MMM", { locale: fr })
      .replace(/\./g, "")
      .toUpperCase();
  return `${piece(weekStart)} - ${piece(end)}`;
}

type SportType = "running" | "cycling" | "swimming" | "strength";
type BlockType = "warmup" | "interval" | "steady" | "recovery" | "cooldown";
type IntensityMode = "zones" | "rpe";
type ZoneKey = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";
type PyramidMode = "symetrique" | "croissante" | "decroissante" | "manuelle";

type SchemaToolKind = "steady" | "interval" | "pyramid" | "variation" | "libre" | "repetition";
type SchemaDragToolKind = "steady" | "interval" | "pyramid" | "variation";

function schemaDragToolLabel(tool: SchemaDragToolKind) {
  if (tool === "steady") return "Continu";
  if (tool === "interval") return "Intervalle";
  if (tool === "pyramid") return "Pyramide";
  return "Variation";
}

function SchemaDragToolMini({ tool }: { tool: SchemaDragToolKind }) {
  if (tool === "steady") {
    return (
      <svg viewBox="0 0 88 36" className="h-8 w-[4.25rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <rect x="8" y="12" width="72" height="12" rx="4" fill="#10B981" fillOpacity="0.92" />
      </svg>
    );
  }
  if (tool === "interval") {
    return (
      <svg viewBox="0 0 88 36" className="h-8 w-[4.25rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <rect x="6" y="6" width="16" height="24" rx="2" fill="#F97316" fillOpacity="0.96" />
        <rect x="26" y="22" width="16" height="8" rx="2" fill="#9CA3AF" fillOpacity="0.92" />
        <rect x="46" y="6" width="16" height="24" rx="2" fill="#F97316" fillOpacity="0.96" />
        <rect x="66" y="22" width="16" height="8" rx="2" fill="#9CA3AF" fillOpacity="0.92" />
      </svg>
    );
  }
  if (tool === "pyramid") {
    return (
      <svg viewBox="0 0 88 36" className="h-8 w-[4.25rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <rect x="8" y="14" width="10" height="16" rx="1.5" fill="#FACC15" fillOpacity="0.92" />
        <rect x="22" y="10" width="10" height="20" rx="1.5" fill="#F97316" fillOpacity="0.93" />
        <rect x="36" y="4" width="12" height="26" rx="2" fill="#EF4444" fillOpacity="0.95" />
        <rect x="52" y="10" width="10" height="20" rx="1.5" fill="#F97316" fillOpacity="0.93" />
        <rect x="66" y="14" width="10" height="16" rx="1.5" fill="#FACC15" fillOpacity="0.92" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 88 36" className="h-8 w-[4.25rem]" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id="variationZoneGradientDragGhost" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9CA3AF" />
          <stop offset="33%" stopColor="#2563EB" />
          <stop offset="66%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <polygon points="8,30 76,4 76,30" fill="url(#variationZoneGradientDragGhost)" fillOpacity="0.95" />
    </svg>
  );
}

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

type PyramidStepSource = {
  id: string;
  paceSecPerKm?: number;
  distanceM?: number;
  durationSec?: number;
  recoveryDurationSec?: number;
  repetitions?: number;
  zone?: ZoneKey;
};

type PyramidConfig = {
  mode: PyramidMode;
  steps: PyramidStepSource[];
};

type PyramidDisplayStep = PyramidStepSource & {
  isMirror: boolean;
  mirrorOf?: number;
  sourceIndex: number;
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
  /** Statut participation de l’athlète ciblé (vue coach semaine). */
  athleteParticipationStatus?: string | null;
  athleteCompletedAt?: string | null;
};

function athletePlanSessionToTrainingSession(s: AthletePlanSessionModel): TrainingSession {
  const sport: SportType =
    s.sport === "cycling" || s.sport === "swimming" || s.sport === "strength" || s.sport === "running"
      ? s.sport
      : "running";
  return {
    id: s.id,
    title: s.title,
    sport,
    assignedDate: s.assignedDate,
    sent: true,
    blocks: s.blocks as unknown as SessionBlock[],
    athleteIntensity: s.athleteIntensity ?? undefined,
    athleteParticipationStatus: s.participationStatus,
  };
}

type SessionPreviewState = {
  sessionId: string;
  blockId: string | null;
  anchorX: number;
  anchorTop: number;
};

type SessionDraft = Omit<TrainingSession, "id" | "sent">;
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
  { zone: "Z1", label: "Z1", description: "Récupération", tone: "bg-slate-500/12 text-slate-700 dark:text-slate-300" },
  { zone: "Z2", label: "Z2", description: "Endurance fondamentale", tone: "bg-blue-500/12 text-blue-700 dark:text-blue-300" },
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
  avatarUrl?: string | null;
  runningRecords?: Record<string, unknown> | null;
  coachRunningRecords?: Record<string, unknown> | null;
};
type GroupEntry = { id: string; name: string };

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[parts.length - 1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function avatarHueFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hues = [350, 207, 199, 280, 32, 24];
  return hues[h % hues.length];
}

const athleteIntensityFromRunningRecords = (
  runningRecords?: Record<string, unknown> | null,
  coachRunningRecords?: Record<string, unknown> | null,
) => buildAthleteIntensityContext({ runningRecords: runningRecords ?? null, coachRunningRecords: coachRunningRecords ?? null });

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PYRAMID_NOTES_PREFIX = "[Pyramid]";
const PYRAMID_MODE_HINTS: Record<PyramidMode, string> = {
  symetrique: "🔒 Chaque palier est dupliqué à l'identique en miroir. Modifier un palier source met à jour son miroir automatiquement.",
  croissante: "Les paliers s'enchaînent du plus facile au plus difficile, sans miroir.",
  decroissante: "Les paliers s'enchaînent du plus difficile au plus facile, sans miroir.",
  manuelle: "Tu construis la séquence comme tu veux, aucune contrainte.",
};

function parsePyramidConfig(block: SessionBlock): PyramidConfig {
  const fallbackZone = block.zone || "Z4";
  const fallbackStep: PyramidStepSource = {
    id: uid(),
    paceSecPerKm: block.paceSecPerKm,
    distanceM: block.distanceM,
    durationSec: block.durationSec,
    recoveryDurationSec: block.recoveryDurationSec,
    repetitions: block.repetitions || 1,
    zone: fallbackZone,
  };
  const fallback: PyramidConfig = {
    mode: "symetrique",
    steps: [fallbackStep, { ...fallbackStep, id: uid() }, { ...fallbackStep, id: uid() }],
  };
  const rawNotes = block.notes || "";
  if (!rawNotes.includes(PYRAMID_NOTES_PREFIX)) return fallback;
  const payload = rawNotes.slice(rawNotes.indexOf(PYRAMID_NOTES_PREFIX) + PYRAMID_NOTES_PREFIX.length).trim();
  if (!payload.startsWith("{")) return fallback;
  try {
    const parsed = JSON.parse(payload) as Partial<PyramidConfig>;
    const mode: PyramidMode =
      parsed.mode === "symetrique" || parsed.mode === "croissante" || parsed.mode === "decroissante" || parsed.mode === "manuelle"
        ? parsed.mode
        : "symetrique";
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps
          .map((step) => ({
            id: typeof step?.id === "string" && step.id ? step.id : uid(),
            paceSecPerKm: isPositive(step?.paceSecPerKm) ? Number(step?.paceSecPerKm) : undefined,
            distanceM: isPositive(step?.distanceM) ? Number(step?.distanceM) : undefined,
            durationSec: isPositive(step?.durationSec) ? Number(step?.durationSec) : undefined,
            recoveryDurationSec: isPositive(step?.recoveryDurationSec) ? Number(step?.recoveryDurationSec) : undefined,
            repetitions: isPositive(step?.repetitions) ? Number(step?.repetitions) : 1,
            zone:
              typeof step?.zone === "string" &&
              ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"].includes(step.zone.toUpperCase())
                ? (step.zone.toUpperCase() as ZoneKey)
                : fallbackZone,
          }))
          .filter((step) => step.id)
      : [];
    return {
      mode,
      steps: steps.length > 0 ? steps : fallback.steps,
    };
  } catch {
    return fallback;
  }
}

function serializePyramidConfig(config: PyramidConfig) {
  return `${PYRAMID_NOTES_PREFIX} ${JSON.stringify(config)}`;
}

function buildPyramidDisplaySteps(config: PyramidConfig): PyramidDisplayStep[] {
  const sources = config.steps.map((step, sourceIndex) => ({
    ...step,
    sourceIndex,
    isMirror: false,
  }));
  if (config.mode !== "symetrique" || sources.length <= 1) return sources;
  const mirrors = sources
    .slice(0, -1)
    .reverse()
    .map((source) => ({
      ...source,
      id: `mirror-${source.id}`,
      isMirror: true,
      mirrorOf: source.sourceIndex + 1,
    }));
  return [...sources, ...mirrors];
}

function pyramidSubtitle(config: PyramidConfig) {
  const sourceCount = config.steps.length;
  if (config.mode === "symetrique") {
    const mirrors = Math.max(0, sourceCount - 1);
    return `${sourceCount} paliers + ${mirrors} miroirs · symétrique`;
  }
  if (config.mode === "croissante") return `${sourceCount} paliers · croissante`;
  if (config.mode === "decroissante") return `${sourceCount} paliers · décroissante`;
  return `${sourceCount} paliers · manuelle`;
}

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
    case "Z1": return "bg-[#B5B5BA]";
    case "Z2": return "bg-[#0066cc]";
    case "Z3": return "bg-[#34C759]";
    case "Z4": return "bg-[#FFCC00]";
    case "Z5": return "bg-[#FF9500]";
    case "Z6": return "bg-[#FF3B30]";
    default:   return "bg-[#34C759]";
  }
}
function zoneHexColor(zone?: string): string {
  const z = typeof zone === "string" ? zone.toUpperCase() : "Z3";
  return ({ Z1: "#B5B5BA", Z2: "#0066cc", Z3: "#34C759", Z4: "#FFCC00", Z5: "#FF9500", Z6: "#FF3B30" } as Record<string, string>)[z] ?? "#34C759";
}
function zoneTextColor(zone?: string): string {
  const z = typeof zone === "string" ? zone.toUpperCase() : "Z3";
  if (z === "Z4") return "#6B5500";
  if (z === "Z1") return "#1d1d1f";
  return "#fff";
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

function parsePaceInputToSec(value: string): number | undefined {
  const cleaned = value.trim().replace(/"/g, "").replace(/''/g, "").replace(/'/g, ":");
  const [mStr, sStr = "0"] = cleaned.split(":");
  const min = Number.parseInt(mStr ?? "", 10);
  const sec = Number.parseInt(sStr ?? "0", 10);
  if (!Number.isFinite(min) || !Number.isFinite(sec) || min < 0 || sec < 0 || sec > 59) return undefined;
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

  /** Scroll principal coaching (IosFixedPageHeaderShell) pour remonter en haut au changement d’écran Mon plan ⇄ Planification. */
  const coachingMainScrollRef = useRef<HTMLDivElement | null>(null);
  const weekPlannerTopRef = useRef<HTMLDivElement | null>(null);

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
  const [sessionPreview, setSessionPreview] = useState<SessionPreviewState | null>(null);
  /** Compte-rendu type maquette `PlanSessionDetailSheet` (vue athlète Mon plan). */
  const [sessionPreviewCrStatus, setSessionPreviewCrStatus] = useState<"done" | "skipped" | null>(null);
  const [sessionPreviewCrFeeling, setSessionPreviewCrFeeling] = useState<"easy" | "ok" | "hard" | null>(null);
  const [sessionPreviewCrComment, setSessionPreviewCrComment] = useState("");
  const [sessionPreviewExportOpen, setSessionPreviewExportOpen] = useState(false);
  const [sessionPreviewCrSaving, setSessionPreviewCrSaving] = useState(false);
  const [activeAthleteId, setActiveAthleteId] = useState<string | undefined>(undefined);
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(undefined);
  /** Maquette 16 · ouverture « Programmer la semaine » sans athlète (ex. FAB Créer une séance). */
  const [coachWeekProgrammerOpen, setCoachWeekProgrammerOpen] = useState(false);
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
  const [expandedPyramidSteps, setExpandedPyramidSteps] = useState<Record<string, boolean>>({});
  const [schemaDraggingTool, setSchemaDraggingTool] = useState<SchemaDragToolKind | null>(null);
  const [schemaAddMoreOpen, setSchemaAddMoreOpen] = useState(false);
  const [schemaDragPointer, setSchemaDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [schemaDropRatio, setSchemaDropRatio] = useState<number | null>(null);
  const schemaDragFromAddCardStartRef = useRef<{ x: number; y: number } | null>(null);
  const addBlockFromCardGestureMovedRef = useRef(false);
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
  const [clubDescription, setClubDescription] = useState<string | null>(null);
  const [clubCode, setClubCode] = useState<string | null>(null);
  const [clubCreatedBy, setClubCreatedBy] = useState<string | null>(null);
  const [clubAvatarUrl, setClubAvatarUrl] = useState<string | null>(null);
  const [trackingSelectedAthleteId, setTrackingSelectedAthleteId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [clubProfileOpen, setClubProfileOpen] = useState(false);
  const [clubProfileNotifMuted, setClubProfileNotifMuted] = useState(false);
  const [clubSettingsMuted, setClubSettingsMuted] = useState(false);
  const [clubConversationCreatedAt, setClubConversationCreatedAt] = useState("");
  const [coachClubsReloadToken, setCoachClubsReloadToken] = useState(0);
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

  const effectiveAthleteMode = !isCoachMode || viewAsAthlete;

  const clubPageVariant = useMemo<ClubSettingsMaquetteVariant>(() => {
    const me = clubMembers.find((m) => m.userId === user?.id);
    return me?.role === "athlete" ? "athlete" : "admin";
  }, [clubMembers, user?.id]);

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
      setActiveClubId((prev) => {
        const ids = nextClubs.map((c) => c.id);
        if (prev && ids.includes(prev)) return prev;
        return nextClubs[0]?.id ?? null;
      });
    };
    void loadCoachClubs();
    return () => {
      ignore = true;
    };
  }, [user, coachClubsReloadToken]);

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
            supabase.from("profiles").select("user_id, display_name, running_records, avatar_url").in("user_id", memberIds),
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
          avatarUrl: profile.avatar_url ?? null,
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
          .select("group_name, group_avatar_url, location, group_description, club_code, created_by, created_at")
          .eq("id", activeClubId)
          .maybeSingle(),
        supabase.from("club_groups").select("id, name, color").eq("club_id", activeClubId).order("name", { ascending: true }),
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
          color: group.color || "#5856D6",
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

      if (ignore) return;
      setClubMembers(memberItems);
      setClubGroupsAdmin(groupItems);
      setClubInvitations(invitationItems);
      setClubLocation(clubRow?.location || null);
      setClubDescription(clubRow?.group_description || null);
      setClubCode(clubRow?.club_code || null);
      setClubCreatedBy(clubRow?.created_by || null);
      setClubAvatarUrl(clubRow?.group_avatar_url || null);
      setClubConversationCreatedAt(clubRow?.created_at || "");
    };
    void loadClubAdmin();
    return () => {
      ignore = true;
    };
  }, [activeClubId]);

  useEffect(() => {
    setClubSettingsMuted(false);
  }, [activeClubId]);

  useEffect(() => {
    if (effectiveAthleteMode || !activeClubId || !user) return;
    let ignore = false;
    const loadWeekSessions = async () => {
      setLoading(true);
      const horizonEnd = addDays(weekAnchor, 7 * COACHING_TIMELINE_WEEK_COUNT);
      let query = supabase
        .from("coaching_sessions")
        .select("id, title, activity_type, scheduled_at, status, target_athletes, target_group_id, session_blocks")
        .eq("club_id", activeClubId)
        .gte("scheduled_at", weekAnchor.toISOString())
        .lt("scheduled_at", horizonEnd.toISOString());
      query = query.eq("coach_id", user.id);
      if (activeGroupId) query = query.eq("target_group_id", activeGroupId);
      const { data, error } = await query.order("scheduled_at", { ascending: true });
      if (!ignore) {
        if (error) {
          toast.error("Impossible de charger la semaine");
        } else {
          let mapped = (data || []).map<TrainingSession>((row) => {
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

          if (activeAthleteId && mapped.length > 0) {
            const sessionIds = mapped.map((s) => s.id);
            const { data: participationRows, error: partError } = await supabase
              .from("coaching_participations")
              .select("coaching_session_id, status, completed_at")
              .eq("user_id", activeAthleteId)
              .in("coaching_session_id", sessionIds);
            if (!partError && participationRows?.length) {
              const bySession = new Map(
                participationRows.map((p: { coaching_session_id: string; status: string | null; completed_at: string | null }) => [
                  p.coaching_session_id,
                  p,
                ])
              );
              mapped = mapped.map((s) => {
                const p = bySession.get(s.id);
                return {
                  ...s,
                  athleteParticipationStatus: p?.status ?? null,
                  athleteCompletedAt: p?.completed_at ?? null,
                };
              });
            }
          }

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
    const horizonEnd = addDays(weekAnchor, 7 * COACHING_TIMELINE_WEEK_COUNT);
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
        .lt("coaching_sessions.scheduled_at", horizonEnd.toISOString())
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
  }, [user, activeMenuKey, memberClubIds, weekAnchor, toast, userProfile?.running_records]);

  useEffect(() => {
    void loadAthleteWeek();
  }, [loadAthleteWeek]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );
  const weekStartsContinuous = useMemo(
    () => Array.from({ length: COACHING_TIMELINE_WEEK_COUNT }, (_, idx) => addWeeks(weekAnchor, idx)),
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
  const sessionTimeAxisLabels = useMemo(() => {
    const duration = Math.max(0, Math.round(previewMetrics.durationMin));
    const end = Math.max(60, Math.ceil(Math.max(1, duration) / 15) * 15);
    const labels: string[] = [];
    for (let minute = 0; minute <= end; minute += 15) {
      labels.push(`${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}`);
    }
    return labels;
  }, [previewMetrics.durationMin]);
  const selectedSchemaPreviewIndex = useMemo(() => {
    if (!selectedBlockId || !draft.blocks.length || !previewBars.length) return null;
    const selectedDraftIndex = draft.blocks.findIndex((block) => block.id === selectedBlockId);
    if (selectedDraftIndex < 0) return null;
    if (draft.blocks.length === 1) return 0;
    return Math.round((selectedDraftIndex / (draft.blocks.length - 1)) * Math.max(0, previewBars.length - 1));
  }, [draft.blocks, previewBars.length, selectedBlockId]);
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

  const openSessionPreview = useCallback((sessionId: string) => {
    setSessionPreview({ sessionId, blockId: null, anchorX: 0, anchorTop: 0 });
  }, []);

  const closeSessionPreview = useCallback(() => {
    setSessionPreview(null);
  }, []);

  useEffect(() => {
    setSessionPreviewCrStatus(null);
    setSessionPreviewCrFeeling(null);
    setSessionPreviewCrComment("");
    setSessionPreviewExportOpen(false);
  }, [sessionPreview?.sessionId]);

  const previewSessionItem = useMemo(() => {
    if (!sessionPreview) return null;
    const fromCoachList = sessions.find((item) => item.id === sessionPreview.sessionId);
    if (fromCoachList) return fromCoachList;
    const fromAthlete = athletePlanSessions.find((s) => s.id === sessionPreview.sessionId);
    return fromAthlete ? athletePlanSessionToTrainingSession(fromAthlete) : null;
  }, [sessionPreview, sessions, athletePlanSessions]);

  const previewAthletePlanSession = useMemo(
    () => (sessionPreview ? athletePlanSessions.find((s) => s.id === sessionPreview.sessionId) ?? null : null),
    [sessionPreview, athletePlanSessions]
  );

  const previewSessionSegments = useMemo(
    () =>
      previewSessionItem
        ? buildWorkoutSegments(previewSessionItem.blocks, {
            sport: previewSessionItem.sport,
            athleteIntensity: previewSessionItem.athleteIntensity ?? undefined,
          })
        : [],
    [previewSessionItem]
  );

  const previewSessionMiniBars = useMemo(
    () => renderWorkoutMiniProfile(previewSessionSegments, { sessionSchema: true }),
    [previewSessionSegments]
  );

  const previewSessionMetrics = useMemo(
    () => resolveWorkoutMetrics({ segments: previewSessionSegments }),
    [previewSessionSegments]
  );

  const previewSessionSelectedBarIndex = useMemo(() => {
    if (!sessionPreview?.blockId || !previewSessionItem?.blocks.length || !previewSessionMiniBars.length) return null;
    return Math.round(
      (Math.max(0, previewSessionItem.blocks.findIndex((b) => b.id === sessionPreview.blockId)) /
        Math.max(1, previewSessionItem.blocks.length - 1)) *
        Math.max(1, previewSessionMiniBars.length - 1)
    );
  }, [previewSessionItem, previewSessionMiniBars, sessionPreview?.blockId]);

  const previewAthleteParticipationUi = useMemo(() => {
    if (!previewAthletePlanSession) return null;
    return mapParticipationToUiStatus(previewAthletePlanSession.participationStatus, previewAthletePlanSession.hasConflict);
  }, [previewAthletePlanSession]);

  const previewSessionFocusedBlock = useMemo(() => {
    if (!previewSessionItem || !sessionPreview?.blockId) return null;
    return previewSessionItem.blocks.find((block) => block.id === sessionPreview.blockId) ?? null;
  }, [previewSessionItem, sessionPreview]);

  const previewSessionBubbleLabel = useMemo(() => {
    if (!previewSessionFocusedBlock) return null;
    const pace = paceToLabel(previewSessionFocusedBlock.paceSecPerKm);
    const duration = secondsToLabel(previewSessionFocusedBlock.durationSec);
    const distance = metersToLabel(previewSessionFocusedBlock.distanceM);
    return [pace, duration || distance].filter(Boolean).join(" · ");
  }, [previewSessionFocusedBlock]);

  const previewSessionSections = useMemo(() => {
    if (!previewSessionItem) return [];
    type DraftSection = { id: string; key: string; title: string; lines: string[]; reps: number };
    const sections: DraftSection[] = [];

    const getSectionBase = (block: SessionBlock, index: number) => {
      if (block.type === "warmup") return { key: "warmup", title: "Échauffement" };
      if (block.type === "cooldown") return { key: "cooldown", title: "Retour au calme" };
      if (block.type === "recovery" && index >= previewSessionItem.blocks.length - 2) {
        return { key: "cooldown", title: "Retour au calme" };
      }
      if (block.type === "interval") {
        const reps = Math.max(1, block.repetitions || 1);
        const shortActivation = (block.durationSec ?? 999) <= 120 && reps <= 4 && index <= 2;
        return shortActivation
          ? { key: "activation", title: "Activation" }
          : { key: "main", title: "Série principale" };
      }
      if (block.type === "recovery") return { key: "recovery", title: "Récupération" };
      return { key: "main", title: "Série principale" };
    };

    for (const [index, block] of previewSessionItem.blocks.entries()) {
      const effortLine = blockTranscript(block);
      const recoveryLine =
        block.recoveryDurationSec || block.recoveryDistanceM
          ? `${block.recoveryDurationSec ? secondsToLabel(block.recoveryDurationSec) : metersToLabel(block.recoveryDistanceM)} récup`
          : null;
      const base = getSectionBase(block, index);
      const reps = block.type === "interval" ? Math.max(1, block.repetitions || 1) : 0;
      const prev = sections[sections.length - 1];

      if (prev && prev.key === base.key) {
        prev.lines.push(...([effortLine, recoveryLine].filter(Boolean) as string[]));
        prev.reps += reps;
      } else {
        sections.push({
          id: block.id,
          key: base.key,
          title: base.title,
          lines: [effortLine, recoveryLine].filter(Boolean) as string[],
          reps,
        });
      }
    }

    return sections.map((section) => ({
      id: section.id,
      title:
        (section.key === "activation" || section.key === "main") && section.reps > 0
          ? `${section.title} ${section.reps}×`
          : section.title,
      lines: section.lines,
    }));
  }, [previewSessionItem]);

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
        athleteParticipationStatus: null,
        athleteCompletedAt: null,
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
      const defaultStep = {
        id: uid(),
        paceSecPerKm: 330,
        distanceM: 200,
        durationSec: 60,
        recoveryDurationSec: 60,
        repetitions: 1,
        zone: "Z4" as ZoneKey,
      };
      return {
        ...createDefaultBlock("steady", nextOrder),
        repetitions: 3,
        notes: serializePyramidConfig({ mode: "symetrique", steps: [defaultStep, { ...defaultStep, id: uid() }, { ...defaultStep, id: uid() }] }),
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

  const updatePyramidBlock = useCallback(
    (blockId: string, updater: (config: PyramidConfig) => PyramidConfig) => {
      updateDraftBlock(blockId, (current) => {
        const currentConfig = parsePyramidConfig(current);
        const nextConfig = updater(currentConfig);
        const safeSteps = nextConfig.steps.length
          ? nextConfig.steps
          : [{ id: uid(), zone: current.zone || "Z4", repetitions: 1 }];
        return {
          ...current,
          notes: serializePyramidConfig({ ...nextConfig, steps: safeSteps }),
          paceSecPerKm: safeSteps[0]?.paceSecPerKm ?? current.paceSecPerKm,
          distanceM: safeSteps[0]?.distanceM ?? current.distanceM,
          durationSec: safeSteps[0]?.durationSec ?? current.durationSec,
          recoveryDurationSec: safeSteps[0]?.recoveryDurationSec ?? current.recoveryDurationSec,
          repetitions: safeSteps.length,
          zone: safeSteps[0]?.zone ?? current.zone ?? "Z4",
        };
      });
    },
    [updateDraftBlock]
  );

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
  const [showCoachRequiredDialog, setShowCoachRequiredDialog] = useState(false);
  const hasCreateDraftWork = useMemo(
    () => Boolean(draft.title.trim()) || draft.blocks.length > 0,
    [draft.blocks.length, draft.title]
  );

  const goToCoachSection = useCallback((key: CoachMenuKey, opts?: { trackingAthleteId?: string | null }) => {
    if (key !== "planning") setCoachWeekProgrammerOpen(false);
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
      const athleteId = opts?.trackingAthleteId ?? null;
      setTrackingSelectedAthleteId(athleteId);
      setCoachingTab("planning");
      return;
    }
    setCoachingTab("planning");
  }, [navigate]);

  const handleOpenPlanForAthleteFromTracking = useCallback(
    (athleteId: string, _athleteName: string, _groupId?: string, weekDate?: Date) => {
      setTrackingSelectedAthleteId(null);
      setActiveGroupId(undefined);
      setActiveAthleteId(athleteId);
      setCoachWeekProgrammerOpen(true);
      setActiveMenuKey("planning");
      setCoachingTab("planning");
      if (weekDate) {
        setWeekAnchor(startOfWeek(weekDate, { weekStartsOn: 1 }));
      }
    },
    []
  );

  useEffect(() => {
    const st = location.state as { coachingClubManage?: { clubId: string } } | null | undefined;
    const clubId = st?.coachingClubManage?.clubId;
    if (!clubId || !user) return;
    setActiveClubId(clubId);
    goToCoachSection("club");
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, user, navigate, goToCoachSection]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    void (async () => {
      const { data } = await supabase.from("profiles").select("notif_message").eq("user_id", user.id).maybeSingle();
      if (ignore) return;
      setClubProfileNotifMuted(data?.notif_message === false);
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  const openClubProfileSheet = useCallback(() => {
    if (!activeClubId) return;
    setClubProfileOpen(true);
  }, [activeClubId]);

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

  const landingWeekSessions = useMemo(() => {
    if (effectiveAthleteMode || activeAthleteId || activeGroupId) return [];
    return sessions;
  }, [sessions, effectiveAthleteMode, activeAthleteId, activeGroupId]);

  const landingIndicatorsByDate = useMemo(() => {
    const map: Record<string, Array<{ color: string }>> = {};
    const sportColor = (sport: SportType) => {
      if (sport === "running") return "#0a84ff";
      if (sport === "cycling") return "#ff9500";
      if (sport === "swimming") return "#5ac8fa";
      if (sport === "strength") return "#af52de";
      return "#64748b";
    };
    landingWeekSessions.forEach((session) => {
      const key = format(new Date(session.assignedDate), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push({ color: sportColor(session.sport) });
    });
    return map;
  }, [landingWeekSessions]);

  const landingMonthLine = useMemo(() => {
    const w = getISOWeek(weekAnchor);
    const month = format(weekAnchor, "MMMM yyyy", { locale: fr });
    return `SEMAINE ${w} · ${month}`.toUpperCase();
  }, [weekAnchor]);

  const landingStats = useMemo(() => {
    const sessionsScheduled = landingWeekSessions.length;
    const validatedCount = landingWeekSessions.filter((s) => s.sent).length;
    const pendingCount = landingWeekSessions.filter((s) => !s.sent).length;
    const athletesActive = athletes.length;
    return { sessionsScheduled, validatedCount, pendingCount, athletesActive };
  }, [landingWeekSessions, athletes.length]);

  const landingAthleteCards = useMemo((): LandingAthleteCard[] => {
    return athletes.slice(0, 16).map((a) => {
      const mine = landingWeekSessions.filter((s) => {
        const ids = new Set<string>();
        if (s.athleteId) ids.add(s.athleteId);
        (s.athleteIds || []).forEach((id) => ids.add(id));
        return ids.has(a.id);
      });
      const hasDraft = mine.some((s) => !s.sent);
      const hasAny = mine.length > 0;
      const hue = avatarHueFromId(a.id);
      return {
        id: a.id,
        name: a.name,
        initials: initialsFromName(a.name),
        subtitle: "Athlète",
        avatarUrl: a.avatarUrl ?? null,
        avatarClass: `bg-[hsl(${hue},85%,52%)]`,
        statusDotClass: hasDraft ? "bg-[#FF9F0A]" : hasAny ? "bg-[#34C759]" : "bg-muted-foreground/35",
      };
    });
  }, [athletes, landingWeekSessions]);

  const upcomingCoachRows = useMemo((): CoachUpcomingSessionRow[] => {
    const sorted = [...landingWeekSessions].sort(
      (a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime()
    );
    return sorted.slice(0, 10).map((s) => {
      const athleteId = s.athleteId || s.athleteIds?.[0];
      const athlete = athleteId ? athletes.find((x) => x.id === athleteId) : undefined;
      const name = athlete?.name || "Athlète";
      const d = new Date(s.assignedDate);
      const hue = avatarHueFromId(athleteId || s.id);
      return {
        id: s.id,
        dayShort: format(d, "EEE", { locale: fr })
          .replace(/\.$/, "")
          .slice(0, 3)
          .toUpperCase(),
        dateNum: format(d, "d"),
        time: format(d, "HH:mm"),
        title: s.title,
        athleteName: name,
        athleteInitials: initialsFromName(name),
        athleteAvatarClass: `bg-[hsl(${hue},85%,52%)]`,
        status: s.sent ? "sent" : "draft",
      };
    });
  }, [landingWeekSessions, athletes]);

  // ── Données pour le nouveau calendrier mensuel ────────────────────────────
  const calendarSessions = useMemo((): PlanCalendarSession[] => {
    return sessions.map((s) => {
      const athleteEntry = s.athleteId ? athletes.find((a) => a.id === s.athleteId) : undefined;
      const status: PlanCalendarSession["status"] =
        s.athleteParticipationStatus === "completed"
          ? "validated"
          : s.sent
            ? "pending"
            : "draft";
      const d = new Date(s.assignedDate);
      const timeStr = !Number.isNaN(d.getTime()) ? format(d, "HH:mm") : undefined;
      return {
        id: s.id,
        title: s.title,
        sport: s.sport,
        assignedDate: s.assignedDate,
        time: timeStr,
        athleteName: athleteEntry?.name,
        status,
      };
    });
  }, [sessions, athletes]);

  const calendarAthletes = useMemo((): PlanCalendarAthlete[] => {
    return athletes.map((a) => {
      const mine = sessions.filter((s) => s.athleteId === a.id);
      const statusColor: PlanCalendarAthlete["statusColor"] = mine.some(
        (s) => s.sent && s.athleteParticipationStatus !== "completed"
      )
        ? "red"
        : mine.some((s) => !s.sent)
          ? "orange"
          : mine.length > 0
            ? "green"
            : "gray";
      return {
        id: a.id,
        name: a.name,
        avatarUrl: a.avatarUrl ?? undefined,
        statusColor,
      };
    });
  }, [athletes, sessions]);

  const showCoachLanding =
    activeMenuKey === "planning" && !effectiveAthleteMode && !activeAthleteId && !activeGroupId && !coachWeekProgrammerOpen;
  const weekPlannerMode =
    activeMenuKey === "planning" && !effectiveAthleteMode && (!!activeAthleteId || !!activeGroupId || coachWeekProgrammerOpen);

  useLayoutEffect(() => {
    const bump = () => {
      const el = coachingMainScrollRef.current;
      if (el) el.scrollTop = 0;
    };
    bump();
    const raf = window.requestAnimationFrame(() => bump());
    return () => window.cancelAnimationFrame(raf);
  }, [activeMenuKey, effectiveAthleteMode]);

  const scrollWeekPlannerTopIntoView = useCallback(() => {
    window.requestAnimationFrame(() => {
      weekPlannerTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, []);

  const coachingHeaderTitle = useMemo(() => {
    if (!isCoachMode || effectiveAthleteMode) return "Mon plan";
    switch (activeMenuKey) {
      case "tracking":
        return "Planification";
      case "dashboard":
        return "Tableau de bord";
      case "templates":
        return "Modèles";
      case "groups":
        return "Brouillons";
      case "club":
        return "Club";
      default:
        return "Planification";
    }
  }, [activeMenuKey, effectiveAthleteMode, isCoachMode]);

  const coachingMaquetteUserInitial = useMemo(() => {
    const n = userProfile?.display_name?.trim();
    if (n?.length) return n.charAt(0).toUpperCase();
    const em = user?.email?.trim();
    if (em?.length) return em.charAt(0).toUpperCase();
    return "?";
  }, [userProfile?.display_name, user?.email]);

  const clearWeekPlannerTarget = useCallback(() => {
    setActiveAthleteId(undefined);
    setActiveGroupId(undefined);
    setSearch("");
    setCoachWeekProgrammerOpen(false);
  }, []);

  useEffect(() => {
    if (activeAthleteId) {
      const a = athletes.find((x) => x.id === activeAthleteId);
      if (a?.name) setSearch(a.name);
      return;
    }
    if (activeGroupId) {
      const g = groups.find((x) => x.id === activeGroupId);
      if (g?.name) setSearch(g.name);
    }
  }, [activeAthleteId, activeGroupId, athletes, groups]);

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

  const sendSessionPreviewCompteRendu = useCallback(async () => {
    const a = previewAthletePlanSession;
    if (!a?.participationId || !sessionPreviewCrStatus) return;
    setSessionPreviewCrSaving(true);
    try {
      const parts: string[] = [];
      if (sessionPreviewCrStatus === "done" && sessionPreviewCrFeeling) {
        parts.push(
          `Ressenti: ${
            sessionPreviewCrFeeling === "easy" ? "Facile" : sessionPreviewCrFeeling === "ok" ? "Correct" : "Difficile"
          }`
        );
      }
      if (sessionPreviewCrComment.trim()) parts.push(sessionPreviewCrComment.trim());
      const note = parts.length ? parts.join("\n") : null;
      const update = {
        athlete_note: note,
        status: sessionPreviewCrStatus === "done" ? ("completed" as const) : ("missed" as const),
        completed_at: sessionPreviewCrStatus === "done" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("coaching_participations").update(update).eq("id", a.participationId);
      if (error) {
        toast.error("Envoi impossible", error.message);
        return;
      }
      toast.success("Compte-rendu envoyé au coach");
      await loadAthleteWeek({ silent: true });
      closeSessionPreview();
    } finally {
      setSessionPreviewCrSaving(false);
    }
  }, [
    previewAthletePlanSession,
    sessionPreviewCrStatus,
    sessionPreviewCrFeeling,
    sessionPreviewCrComment,
    closeSessionPreview,
    toast,
    loadAthleteWeek,
  ]);

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

  const shareClubFromCoaching = async () => {
    if (!clubCode) {
      toast.error("Code du club indisponible");
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({
          title: activeClubName || "Club",
          text: `Rejoins ${activeClubName || "le club"} avec le code : ${clubCode}`,
        });
      } else {
        await navigator.clipboard.writeText(clubCode);
        toast.success("Code copié");
      }
    } catch {
      /* annulation partage */
    }
  };

  const deleteClubAsAdmin = async () => {
    if (!activeClubId || !user) return;
    if (!window.confirm(`Supprimer définitivement le club « ${activeClubName || ""} » ?`)) return;
    try {
      await supabase.from("group_members").delete().eq("conversation_id", activeClubId);
      await supabase.from("messages").delete().eq("conversation_id", activeClubId);
      const { error } = await supabase.from("conversations").delete().eq("id", activeClubId);
      if (error) throw error;
      toast.success("Club supprimé");
      setClubs((prev) => prev.filter((c) => c.id !== activeClubId));
      setActiveClubId(null);
      setActiveMenuKey(effectiveAthleteMode ? "my-plan" : "planning");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Suppression impossible", msg);
    }
  };

  const leaveClubFromCoaching = async () => {
    if (!user || !activeClubId) return;
    if (!window.confirm("Quitter ce club ?")) return;
    await removeMemberFromClub(user.id);
    setClubs((prev) => prev.filter((c) => c.id !== activeClubId));
    setActiveClubId(null);
    setActiveMenuKey("my-plan");
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

  /** Mon plan / Planification : header dans le flux (pas d’ancrage fixe iOS) — autres vues gardent le pin clavier-safe. */
  const pinCoachShellHeader =
    weekPlannerMode || activeMenuKey === "club" || activeMenuKey === "tracking";

  return (
    <>
      <div
        className="coaching-flat flex h-full min-h-0 flex-col overflow-hidden"
        data-tutorial="tutorial-coaching"
        style={
          weekPlannerMode || activeMenuKey === "planning" || activeMenuKey === "my-plan"
            ? planifierMaquetteFontStackStyle
            : undefined
        }
      >
        <IosFixedPageHeaderShell
          className="min-h-0 flex-1"
          contentTopOffsetPx={0}
          pinHeader={pinCoachShellHeader}
          scrollRef={coachingMainScrollRef}
          headerWrapperClassName={
            weekPlannerMode || activeMenuKey === "tracking"
              ? "shrink-0 border-b border-[#E5E5EA] bg-[#FFFFFF]"
              : activeMenuKey === "club"
                ? "shrink-0 border-b border-border apple-grouped-bg"
                : activeMenuKey === "my-plan"
                  ? "shrink-0 border-0 z-50 bg-[#F2F2F7]"
                  : showCoachLanding
                    ? "shrink-0 border-0 z-50 bg-[#F2F2F7]"
                    : "shrink-0 border-0 z-50 bg-[#F2F2F7]"
          }
          header={
            weekPlannerMode ? (
              <div className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
                <button
                  type="button"
                  onClick={clearWeekPlannerTarget}
                  className="flex shrink-0 items-center active:opacity-70 [-webkit-tap-highlight-color:transparent]"
                  aria-label="Retour à la planification"
                >
                  <ChevronLeft className="h-6 w-6" color="#007AFF" strokeWidth={2.6} aria-hidden />
                  <span
                    className="text-[17px] font-medium tracking-tight"
                    style={{ color: "#007AFF", letterSpacing: "-0.01em" }}
                  >
                    Planification
                  </span>
                </button>
                <h1
                  className="min-w-0 flex-1 truncate px-2 text-center text-[17px] font-extrabold tracking-tight text-[#0A0F1F]"
                  style={{ letterSpacing: "-0.01em", margin: 0 }}
                >
                  Programmer la semaine
                </h1>
                <div className="shrink-0" style={{ width: 80 }} aria-hidden />
              </div>
            ) : activeMenuKey === "club" ? (
              <div className="pt-[calc(var(--safe-area-top)-4px)]">
                <IosPageHeaderBar
                  leadingBack={{
                    onClick: () => setActiveMenuKey(effectiveAthleteMode ? "my-plan" : "planning"),
                    label: "Coaching",
                  }}
                  title="Paramètres"
                  titleClassName="text-[17px] font-extrabold tracking-[-0.01em]"
                  right={
                    <button
                      type="button"
                      className={`border-0 bg-transparent px-1 text-[17px] leading-none text-[#007AFF] active:opacity-60 dark:text-primary ${
                        clubPageVariant === "admin" ? "font-bold" : "font-normal"
                      }`}
                      onClick={() => {
                        if (clubPageVariant === "admin") void editClubInfo();
                        else void shareClubFromCoaching();
                      }}
                    >
                      {clubPageVariant === "admin" ? "Modifier" : "Partager"}
                    </button>
                  }
                />
              </div>
            ) : activeMenuKey === "tracking" ? (
              <div className="flex shrink-0 items-center px-4 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
                <button
                  type="button"
                  onClick={() => setActiveMenuKey("planning")}
                  className="flex shrink-0 items-center active:opacity-70 [-webkit-tap-highlight-color:transparent]"
                  aria-label="Retour à la planification"
                >
                  <ChevronLeft className="h-6 w-6" color="#007AFF" strokeWidth={2.6} aria-hidden />
                  <span
                    className="text-[17px] font-medium tracking-tight"
                    style={{ color: "#007AFF", letterSpacing: "-0.01em" }}
                  >
                    Planification
                  </span>
                </button>
                <h1
                  className="min-w-0 flex-1 truncate px-2 text-center text-[17px] font-extrabold tracking-tight text-[#0A0F1F]"
                  style={{ letterSpacing: "-0.01em", margin: 0 }}
                >
                  Suivi athlète
                </h1>
                <div className="shrink-0" style={{ width: 80 }} aria-hidden />
              </div>
            ) : (
              <PlanningHeader
                onOpenMenu={() => setDrawerOpen(true)}
                title={coachingHeaderTitle}
                coachLandingBrand={false}
                hideDrawerActions={
                  coachingHeaderTitle === "Mon plan" || coachingHeaderTitle === "Planification"
                }
                largeTitleClassName={
                  coachingHeaderTitle === "Mon plan"
                    ? "text-[40px] font-black leading-none tracking-[-0.04em] text-[#0A0F1F]"
                    : coachingHeaderTitle === "Planification"
                      ? "text-[36px] font-black leading-none tracking-[-0.04em] text-[#0A0F1F]"
                      : undefined
                }
                userInitialAccentBadge={
                  coachingHeaderTitle === "Mon plan" || coachingHeaderTitle === "Planification"
                    ? coachingMaquetteUserInitial
                    : undefined
                }
                clubAvatarUrl={activeClubId ? clubAvatarUrl : undefined}
                clubName={activeClubId ? activeClubName : undefined}
                onPressClubAvatar={activeClubId ? openClubProfileSheet : undefined}
                surfaceClassName={
                  coachingHeaderTitle === "Mon plan" || coachingHeaderTitle === "Planification"
                    ? "bg-[#F2F2F7]"
                    : undefined
                }
              />
            )
          }
          scrollClassName={cn(
            weekPlannerMode
              ? ""
              : activeMenuKey === "my-plan" || activeMenuKey === "planning"
                ? "bg-[#F2F2F7]"
                : activeMenuKey === "club" || activeMenuKey === "tracking"
                  ? "apple-grouped-bg"
                  : "bg-white"
          )}
          scrollProps={
            weekPlannerMode
              ? {
                  style: {
                    backgroundColor: PLANIFIER_MAQUETTE_GROUPED_BG,
                    WebkitOverflowScrolling: "touch",
                  },
                }
              : activeMenuKey === "my-plan" || activeMenuKey === "planning"
                ? {
                    style: {
                      ...planifierMaquetteFontStackStyle,
                      WebkitOverflowScrolling: "touch",
                    },
                  }
                : undefined
          }
          footer={null}
        >
          <div
            className={cn(
              "space-y-0",
              activeMenuKey === "my-plan"
                ? "pb-[calc(2rem+env(safe-area-inset-bottom,0px))]"
                : activeMenuKey === "planning" || activeMenuKey === "tracking"
                  ? "pb-0"
                  : "pb-6",
            )}
          >
            {(activeMenuKey === "planning" || activeMenuKey === "my-plan") &&
            !weekPlannerMode &&
            (isCoachMode || activeMenuKey === "my-plan") ? (
              <>
                {/* Segmenté : uniquement dans le scroll (jamais dans MainTopHeader). Pas de sticky pour ne pas fusionner visuellement avec le header iOS. */}
                <CoachingRolePill coachSegmentDisabled={!isCoachMode}
                  active={effectiveAthleteMode ? "athlete" : "coach"}
                  onSelect={(role) => {
                    if (role === "athlete") {
                      setViewAsAthlete(true);
                      setActiveMenuKey("my-plan");
                    } else {
                      if (!isCoachMode) {
                        setShowCoachRequiredDialog(true);
                        return;
                      }
                      setViewAsAthlete(false);
                      setActiveAthleteId(undefined);
                      setActiveGroupId(undefined);
                      setCoachWeekProgrammerOpen(false);
                      setActiveMenuKey("planning");
                      setSearch("");
                    }
                  }}
                />
              </>
            ) : null}

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

            {weekPlannerMode ? (
              <>
                <div ref={weekPlannerTopRef} className="h-0 w-full" aria-hidden />
                <div className="px-5 pt-4">
                  <PlanningSearchBar
                    bare
                    variant="planifierSemaine"
                    value={search}
                    onChange={setSearch}
                    placeholder="Rechercher un athlète ou un groupe"
                  />
                  {search.trim().length > 0 && (searchResults.athletes.length > 0 || searchResults.groups.length > 0) ? (
                    <div className="mt-2 divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card shadow-sm">
                      {searchResults.groups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-secondary/80"
                          onClick={() => {
                            setActiveGroupId(group.id);
                            setActiveAthleteId(undefined);
                            setCoachWeekProgrammerOpen(false);
                            setSearch("");
                            scrollWeekPlannerTopIntoView();
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
                            setCoachWeekProgrammerOpen(false);
                            setSearch("");
                            scrollWeekPlannerTopIntoView();
                          }}
                        >
                          <span className="text-[15px] font-medium text-foreground">{athlete.name}</span>
                          <span className="text-[13px] text-muted-foreground">Athlète</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {weekPlannerMode && (activeAthlete || activeGroup) ? (
              <div className="px-5 pb-[18px] pt-3">
                {activeAthlete ? (
                  <div className="flex items-center gap-3 rounded-[14px] border border-[rgba(10,132,255,0.25)] bg-card py-2.5 pl-2.5 pr-2 shadow-[0_0_0_3px_rgba(10,132,255,0.08)]">
                    {activeAthlete.avatarUrl ? (
                      <img
                        src={activeAthlete.avatarUrl}
                        alt={`Photo de profil de ${activeAthlete.name}`}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white"
                        style={{ backgroundColor: `hsl(${avatarHueFromId(activeAthlete.id)},85%,52%)` }}
                      >
                        {initialsFromName(activeAthlete.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-foreground">{activeAthlete.name}</p>
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Athlète</p>
                    </div>
                    <button
                      type="button"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[15px] leading-none text-muted-foreground"
                      style={{ background: "rgba(118, 118, 128, 0.12)" }}
                      onClick={() => {
                        setActiveAthleteId(undefined);
                        setSearch("");
                        setCoachWeekProgrammerOpen(true);
                      }}
                      aria-label="Désélectionner l'athlète"
                    >
                      ×
                    </button>
                  </div>
                ) : activeGroup ? (
                  <div className="flex items-center gap-3 rounded-[14px] border border-[rgba(10,132,255,0.25)] bg-card py-2.5 pl-2.5 pr-2 shadow-[0_0_0_3px_rgba(10,132,255,0.08)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground">
                      {initialsFromName(activeGroup.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold tracking-[-0.03em] text-foreground">{activeGroup.name}</p>
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Groupe</p>
                    </div>
                    <button
                      type="button"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[15px] leading-none text-muted-foreground"
                      style={{ background: "rgba(118, 118, 128, 0.12)" }}
                      onClick={() => {
                        setActiveGroupId(undefined);
                        setSearch("");
                        setCoachWeekProgrammerOpen(true);
                      }}
                      aria-label="Désélectionner le groupe"
                    >
                      ×
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeMenuKey === "my-plan" ? (
              <div className="mt-5 -mx-5 bg-[#F2F2F7]">
                {weekStartsContinuous.map((weekStart) => {
                  const weekDaysLocal = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                  const weekSessions = athletePlanSessions.filter((session) => {
                    const d = new Date(session.assignedDate);
                    return d >= weekStart && d < addDays(weekStart, 7);
                  });
                  const weekKm = formatCalendarDistance(weekSessions.reduce((acc, item) => acc + (item.distanceKm || 0), 0));
                  const kmLineDisplay = weekSessions.length === 0 ? "—" : weekKm ?? "0 km";
                  return (
                    <div key={weekStart.toISOString()}>
                      <div className="mb-3 mt-7 pl-[calc(1.25rem+12px+3px)] pr-7">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <h2 className="text-[26px] font-extrabold leading-none tracking-[-0.02em] text-[#0A0F1F]">
                            Semaine {getISOWeek(weekStart)}
                          </h2>
                          <p className="min-w-0 truncate text-[14px] font-medium leading-none tracking-[-0.01em] text-[#8E8E93]">
                            · {formatMaquetteMonPlanWeekRange(weekStart)}
                          </p>
                        </div>
                        <p className="mt-1 text-[14px] leading-normal">
                          <span className="font-bold text-[#0A0F1F]">{kmLineDisplay}</span>
                          <span className="font-medium text-[#8E8E93]">
                            {" "}
                            · {weekSessions.length} séance(s)
                          </span>
                        </p>
                      </div>
                      <div>
                        {weekDaysLocal.map((day, dayIdx) => {
                    const daySessions = athletePlanSessions.filter((session) => isSameDay(new Date(session.assignedDate), day));
                    const session = daySessions[0];
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
                          explicitDistanceKm: session.distanceKm,
                        })
                      : null;
                    const summary = session
                      ? {
                          title: buildWorkoutHeadline({ title: session.title, segments: normalizedSegments, sport: sportHint }),
                          subtitle: session.title,
                          duration: workoutMetrics?.durationLabel,
                          distance: workoutMetrics?.distanceLabel,
                          intensityLabel: [workoutMetrics?.intensityLabel, workoutMetrics?.feedbackLabel].filter(Boolean).join(" • "),
                          miniProfile: renderWorkoutMiniProfile(normalizedSegments, { sessionSchema: true }),
                          isRestDay: isExplicitRestDay([session]),
                          sportHint,
                        }
                      : undefined;
                    const accentColor = workoutAccentColor(normalizedSegments, sportHint, summary?.isRestDay);
                    const dayIsToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} data-day-key={format(day, "yyyy-MM-dd")}>
                        <DayPlanningRow
                          dayLabel={format(day, "EEEE", { locale: fr })}
                          dateLabel={format(day, "d")}
                          isToday={dayIsToday}
                          isSelected={false}
                          session={summary}
                          isSent={session?.participationStatus === "completed"}
                          accentColor={accentColor}
                          emptyLabel="Repos"
                          layoutVariant="athleteTimeline"
                          isLast={dayIdx === weekDaysLocal.length - 1}
                          athleteSessionCompleted={session?.participationStatus === "completed"}
                          onAdd={() => undefined}
                          onOpen={session ? () => openSessionPreview(session.id) : undefined}
                          onEdit={undefined}
                          onSend={undefined}
                          onDuplicate={undefined}
                          onDelete={undefined}
                          onUnsend={undefined}
                          allowSessionActions={false}
                          hideActionSlot
                        />
                      </div>
                    );
                        })}
                      </div>
                    </div>
                  );
                })}
                </div>
            ) : activeMenuKey === "planning" && showCoachLanding ? (
              <CoachPlanificationMonthCalendar
                sessions={calendarSessions}
                athletes={calendarAthletes}
                onCreateSession={() => {
                  setActiveAthleteId(undefined);
                  setActiveGroupId(undefined);
                  setSearch("");
                  setCoachWeekProgrammerOpen(true);
                }}
                onOpenSession={(id) => openEditSession(id)}
                onSelectAthlete={(id) => {
                  goToCoachSection("tracking", { trackingAthleteId: id });
                }}
              />
            ) : activeMenuKey === "planning" ? (
              <>
                {weekPlannerMode ? (
                  <div className="pb-[calc(2rem+env(safe-area-inset-bottom))]">
                    {weekStartsContinuous.map((weekStart) => {
                      const weekDaysLocal = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                      const weekSessions = enrichedFilteredSessions.filter((session) => {
                        const d = new Date(session.assignedDate);
                        return d >= weekStart && d < addDays(weekStart, 7);
                      });
                      const rangeStart = format(weekStart, "d MMM", { locale: fr }).replace(/\.$/, "").toUpperCase();
                      const rangeEnd = format(addDays(weekStart, 6), "d MMM", { locale: fr }).replace(/\.$/, "").toUpperCase();
                      return (
                        <div key={weekStart.toISOString()} className="mt-7">
                          <div className="mb-4 px-5">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                              <h2 className="text-[32px] font-extrabold leading-tight tracking-tight text-[#0A0F1F] dark:text-foreground">
                                Semaine {getISOWeek(weekStart)}
                              </h2>
                              <p className="text-[14px] font-bold tracking-wider text-[#8E8E93]">
                                · {rangeStart} – {rangeEnd}
                              </p>
                            </div>
                            <p className="mt-0.5 text-[13px] text-[#8E8E93]">· {weekSessions.length} séance(s)</p>
                          </div>

                          <div className="space-y-3 px-5">
                            {weekDaysLocal.map((day, dayIdx) => {
                        const daySessions = enrichedFilteredSessions.filter((session) => isSameDay(new Date(session.assignedDate), day));
                        const session = daySessions[0];
                        const dayIsToday = isSameDay(day, new Date());
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
                              miniProfile: renderWorkoutMiniProfile(normalizedSegments, { sessionSchema: true }),
                              isRestDay: isExplicitRestDay([session]),
                              sportHint,
                            }
                          : undefined;
                        const accentColor = workoutAccentColor(normalizedSegments, sportHint, summary?.isRestDay);
                        return (
                          <div key={day.toISOString()} data-day-key={format(day, "yyyy-MM-dd")}>
                            <DayPlanningRow
                              dayLabel={format(day, "EEEE", { locale: fr })}
                              dateLabel={format(day, "d")}
                              isSelected={false}
                              isToday={dayIsToday}
                              session={summary}
                              isSent={session?.sent}
                              accentColor={accentColor}
                              emptyLabel="Repos"
                              layoutVariant="coachWeek"
                              isLast={dayIdx === weekDaysLocal.length - 1}
                              athleteSessionCompleted={!!activeAthleteId && session?.athleteParticipationStatus === "completed"}
                              onAdd={() => openCreateForDate(day)}
                              onOpen={session ? () => openSessionPreview(session.id) : undefined}
                              onEdit={session ? () => openEditSession(session.id) : undefined}
                              onSend={
                                session ? () => void (session.sent ? unsendSession(session.id) : sendSession(session.id)) : undefined
                              }
                              onDuplicate={session ? () => void duplicateSession(session, addDays(day, 1)) : undefined}
                              onDelete={session ? () => void removeSession(session.id) : undefined}
                              onUnsend={session ? () => void unsendSession(session.id) : undefined}
                              allowSessionActions={!effectiveAthleteMode}
                              hideActionSlot={false}
                            />
                          </div>
                        );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                      variant="default"
                    />

                    <Group title="Plan de la semaine" className="mb-0">
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
                              miniProfile: renderWorkoutMiniProfile(normalizedSegments, { sessionSchema: true }),
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
                            onOpen={session ? () => openSessionPreview(session.id) : undefined}
                            onEdit={session ? () => openEditSession(session.id) : undefined}
                            onSend={
                              session ? () => void (session.sent ? unsendSession(session.id) : sendSession(session.id)) : undefined
                            }
                            onDuplicate={session ? () => void duplicateSession(session, addDays(day, 1)) : undefined}
                            onDelete={session ? () => void removeSession(session.id) : undefined}
                            onUnsend={session ? () => void unsendSession(session.id) : undefined}
                            allowSessionActions={!effectiveAthleteMode}
                            hideActionSlot={!!activeAthleteId}
                          />
                        );
                      })}
                    </Group>
                  </>
                )}

                {weekPlannerMode && !activeAthlete && !activeGroup ? (
                  <div className="h-[calc(5rem+env(safe-area-inset-bottom))]" aria-hidden />
                ) : null}

                {weekPlannerMode && (activeAthlete || activeGroup) ? (
                  <div className="flex gap-2.5 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2">
                    <button type="button" className="handoff-week-btn handoff-week-btn--primary" onClick={() => copyAthleteWeek()}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-[#0066cc]">
                        <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M4 11H3a1 1 0 01-1-1V3a1 1 0 011-1h7a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Copier la semaine
                    </button>
                    <button
                      type="button"
                      className="handoff-week-btn handoff-week-btn--muted"
                      onClick={() => void pasteAthleteWeek()}
                      disabled={!copiedWeekSessions?.length || copiedFromAthleteId === activeAthleteId}
                    >
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 opacity-70">
                        <path
                          d="M5 3h6l2 2v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path d="M6 3V2a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      Coller la semaine
                    </button>
                  </div>
                ) : null}
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
                  onOpenPlanForAthlete={handleOpenPlanForAthleteFromTracking}
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
                variant={clubPageVariant}
                clubName={activeClubName || "RunConnect Club"}
                clubCreatedBy={clubCreatedBy}
                clubDescription={clubDescription}
                clubLocation={clubLocation}
                clubAvatarUrl={clubAvatarUrl}
                clubCreatedAt={clubConversationCreatedAt}
                coachesCount={clubMembers.filter((m) => m.role === "coach" || m.role === "admin").length}
                trainingGroups={clubGroupsAdmin}
                members={clubMembers}
                invitations={clubInvitations}
                currentUserId={user?.id}
                isClubOwner={clubCreatedBy === user?.id}
                notificationsMuted={clubSettingsMuted}
                onToggleNotifications={() => {
                  const newMuted = !clubSettingsMuted;
                  setClubSettingsMuted(newMuted);
                  if (user) {
                    void supabase.from("profiles").update({ notif_message: !newMuted }).eq("user_id", user.id);
                  }
                }}
                onInviteAthlete={() => setInviteDialogOpen(true)}
                onInviteCoach={() => setInviteDialogOpen(true)}
                onEditClub={() => void editClubInfo()}
                onOpenMemberProfile={(uid) => navigate(`/profile/${uid}`)}
                onSendMessage={(uid) => void openDirectMessage(uid)}
                onChangeRole={(uid, role) => void updateMemberRole(uid, role)}
                onRemoveMember={(uid) => void removeMemberFromClub(uid)}
                onResendInvitation={(invitationId) => void resendInvitation(invitationId)}
                onCancelInvitation={(invitationId) => void cancelInvitation(invitationId)}
                onShareClubCode={() => void shareClubFromCoaching()}
                onDeleteClub={() => void deleteClubAsAdmin()}
                onCreateTrainingGroup={() => void createGroup()}
                onOpenTrainingGroup={() => setActiveMenuKey("groups")}
                onClubStatistics={() => setActiveMenuKey("dashboard")}
                onClubShop={() => toast.success("Boutique du club : à venir")}
                onReportClub={() =>
                  window.confirm(
                    "Signaler ce club ? Notre équipe examinera votre signalement sous 24h."
                  )
                    ? toast.success("Merci pour votre retour.")
                    : undefined
                }
                onLeaveClub={() => void leaveClubFromCoaching()}
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
        onPressClubAvatar={openClubProfileSheet}
      />

      <ClubProfileDialog
          isOpen={clubProfileOpen}
          onClose={() => setClubProfileOpen(false)}
          conversationId={activeClubId || ""}
          groupName={activeClubName || "Club"}
          groupDescription={clubDescription}
          groupAvatarUrl={clubAvatarUrl}
          isAdmin={clubCreatedBy === user?.id}
          clubCode={clubCode || ""}
          createdBy={clubCreatedBy || ""}
          createdAt={clubConversationCreatedAt}
          isClub={Boolean(clubCode)}
          isMuted={clubProfileNotifMuted}
          onToggleMute={() => {
            const newMuted = !clubProfileNotifMuted;
            setClubProfileNotifMuted(newMuted);
            if (user) {
              void supabase.from("profiles").update({ notif_message: !newMuted }).eq("user_id", user.id);
            }
          }}
          dismissBackLabel="Coaching"
          onEditClub={() => {
            setClubProfileOpen(false);
            void editClubInfo();
          }}
          onClubLeftOrDeleted={() => {
            setClubProfileOpen(false);
            setCoachClubsReloadToken((t) => t + 1);
          }}
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
                navigate("/messages?tab=create-club");
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
        <div className="coaching-create-flat fixed inset-0 z-[125] flex min-h-0 flex-col overflow-hidden">
          <IosFixedPageHeaderShell
            className="min-h-0 h-full"
            headerWrapperClassName="shrink-0 border-b border-border bg-card"
            header={
              <div className="pt-[calc(var(--safe-area-top)-4px)]">
                <IosPageHeaderBar
                  leadingBack={{
                    onClick: () => {
                      if (hasCreateDraftWork) {
                        setPendingDrawerKey("planning");
                        setShowExitDraftDialog(true);
                        return;
                      }
                      setCoachingTab("planning");
                    },
                    label: "Retour",
                  }}
                  title="Créer une séance"
                  right={
                    <button
                      type="button"
                      onClick={() => setCoachingTab("planning")}
                      className="text-[17px] font-semibold text-primary"
                    >
                      OK
                    </button>
                  }
                />
                <div className="grid grid-cols-2 gap-2 px-4 pb-1.5">
                  <button
                    type="button"
                    onClick={() => setEditorTab("build")}
                    className={cn(
                      "h-8 rounded-full border text-center text-[13px] font-semibold transition-colors",
                      editorTab === "build"
                        ? "border-[#0066cc] bg-[#0066cc] text-white"
                        : "border-[#e0e0e0] bg-white text-[#1d1d1f]"
                    )}
                  >
                    Construire
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("models")}
                    className={cn(
                      "h-8 rounded-full border text-center text-[13px] font-semibold transition-colors",
                      editorTab === "models"
                        ? "border-[#0066cc] bg-[#0066cc] text-white"
                        : "border-[#e0e0e0] bg-white text-[#1d1d1f]"
                    )}
                  >
                    Modèles
                  </button>
                </div>
              </div>
            }
            scrollClassName="bg-[#f5f5f7] pb-24"
            footer={
              editorTab === "build" && (
                <div className="border-t border-[#e0e0e0] bg-[#f5f5f7] px-[17px] pb-[max(1.4rem,var(--safe-area-bottom))] pt-[14px]">
                  <Button
                    onClick={() => void saveSession()}
                    className="h-[50px] w-full rounded-full bg-[#0066cc] text-[17px] font-semibold text-white"
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
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Nom de la séance"
                  className="w-full bg-transparent font-display text-[42px] font-semibold tracking-[-0.8px] text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none"
                />
                <div className="py-3">
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-[10px]">
                      {[
                        { id: "running", emoji: "🏃", bg: "#007AFF" },
                        { id: "cycling", emoji: "🚴", bg: "#FF3B30" },
                        { id: "swimming", emoji: "🏊", bg: "#5AC8FA" },
                        { id: "strength", emoji: "💪", bg: "#FF9500" },
                      ].map((sport) => (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => setDraft((prev) => ({ ...prev, sport: sport.id as typeof prev.sport }))}
                          aria-label={sport.id}
                          className="relative aspect-square rounded-[14px] text-[36px] leading-none flex items-center justify-center transition-transform active:scale-95"
                          style={{ backgroundColor: sport.bg }}
                        >
                          {draft.sport === sport.id && (
                            <span className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[0_0_0_2px_#f5f5f7,0_0_0_4px_#0066cc]" />
                          )}
                          {sport.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-3">
                    <p className="px-0.5 text-[14px] font-semibold tracking-[-0.224px]" style={{ color: "#1d1d1f" }}>Schéma de séance</p>
                    <div className="min-w-0 rounded-[18px] border border-border/65 bg-white px-2 py-2 shadow-[0_14px_30px_-22px_rgba(15,23,42,0.22)]">
                        <div className="flex min-w-0 gap-2">
                          <div className="flex min-h-[220px] h-[220px] shrink-0 flex-col justify-around py-0 text-[9px] font-semibold leading-none" style={{ color: "#7a7a7a" }}>
                            <span>Z6</span>
                            <span>Z5</span>
                            <span>Z4</span>
                            <span>Z3</span>
                            <span>Z2</span>
                            <span>Z1</span>
                          </div>
                          <div
                            ref={schemaPreviewRef}
                            onPointerMove={handleSchemaPreviewPointerMove}
                            onPointerDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                            }}
                            className={cn(
                              "relative min-w-0 flex-1",
                              schemaDraggingTool ? "cursor-copy rounded-md ring-2 ring-[#2563EB]/35" : ""
                            )}
                            title={schemaDraggingTool ? "Placez le bloc sur le schéma" : undefined}
                          >
                            <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
                              {[0, 1, 2, 3, 4, 5].map((i) => (
                                <div
                                  key={i}
                                  className="absolute left-0 right-0"
                                  style={{
                                    top: `${(i / 6) * 100}%`,
                                    borderTop: "1px dashed #e0e0e0",
                                  }}
                                />
                              ))}
                              <div
                                className="absolute bottom-0 left-0 right-0"
                                style={{ borderTop: "1px solid rgba(29,29,31,0.18)" }}
                              />
                            </div>
                            <MiniWorkoutProfile
                              blocks={previewBars}
                              variant="premiumCompact"
                              barHeightScale={3}
                              zoneBandMode
                              interBlockGapPx={4}
                              flatSurface
                              selectedBlockIndex={selectedSchemaPreviewIndex}
                              onBlockTap={({ index }) => {
                                if (!draft.blocks.length) return;
                                const mappedDraftIndex =
                                  draft.blocks.length <= 1 || previewBars.length <= 1
                                    ? 0
                                    : Math.round((index / Math.max(1, previewBars.length - 1)) * (draft.blocks.length - 1));
                                const block = draft.blocks[Math.max(0, Math.min(draft.blocks.length - 1, mappedDraftIndex))];
                                if (block) setSelectedBlockId(block.id);
                              }}
                              className="relative z-[2] h-[220px] w-full bg-transparent"
                            />
                            {schemaDropRatio != null ? (
                              <div
                                aria-hidden
                                className="pointer-events-none absolute inset-y-2.5 w-0.5 rounded-full bg-[#2563EB]/45"
                                style={{ left: `calc(${Math.max(0, Math.min(100, schemaDropRatio * 100))}% - 1px)` }}
                              />
                            ) : null}
                            {schemaDropRatio != null && schemaDraggingTool ? (
                              <div
                                aria-hidden
                                className="pointer-events-none absolute z-30 rounded-xl border border-[#2563EB]/35 bg-white/95 px-1.5 py-1 shadow-[0_14px_30px_-18px_rgba(37,99,235,0.65)] backdrop-blur-[2px]"
                                style={{
                                  left: `calc(${Math.max(0, Math.min(100, schemaDropRatio * 100))}%)`,
                                  top: "50%",
                                  transform: "translate(-50%, -50%)",
                                }}
                              >
                                <SchemaDragToolMini tool={schemaDraggingTool} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-1.5 overflow-x-auto pl-[2.2rem]">
                          <div className="flex min-w-full items-center justify-between gap-1 text-[10px] font-medium text-muted-foreground">
                            {sessionTimeAxisLabels.map((label) => (
                              <span key={`axis-${label}`} className="shrink-0 text-center">
                                {label}
                              </span>
                            ))}
                          </div>
                          <p className="mt-0.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Temps
                          </p>
                        </div>
                    </div>

                    <p className="mb-[10px] mt-5 px-0.5 text-[14px] font-semibold tracking-[-0.224px]" style={{ color: "#1d1d1f" }}>Ajouter un bloc</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          {
                            key: "steady" as const,
                            title: "Continu",
                            mini: (
                              <svg viewBox="0 0 44 22" className="w-[44px] h-[22px]" fill="none" aria-hidden>
                                <rect x="2" y="9" width="40" height="6" rx="2" fill="#0066cc"/>
                              </svg>
                            ),
                          },
                          {
                            key: "interval" as const,
                            title: "Intervalle",
                            mini: (
                              <svg viewBox="0 0 44 22" className="w-[44px] h-[22px]" fill="none" aria-hidden>
                                <rect x="2"  y="4"  width="6" height="16" rx="1.5" fill="#FF9500"/>
                                <rect x="11" y="14" width="3" height="6"  rx="1"   fill="#B5B5BA"/>
                                <rect x="17" y="4"  width="6" height="16" rx="1.5" fill="#FF9500"/>
                                <rect x="26" y="14" width="3" height="6"  rx="1"   fill="#B5B5BA"/>
                                <rect x="32" y="4"  width="6" height="16" rx="1.5" fill="#FF9500"/>
                              </svg>
                            ),
                          },
                          {
                            key: "pyramid" as const,
                            title: "Pyramide",
                            mini: (
                              <svg viewBox="0 0 44 22" className="w-[44px] h-[22px]" fill="none" aria-hidden>
                                <rect x="2"  y="14" width="5" height="6"  rx="1"   fill="#34C759"/>
                                <rect x="9"  y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/>
                                <rect x="16" y="4"  width="5" height="16" rx="1.5" fill="#FF9500"/>
                                <rect x="23" y="4"  width="5" height="16" rx="1.5" fill="#FF9500"/>
                                <rect x="30" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/>
                                <rect x="37" y="14" width="5" height="6"  rx="1"   fill="#34C759"/>
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
                          className={cn(
                            "group flex cursor-grab flex-col items-center gap-2 rounded-[14px] border select-none touch-none transition active:cursor-grabbing py-[14px] px-2 pb-[10px]",
                            card.key === "pyramid"
                              ? "border-2 border-[#0066cc] bg-white"
                              : "border-[#e0e0e0] bg-white hover:border-[#0066cc]/40"
                          )}
                        >
                          <div className="pointer-events-none flex items-center justify-center">
                            {card.mini}
                          </div>
                          <p className="shrink-0 text-center text-[12px] leading-none tracking-[-0.12px]" style={{ color: "#1d1d1f" }}>{card.title}</p>
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
                        className="group flex cursor-grab flex-col items-center gap-2 rounded-[14px] border border-[#e0e0e0] bg-white py-[14px] px-2 pb-[10px] select-none touch-none transition hover:border-[#0066cc]/40 active:cursor-grabbing"
                      >
                        <div className="pointer-events-none flex items-center justify-center">
                          <svg viewBox="0 0 44 22" className="w-[44px] h-[22px]" fill="none" aria-hidden>
                            <rect x="2"  y="16" width="5" height="4"  rx="1"   fill="#B5B5BA"/>
                            <rect x="9"  y="12" width="5" height="8"  rx="1"   fill="#34C759"/>
                            <rect x="16" y="6"  width="5" height="14" rx="1.3" fill="#FF9500"/>
                            <rect x="23" y="14" width="5" height="6"  rx="1"   fill="#0066cc"/>
                            <rect x="30" y="4"  width="5" height="16" rx="1.5" fill="#FF3B30"/>
                            <rect x="37" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/>
                          </svg>
                        </div>
                        <p className="shrink-0 text-center text-[12px] leading-none tracking-[-0.12px]" style={{ color: "#1d1d1f" }}>
                          Variation
                        </p>
                      </div>

                    </div>
                    {schemaDraggingTool && schemaDragPointer ? (
                      <div
                        className="pointer-events-none fixed z-[125] rounded-full border border-[#2563EB]/45 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] shadow-lg"
                        style={{ left: schemaDragPointer.x + 10, top: schemaDragPointer.y + 10 }}
                      >
                        {schemaDragToolLabel(schemaDraggingTool)}
                      </div>
                    ) : null}
                </div>
                </div>

                  {draft.blocks.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {draft.blocks.map((block, index) => {
                        const isPyramidBlock = Boolean(block.notes?.includes(PYRAMID_NOTES_PREFIX));
                        const isProgressive = isProgressiveBlock(block);
                        const pyramidConfig = isPyramidBlock ? parsePyramidConfig(block) : null;
                        const pyramidSteps = pyramidConfig ? buildPyramidDisplaySteps(pyramidConfig) : [];
                        const isSelected = selectedBlockId === block.id;
                        const accentHex = isPyramidBlock ? "#FF9500" : isProgressive ? "#AF52DE" : block.type === "interval" ? "#0066cc" : "#34C759";
                        const blockName = isPyramidBlock ? "Pyramide" : isProgressive ? "Variation" : blockTitle(block.type);
                        const badge = isPyramidBlock && pyramidConfig
                          ? (() => { const mc = pyramidSteps.filter(s => s.isMirror).length; return mc > 0 ? `${pyramidConfig.steps.length} + ${mc} miroirs` : `${pyramidConfig.steps.length} paliers`; })()
                          : isProgressive
                          ? `${block.paceStartSecPerKm ? compactPaceLabel(block.paceStartSecPerKm) : "?'??"} → ${block.paceEndSecPerKm ? compactPaceLabel(block.paceEndSecPerKm) : "?'??"}`
                          : block.type === "interval" ? `${block.blockRepetitions ?? 1} × ${block.repetitions ?? 1}` : `${index + 1}`;
                        const subtitle = isPyramidBlock && pyramidConfig ? pyramidSubtitle(pyramidConfig) : blockSummary(block);

                        return (
                          <div key={block.id} className="relative overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
                            {/* Left accent bar */}
                            <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: accentHex }} />
                            {/* Header */}
                            <button
                              type="button"
                              className="grid w-full items-center gap-[10px] py-3 pl-4 pr-3 text-left"
                              style={{ gridTemplateColumns: "32px 1fr auto" }}
                              onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ background: accentHex }}>
                                {isPyramidBlock ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><polygon points="12,5 21,20 3,20"/></svg>
                                ) : isProgressive ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="4,18 9,12 13,15 20,5"/><polyline points="14,5 20,5 20,11"/></svg>
                                ) : block.type === "interval" ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M13 2 L4 13 L11 13 L11 22 L20 11 L13 11 Z"/></svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-4 w-4"><line x1="6" y1="9" x2="18" y2="9"/><line x1="6" y1="15" x2="18" y2="15"/></svg>
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="mb-0.5 flex items-baseline gap-[7px]">
                                  <span className="text-[16px] font-semibold tracking-[-0.3px]" style={{ color: "#1d1d1f" }}>{blockName}</span>
                                  <span className="rounded-full px-[7px] py-[2px] text-[11px] font-semibold leading-none" style={{ color: accentHex, background: accentHex + "22" }}>{badge}</span>
                                </div>
                                <div className="truncate text-[13px]" style={{ color: "#7a7a7a" }}>{subtitle}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-full transition-transform", isSelected ? "rotate-180" : "")}>
                                  <ChevronDown className="h-4 w-4" style={{ color: "#7a7a7a" }} />
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Supprimer ${blockName}`}
                                  onClick={(e) => { e.stopPropagation(); removeDraftBlock(block.id); }}
                                  className="flex h-[30px] w-[30px] items-center justify-center rounded-full transition-colors hover:bg-red-50 hover:text-[#FF3B30]"
                                  style={{ color: "#7a7a7a" }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </button>
                            {/* Body */}
                            {isSelected && (
                              <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-[14px]">
                              {block.type === "interval" ? (
                                <div className="space-y-[10px]">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Blocs</p>
                                      <button type="button" onClick={() => openWheel("Blocs", Array.from({length:20},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.blockRepetitions??1), (n)=>updateDraftBlock(block.id,(c)=>({...c,blockRepetitions:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:"#1d1d1f"}}>{block.blockRepetitions??1}</button>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Répétitions</p>
                                      <button type="button" onClick={() => openWheel("Répétitions", Array.from({length:20},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.repetitions??1), (n)=>updateDraftBlock(block.id,(c)=>({...c,repetitions:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:"#1d1d1f"}}>{block.repetitions??1}</button>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>RPE</p>
                                      <button type="button" onClick={() => openWheel("RPE", Array.from({length:10},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.rpe??8), (n)=>updateDraftBlock(block.id,(c)=>({...c,rpe:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.rpe?"#1d1d1f":"#7a7a7a"}}>{block.rpe??"—"}</button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                                      <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); setWheelUnit("km"); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                                      <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure</p>
                                      <button type="button" onClick={() => { const p=block.paceSecPerKm||270; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); setWheelUnit("min/km"); openWheelColumns("Allure du bloc",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,paceSecPerKm:n},"pace"):{...c,paceSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceSecPerKm?compactPaceLabel(block.paceSecPerKm):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Récup effort</p>
                                      <button type="button" onClick={() => { const t=block.blockRecoveryDurationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Récupération entre blocs",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateDraftBlock(block.id,(c)=>({...c,blockRecoveryDurationSec:n}));});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.blockRecoveryDurationSec?"#1d1d1f":"#7a7a7a"}}>{block.blockRecoveryDurationSec?secondsToLabel(block.blockRecoveryDurationSec):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Récup série</p>
                                      <button type="button" onClick={() => { const t=block.recoveryDurationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Récupération entre répétitions",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateDraftBlock(block.id,(c)=>({...c,recoveryDurationSec:n}));});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.recoveryDurationSec?"#1d1d1f":"#7a7a7a"}}>{block.recoveryDurationSec?secondsToLabel(block.recoveryDurationSec):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>&nbsp;</span>
                                    </div>
                                  </div>
                                </div>
                              ) : isPyramidBlock && pyramidConfig ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-4 gap-[6px]">
                                    {([
                                      { mode: "symetrique" as const, label: "Symétrique", svgBars: [[0,6,3],[1,3,6],[2,0,12],[3,3,6],[4,6,3]] },
                                      { mode: "croissante" as const, label: "Croiss.", svgBars: [[0,6,3],[1,3,6],[2,0,12]] },
                                      { mode: "decroissante" as const, label: "Décroiss.", svgBars: [[0,0,12],[1,3,6],[2,6,3]] },
                                      { mode: "manuelle" as const, label: "Manuelle", svgBars: [[0,3,6],[1,0,12],[2,6,3],[3,2,9]] },
                                    ]).map((modeCard) => {
                                      const isActive = pyramidConfig.mode === modeCard.mode;
                                      return (
                                        <button key={`${block.id}-${modeCard.mode}`} type="button"
                                          className={cn("flex flex-col items-center gap-1 rounded-[11px] border pb-[6px] pt-2 transition-all", isActive ? "border-2 border-[#FF9500] bg-[rgba(255,149,0,0.08)]" : "border-[#e0e0e0] bg-[#f5f5f7]")}
                                          onClick={() => updatePyramidBlock(block.id, (cfg) => ({ ...cfg, mode: modeCard.mode }))}>
                                          <svg viewBox="0 0 22 14" className="h-[14px] w-[22px]" aria-hidden>
                                            {modeCard.svgBars.map(([xi, yi, hi]) => (
                                              <rect key={xi} x={xi * 5 + 1} y={yi} width="3" height={hi} rx="0.5" fill={isActive ? "#FF9500" : "#7a7a7a"} />
                                            ))}
                                          </svg>
                                          <span className="text-[11px] leading-none tracking-[-0.1px]" style={{ color: isActive ? "#FF9500" : "#1d1d1f", fontWeight: isActive ? 600 : 500 }}>{modeCard.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-start gap-2 rounded-[11px] border px-3 py-[10px]" style={{ background: "rgba(255,149,0,0.06)", borderColor: "rgba(255,149,0,0.25)" }}>
                                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF9500]" />
                                    <p className="text-[12.5px] leading-[1.4] tracking-[-0.1px]" style={{ color: "#333" }}>{PYRAMID_MODE_HINTS[pyramidConfig.mode]}</p>
                                  </div>

                                  <div className="flex flex-col gap-[6px]">
                                    {pyramidSteps.map((step, stepIndex) => {
                                      const stepNumber = stepIndex + 1;
                                      const stepKey = `${block.id}:${step.id}`;
                                      const isOpen = Boolean(expandedPyramidSteps[stepKey]);
                                      const zone = step.zone || "Z4";
                                      const isMirror = step.isMirror;
                                      const sourcePalier = (step.mirrorOf ?? 0) || step.sourceIndex + 1;
                                      return (
                                        <div
                                          key={stepKey}
                                          className={cn(
                                            "overflow-hidden rounded-[11px] border",
                                            isMirror ? "border-[rgba(255,149,0,0.35)] bg-[rgba(255,149,0,0.04)]" : "border-[#e0e0e0] bg-[#f5f5f7]"
                                          )}
                                        >
                                          <button
                                            type="button"
                                            className="grid w-full items-center gap-[9px] px-3 py-[10px] text-left"
                                            style={{ gridTemplateColumns: "22px auto 1fr 18px" }}
                                            onClick={() =>
                                              setExpandedPyramidSteps((prev) => ({
                                                ...prev,
                                                [stepKey]: !prev[stepKey],
                                              }))
                                            }
                                          >
                                            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[11px] font-semibold" style={{ color: "#333" }}>
                                              {stepNumber}
                                            </span>
                                            <span className="inline-flex h-5 items-center rounded-[6px] px-[7px] text-[11px] font-bold" style={{ background: zoneHexColor(zone), color: zoneTextColor(zone) }}>
                                              {zone}
                                            </span>
                                            <div className="min-w-0 truncate text-[13px]" style={{ color: "#333" }}>
                                              <strong style={{ color: "#1d1d1f" }}>{step.distanceM ? metersToLabel(step.distanceM) : "—"}</strong>
                                              {" · "}{step.paceSecPerKm ? compactPaceLabel(step.paceSecPerKm) : "—"}
                                              {" · récup "}{step.recoveryDurationSec ? secondsToLabel(step.recoveryDurationSec) : "—"}
                                              {isMirror && (
                                                <span className="ml-[7px] text-[10px] font-bold uppercase tracking-[0.3px]" style={{ color: "#FF9500" }}>🔒 Miroir P{sourcePalier}</span>
                                              )}
                                            </div>
                                            <span className={cn("flex h-[18px] w-[18px] items-center justify-center transition-transform", isOpen ? "rotate-180" : "")}>
                                              <ChevronDown className="h-3 w-3" style={{ color: "#7a7a7a" }} />
                                            </span>
                                          </button>
                                          {isOpen ? (
                                            <div className="border-t border-[#f0f0f0] px-3 pb-3 pt-2">
                                              {isMirror ? (
                                                <div className="mb-2 rounded-[8px] px-2.5 py-2 text-[11px]" style={{ background: "rgba(255,149,0,0.1)", color: "#C2410C" }}>
                                                  🔒 Ce palier est le miroir verrouillé du Palier {sourcePalier}. Modifie le palier source pour changer ses valeurs.
                                                </div>
                                              ) : null}
                                              <div className="grid grid-cols-3 gap-2">
                                                {[
                                                  { key: "paceSecPerKm", label: "Allure", value: step.paceSecPerKm ? compactPaceLabel(step.paceSecPerKm) : "" },
                                                  { key: "distanceM", label: "Distance", value: step.distanceM ? String(step.distanceM) : "" },
                                                  { key: "durationSec", label: "Temps", value: step.durationSec ? String(step.durationSec) : "" },
                                                ].map((field) => (
                                                  <label key={`${stepKey}-${field.key}`}>
                                                    <span className="mb-1.5 block pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: "#7a7a7a" }}>{field.label}</span>
                                                    <input
                                                      value={field.value}
                                                      disabled={isMirror}
                                                      placeholder="—"
                                                      onChange={(event) => {
                                                        if (isMirror) return;
                                                        updatePyramidBlock(block.id, (cfg) => {
                                                          const steps = [...cfg.steps];
                                                          const source = steps[step.sourceIndex];
                                                          if (!source) return cfg;
                                                          const raw = event.target.value;
                                                          const nextValue =
                                                            field.key === "paceSecPerKm"
                                                              ? parsePaceInputToSec(raw)
                                                              : (() => {
                                                                  const numeric = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
                                                                  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
                                                                })();
                                                          if (field.key === "paceSecPerKm") source.paceSecPerKm = nextValue;
                                                          if (field.key === "distanceM") source.distanceM = nextValue;
                                                          if (field.key === "durationSec") source.durationSec = nextValue;
                                                          return { ...cfg, steps };
                                                        });
                                                      }}
                                                      className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium outline-none focus:border-2 focus:border-[#0066cc]"
                                                      style={{ color: isMirror ? "#7a7a7a" : "#1d1d1f", cursor: isMirror ? "not-allowed" : undefined }}
                                                    />
                                                  </label>
                                                ))}
                                              </div>
                                              <div className="mt-2 grid grid-cols-2 gap-2">
                                                {[
                                                  { key: "recoveryDurationSec", label: "Récup", value: step.recoveryDurationSec ? String(step.recoveryDurationSec) : "" },
                                                  { key: "repetitions", label: "Répétitions", value: String(step.repetitions ?? 1) },
                                                ].map((field) => (
                                                  <label key={`${stepKey}-${field.key}`}>
                                                    <span className="mb-1.5 block pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: "#7a7a7a" }}>{field.label}</span>
                                                    <input
                                                      value={field.value}
                                                      disabled={isMirror}
                                                      onChange={(event) => {
                                                        if (isMirror) return;
                                                        const numeric = Number.parseInt(event.target.value.replace(/[^\d]/g, ""), 10);
                                                        updatePyramidBlock(block.id, (cfg) => {
                                                          const steps = [...cfg.steps];
                                                          const source = steps[step.sourceIndex];
                                                          if (!source) return cfg;
                                                          const nextValue = Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
                                                          if (field.key === "recoveryDurationSec") source.recoveryDurationSec = nextValue;
                                                          if (field.key === "repetitions") source.repetitions = nextValue ?? 1;
                                                          return { ...cfg, steps };
                                                        });
                                                      }}
                                                      className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium outline-none focus:border-2 focus:border-[#0066cc]"
                                                      style={{ color: isMirror ? "#7a7a7a" : "#1d1d1f", cursor: isMirror ? "not-allowed" : undefined }}
                                                    />
                                                  </label>
                                                ))}
                                              </div>
                                              <div className="mt-2">
                                                <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{ color: "#7a7a7a" }}>Zone</p>
                                                <div className="flex gap-1">
                                                  {(PREVIEW_ZONE_ORDER as readonly ZoneKey[]).map((zoneKey) => (
                                                    <button
                                                      key={`${stepKey}-${zoneKey}`}
                                                      type="button"
                                                      disabled={isMirror}
                                                      className={cn("flex-1 rounded-md py-1 text-[10px] font-bold transition-transform", step.zone === zoneKey ? "scale-[1.04] ring-1 ring-black/20" : "", isMirror ? "cursor-not-allowed opacity-70" : "")}
                                                      style={{ background: zoneHexColor(zoneKey), color: zoneTextColor(zoneKey) }}
                                                      onClick={() =>
                                                        updatePyramidBlock(block.id, (cfg) => {
                                                          const steps = [...cfg.steps];
                                                          const source = steps[step.sourceIndex];
                                                          if (!source) return cfg;
                                                          source.zone = zoneKey;
                                                          return { ...cfg, steps };
                                                        })
                                                      }
                                                    >
                                                      {zoneKey}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                              {!isMirror ? (
                                                <div className="mt-2 flex justify-end">
                                                  <button
                                                    type="button"
                                                    className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-500"
                                                    onClick={() =>
                                                      updatePyramidBlock(block.id, (cfg) => ({
                                                        ...cfg,
                                                        steps: cfg.steps.filter((_, sourceIdx) => sourceIdx !== step.sourceIndex),
                                                      }))
                                                    }
                                                  >
                                                    Supprimer
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <button
                                    type="button"
                                    className="mt-2 h-[40px] w-full rounded-[11px] border-[1.5px] border-dashed border-[#e0e0e0] bg-transparent text-[14px] font-semibold tracking-[-0.2px] text-[#0066cc]"
                                    onClick={() => {
                                      const newStepId = uid();
                                      updatePyramidBlock(block.id, (cfg) => ({
                                        ...cfg,
                                        steps: [...cfg.steps, { id: newStepId, zone: "Z4", repetitions: 1 }],
                                      }));
                                      setExpandedPyramidSteps((prev) => ({
                                        ...prev,
                                        [`${block.id}:${newStepId}`]: true,
                                      }));
                                    }}
                                  >
                                    + Ajouter un palier
                                  </button>
                                </div>
                              ) : isProgressiveBlock(block) ? (
                                <div className="space-y-[10px]">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure début</p>
                                      <button type="button" onClick={() => { const p=block.paceStartSecPerKm||block.paceSecPerKm||330; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); setWheelUnit("min/km"); openWheelColumns("Allure de début",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveProgressiveRunningVolume({...c,paceStartSecPerKm:n},"paceStart"):{...c,paceStartSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceStartSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceStartSecPerKm?compactPaceLabel(block.paceStartSecPerKm):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure finale</p>
                                      <button type="button" onClick={() => { const p=block.paceEndSecPerKm||block.paceSecPerKm||285; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); setWheelUnit("min/km"); openWheelColumns("Allure finale",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveProgressiveRunningVolume({...c,paceEndSecPerKm:n},"paceEnd"):{...c,paceEndSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceEndSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceEndSecPerKm?compactPaceLabel(block.paceEndSecPerKm):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>RPE</p>
                                      <button type="button" onClick={() => openWheel("RPE",Array.from({length:10},(_,i)=>({value:String(i+1),label:String(i+1)})),String(block.rpe??7),(n)=>updateDraftBlock(block.id,(c)=>({...c,rpe:Number(n),intensityMode:"rpe"})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.rpe?"#1d1d1f":"#7a7a7a"}}>{block.rpe??"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>&nbsp;</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                                      <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); setWheelUnit("km"); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveProgressiveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                                      <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveProgressiveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-[10px]">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure</p>
                                      <button type="button" onClick={() => { const p=block.paceSecPerKm||330; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); setWheelUnit("min/km"); openWheelColumns("Allure du bloc",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,paceSecPerKm:n},"pace"):{...c,paceSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceSecPerKm?compactPaceLabel(block.paceSecPerKm):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                                      <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); setWheelUnit("km"); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                                    </div>
                                    <div>
                                      <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                                      <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateDraftBlock(block.id,(c)=>draft.sport==="running"?deriveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
                                      <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              </div>
                            )}
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
                      const defaultStep = {
                        id: uid(),
                        paceSecPerKm: 330,
                        distanceM: 200,
                        durationSec: 60,
                        recoveryDurationSec: 60,
                        repetitions: 1,
                        zone: "Z4" as ZoneKey,
                      };
                      insertDraftBlock(
                        {
                          ...createDefaultBlock("steady", nextOrder),
                          repetitions: 3,
                          notes: serializePyramidConfig({ mode: "symetrique", steps: [defaultStep, { ...defaultStep, id: uid() }, { ...defaultStep, id: uid() }] }),
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

      <Sheet open={!!sessionPreview} onOpenChange={(open) => (!open ? closeSessionPreview() : undefined)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          overlayClassName="z-[140]"
          className="z-[140] grid w-full max-h-[92dvh] grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-t-[24px] border-[#E5E5EA] bg-white p-0 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:mx-auto sm:max-w-lg"
        >
          {previewSessionItem ? (
            <>
              <div className="flex-shrink-0 pt-2.5 pb-1.5" aria-hidden>
                <div className="mx-auto h-[5px] w-10 rounded-full bg-[#D1D1D6]" />
              </div>
              <div className="flex-shrink-0 px-5 pt-1">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-95"
                  onClick={closeSessionPreview}
                  aria-label="Fermer"
                >
                  <X className="h-7 w-7 text-[#0A0F1F]" strokeWidth={2.4} />
                </button>
              </div>

              <div className="min-h-0 touch-pan-y overflow-y-auto overscroll-y-contain px-5 pb-[max(1rem,var(--safe-area-bottom))] [-webkit-overflow-scrolling:touch]">
                <h2 className="m-0 text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#0A0F1F]">
                  {previewSessionItem.title || "Séance sans titre"}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-5">
                  {previewSessionMetrics.durationLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-[18px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
                      <Clock3 className="h-5 w-5 shrink-0 text-[#0A0F1F]" strokeWidth={2.2} />
                      {previewSessionMetrics.durationLabel}
                    </span>
                  ) : null}
                  {previewSessionMetrics.distanceLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-[18px] font-extrabold tracking-[-0.01em] text-[#0A0F1F]">
                      <Ruler className="h-5 w-5 shrink-0 text-[#0A0F1F]" strokeWidth={2.2} />
                      {previewSessionMetrics.distanceLabel}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3.5">
                  {previewSessionBubbleLabel ? (
                    <div className="mb-2 rounded-xl bg-[#1c1d21] px-3 py-1.5 text-center text-[12px] font-semibold text-white">
                      {previewSessionBubbleLabel}
                    </div>
                  ) : null}
                  <MonPlanSchemaBars
                    size="sheet"
                    blocks={previewSessionMiniBars}
                    interactive
                    selectedBarIndex={previewSessionSelectedBarIndex}
                    onSelectBarIndex={(index) => {
                      if (!previewSessionItem.blocks.length || !previewSessionMiniBars.length) return;
                      const mapped = Math.round(
                        (index / Math.max(1, previewSessionMiniBars.length - 1)) * (previewSessionItem.blocks.length - 1)
                      );
                      const targetBlock =
                        previewSessionItem.blocks[Math.max(0, Math.min(mapped, previewSessionItem.blocks.length - 1))];
                      if (!targetBlock) return;
                      setSessionPreview((prev) => (prev ? { ...prev, blockId: targetBlock.id, anchorX: 0, anchorTop: 0 } : prev));
                    }}
                  />
                  <p className="mt-1 text-center text-[12px] font-medium text-[#8E8E93]">
                    Touche un bloc pour voir l&apos;allure et la durée
                  </p>
                </div>

                <div className="mt-[18px] space-y-[18px] pb-1">
                  {previewSessionSections.map((section) => (
                    <div key={section.id}>
                      <h3 className="m-0 mb-2 text-[22px] font-black tracking-[-0.02em] text-[#0A0F1F]">{section.title}</h3>
                      {section.lines.map((line, idx) => (
                        <p key={`${section.id}-${idx}`} className="m-0 mb-1 text-[17px] font-medium leading-snug text-[#0A0F1F] last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>

                {previewAthletePlanSession && previewAthleteParticipationUi === "conflict" ? (
                  <div className="mt-4 rounded-xl border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-[13px] text-violet-950 dark:text-violet-100">
                    Deux séances sont proches sur cette plage horaire. Parlez-en avec votre coach.
                  </div>
                ) : null}

                {previewAthletePlanSession &&
                previewAthleteParticipationUi &&
                previewAthleteParticipationUi !== "done" &&
                previewAthleteParticipationUi !== "missed" &&
                previewAthleteParticipationUi !== "conflict" ? (
                  <div className="mt-4 rounded-[18px] bg-[#F2F2F7] p-4">
                    <h3 className="m-0 text-[18px] font-black tracking-[-0.02em] text-[#0A0F1F]">Compte-rendu au coach</h3>
                    <div className="mt-3 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSessionPreviewCrStatus((s) => (s === "done" ? null : "done"))}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-3 text-[15px] font-extrabold tracking-[-0.01em] transition-transform active:scale-[0.97]",
                          sessionPreviewCrStatus === "done" ? "bg-[#34C759] text-white" : "border-[1.5px] border-[#E5E5EA] bg-white text-[#0A0F1F]"
                        )}
                      >
                        <Check className="h-5 w-5" strokeWidth={2.6} />
                        Fait
                      </button>
                      <button
                        type="button"
                        onClick={() => setSessionPreviewCrStatus((s) => (s === "skipped" ? null : "skipped"))}
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-3 text-[15px] font-extrabold tracking-[-0.01em] transition-transform active:scale-[0.97]",
                          sessionPreviewCrStatus === "skipped" ? "bg-[#FF3B30] text-white" : "border-[1.5px] border-[#E5E5EA] bg-white text-[#0A0F1F]"
                        )}
                      >
                        <X className="h-5 w-5" strokeWidth={2.6} />
                        Pas fait
                      </button>
                    </div>

                    {sessionPreviewCrStatus === "done" ? (
                      <div className="mt-3.5">
                        <p className="m-0 mb-2 text-[14px] font-bold text-[#0A0F1F]">Ressenti à la fin</p>
                        <div className="flex gap-2">
                          {(
                            [
                              { id: "easy" as const, label: "Facile", emoji: "😎" },
                              { id: "ok" as const, label: "Correct", emoji: "🙂" },
                              { id: "hard" as const, label: "Difficile", emoji: "😮‍💨" },
                            ] as const
                          ).map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSessionPreviewCrFeeling((cur) => (cur === f.id ? null : f.id))}
                              className={cn(
                                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2.5 text-[13px] font-bold transition-transform active:scale-[0.97]",
                                sessionPreviewCrFeeling === f.id
                                  ? "bg-[#007AFF] text-white"
                                  : "border-[1.5px] border-[#E5E5EA] bg-white text-[#0A0F1F]"
                              )}
                            >
                              <span className="text-[18px]" aria-hidden>
                                {f.emoji}
                              </span>
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {sessionPreviewCrStatus ? (
                      <div className="mt-3.5">
                        <p className="m-0 mb-2 text-[14px] font-bold text-[#0A0F1F]">
                          {sessionPreviewCrStatus === "skipped" ? "Pourquoi ?" : "Un mot pour le coach (optionnel)"}
                        </p>
                        <textarea
                          value={sessionPreviewCrComment}
                          onChange={(e) => setSessionPreviewCrComment(e.target.value)}
                          placeholder={
                            sessionPreviewCrStatus === "skipped"
                              ? "Ex : Trop fatigué, douleur au mollet…"
                              : "Ex : J'ai eu du mal sur les 400m, allure trop rapide pour moi."
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border-[1.5px] border-[#E5E5EA] bg-white px-3 py-2.5 text-[15px] font-medium text-[#0A0F1F] outline-none placeholder:text-[#8E8E93]"
                        />
                        <button
                          type="button"
                          disabled={sessionPreviewCrSaving}
                          onClick={() => void sendSessionPreviewCompteRendu()}
                          className="mt-2.5 w-full rounded-full bg-[#007AFF] py-3 text-[16px] font-extrabold tracking-[-0.01em] text-white shadow-[0_4px_14px_rgba(0,122,255,0.3)] transition-transform active:scale-[0.98] disabled:opacity-60"
                        >
                          Envoyer au coach
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : previewAthletePlanSession && (previewAthleteParticipationUi === "done" || previewAthleteParticipationUi === "missed") ? (
                  <p className="mt-4 text-center text-[14px] text-[#8E8E93]">
                    {previewAthleteParticipationUi === "done"
                      ? "Cette séance est déjà enregistrée comme réalisée."
                      : "Cette séance est déjà enregistrée comme non réalisée."}
                  </p>
                ) : null}

                <div className="mt-3 overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#F8F8F8]"
                    onClick={() => {
                      if (previewAthletePlanSession) {
                        toast.info("Seul le coach peut modifier cette séance.");
                        return;
                      }
                      if (!previewSessionItem) return;
                      openEditSession(previewSessionItem.id);
                      closeSessionPreview();
                    }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F2F7]">
                      <Settings className="h-[18px] w-[18px] text-[#0A0F1F]" strokeWidth={2.2} />
                    </div>
                    <span className="min-w-0 flex-1 text-[16px] font-bold tracking-[-0.01em] text-[#0A0F1F]">Modifier la séance</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
                  </button>
                  <div className="ml-[60px] h-px bg-[#E5E5EA]" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#F8F8F8]"
                    onClick={() => {
                      toast.info("Utilisez la planification avec votre coach pour reprogrammer.");
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(0, 122, 255, 0.1)" }}
                    >
                      <CalendarDays className="h-[18px] w-[18px] text-[#007AFF]" strokeWidth={2.2} />
                    </div>
                    <span className="min-w-0 flex-1 text-[16px] font-bold tracking-[-0.01em] text-[#0A0F1F]">Planifier cette séance</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
                  </button>
                  <div className="ml-[60px] h-px bg-[#E5E5EA]" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-[#F8F8F8]"
                    onClick={() => setSessionPreviewExportOpen(true)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2F2F7]">
                      <Download className="h-[18px] w-[18px] text-[#0A0F1F]" strokeWidth={2.2} />
                    </div>
                    <span className="min-w-0 flex-1 text-[16px] font-bold tracking-[-0.01em] text-[#0A0F1F]">Exporter la séance</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {sessionPreviewExportOpen ? (
        <div
          className="fixed inset-0 z-[10050] flex flex-col justify-end bg-black/45"
          role="presentation"
          onClick={() => setSessionPreviewExportOpen(false)}
        >
          <div
            className="rounded-t-[22px] bg-white px-4 pt-[18px]"
            style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
            role="dialog"
            aria-label="Exporter vers"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3.5 h-[5px] w-10 rounded-full bg-[#D1D1D6]" />
            <h3 className="m-0 mb-3 text-center text-[20px] font-black tracking-[-0.02em] text-[#0A0F1F]">Exporter vers</h3>
            {(
              [
                { id: "garmin", label: "Garmin Connect", color: "#000000" },
                { id: "strava", label: "Strava", color: "#FC4C02" },
                { id: "coros", label: "Coros", color: "#E31E26" },
                { id: "polar", label: "Polar Flow", color: "#D6001C" },
                { id: "fit", label: "Fichier .FIT", color: "#007AFF" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-colors active:bg-[#F8F8F8]"
                onClick={() => setSessionPreviewExportOpen(false)}
              >
                <div className="h-9 w-9 shrink-0 rounded-[10px]" style={{ background: opt.color }} />
                <span className="min-w-0 flex-1 text-[16px] font-bold text-[#0A0F1F]">{opt.label}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#C7C7CC]" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              className="mt-2 w-full rounded-full bg-[#F2F2F7] py-3.5 text-[16px] font-extrabold text-[#0A0F1F] transition-transform active:scale-[0.98]"
              onClick={() => setSessionPreviewExportOpen(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

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

