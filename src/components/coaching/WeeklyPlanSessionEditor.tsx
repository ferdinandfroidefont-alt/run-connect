import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, startOfWeek } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { SessionBlock } from "@/components/session-creation/types";
import {
  formatDurationSeconds,
  normalizeBlocksForStorage,
  parseDurationSeconds,
  parseDistanceMeters,
  parsePaceToSecondsPerKm,
  sessionBlocksToParsedBlocks,
} from "@/lib/sessionBlockCalculations";
import {
  computeRCCSummary,
  mergeParsedBlocksByIndex,
  parseRCC,
  rccToSessionBlocks,
  serializeParsedBlocksToRcc,
} from "@/lib/rccParser";
import { normalizeBlockRpeLength } from "@/lib/sessionBlockRpe";
import { WIZARD_ACTION_BLUE, WIZARD_TITLE } from "@/components/session-creation/wizardVisualTokens";
import { CoachingBlockEditorPanel, type CoachingSessionBlock } from "./CoachingBlockEditorPanel";
import { ModelsPage } from "./models/ModelsPage";
import type { SessionModelItem } from "./models/types";
import { cn } from "@/lib/utils";

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
  rpe?: number;
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
  /** Clé stable (ex. index + groupe) pour réinitialiser l’éditeur quand on change de séance. */
  sessionSyncKey?: string | number;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function isCoachingPositive(value?: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function paceSecPerKmToRunPaceString(sec?: number): string {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function blockIntensityToZone(intensity?: string | null): NonNullable<CoachingSessionBlock["zone"]> {
  const z = intensity?.trim().toLowerCase();
  if (z === "z1") return "Z1";
  if (z === "z2") return "Z2";
  if (z === "z3") return "Z3";
  if (z === "z4") return "Z4";
  if (z === "z5") return "Z5";
  if (z === "z6") return "Z6";
  return "Z2";
}

function coachingBlocksToSessionBlocks(blocks: CoachingSessionBlock[]): SessionBlock[] {
  return blocks.map((block) => {
    if (block.type === "interval") {
      const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
      const hasDistance = isCoachingPositive(block.distanceM);
      return {
        id: block.id,
        type: "interval",
        repetitions: Math.max(1, block.repetitions ?? 1),
        blockRepetitions: Math.max(1, block.blockRepetitions ?? 1),
        effortType: hasDistance ? "distance" : "time",
        effortDistance: hasDistance ? String(Math.round(block.distanceM!)) : "",
        effortDuration: hasDistance ? "" : formatDurationSeconds(block.durationSec),
        effortPace: pace,
        recoveryDuration: formatDurationSeconds(block.recoveryDurationSec),
        recoveryType: "trot",
        effortIntensity: block.zone ? block.zone.toLowerCase() : undefined,
      };
    }
    const sessionType: "warmup" | "steady" | "cooldown" =
      block.type === "warmup" ? "warmup" : block.type === "cooldown" ? "cooldown" : "steady";
    const pace = paceSecPerKmToRunPaceString(block.paceSecPerKm);
    return {
      id: block.id,
      type: sessionType,
      durationType: isCoachingPositive(block.distanceM) && !isCoachingPositive(block.durationSec) ? "distance" : "time",
      duration: formatDurationSeconds(block.durationSec),
      distance: block.distanceM != null ? String(Math.round(block.distanceM)) : "",
      pace,
      intensity: block.zone?.toLowerCase(),
    };
  });
}

function sessionBlocksToCoachingBlocks(blocks: SessionBlock[]): CoachingSessionBlock[] {
  return blocks.map((b, index) => {
    if (b.type === "interval") {
      const effortDuration = parseDurationSeconds(b.effortDuration);
      const effortDistance = parseDistanceMeters(b.effortDistance);
      const recoveryDuration = parseDurationSeconds(b.recoveryDuration);
      return {
        id: b.id || uid(),
        order: index + 1,
        type: "interval",
        durationSec: b.effortType === "distance" ? undefined : effortDuration ?? undefined,
        distanceM: effortDistance ?? undefined,
        paceSecPerKm: parsePaceToSecondsPerKm(b.effortPace) ?? undefined,
        repetitions: b.repetitions,
        blockRepetitions: b.blockRepetitions,
        recoveryDurationSec: recoveryDuration ?? undefined,
        intensityMode: "zones",
        zone: blockIntensityToZone(b.effortIntensity),
      };
    }
    const mapType = (): CoachingSessionBlock["type"] => {
      if (b.type === "warmup") return "warmup";
      if (b.type === "cooldown") return "cooldown";
      return "steady";
    };
    const distanceM = parseDistanceMeters(b.distance);
    const n = Number(b.duration?.trim());
    const legacySeconds =
      !b.durationType && Number.isInteger(n) && n > 0 && n <= 240 ? n * 60 : undefined;
    const fromParse = parseDurationSeconds(b.duration);
    const durationSecResolved = legacySeconds ?? fromParse ?? undefined;
    return {
      id: b.id || uid(),
      order: index + 1,
      type: mapType(),
      durationSec: durationSecResolved,
      distanceM: distanceM ?? undefined,
      paceSecPerKm: parsePaceToSecondsPerKm(b.pace) ?? undefined,
      intensityMode: "zones",
      zone: blockIntensityToZone(b.intensity),
    };
  });
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

export const WeeklyPlanSessionEditor = ({
  session,
  onChange,
  onDuplicate: _onDuplicate,
  onDelete: _onDelete,
  members: _members,
  sessionSyncKey,
}: WeeklyPlanSessionEditorProps) => {
  const { user } = useAuth();
  void _onDuplicate;
  void _onDelete;
  void _members;

  const [builderTab, setBuilderTab] = useState<"build" | "templates">("build");
  const [coachingBlocks, setCoachingBlocks] = useState<CoachingSessionBlock[]>([]);
  const [schemaEditorKey, setSchemaEditorKey] = useState(0);
  const [myModels, setMyModels] = useState<SessionModelItem[]>([]);
  const lastSyncKey = useRef<typeof sessionSyncKey>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coaching_templates")
      .select("id, title, activity_type, objective, rcc_code, category")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setMyModels(
          data.map((row) => ({
            id: row.id,
            source: "mine" as const,
            title: row.title || "",
            activityType: row.activity_type || "running",
            objective: row.objective || "",
            rccCode: row.rcc_code || "",
            category: row.category || "endurance",
          }))
        );
      });
  }, [user]);

  useEffect(() => {
    if (sessionSyncKey !== undefined && lastSyncKey.current === sessionSyncKey) {
      return;
    }
    lastSyncKey.current = sessionSyncKey;

    const parsed = session.parsedBlocks?.length
      ? session.parsedBlocks
      : parseRCC(session.rccCode).blocks;
    const sessionRows = rccToSessionBlocks(parsed) as SessionBlock[];
    setCoachingBlocks(sessionBlocksToCoachingBlocks(sessionRows));
    setSchemaEditorKey((k) => k + 1);
  }, [sessionSyncKey]);

  const weekDays = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, []);

  const sportProp = useMemo((): "running" | "cycling" | "swimming" | "strength" => {
    const t = session.activityType;
    if (t === "cycling" || t === "velo") return "cycling";
    if (t === "swimming" || t === "natation") return "swimming";
    if (t === "strength" || t === "musculation" || t === "muscu") return "strength";
    return "running";
  }, [session.activityType]);

  const estimated = useMemo(() => {
    const code = session.rccCode.trim();
    if (!code) return { km: "0", min: 0 };
    const summary = computeRCCSummary(parseRCC(code).blocks);
    return {
      km: summary.totalDistanceKm > 0 ? String(summary.totalDistanceKm) : "0",
      min: summary.totalDurationMin,
    };
  }, [session.rccCode]);

  const handleCoachingBlocksChange = (blocks: CoachingSessionBlock[]) => {
    setCoachingBlocks(blocks);
    const sessionBlocks = normalizeBlocksForStorage(coachingBlocksToSessionBlocks(blocks));
    const parsed = sessionBlocksToParsedBlocks(sessionBlocks);
    const mergedParsed = mergeParsedBlocksByIndex(parsed, session.parsedBlocks || []);
    const rccCode = serializeParsedBlocksToRcc(parsed);
    onChange({
      ...session,
      rccCode,
      parsedBlocks: mergedParsed,
      blockRpe: normalizeBlockRpeLength(session.blockRpe, mergedParsed.length),
    });
  };

  const applyModelToSession = (model: SessionModelItem) => {
    const rawParsed = parseRCC(model.rccCode).blocks;
    const raw = rccToSessionBlocks(rawParsed) as SessionBlock[];
    const blocks = normalizeBlocksForStorage(raw);
    const coaching = sessionBlocksToCoachingBlocks(blocks);
    const mergedParsed = mergeParsedBlocksByIndex(rawParsed, []);
    const rccCode = model.rccCode.trim();
    const obj = model.objective?.trim();
    const notes = session.coachNotes?.trim();
    let coachNotes = session.coachNotes;
    if (obj && (!notes || !notes.includes(obj))) {
      coachNotes = notes ? `${notes}\n\nObjectif : ${obj}` : `Objectif : ${obj}`;
    }

    onChange({
      ...session,
      rccCode,
      parsedBlocks: mergedParsed,
      objective: model.title?.trim() || session.objective,
      blockRpe: normalizeBlockRpeLength([], mergedParsed.length),
      ...(coachNotes !== session.coachNotes ? { coachNotes } : {}),
    });
    setCoachingBlocks(coaching);
    setBuilderTab("build");
    setSchemaEditorKey((k) => k + 1);
  };

  return (
    <div className="overflow-hidden bg-background">
      <div className={cn("space-y-4 px-0", "pb-4")}>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-full py-3 text-center text-[16px] font-bold transition-transform active:scale-[0.98]"
            style={
              builderTab === "build"
                ? { background: WIZARD_ACTION_BLUE, color: "#fff" }
                : { background: "#fff", color: WIZARD_TITLE, border: "1px solid #E5E5EA" }
            }
            onClick={() => setBuilderTab("build")}
          >
            Construire
          </button>
          <button
            type="button"
            className="flex-1 rounded-full py-3 text-center text-[16px] font-bold transition-transform active:scale-[0.98]"
            style={
              builderTab === "templates"
                ? { background: WIZARD_ACTION_BLUE, color: "#fff" }
                : { background: "#fff", color: WIZARD_TITLE, border: "1px solid #E5E5EA" }
            }
            onClick={() => setBuilderTab("templates")}
          >
            Modèles
          </button>
        </div>

        <div className="px-1">
          <input
            className="w-full bg-transparent font-display text-[42px] font-semibold tracking-[-0.8px] text-[#1d1d1f] placeholder:text-[#7a7a7a] focus:outline-none"
            placeholder="Nom de la séance"
            value={session.objective}
            onChange={(e) => onChange({ ...session, objective: e.target.value })}
          />
          <p className="text-[14px] text-[#7a7a7a]">
            {estimated.min > 0 ? `${estimated.km} km · ~${estimated.min} min` : "Ajoute des blocs pour estimer la charge"}
          </p>
        </div>

        {builderTab === "build" ? (
          <CoachingBlockEditorPanel
            key={schemaEditorKey}
            sport={sportProp}
            initialBlocks={coachingBlocks.length ? coachingBlocks : undefined}
            onChange={handleCoachingBlocksChange}
          />
        ) : (
          <ModelsPage
            weekDays={weekDays}
            existingSessionsByDay={{}}
            myModels={myModels}
            baseModels={BASE_MODELS}
            onCreateModel={() => setBuilderTab("build")}
            onApplyToSession={(model) => applyModelToSession(model)}
            onEditModel={(model) => applyModelToSession(model)}
            onDuplicateModel={() => {}}
            onDeleteModel={async (model) => {
              if (model.source !== "mine") return;
              await supabase.from("coaching_templates").delete().eq("id", model.id);
              setMyModels((prev) => prev.filter((m) => m.id !== model.id));
            }}
          />
        )}

        <div className="space-y-2">
          <p className="pl-0.5 text-[12px] font-medium uppercase tracking-[0.16em] text-muted-foreground/85">Notes coach</p>
          <div className="overflow-hidden rounded-[18px] border border-border/60 bg-card p-3">
            <textarea
              value={session.coachNotes}
              onChange={(e) => onChange({ ...session, coachNotes: e.target.value })}
              placeholder="Consignes, variantes, repères d’intensité…"
              rows={3}
              className="w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-[1.4] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
