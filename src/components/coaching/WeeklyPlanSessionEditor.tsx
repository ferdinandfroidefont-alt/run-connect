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

        {/* Bloc builder */}
        <div className="space-y-2">
          <button type="button" className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bloc &gt;
          </button>
          {session.parsedBlocks.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {session.parsedBlocks.map((b, idx) => (
                  <button
                    key={`${b.raw}-${idx}`}
                    type="button"
                    onClick={() => setSelectedBlockIndex(idx)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      idx === selectedBlockIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    Bloc {idx + 1} · {BLOCK_TYPE_LABELS[b.type]}
                  </button>
                ))}
              </div>
              {selectedBlock && (
                <div className="rounded-xl bg-secondary/50 p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="justify-start rounded-xl text-[13px]"
                      onClick={() =>
                        (() => {
                          const currentMeters = selectedBlock.distance || 1000;
                          const useMeters = currentMeters < 1000;
                          setWheelUnit(useMeters ? "m" : "km");
                          setWheelA(String(useMeters ? currentMeters : Math.floor(currentMeters / 1000)));
                          setWheelB(String(useMeters ? 0 : currentMeters % 1000));
                          openWheel(
                            "Distance",
                            useMeters
                              ? [
                                  { items: Array.from({ length: 3000 }, (_, i) => ({ value: String(i * 5), label: String(i * 5) })), value: wheelA, onChange: setWheelA, suffix: "m" },
                                  { items: [{ value: "m", label: "m" }, { value: "km", label: "km" }, { value: "mi", label: "mi" }], value: wheelUnit, onChange: setWheelUnit },
                                ]
                              : [
                                  { items: Array.from({ length: 80 }, (_, i) => ({ value: String(i), label: String(i) })), value: wheelA, onChange: setWheelA, suffix: wheelUnit },
                                  { items: Array.from({ length: 100 }, (_, i) => ({ value: String(i * 10), label: String(i * 10).padStart(3, "0") })), value: wheelB, onChange: setWheelB, suffix: "m" },
                                  { items: [{ value: "m", label: "m" }, { value: "km", label: "km" }, { value: "mi", label: "mi" }], value: wheelUnit, onChange: setWheelUnit },
                                ],
                            () => {
                              const next =
                                wheelUnit === "m"
                                  ? Number.parseInt(wheelA, 10)
                                  : wheelUnit === "km"
                                  ? Number.parseInt(wheelA, 10) * 1000 + Number.parseInt(wheelB, 10)
                                  : Math.round((Number.parseInt(wheelA, 10) + Number.parseInt(wheelB, 10) / 1000) * 1609.344);
                            const nextBlocks = [...session.parsedBlocks];
                            nextBlocks[selectedBlockIndex] = {
                              ...selectedBlock,
                              type: "interval",
                              distance: next,
                              duration: undefined,
                              repetitions: Math.max(1, selectedBlock.repetitions || 1),
                              pace: selectedBlock.pace || "5:30",
                            };
                            applyBlocks(nextBlocks);
                            }
                          );
                        })()
                      }
                    >
                      Distance
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="justify-start rounded-xl text-[13px]"
                      onClick={() =>
                        openWheel(
                          "Répétitions",
                          [{ items: REP_OPTIONS, value: String(selectedBlock.repetitions || 1), onChange: setWheelA }],
                          () => {
                            const next = wheelA;
                            const reps = Number.parseInt(next, 10);
                            const nextBlocks = [...session.parsedBlocks];
                            nextBlocks[selectedBlockIndex] = {
                              ...selectedBlock,
                              type: "interval",
                              repetitions: reps,
                              distance: selectedBlock.distance || 1000,
                              duration: undefined,
                              pace: selectedBlock.pace || "5:30",
                            };
                            applyBlocks(nextBlocks);
                          }
                        )
                      }
                    >
                      Répétitions
                    </Button>
                    {(selectedBlock.repetitions || 1) > 1 && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="justify-start rounded-xl text-[13px]"
                        onClick={() =>
                          (() => {
                            const total = selectedBlock.recoveryDuration || 0;
                            setWheelA(String(Math.floor(total / 3600)));
                            setWheelB(String(Math.floor((total % 3600) / 60)));
                            setWheelC(String(total % 60));
                            openWheel(
                              "Récup répétitions",
                              [
                                { items: Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })), value: wheelA, onChange: setWheelA, suffix: "h" },
                                { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelB, onChange: setWheelB, suffix: "m" },
                                { items: Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") })), value: wheelC, onChange: setWheelC, suffix: "s" },
                              ],
                              () => {
                                const next = Number.parseInt(wheelA, 10) * 3600 + Number.parseInt(wheelB, 10) * 60 + Number.parseInt(wheelC, 10);
                              const nextBlocks = [...session.parsedBlocks];
                              nextBlocks[selectedBlockIndex] = {
                                ...selectedBlock,
                                recoveryDuration: next,
                              };
                              applyBlocks(nextBlocks);
                              }
                            );
                          })()
                        }
                      >
                        Récup répétitions
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      className="justify-start rounded-xl text-[13px]"
                      onClick={() =>
                        openWheel(
                          "RPE",
                          [{ items: RPE_OPTIONS, value: String(session.blockRpe[selectedBlockIndex] ?? 0), onChange: setWheelA }],
                          () => {
                            const next = wheelA;
                            const nextRpe = [...session.blockRpe];
                            nextRpe[selectedBlockIndex] = Number.parseInt(next, 10);
                            applyBlocks([...session.parsedBlocks], nextRpe);
                          }
                        )
                      }
                    >
                      RPE
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="col-span-2 rounded-xl border-dashed text-[13px]"
                      onClick={() => {
                        const nextBlocks = [
                          ...session.parsedBlocks,
                          {
                            type: "interval",
                            raw: "1x1000>5'30",
                            distance: 1000,
                            repetitions: 1,
                            pace: "5:30",
                            recoveryType: "trot",
                          } as ParsedBlock,
                        ];
                        const nextRpe = normalizeBlockRpeLength(session.blockRpe, nextBlocks.length);
                        applyBlocks(nextBlocks, nextRpe);
                        setSelectedBlockIndex(nextBlocks.length - 1);
                      }}
                    >
                      + Bloc
                    </Button>
                  </div>
                  <div className="mt-2 rounded-lg border border-border/60 bg-card px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bloc actif</p>
                    <p className="mt-1 text-[13px] font-semibold text-foreground">
                      {BLOCK_TYPE_LABELS[selectedBlock.type]} · {selectedBlock.distance ? `${selectedBlock.distance}m` : `${selectedBlock.duration || 0} min`} · x{selectedBlock.repetitions || 1}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">Récup: {recoveryLabel(selectedBlock.recoveryDuration)}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{blockToRcc(selectedBlock)}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed text-[13px]"
              onClick={() => {
                const nextBlocks: ParsedBlock[] = [
                  {
                    type: "interval",
                    raw: "1x1000>5'30",
                    distance: 1000,
                    repetitions: 1,
                    pace: "5:30",
                    recoveryType: "trot",
                  },
                ];
                applyBlocks(nextBlocks, [0]);
                setSelectedBlockIndex(0);
              }}
            >
              + Bloc
            </Button>
          )}
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
