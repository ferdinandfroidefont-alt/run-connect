import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { mergeParsedBlocksByIndex, parseRCC, type ParsedBlock } from "@/lib/rccParser";
import { normalizeBlockRpeLength } from "@/lib/sessionBlockRpe";

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
}

const SPORT_OPTIONS = [
  { key: "running", emoji: "🏃", bg: "#007AFF" },
  { key: "cycling", emoji: "🚴", bg: "#FF3B30" },
  { key: "swimming", emoji: "🏊", bg: "#5AC8FA" },
  { key: "strength", emoji: "💪", bg: "#FF9500" },
] as const;

const BLOCK_PRESETS = [
  {
    label: "Continu",
    code: "20'>5'30",
    svg: <rect x="2" y="9" width="40" height="6" rx="2" fill="#0066cc" />,
  },
  {
    label: "Intervalle",
    code: "6x3'>3'30",
    svg: (
      <>
        <rect x="2" y="4" width="6" height="16" rx="1.5" fill="#FF9500" />
        <rect x="11" y="14" width="3" height="6" rx="1" fill="#B5B5BA" />
        <rect x="17" y="4" width="6" height="16" rx="1.5" fill="#FF9500" />
        <rect x="26" y="14" width="3" height="6" rx="1" fill="#B5B5BA" />
        <rect x="32" y="4" width="6" height="16" rx="1.5" fill="#FF9500" />
      </>
    ),
  },
  {
    label: "Pyramide",
    code: "200>4'00, 400>4'10, 600>4'20, 400>4'10, 200>4'00",
    svg: (
      <>
        <rect x="2" y="14" width="5" height="6" rx="1" fill="#34C759" />
        <rect x="9" y="10" width="5" height="10" rx="1.2" fill="#FFCC00" />
        <rect x="16" y="4" width="5" height="16" rx="1.5" fill="#FF9500" />
        <rect x="23" y="4" width="5" height="16" rx="1.5" fill="#FF9500" />
        <rect x="30" y="10" width="5" height="10" rx="1.2" fill="#FFCC00" />
        <rect x="37" y="14" width="5" height="6" rx="1" fill="#34C759" />
      </>
    ),
  },
  {
    label: "Variation",
    code: "10'>5'30, 10'>4'45, 10'>5'15",
    svg: (
      <>
        <rect x="2" y="16" width="5" height="4" rx="1" fill="#B5B5BA" />
        <rect x="9" y="12" width="5" height="8" rx="1" fill="#34C759" />
        <rect x="16" y="6" width="5" height="14" rx="1.3" fill="#FF9500" />
        <rect x="23" y="14" width="5" height="6" rx="1" fill="#0066cc" />
        <rect x="30" y="4" width="5" height="16" rx="1.5" fill="#FF3B30" />
        <rect x="37" y="10" width="5" height="10" rx="1.2" fill="#FFCC00" />
      </>
    ),
  },
] as const;

