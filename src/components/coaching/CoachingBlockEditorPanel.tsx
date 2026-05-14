import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, ChevronUp, Lock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import {
  BlockPreviewBars,
  CoachingSchemaChart,
  COACHING_ACTION_BLUE,
  COACHING_BLOCK_PALETTE,
  type PaletteBlockId,
} from "@/components/coaching/create-session/CoachingCreateSessionSchema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoachingSessionBlock = {
  id: string;
  order: number;
  type: "warmup" | "interval" | "steady" | "recovery" | "cooldown";
  durationSec?: number;
  distanceM?: number;
  paceSecPerKm?: number;
  paceStartSecPerKm?: number;
  paceEndSecPerKm?: number;
  repetitions?: number;
  blockRepetitions?: number;
  recoveryDurationSec?: number;
  blockRecoveryDurationSec?: number;
  intensityMode?: "zones" | "rpe";
  zone?: "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6";
  rpe?: number;
  notes?: string;
};

type BlockType = CoachingSessionBlock["type"];
type ZoneKey = NonNullable<CoachingSessionBlock["zone"]>;
type PyramidMode = "symetrique" | "croissante" | "decroissante" | "manuelle";
type SchemaDragToolKind = "steady" | "interval" | "pyramid" | "variation";
type SchemaToolKind = "steady" | "interval" | "pyramid" | "variation" | "libre" | "repetition";

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

interface CoachingBlockEditorPanelProps {
  initialBlocks?: CoachingSessionBlock[];
  onChange?: (blocks: CoachingSessionBlock[]) => void;
  sport?: "running" | "cycling" | "swimming" | "strength";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PYRAMID_NOTES_PREFIX = "[Pyramid]";

const PYRAMID_MODE_HINTS: Record<PyramidMode, string> = {
  symetrique: "🔒 Chaque palier est dupliqué à l'identique en miroir. Modifier un palier source met à jour son miroir automatiquement.",
  croissante: "Les paliers s'enchaînent du plus facile au plus difficile, sans miroir.",
  decroissante: "Les paliers s'enchaînent du plus difficile au plus facile, sans miroir.",
  manuelle: "Tu construis la séquence comme tu veux, aucune contrainte.",
};

const PREVIEW_ZONE_ORDER = ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"] as const;

const DISTANCE_KM_WHOLE_OPTIONS = Array.from({ length: 201 }, (_, i) => ({ value: String(i), label: String(i) }));
const DISTANCE_METERS_25_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const meters = i * 25;
  return { value: String(meters), label: String(meters).padStart(3, "0") };
});

