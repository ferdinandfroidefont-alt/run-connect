import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RCCEditor } from "./RCCEditor";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { BookOpen, Copy, Trash2, HelpCircle, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { mergeParsedBlocksByIndex, parseRCC, type RCCResult, type ParsedBlock } from "@/lib/rccParser";
import { normalizeBlockRpeLength } from "@/lib/sessionBlockRpe";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";

const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ACTIVITY_TYPES = [
  { value: "running", label: "Course" },
  { value: "cycling", label: "Vélo" },
  { value: "swimming", label: "Natation" },
];

const PACE_UNITS: Record<string, string> = {
  running: "min/km",
  cycling: "watts (W)",
  swimming: "min/100m",
};

const PACE_EXAMPLES: Record<string, { code: string; label: string }[]> = {
  running: [
    { code: "20'>5'30", label: "20 min à 5:30/km" },
    { code: "3x1000>4'00", label: "3×1000m à 4:00/km" },
    { code: "6x3'>3'30", label: "6×3min à 3:30/km" },
  ],
  cycling: [
    { code: "20'>250W", label: "20 min à 250W" },
    { code: "5x5'>300W", label: "5×5min à 300W" },
    { code: "60'>180W", label: "60 min à 180W" },
  ],
  swimming: [
    { code: "10x100>1'45", label: "10×100m à 1:45/100m" },
    { code: "20'>2'00", label: "20 min à 2:00/100m" },
    { code: "5x200>3'30", label: "5×200m à 3:30/200m" },
  ],
};

const BLOCK_TYPE_LABELS: Record<ParsedBlock["type"], string> = {
  warmup: "Échauff.",
  interval: "Interval",
  steady: "Tempo",
  cooldown: "Retour",
  recovery: "Récup",
};

const DISTANCE_OPTIONS = Array.from({ length: 50 }, (_, i) => {
  const meters = (i + 1) * 100;
  return { value: String(meters), label: `${meters} m` };
});

const REP_OPTIONS = Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const RECOVERY_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const seconds = i * 15;
  if (seconds === 0) return { value: "0", label: "Aucune" };
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return { value: String(seconds), label: min > 0 ? `${min}'${String(sec).padStart(2, "0")}` : `${sec}s` };
});
const RPE_OPTIONS = Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }));

function paceToRcc(pace?: string): string {
  if (!pace) return "5'30";
  const [m, s] = pace.split(":");
  return `${m || "5"}'${String(Number.parseInt(s || "0", 10)).padStart(2, "0")}`;
}

function blockToRcc(block: ParsedBlock): string {
  if (block.type === "interval") {
    const reps = Math.max(1, block.repetitions || 1);
    const effort = block.distance ? `${Math.max(100, block.distance)}` : `${Math.max(1, block.duration || 3)}'`;
    const pace = paceToRcc(block.pace);
    let recovery = "";
    if (reps > 1 && (block.recoveryDuration || 0) > 0) {
      const rec = block.recoveryDuration || 0;
      const recMin = Math.floor(rec / 60);
      const recSec = rec % 60;
      recovery = recMin > 0
        ? ` r${recMin}'${String(recSec).padStart(2, "0")}>${block.recoveryType || "trot"}`
        : ` r${rec}>${block.recoveryType || "trot"}`;
    }
    return `${reps}x${effort}>${pace}${recovery}`;
  }
  if (block.duration) {
    const pace = block.pace ? `>${paceToRcc(block.pace)}` : "";
    return `${Math.max(1, block.duration)}'${pace}`;
  }
  return block.raw || "10'";
}

function recoveryLabel(seconds?: number): string {
  const safe = seconds || 0;
  if (safe <= 0) return "Aucune";
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return min > 0 ? `${min}'${String(sec).padStart(2, "0")}` : `${safe}s`;
}

interface AthleteOverride {
  pace?: string;
  reps?: number;
  recovery?: number;
  notes?: string;
}

export interface WeekSession {
  dayIndex: number;
  activityType: string;
  objective: string;
  rccCode: string;
  parsedBlocks: ParsedBlock[];
  coachNotes: string;
  locationName: string;
  locationLat?: number;
  locationLng?: number;
  athleteOverrides: Record<string, AthleteOverride>;
  /** @deprecated rétrocompat templates */
  rpe?: number;
  /** RPE 0–10 par bloc RCC (même ordre que parsedBlocks). */
  blockRpe: number[];
}

interface ClubMember {
  user_id: string;
  display_name: string;
}

interface WeeklyPlanSessionEditorProps {
  session: WeekSession;
  onChange: (session: WeekSession) => void;
  onDuplicate: (targetDay: number) => void;
  onDelete: () => void;
  members: ClubMember[];
}