export const WeeklyPlanSessionEditor = ({
  session,
  onChange,
  onDuplicate: _onDuplicate,
  onDelete: _onDelete,
  members: _members,
}: WeeklyPlanSessionEditorProps) => {
  const [showTemplates, setShowTemplates] = useState(false);

  void _onDuplicate;
  void _onDelete;
  void _members;

  const update = <K extends keyof WeekSession>(key: K, value: WeekSession[K]) => onChange({ ...session, [key]: value });

  const applyRccCode = (nextCode: string) => {
    const parsed = parseRCC(nextCode).blocks;
    const merged = mergeParsedBlocksByIndex(parsed, session.parsedBlocks || []);
    onChange({
      ...session,
      rccCode: nextCode,
      parsedBlocks: merged,
      blockRpe: normalizeBlockRpeLength(session.blockRpe, merged.length),
    });
  };

  const appendRccCode = (chunk: string) => {
    const current = session.rccCode.trim();
    applyRccCode(current ? `${current}, ${chunk}` : chunk);
  };

  const estimated = useMemo(() => {
    const blocks: ParsedBlock[] = session.parsedBlocks || [];
    if (!blocks.length) return { km: "11", min: 54 };
    const totalMin = blocks.reduce((sum, b) => {
      const oneBlock = (b.duration || 0) + (b.recoveryDuration || 0) / 60;
      const reps = b.repetitions || 1;
      return sum + Math.max(0, oneBlock * reps);
    }, 0);
    const totalKm = blocks.reduce((sum, b) => {
      const km = (b.distance || 0) / 1000;
      const reps = b.repetitions || 1;
      return sum + km * reps;
    }, 0);
    return {
      km: totalKm > 0 ? totalKm.toFixed(1).replace(".0", "") : "11",
      min: Math.max(1, Math.round(totalMin || 54)),
    };
  }, [session.parsedBlocks]);

  return (
    <div className="overflow-hidden bg-[#f5f5f7]">
      <div className="space-y-6 p-[17px] pb-8">
        <div className="grid grid-cols-2 gap-2 rounded-full border border-[#e0e0e0] bg-white p-1">
          <button type="button" className="h-11 rounded-full border border-[#0066cc] bg-[#0066cc] text-[15px] font-semibold text-white">
            Construire
          </button>
          <button
            type="button"
            onClick={() => setShowTemplates(true)}
            className="h-11 rounded-full border border-[#e0e0e0] bg-white text-[15px] font-semibold text-[#1d1d1f]"
          >
            Modèles
          </button>
        </div>

        <div className="space-y-1 pt-1">
          <Input
            value={session.objective}
            onChange={(e) => update("objective", e.target.value)}
            placeholder="Nom de la séance"
            className="h-auto border-0 bg-transparent px-0 py-0 font-display text-[52px] font-semibold leading-[1.04] tracking-[-0.5px] text-[#1d1d1f] placeholder:text-[#7a7a7a] shadow-none focus-visible:ring-0"
          />
          <p className="text-[14px] text-[#7a7a7a]">{`${estimated.km} km · ~${estimated.min} min`}</p>
        </div>

        <div className="grid grid-cols-4 gap-[10px]">
          {SPORT_OPTIONS.map((sport, idx) => (
            <button
              key={`${sport.key}-${idx}`}
              type="button"
              onClick={() => update("activityType", sport.key)}
              className="relative aspect-square rounded-[14px] text-[36px]"
              style={{ backgroundColor: sport.bg }}
            >
              {session.activityType === sport.key ? (
                <span className="pointer-events-none absolute inset-0 rounded-[14px] shadow-[0_0_0_2px_#f5f5f7,0_0_0_4px_#0066cc]" />
              ) : null}
              {sport.emoji}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Schéma de séance</p>
          <div className="rounded-[18px] border border-[#e0e0e0] bg-white px-4 py-3">
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
              <g fontFamily="SF Pro Text, system-ui, sans-serif" fontSize="10" fill="#7a7a7a">
                <text x="40" y="216" textAnchor="middle">0:00</text>
                <text x="120" y="216" textAnchor="middle">0:15</text>
                <text x="200" y="216" textAnchor="middle">0:30</text>
                <text x="280" y="216" textAnchor="middle">0:45</text>
                <text x="360" y="216" textAnchor="end">1:00</text>
              </g>
            </svg>
          </div>
        </div>

        <div className="space-y-2">
          <p className="pl-0.5 text-[14px] font-semibold text-[#333]">Ajouter un bloc</p>
          <div className="grid grid-cols-4 gap-2">
            {BLOCK_PRESETS.map((item, idx) => (
              <button
                key={item.label}
                type="button"
                onClick={() => appendRccCode(item.code)}
                className={`rounded-[14px] border bg-white px-2 py-2 ${idx === 2 ? "border-2 border-[#0066cc]" : "border-[#e0e0e0]"}`}
              >
                <svg viewBox="0 0 44 22" className="mx-auto h-5 w-11" fill="none">
                  {item.svg}
                </svg>
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

      <div className="border-t border-[#e0e0e0] bg-[#f5f5f7] px-[17px] pb-7 pt-[14px]">
        <button type="button" className="h-[50px] w-full rounded-full bg-[#0066cc] text-[17px] font-semibold text-white">
          Enregistrer la séance
        </button>
      </div>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code, objective) => {
          applyRccCode(code);
          if (objective) update("objective", objective);
          setShowTemplates(false);
        }}
      />
    </div>
  );
};