const BLOCK_TYPES: Array<{ id: BlockType; label: string }> = [
  { id: "warmup", label: "Échauffement" },
  { id: "interval", label: "Intervalle" },
  { id: "steady", label: "Bloc continu" },
  { id: "recovery", label: "Récupération" },
  { id: "cooldown", label: "Retour au calme" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPositive(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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

function metersToLabel(distance: number | undefined) {
  if (!distance || distance <= 0) return "";
  return `${Math.round(distance).toLocaleString("fr-FR")} m`;
}

function compactPaceLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "—";
  const rounded = Math.max(1, Math.round(paceSecPerKm));
  const min = Math.floor(rounded / 60);
  const sec = rounded % 60;
  return `${min}'${sec.toString().padStart(2, "0")}`;
}

function paceToLabel(paceSecPerKm?: number) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = paceSecPerKm % 60;
  return `${min}'${sec.toString().padStart(2, "0")}''/km`;
}

function simpleBlockDistanceValue(distanceM?: number) {
  if (!distanceM || distanceM <= 0) return "";
  if (distanceM >= 1000) {
    const km = distanceM / 1000;
    return `${km.toLocaleString("fr-FR", { maximumFractionDigits: distanceM % 1000 === 0 ? 0 : 1 })} km`;
  }
  return `${Math.round(distanceM)} m`;
}

function blockTitle(type: BlockType) {
  return BLOCK_TYPES.find((b) => b.id === type)?.label ?? "Bloc";
}

function paletteTypeForCoachingBlock(block: CoachingSessionBlock): PaletteBlockId {
  if (block.notes?.includes(PYRAMID_NOTES_PREFIX)) return "pyramide";
  if (
    block.notes?.includes("[Variation]") ||
    block.notes?.includes("[Progressif]") ||
    block.notes?.includes("[Dégressif]")
  ) {
    return "variation";
  }
  if (block.type === "interval") return "intervalle";
  return "continu";
}

function schemaToolFromPalette(id: PaletteBlockId): SchemaDragToolKind {
  switch (id) {
    case "continu":
      return "steady";
    case "intervalle":
      return "interval";
    case "pyramide":
      return "pyramid";
    case "variation":
      return "variation";
  }
}

function emojiForBlockHeader(block: CoachingSessionBlock, isPyramid: boolean, isProgressive: boolean): string {
  if (isPyramid) return "▲";
  if (isProgressive) return "📈";
  if (block.type === "interval") return "⚡";
  return "=";
}

function isProgressiveBlock(block: CoachingSessionBlock) {
  return Boolean(
    block.notes?.includes("[Variation]") ||
      block.notes?.includes("[Progressif]") ||
      block.notes?.includes("[Dégressif]")
  );
}

function blockSummary(block: CoachingSessionBlock) {
  const volume = block.distanceM ? metersToLabel(block.distanceM) : secondsToLabel(block.durationSec);
  const progressiveTarget =
    block.paceStartSecPerKm && block.paceEndSecPerKm
      ? `${paceToLabel(block.paceStartSecPerKm)} → ${paceToLabel(block.paceEndSecPerKm)}`
      : "";
  const target =
    progressiveTarget ||
    (block.paceSecPerKm ? paceToLabel(block.paceSecPerKm) : "");
  const intensity =
    block.intensityMode === "rpe"
      ? block.rpe ? `RPE ${block.rpe}` : ""
      : block.zone || "";
  if (block.type === "interval") {
    const reps = block.repetitions || 1;
    const series = block.blockRepetitions || 1;
    const rec = block.recoveryDurationSec ? `récup ${secondsToLabel(block.recoveryDurationSec)}` : "";
    const seriesRec = block.blockRecoveryDurationSec ? `inter-séries ${secondsToLabel(block.blockRecoveryDurationSec)}` : "";
    return `${series > 1 ? `${series} x ` : ""}${reps} x ${volume}${target ? ` à ${target}` : ""}${rec ? ` - ${rec}` : ""}${seriesRec ? ` - ${seriesRec}` : ""}${intensity ? ` - ${intensity}` : ""}`;
  }
  if (block.notes?.includes("[Pyramid]")) {
    const steps = Math.max(3, block.repetitions || 5);
    return `${steps} paliers${volume ? ` • ${volume}` : ""}${target ? ` • ${target}` : ""}${intensity ? ` • ${intensity}` : ""}`;
  }
  return `${volume}${target ? ` à ${target}` : ""}${intensity ? ` - ${intensity}` : ""}`;
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

function deriveRunningVolume(
  block: CoachingSessionBlock,
  changedField: "duration" | "distance" | "pace"
): CoachingSessionBlock {
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

function deriveProgressiveRunningVolume(
  block: CoachingSessionBlock,
  changedField: "duration" | "distance" | "paceStart" | "paceEnd"
): CoachingSessionBlock {
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

function parsePyramidConfig(block: CoachingSessionBlock): PyramidConfig {
  const fallbackZone = block.zone || "Z4";
  const fallbackStep: PyramidStepSource = {
    id: uid(),
    paceSecPerKm: 330,
    distanceM: 200,
    durationSec: 60,
    recoveryDurationSec: 60,
    repetitions: 1,
    zone: fallbackZone as ZoneKey,
  };
  const fallback: PyramidConfig = { mode: "symetrique", steps: [fallbackStep] };
  if (!block.notes?.includes(PYRAMID_NOTES_PREFIX)) return fallback;
  try {
    const jsonStart = block.notes.indexOf("{");
    if (jsonStart < 0) return fallback;
    const raw = JSON.parse(block.notes.slice(jsonStart)) as Record<string, unknown>;
    const mode: PyramidMode =
      raw.mode === "croissante" || raw.mode === "decroissante" || raw.mode === "manuelle"
        ? (raw.mode as PyramidMode)
        : "symetrique";
    const steps: PyramidStepSource[] = Array.isArray(raw.steps)
      ? (raw.steps as Record<string, unknown>[])
          .map((step) => ({
            id: typeof step.id === "string" ? step.id : uid(),
            paceSecPerKm: typeof step.paceSecPerKm === "number" ? step.paceSecPerKm : undefined,
            distanceM: typeof step.distanceM === "number" ? step.distanceM : undefined,
            durationSec: typeof step.durationSec === "number" ? step.durationSec : undefined,
            recoveryDurationSec: typeof step.recoveryDurationSec === "number" ? step.recoveryDurationSec : undefined,
            repetitions: isPositive(step.repetitions as number) ? Number(step.repetitions) : 1,
            zone:
              typeof step.zone === "string" &&
              ["Z1", "Z2", "Z3", "Z4", "Z5", "Z6"].includes((step.zone as string).toUpperCase())
                ? ((step.zone as string).toUpperCase() as ZoneKey)
                : fallbackZone as ZoneKey,
          }))
          .filter((step) => step.id)
      : [];
    return { mode, steps: steps.length > 0 ? steps : fallback.steps };
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

function parsePaceInputToSec(value: string): number | undefined {
  const cleaned = value.trim().replace(/"/g, "").replace(/''/g, "").replace(/'/g, ":");
  const [mStr, sStr = "0"] = cleaned.split(":");
  const min = Number.parseInt(mStr ?? "", 10);
  const sec = Number.parseInt(sStr ?? "0", 10);
  if (!Number.isFinite(min) || !Number.isFinite(sec) || min < 0 || sec < 0 || sec > 59) return undefined;
  return min * 60 + sec;
}

function createDefaultBlock(type: BlockType, order: number): CoachingSessionBlock {
  return { id: uid(), order, type, intensityMode: "zones" };
}

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
        <linearGradient id="variationZoneGradientDragGhostPanel" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9CA3AF" />
          <stop offset="33%" stopColor="#2563EB" />
          <stop offset="66%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#FACC15" />
        </linearGradient>
      </defs>
      <polygon points="8,30 76,4 76,30" fill="url(#variationZoneGradientDragGhostPanel)" fillOpacity="0.95" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CoachingBlockEditorPanel({
  initialBlocks,
  onChange,
  sport = "running",
}: CoachingBlockEditorPanelProps) {
  const [blocks, setBlocks] = useState<CoachingSessionBlock[]>(() => initialBlocks ?? []);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [expandedPyramidSteps, setExpandedPyramidSteps] = useState<Record<string, boolean>>({});

  // Schema drag state
  const [schemaDraggingTool, setSchemaDraggingTool] = useState<SchemaDragToolKind | null>(null);
  const [schemaDragPointer, setSchemaDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [schemaDropRatio, setSchemaDropRatio] = useState<number | null>(null);
  const schemaPreviewRef = useRef<HTMLDivElement>(null);
  const schemaDragFromAddCardStartRef = useRef<{ x: number; y: number } | null>(null);
  const addBlockFromCardGestureMovedRef = useRef(false);

  // Wheel picker state
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelTitle, setWheelTitle] = useState("");
  const [wheelColumns, setWheelColumns] = useState<Array<{
    items: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
    suffix?: string;
  }>>([]);
  const [applyWheel, setApplyWheel] = useState<(() => void) | null>(null);
  const [wheelA, setWheelA] = useState("0");
  const [wheelB, setWheelB] = useState("0");
  const [wheelC, setWheelC] = useState("0");
  const wheelARef = useRef("0");
  const wheelBRef = useRef("0");
  const wheelCRef = useRef("0");

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

  // Notify parent on change
  const updateBlocks = useCallback((updater: (prev: CoachingSessionBlock[]) => CoachingSessionBlock[]) => {
    setBlocks((prev) => {
      const next = updater(prev);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  // ── Wheel helpers ──────────────────────────────────────────────────────────

  const openWheelColumns = useCallback((
    title: string,
    columns: Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (v: string) => void; suffix?: string }>,
    onConfirm: () => void
  ) => {
    setWheelTitle(title);
    setWheelColumns(columns);
    setApplyWheel(() => onConfirm);
    setWheelOpen(true);
  }, []);

  const openWheel = useCallback((
    title: string,
    items: Array<{ value: string; label: string }>,
    currentValue: string,
    onConfirm: (next: string) => void
  ) => {
    setWheelAValue(currentValue);
    openWheelColumns(title, [{ items, value: currentValue, onChange: setWheelAValue }], () =>
      onConfirm(wheelARef.current)
    );
  }, [openWheelColumns, setWheelAValue]);

  // ── Block operations ───────────────────────────────────────────────────────

  const updateBlock = useCallback((blockId: string, updater: (block: CoachingSessionBlock) => CoachingSessionBlock) => {
    updateBlocks((prev) => prev.map((b) => (b.id === blockId ? updater(b) : b)));
  }, [updateBlocks]);

  const removeBlock = useCallback((blockId: string) => {
    updateBlocks((prev) => prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i + 1 })));
    setSelectedBlockId((cur) => (cur === blockId ? null : cur));
  }, [updateBlocks]);

  const updatePyramidBlock = useCallback(
    (blockId: string, updater: (config: PyramidConfig) => PyramidConfig) => {
      updateBlock(blockId, (current) => {
        const currentConfig = parsePyramidConfig(current);
        const nextConfig = updater(currentConfig);
        const safeSteps = nextConfig.steps.length
          ? nextConfig.steps
          : [{ id: uid(), zone: (current.zone || "Z4") as ZoneKey, repetitions: 1 }];
        return {
          ...current,
          notes: serializePyramidConfig({ ...nextConfig, steps: safeSteps }),
        };
      });
    },
    [updateBlock]
  );

  const insertBlock = useCallback((block: CoachingSessionBlock, insertIndex?: number | null) => {
    updateBlocks((prev) => {
      const next = [...prev];
      const targetIndex = typeof insertIndex === "number" ? Math.max(0, Math.min(insertIndex, next.length)) : next.length;
      next.splice(targetIndex, 0, block);
      return next.map((b, i) => ({ ...b, order: i + 1 }));
    });
  }, [updateBlocks]);

  // ── Schema drag ────────────────────────────────────────────────────────────

  const createQuickSchemaBlock = useCallback((kind: SchemaToolKind): CoachingSessionBlock => {
    const nextOrder = blocks.length + 1;
    if (kind === "pyramid") {
      const defaultStep: PyramidStepSource = {
        id: uid(),
        paceSecPerKm: 330,
        distanceM: 200,
        durationSec: 60,
        recoveryDurationSec: 60,
        repetitions: 1,
        zone: "Z4",
      };
      return {
        ...createDefaultBlock("steady", nextOrder),
        repetitions: 3,
        notes: serializePyramidConfig({ mode: "symetrique", steps: [defaultStep, { ...defaultStep, id: uid() }, { ...defaultStep, id: uid() }] }),
        zone: "Z4",
      };
    }
    if (kind === "interval" || kind === "repetition") {
      return { ...createDefaultBlock("interval", nextOrder), zone: "Z5" };
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
  }, [blocks.length]);

  const addQuickSchemaBlock = useCallback((kind: SchemaToolKind) => {
    const block = createQuickSchemaBlock(kind);
    insertBlock(block, null);
    setSelectedBlockId(block.id);
  }, [createQuickSchemaBlock, insertBlock]);

  const finalizeSchemaDragAtClientPoint = useCallback((clientX: number, clientY: number) => {
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
    const inside = clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
    if (inside) {
      const padL = 44;
      const padR = 4;
      const innerW = Math.max(0, bounds.width - padL - padR);
      const x = Math.max(0, Math.min(innerW, clientX - bounds.left - padL));
      const ratio = innerW > 0 ? x / innerW : 0;
      const insertIndex = Math.max(0, Math.min(blocks.length, Math.round(ratio * blocks.length)));
      const block = createQuickSchemaBlock(schemaDraggingTool);
      insertBlock(block, insertIndex);
      setSelectedBlockId(block.id);
    }
    schemaDragFromAddCardStartRef.current = null;
    setSchemaDraggingTool(null);
    setSchemaDragPointer(null);
    setSchemaDropRatio(null);
  }, [blocks.length, createQuickSchemaBlock, insertBlock, schemaDraggingTool]);

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
    const padL = 44;
    const padR = 4;
    const innerW = Math.max(0, bounds.width - padL - padR);
    const x = Math.max(0, Math.min(innerW, event.clientX - bounds.left - padL));
    const ratio = innerW > 0 ? x / innerW : 0;
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
      const padL = 44;
      const padR = 4;
      const innerW = Math.max(0, bounds.width - padL - padR);
      const x = Math.max(0, Math.min(innerW, event.clientX - bounds.left - padL));
      setSchemaDropRatio(innerW > 0 ? x / innerW : 0);
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

  const schemaChartBlocks = useMemo(
    () => blocks.map((b) => ({ id: b.id, type: paletteTypeForCoachingBlock(b) })),
    [blocks]
  );
  const schemaDragOver =
    Boolean(schemaDraggingTool) && schemaDropRatio != null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Schema section */}
      <div className="space-y-3">
        <div className="space-y-3">
          <p
            className="m-0 text-[18px] font-extrabold tracking-[-0.01em]"
            style={{ color: "#0A0F1F" }}
          >
            Schéma de séance
          </p>
          <div
            ref={schemaPreviewRef}
            onPointerMove={handleSchemaPreviewPointerMove}
            className={cn(
              "relative min-w-0 rounded-[20px]",
              schemaDraggingTool ? "cursor-copy" : ""
            )}
            style={
              schemaDraggingTool
                ? { boxShadow: `0 0 0 2px ${COACHING_ACTION_BLUE}40` }
                : undefined
            }
            title={schemaDraggingTool ? "Placez le bloc sur le schéma" : undefined}
          >
            <CoachingSchemaChart blocks={schemaChartBlocks} dragOver={schemaDragOver} />
            {schemaDropRatio != null ? (
              <div
                aria-hidden
                className="pointer-events-none absolute z-[5] w-0.5 rounded-full"
                style={{
                  left: `calc(44px + (100% - 48px) * ${schemaDropRatio})`,
                  top: 18,
                  bottom: 58,
                  transform: "translateX(-50%)",
                  background: `${COACHING_ACTION_BLUE}b3`,
                }}
              />
            ) : null}
            {schemaDropRatio != null && schemaDraggingTool ? (
              <div
                aria-hidden
                className="pointer-events-none absolute z-30 rounded-full border bg-white px-2 py-1 text-[11px] font-semibold shadow-lg"
                style={{
                  left: `calc(44px + (100% - 48px) * ${schemaDropRatio})`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  borderColor: `${COACHING_ACTION_BLUE}59`,
                  color: COACHING_ACTION_BLUE,
                }}
              >
                <SchemaDragToolMini tool={schemaDraggingTool} />
              </div>
            ) : null}
          </div>

          {/* Add block cards — aligné maquette RunConnect (11) */}
          <p
            className="mb-1 mt-5 text-[18px] font-extrabold tracking-[-0.01em]"
            style={{ color: "#0A0F1F" }}
          >
            Ajouter un bloc
          </p>
          <p className="mb-3 text-[13px]" style={{ color: "#8E8E93" }}>
            Glisse un bloc sur le schéma ↑
          </p>
          <div className="grid grid-cols-4 gap-2">
            {COACHING_BLOCK_PALETTE.map((bt) => {
              const tool = schemaToolFromPalette(bt.id);
              const isDraggingThis = schemaDraggingTool === tool;
              return (
                <div
                  key={bt.id}
                  role="button"
                  tabIndex={0}
                  onPointerDown={(e) => handleSchemaDragStart(tool, e)}
                  onClick={() => {
                    if (addBlockFromCardGestureMovedRef.current) {
                      addBlockFromCardGestureMovedRef.current = false;
                      return;
                    }
                    addQuickSchemaBlock(tool);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      addQuickSchemaBlock(tool);
                    }
                  }}
                  className="flex cursor-grab flex-col items-center rounded-[14px] border border-[#E5E5EA] bg-white py-3 pb-2.5 select-none touch-none transition active:cursor-grabbing"
                  style={{
                    opacity: isDraggingThis ? 0.35 : 1,
                    transform: isDraggingThis ? "scale(0.94)" : "scale(1)",
                  }}
                >
                  <BlockPreviewBars type={bt.id} />
                  <p
                    className="mt-1.5 shrink-0 text-center text-[12px] font-bold leading-none tracking-[-0.01em]"
                    style={{ color: "#0A0F1F" }}
                  >
                    {bt.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Drag ghost label */}
          {schemaDraggingTool && schemaDragPointer ? (
            <div
              className="pointer-events-none fixed z-[125] rounded-full border bg-white px-2.5 py-1 text-[11px] font-semibold shadow-lg"
              style={{
                left: schemaDragPointer.x + 10,
                top: schemaDragPointer.y + 10,
                borderColor: `${COACHING_ACTION_BLUE}73`,
                color: COACHING_ACTION_BLUE,
              }}
            >
              {schemaDragToolLabel(schemaDraggingTool)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Block list */}
      {blocks.length > 0 ? (
        <div className="mt-4 space-y-3">
          {blocks.map((block, index) => {
            const isPyramidBlock = Boolean(block.notes?.includes(PYRAMID_NOTES_PREFIX));
            const isProgressive = isProgressiveBlock(block);
            const pyramidConfig = isPyramidBlock ? parsePyramidConfig(block) : null;
            const pyramidSteps = pyramidConfig ? buildPyramidDisplaySteps(pyramidConfig) : [];
            const isSelected = selectedBlockId === block.id;
            const accentHex = isPyramidBlock
              ? "#FF9500"
              : isProgressive
                ? "#AF52DE"
                : block.type === "interval"
                  ? COACHING_ACTION_BLUE
                  : "#34C759";
            const blockName = isPyramidBlock ? "Pyramide" : isProgressive ? "Variation" : blockTitle(block.type);
            const badge = isPyramidBlock && pyramidConfig
              ? (() => {
                  const mc = pyramidSteps.filter((s) => s.isMirror).length;
                  return mc > 0 ? `${pyramidConfig.steps.length} + ${mc} miroirs` : `${pyramidConfig.steps.length} paliers`;
                })()
              : isProgressive
                ? `${block.paceStartSecPerKm ? compactPaceLabel(block.paceStartSecPerKm) : "?'??"} → ${block.paceEndSecPerKm ? compactPaceLabel(block.paceEndSecPerKm) : "?'??"}`
                : block.type === "interval"
                  ? `${block.blockRepetitions ?? 1} × ${block.repetitions ?? 1}`
                  : `${index + 1}`;
            const subtitle = isPyramidBlock && pyramidConfig ? pyramidSubtitle(pyramidConfig) : blockSummary(block);

            const headerEmoji = emojiForBlockHeader(block, isPyramidBlock, isProgressive);

            return (
              <div key={block.id} className="relative overflow-hidden rounded-2xl bg-white" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                {/* Bande latérale — maquette 4px */}
                <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 top-0 w-1" style={{ background: accentHex }} />
                {/* Header */}
                <div className="flex w-full items-center gap-3 py-3 pl-5 pr-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold text-white"
                    style={{ background: accentHex }}
                  >
                    {headerEmoji}
                  </div>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[18px] font-extrabold" style={{ color: "#0A0F1F" }}>
                        {blockName}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                        style={{ color: accentHex, background: `${accentHex}22` }}
                      >
                        {badge}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px]" style={{ color: "#8E8E93" }}>
                      {subtitle}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                    className="shrink-0 p-1"
                    aria-expanded={isSelected}
                  >
                    {isSelected ? (
                      <ChevronUp className="h-5 w-5 text-[#8E8E93]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#8E8E93]" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${blockName}`}
                    onClick={() => removeBlock(block.id)}
                    className="shrink-0 p-1 text-[#8E8E93]"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>

                {/* Body */}
                {isSelected && (
                  <div className="border-t border-[#f0f0f0] px-4 pb-4 pt-[14px]">
                    {block.type === "interval" ? (
                      <div className="space-y-[10px]">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Blocs</p>
                            <button type="button" onClick={() => openWheel("Blocs", Array.from({length:20},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.blockRepetitions??1), (n)=>updateBlock(block.id,(c)=>({...c,blockRepetitions:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:"#1d1d1f"}}>{block.blockRepetitions??1}</button>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Répétitions</p>
                            <button type="button" onClick={() => openWheel("Répétitions", Array.from({length:20},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.repetitions??1), (n)=>updateBlock(block.id,(c)=>({...c,repetitions:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:"#1d1d1f"}}>{block.repetitions??1}</button>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>RPE</p>
                            <button type="button" onClick={() => openWheel("RPE", Array.from({length:10},(_,i)=>({value:String(i+1),label:String(i+1)})), String(block.rpe??8), (n)=>updateBlock(block.id,(c)=>({...c,rpe:Number(n)})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.rpe?"#1d1d1f":"#7a7a7a"}}>{block.rpe??"—"}</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                            <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                            <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure</p>
                            <button type="button" onClick={() => { const p=block.paceSecPerKm||270; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); openWheelColumns("Allure du bloc",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,paceSecPerKm:n},"pace"):{...c,paceSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceSecPerKm?compactPaceLabel(block.paceSecPerKm):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Récup effort</p>
                            <button type="button" onClick={() => { const t=block.blockRecoveryDurationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Récupération entre blocs",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateBlock(block.id,(c)=>({...c,blockRecoveryDurationSec:n}));});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.blockRecoveryDurationSec?"#1d1d1f":"#7a7a7a"}}>{block.blockRecoveryDurationSec?secondsToLabel(block.blockRecoveryDurationSec):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Récup série</p>
                            <button type="button" onClick={() => { const t=block.recoveryDurationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Récupération entre répétitions",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateBlock(block.id,(c)=>({...c,recoveryDurationSec:n}));});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.recoveryDurationSec?"#1d1d1f":"#7a7a7a"}}>{block.recoveryDurationSec?secondsToLabel(block.recoveryDurationSec):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>&nbsp;</span>
                          </div>
                        </div>
                      </div>
                    ) : isPyramidBlock && pyramidConfig ? (
                      <div className="space-y-3">
                        {/* Pyramid mode selector */}
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

                        {/* Pyramid steps */}
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
                                    setExpandedPyramidSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }))
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
                              steps: [...cfg.steps, { id: newStepId, zone: "Z4" as ZoneKey, repetitions: 1 }],
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
                            <button type="button" onClick={() => { const p=block.paceStartSecPerKm||block.paceSecPerKm||330; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); openWheelColumns("Allure de début",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveProgressiveRunningVolume({...c,paceStartSecPerKm:n},"paceStart"):{...c,paceStartSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceStartSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceStartSecPerKm?compactPaceLabel(block.paceStartSecPerKm):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure finale</p>
                            <button type="button" onClick={() => { const p=block.paceEndSecPerKm||block.paceSecPerKm||285; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); openWheelColumns("Allure finale",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveProgressiveRunningVolume({...c,paceEndSecPerKm:n},"paceEnd"):{...c,paceEndSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceEndSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceEndSecPerKm?compactPaceLabel(block.paceEndSecPerKm):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>RPE</p>
                            <button type="button" onClick={() => openWheel("RPE",Array.from({length:10},(_,i)=>({value:String(i+1),label:String(i+1)})),String(block.rpe??7),(n)=>updateBlock(block.id,(c)=>({...c,rpe:Number(n),intensityMode:"rpe"})))} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.rpe?"#1d1d1f":"#7a7a7a"}}>{block.rpe??"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>&nbsp;</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                            <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateBlock(block.id,(c)=>sport==="running"?deriveProgressiveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                            <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveProgressiveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>min</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Default block (warmup / steady / recovery / cooldown) */
                      <div className="space-y-[10px]">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Allure</p>
                            <button type="button" onClick={() => { const p=block.paceSecPerKm||330; setWheelAValue(String(Math.floor(p/60))); setWheelBValue(String(p%60)); openWheelColumns("Allure du bloc",[{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(Math.floor(p/60)),onChange:setWheelAValue,suffix:"'"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:String(p%60),onChange:setWheelBValue,suffix:"''"}],()=>{const n=Number.parseInt(wheelARef.current,10)*60+Number.parseInt(wheelBRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,paceSecPerKm:n},"pace"):{...c,paceSecPerKm:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.paceSecPerKm?"#1d1d1f":"#7a7a7a"}}>{block.paceSecPerKm?compactPaceLabel(block.paceSecPerKm):"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>/km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Distance</p>
                            <button type="button" onClick={() => { const m=block.distanceM||0,wk=Math.floor(m/1000),rm=Math.max(0,m-wk*1000); setWheelAValue(String(wk)); setWheelBValue(String(Math.round(rm/25)*25)); openWheelColumns("Distance du bloc",[{items:DISTANCE_KM_WHOLE_OPTIONS,value:String(wk),onChange:setWheelAValue,suffix:"km"},{items:DISTANCE_METERS_25_OPTIONS,value:String(Math.round(rm/25)*25),onChange:setWheelBValue,suffix:"m"}],()=>{const n=(Number.parseInt(wheelARef.current,10)||0)*1000+(Number.parseInt(wheelBRef.current,10)||0); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,distanceM:n},"distance"):{...c,distanceM:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.distanceM?"#1d1d1f":"#7a7a7a"}}>{simpleBlockDistanceValue(block.distanceM)||"—"}</button>
                            <span className="mt-1 block text-center text-[11px]" style={{color:"#7a7a7a"}}>km</span>
                          </div>
                          <div>
                            <p className="mb-1.5 pl-1 text-[11px] font-semibold uppercase tracking-[0.4px]" style={{color:"#7a7a7a"}}>Temps</p>
                            <button type="button" onClick={() => { const t=block.durationSec||0,nA=String(Math.floor(t/3600)),nB=String(Math.floor((t%3600)/60)),nC=String(t%60); setWheelAValue(nA); setWheelBValue(nB); setWheelCValue(nC); openWheelColumns("Durée du bloc",[{items:Array.from({length:11},(_,i)=>({value:String(i),label:String(i)})),value:nA,onChange:setWheelAValue,suffix:"h"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nB,onChange:setWheelBValue,suffix:"m"},{items:Array.from({length:60},(_,i)=>({value:String(i),label:String(i).padStart(2,"0")})),value:nC,onChange:setWheelCValue,suffix:"s"}],()=>{const n=Number.parseInt(wheelARef.current,10)*3600+Number.parseInt(wheelBRef.current,10)*60+Number.parseInt(wheelCRef.current,10); updateBlock(block.id,(c)=>sport==="running"?deriveRunningVolume({...c,durationSec:n},"duration"):{...c,durationSec:n});});}} className="h-[38px] w-full rounded-[11px] border border-[#e0e0e0] bg-white text-center text-[15px] font-medium" style={{color:block.durationSec?"#1d1d1f":"#7a7a7a"}}>{block.durationSec?secondsToLabel(block.durationSec):"—"}</button>
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

      {/* Wheel picker modal */}
      <WheelValuePickerModal
        open={wheelOpen}
        title={wheelTitle}
        columns={wheelColumns}
        onConfirm={() => {
          applyWheel?.();
          setWheelOpen(false);
        }}
        onCancel={() => setWheelOpen(false)}
      />

    </div>
  );
}
