import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RCCEditor } from "./RCCEditor";
import { AthleteOverrideEditor, type AthleteOverride } from "./AthleteOverrideEditor";
import { CoachingTemplatesDialog } from "./CoachingTemplatesDialog";
import { BookOpen, ChevronDown, Users, Copy, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { RCCResult, ParsedBlock } from "@/lib/rccParser";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ACTIVITY_TYPES = [
  { value: "running", label: "Course" },
  { value: "trail", label: "Trail" },
  { value: "cycling", label: "Vélo" },
  { value: "swimming", label: "Natation" },
  { value: "walking", label: "Marche" },
];

export interface WeekSession {
  dayIndex: number;
  activityType: string;
  objective: string;
  rccCode: string;
  parsedBlocks: ParsedBlock[];
  coachNotes: string;
  locationName: string;
  athleteOverrides: Record<string, AthleteOverride>;
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
  const [variantsOpen, setVariantsOpen] = useState(false);

  const update = <K extends keyof WeekSession>(key: K, value: WeekSession[K]) => {
    onChange({ ...session, [key]: value });
  };

  const handleParsedChange = (result: RCCResult) => {
    update("parsedBlocks", result.blocks);
  };

  // Extract base values from parsed blocks for override defaults
  const intervalBlock = session.parsedBlocks.find(b => b.type === "interval");
  const basePace = intervalBlock?.pace;
  const baseReps = intervalBlock?.repetitions;
  const baseRecovery = intervalBlock?.recoveryDuration;

  const otherDays = DAY_LABELS.map((label, i) => ({ label, index: i }))
    .filter(d => d.index !== session.dayIndex);

  return (
    <div className="space-y-3 p-4 border rounded-xl bg-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{DAY_LABELS[session.dayIndex]} — {session.objective || "Nouvelle séance"}</p>
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Dupliquer vers...">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherDays.map(d => (
                <DropdownMenuItem key={d.index} onClick={() => onDuplicate(d.index)}>
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={session.activityType} onValueChange={v => update("activityType", v)}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPES.map(a => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={session.objective}
          onChange={e => update("objective", e.target.value)}
          placeholder="Objectif (VMA, Seuil...)"
          className="h-9 text-xs"
        />
      </div>

      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowTemplates(true)}>
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          Template
        </Button>
      </div>

      <RCCEditor
        value={session.rccCode}
        onChange={v => update("rccCode", v)}
        onParsedChange={handleParsedChange}
      />

      <Input
        value={session.locationName}
        onChange={e => update("locationName", e.target.value)}
        placeholder="📍 Lieu (optionnel)"
        className="h-9 text-xs"
      />

      <Textarea
        value={session.coachNotes}
        onChange={e => update("coachNotes", e.target.value)}
        placeholder="📝 Notes coach (optionnel)"
        className="text-xs min-h-[40px] resize-none"
        rows={2}
      />

      {/* Athlete variants */}
      <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-between">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Variantes ({Object.keys(session.athleteOverrides).length})
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${variantsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <AthleteOverrideEditor
            members={members}
            overrides={session.athleteOverrides}
            onChange={ov => update("athleteOverrides", ov)}
            basePace={basePace}
            baseReps={baseReps}
            baseRecovery={baseRecovery}
          />
        </CollapsibleContent>
      </Collapsible>

      <CoachingTemplatesDialog
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(code, objective) => {
          update("rccCode", code);
          if (objective) update("objective", objective);
          setShowTemplates(false);
        }}
      />
    </div>
  );
};
