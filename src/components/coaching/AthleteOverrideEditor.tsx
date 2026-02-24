import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Minus, Plus } from "lucide-react";

export interface AthleteOverride {
  pace?: string;
  reps?: number;
  recovery?: number;
  distance?: number;
}

interface ClubMember {
  user_id: string;
  display_name: string;
  avatar_url?: string;
}

interface AthleteOverrideEditorProps {
  members: ClubMember[];
  overrides: Record<string, AthleteOverride>;
  onChange: (overrides: Record<string, AthleteOverride>) => void;
  basePace?: string;
  baseReps?: number;
  baseRecovery?: number;
}

function paceToSeconds(pace: string): number {
  const [m, s] = pace.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function secondsToPace(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const AthleteOverrideEditor = ({
  members,
  overrides,
  onChange,
  basePace,
  baseReps,
  baseRecovery,
}: AthleteOverrideEditorProps) => {
  const [addingId, setAddingId] = useState("");

  const availableMembers = members.filter(m => !overrides[m.user_id]);
  const overrideEntries = Object.entries(overrides);

  const handleAdd = (userId: string) => {
    if (!userId) return;
    onChange({ ...overrides, [userId]: {} });
    setAddingId("");
  };

  const handleRemove = (userId: string) => {
    const next = { ...overrides };
    delete next[userId];
    onChange(next);
  };

  const update = (userId: string, field: keyof AthleteOverride, value: any) => {
    onChange({ ...overrides, [userId]: { ...overrides[userId], [field]: value } });
  };

  const adjustPace = (userId: string, delta: number) => {
    const current = overrides[userId]?.pace || basePace || "4:00";
    const secs = paceToSeconds(current) + delta;
    if (secs > 0) update(userId, "pace", secondsToPace(secs));
  };

  const adjustReps = (userId: string, delta: number) => {
    const current = overrides[userId]?.reps ?? baseReps ?? 6;
    const next = Math.max(1, current + delta);
    update(userId, "reps", next);
  };

  const adjustRecovery = (userId: string, delta: number) => {
    const current = overrides[userId]?.recovery ?? baseRecovery ?? 90;
    const next = Math.max(0, current + delta);
    update(userId, "recovery", next);
  };

  const getMemberName = (userId: string) =>
    members.find(m => m.user_id === userId)?.display_name || "Athlète";

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">Variantes par athlète</p>

      {overrideEntries.map(([userId, ov]) => (
        <div key={userId} className="p-2.5 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getMemberName(userId)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(userId)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Pace */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Allure</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustPace(userId, -5)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono text-center flex-1">{ov.pace || basePace || "—"}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustPace(userId, 5)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Reps */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Reps</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustReps(userId, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono text-center flex-1">{ov.reps ?? baseReps ?? "—"}</span>
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustReps(userId, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recovery */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Récup</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustRecovery(userId, -15)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono text-center flex-1">
                  {secondsToPace(ov.recovery ?? baseRecovery ?? 90)}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => adjustRecovery(userId, 15)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {availableMembers.length > 0 && (
        <Select value={addingId} onValueChange={handleAdd}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="+ Ajouter un athlète" />
          </SelectTrigger>
          <SelectContent>
            {availableMembers.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