export const WeeklyPlanSessionEditor = ({
  session,
  onChange,
  onDuplicate,
  onDelete,
  members,
}: WeeklyPlanSessionEditorProps) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelTitle, setWheelTitle] = useState("");
  const [wheelColumns, setWheelColumns] = useState<Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>>([]);
  const [wheelApply, setWheelApply] = useState<(() => void) | null>(null);
  const [wheelA, setWheelA] = useState("0");
  const [wheelB, setWheelB] = useState("0");
  const [wheelC, setWheelC] = useState("0");
  const [wheelUnit, setWheelUnit] = useState("km");

  const update = <K extends keyof WeekSession>(key: K, value: WeekSession[K]) => {
    onChange({ ...session, [key]: value });
  };

  const handleParsedChange = (result: RCCResult) => {
    const merged = mergeParsedBlocksByIndex(result.blocks, session.parsedBlocks || []);
    const nextBlockRpe = normalizeBlockRpeLength(session.blockRpe, merged.length);
    onChange({ ...session, parsedBlocks: merged, blockRpe: nextBlockRpe });
    if (merged.length > 0 && selectedBlockIndex > merged.length - 1) {
      setSelectedBlockIndex(merged.length - 1);
    }
  };

  const applyBlocks = (blocks: ParsedBlock[], nextBlockRpe?: number[]) => {
    const code = blocks.map(blockToRcc).join(", ");
    const reparsed = mergeParsedBlocksByIndex(parseRCC(code).blocks, blocks);
    const mergedRpe = normalizeBlockRpeLength(nextBlockRpe ?? session.blockRpe, reparsed.length);
    onChange({
      ...session,
      rccCode: code,
      parsedBlocks: reparsed,
      blockRpe: mergedRpe,
    });
  };

  const openWheel = (title: string, columns: Array<{ items: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; suffix?: string }>, onConfirm: () => void) => {
    setWheelTitle(title);
    setWheelColumns(columns);
    setWheelApply(() => onConfirm);
    setWheelOpen(true);
  };

  const otherDays = DAY_SHORT.map((label, i) => ({ label, index: i }))
    .filter(d => d.index !== session.dayIndex);

  const currentPaceUnit = PACE_UNITS[session.activityType] || PACE_UNITS.running;
  const currentPaceExamples = PACE_EXAMPLES[session.activityType] || PACE_EXAMPLES.running;

  const selectedBlock = session.parsedBlocks?.[selectedBlockIndex] || null;
  const estimatedMin = Math.max(0, (session.parsedBlocks?.length || 0) * 8);
  const estimatedKm = Math.max(0, Number((session.parsedBlocks?.length * 1.8 || 0).toFixed(1)));

  return (
    <div className="overflow-hidden bg-[#f5f5f7]">
      <div className="space-y-5 p-4">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-[#e0e0e0] bg-white p-1">
          <button type="button" className="h-10 rounded-full bg-[#0066cc] text-[15px] font-semibold text-white">Construire</button>
          <button type="button" onClick={() => setShowTemplates(true)} className="h-10 rounded-full text-[15px] font-semibold text-[#1d1d1f]">Modèles</button>
        </div>

        <div className="space-y-1">
          <Input
            value={session.objective}
            onChange={(e) => update("objective", e.target.value)}
            placeholder="Nom de la séance"
            className="h-auto border-0 bg-transparent px-0 py-0 font-display text-[36px] font-semibold tracking-[-0.5px] text-[#1d1d1f] placeholder:text-[#7a7a7a] shadow-none focus-visible:ring-0"
          />
          <p className="text-[14px] text-[#7a7a7a]">
            {estimatedKm > 0 ? `${estimatedKm} km · ~${estimatedMin} min` : "11 km · ~54 min"}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-[10px]">
          {[
            { key: "running", emoji: "🏃", bg: "#007AFF" },
            { key: "cycling", emoji: "🚴", bg: "#FF3B30" },
            { key: "swimming", emoji: "🏊", bg: "#5AC8FA" },
            { key: "running", emoji: "💪", bg: "#FF9500" },
          ].map((sport, idx) => (
            <button
              key={`${sport.key}-${idx}`}
              type="button"
              onClick={() => update("activityType", sport.key)}
              className="relative aspect-square rounded-[14px] text-[36px]"
              style={{ backgroundColor: sport.bg }}
            >
              {session.activityType === sport.key && idx < 3 ? (
                <span className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[0_0_0_2px_#f5f5f7,0_0_0_4px_#0066cc]" />
              ) : null}
              {sport.emoji}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Schéma de séance</p>
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-3">
            <svg viewBox="0 0 360 230" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <line x1="40" y1="20" x2="360" y2="20" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="50" x2="360" y2="50" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="80" x2="360" y2="80" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="110" x2="360" y2="110" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="140" x2="360" y2="140" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="170" x2="360" y2="170" stroke="#e0e0e0" strokeDasharray="2 3" />
              <line x1="40" y1="200" x2="360" y2="200" stroke="#1d1d1f" strokeOpacity="0.18" />
              <g fontFamily="SF Pro Text, system-ui, sans-serif" fontSize="10" fontWeight="600" fill="#7a7a7a">
                <text x="32" y="38" textAnchor="end">Z6</text>
                <text x="32" y="68" textAnchor="end">Z5</text>
                <text x="32" y="98" textAnchor="end">Z4</text>
                <text x="32" y="128" textAnchor="end">Z3</text>
                <text x="32" y="158" textAnchor="end">Z2</text>
                <text x="32" y="188" textAnchor="end">Z1</text>
              </g>
              <rect x="40" y="170" width="144" height="30" fill="#B5B5BA" rx="3" />
              <rect x="184" y="50" width="37" height="150" fill="#FF9500" rx="3" />
              <rect x="221" y="170" width="6" height="30" fill="#B5B5BA" rx="2" />
              <rect x="227" y="50" width="37" height="150" fill="#FF9500" rx="3" />
              <rect x="264" y="170" width="59" height="30" fill="#B5B5BA" rx="3" />
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Ajouter un bloc</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Continu", code: "20'>5'30", svg: <rect x="2" y="9" width="40" height="6" rx="2" fill="#0066cc" /> },
              { label: "Intervalle", code: "6x3'>3'30", svg: <><rect x="2" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/><rect x="11" y="14" width="3" height="6" rx="1" fill="#B5B5BA"/><rect x="17" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/><rect x="26" y="14" width="3" height="6" rx="1" fill="#B5B5BA"/><rect x="32" y="4" width="6" height="16" rx="1.5" fill="#FF9500"/></> },
              { label: "Pyramide", code: "200>4'00, 400>4'10, 600>4'20, 400>4'10, 200>4'00", svg: <><rect x="2" y="14" width="5" height="6" rx="1" fill="#34C759"/><rect x="9" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/><rect x="16" y="4" width="5" height="16" rx="1.5" fill="#FF9500"/><rect x="23" y="4" width="5" height="16" rx="1.5" fill="#FF9500"/><rect x="30" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/><rect x="37" y="14" width="5" height="6" rx="1" fill="#34C759"/></> },
              { label: "Variation", code: "10'>5'30, 10'>4'45, 10'>5'15", svg: <><rect x="2" y="16" width="5" height="4" rx="1" fill="#B5B5BA"/><rect x="9" y="12" width="5" height="8" rx="1" fill="#34C759"/><rect x="16" y="6" width="5" height="14" rx="1.3" fill="#FF9500"/><rect x="23" y="14" width="5" height="6" rx="1" fill="#0066cc"/><rect x="30" y="4" width="5" height="16" rx="1.5" fill="#FF3B30"/><rect x="37" y="10" width="5" height="10" rx="1.2" fill="#FFCC00"/></> },
            ].map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onClick={() => update("rccCode", session.rccCode.trim() ? `${session.rccCode}, ${item.code}` : item.code)}
                className={`rounded-[14px] border bg-white px-2 py-2 ${idx === 2 ? "border-2 border-[#0066cc]" : "border-[#e0e0e0]"}`}
              >
                <svg viewBox="0 0 44 22" className="mx-auto h-5 w-11" fill="none">{item.svg}</svg>
                <span className="mt-1 block text-[12px]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Description</p>
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-3">
            <Textarea
              value={session.coachNotes}
              onChange={(e) => update("coachNotes", e.target.value)}
              placeholder="27' à 5'30/km + 2 × 2 km à 3'30/km (récup 1 min) + 11' à 5'30/km"
              rows={3}
              className="resize-none border-0 bg-transparent p-0 text-[14px] leading-[1.4] text-[#333] shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code, objective) => {
          update("rccCode", code);
          if (objective) update("objective", objective);
          setShowTemplates(false);
        }}
      />
      <WheelValuePickerModal
        open={wheelOpen}
        onClose={() => setWheelOpen(false)}
        title={wheelTitle}
        columns={wheelColumns}
        onConfirm={() => {
          wheelApply?.();
          setWheelOpen(false);
        }}
      />
    </div>
  );
};
