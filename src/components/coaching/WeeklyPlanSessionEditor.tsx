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

  return (
    <div className="overflow-hidden bg-transparent">
      {/* Header with day + actions */}
      <div className="bg-secondary/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-[13px] font-bold text-primary">
              {DAY_SHORT[session.dayIndex]}
            </span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground leading-tight">
              {session.objective || "Titre de la séance"}
            </p>
            <p className="text-[12px] text-muted-foreground">{DAY_LABELS[session.dayIndex]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" title="Dupliquer">
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherDays.map(d => (
                <DropdownMenuItem key={d.index} onClick={() => onDuplicate(d.index)}>
                  {DAY_LABELS[d.index]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Session title */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Titre de la séance
          </label>
          <Input
            value={session.objective}
            onChange={e => update("objective", e.target.value)}
            placeholder="Ex: Footing, VMA, Seuil..."
            className="h-11 rounded-xl bg-secondary/50 border-0 text-[15px]"
          />
        </div>

        {/* Template button */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 rounded-xl text-[14px] w-full border-dashed border-border/80 hover:bg-primary/5"
          onClick={() => setShowTemplates(true)}
        >
          <BookOpen className="h-4 w-4 mr-2 text-primary" />
          Charger un template
        </Button>

        {/* Activity type + Objective */}
        <div className="space-y-3">
          <div>
            <button type="button" className="mb-1.5 inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Type &gt;
            </button>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => update("activityType", a.value)}
                  className={`h-10 rounded-xl text-[13px] font-semibold transition-colors ${
                    session.activityType === a.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/70 text-muted-foreground"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Bloc builder — maquette blocs.html */}
        <div className="space-y-3">
          <p className="text-[14px] font-semibold text-[#333]">Blocs</p>
          {[
            {
              id: "continu",
              accent: "#34C759",
              name: "Continu",
              badge: "1",
              sub: "Z1 · 5 km · 27 min",
              action: "20'>5'30",
              icon: <Waves className="h-4 w-4" />,
              fields: [
                ["Allure", "5'30", "/km"],
                ["Distance", "5", "km"],
                ["Temps", "27", "min"],
              ],
            },
            {
              id: "intervalle",
              accent: "#0066cc",
              name: "Intervalle",
              badge: "2 × 2",
              sub: "Z5 · 2 km @ 3'30 · récup 1 min",
              action: "2x(2km>3'30 r1')",
              icon: <BarChart3 className="h-4 w-4" />,
              fields: [
                ["Blocs", "1", ""],
                ["Répétitions", "2", ""],
                ["RPE", "8", ""],
              ],
            },
            {
              id: "pyramide",
              accent: "#FF9500",
              name: "Pyramide",
              badge: "3 + 2 miroirs",
              sub: "Symétrique · 5 paliers",
              action: "200>5'30, 400>5'00, 600>4'40, 400>5'00, 200>5'30",
              icon: <ChevronDown className="h-4 w-4 -rotate-90" />,
              fields: [
                ["Palier 1", "200 m", "5'30"],
                ["Palier 2", "400 m", "5'00"],
                ["Palier 3", "600 m", "4'40"],
              ],
            },
            {
              id: "variation",
              accent: "#AF52DE",
              name: "Variation",
              badge: "7'00 → 4'30",
              sub: "Z2 · 5 km · 30 min",
              action: "5km de 7'00 à 4'30",
              icon: <BarChart3 className="h-4 w-4" />,
              fields: [
                ["Début", "7'00", "/km"],
                ["Fin", "4'30", "/km"],
                ["RPE", "7", ""],
              ],
            },
          ].map((card) => (
            <div key={card.id} className="overflow-hidden rounded-[18px] border border-[#e0e0e0] bg-white">
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderLeft: `3px solid ${card.accent}` }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: card.accent }}>
                      {card.icon}
                    </span>
                    <span className="text-[16px] font-semibold">{card.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: card.accent, backgroundColor: `${card.accent}22` }}>
                      {card.badge}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-[#7a7a7a]">{card.sub}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full px-3 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: card.accent }}
                  onClick={() => update("rccCode", session.rccCode.trim() ? `${session.rccCode}, ${card.action}` : card.action)}
                >
                  Ajouter
                </Button>
              </div>
              <div className="border-t border-[#f0f0f0] px-4 py-3">
                <div className="grid grid-cols-3 gap-2">
                  {card.fields.map(([lbl, val, unit], idx) => (
                    <div key={`${card.id}-${idx}`}>
                      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.35px] text-[#7a7a7a]">{lbl}</p>
                      <input readOnly value={val} className="h-9 w-full rounded-[11px] border border-[#e0e0e0] bg-white px-2 text-center text-[14px] font-medium text-[#1d1d1f]" />
                      <p className="mt-1 text-center text-[10px] text-[#7a7a7a]">{unit || "\u00A0"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RCC Editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Contenu · Allure en {currentPaceUnit}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-lg text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-[13px] space-y-2 p-4" side="top">
                <p className="font-semibold text-[15px]">Formats RCC — {currentPaceUnit}</p>
                <div className="space-y-2 text-muted-foreground">
                  {currentPaceExamples.map(ex => (
                    <div key={ex.code}>
                      <code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">{ex.code}</code> → {ex.label}
                    </div>
                  ))}
                  <div><code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">10'</code> → 10 min (allure libre)</div>
                  <div><code className="font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">r1'30&gt;trot</code> → Récup 1'30 trot</div>
                </div>
                <p className="text-muted-foreground pt-1 text-[12px]">Séparez les blocs par des virgules.</p>
              </PopoverContent>
            </Popover>
          </div>
          <RCCEditor
            value={session.rccCode}
            onChange={v => update("rccCode", v)}
            onParsedChange={handleParsedChange}
          />
        </div>

        {/* Coach notes */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Notes coach (optionnel)
          </label>
          <Textarea
            value={session.coachNotes}
            onChange={e => update("coachNotes", e.target.value)}
            placeholder="Consignes, rappels, motivation..."
            className="rounded-xl bg-secondary/50 border-0 text-[14px] min-h-[60px] resize-none"
            rows={2}
          />
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
