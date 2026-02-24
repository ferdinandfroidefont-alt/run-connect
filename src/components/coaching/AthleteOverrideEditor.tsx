import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Minus, Plus, Search, UserPlus } from "lucide-react";

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
  /** Compact mode for inline use */
  compact?: boolean;
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

function pacePercentDiff(base: string, current: string): string {
  const baseSec = paceToSeconds(base);
  const curSec = paceToSeconds(current);
  if (baseSec === 0) return "";
  const diff = ((curSec - baseSec) / baseSec) * 100;
  if (Math.abs(diff) < 0.5) return "";
  return diff > 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;
}

export const AthleteOverrideEditor = ({
  members,
  overrides,
  onChange,
  basePace,
  baseReps,
  baseRecovery,
  compact = false,
}: AthleteOverrideEditorProps) => {
  const [search, setSearch] = useState("");

  const overrideEntries = Object.entries(overrides);
  const customizedIds = new Set(overrideEntries.map(([id]) => id));

  // Filtered members for adding
  const filteredAvailable = useMemo(() => {
    const q = search.toLowerCase().trim();
    return members
      .filter(m => !customizedIds.has(m.user_id))
      .filter(m => !q || m.display_name.toLowerCase().includes(q));
  }, [members, customizedIds, search]);

  // Filtered customized athletes
  const filteredCustomized = useMemo(() => {
    const q = search.toLowerCase().trim();
    return overrideEntries.filter(([userId]) => {
      if (!q) return true;
      const name = members.find(m => m.user_id === userId)?.display_name || "";
      return name.toLowerCase().includes(q);
    });
  }, [overrideEntries, search, members]);

  const handleAdd = (userId: string) => {
    onChange({ ...overrides, [userId]: {} });
  };

  const handleAddAll = () => {
    const next = { ...overrides };
    filteredAvailable.forEach(m => {
      if (!next[m.user_id]) next[m.user_id] = {};
    });
    onChange(next);
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
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un athlète..."
          className="h-8 text-xs pl-8"
        />
      </div>

      {/* Customized athletes */}
      {filteredCustomized.map(([userId, ov]) => {
        const pctLabel = basePace && ov.pace ? pacePercentDiff(basePace, ov.pace) : "";
        const repsDiff = ov.reps != null && baseReps != null ? ov.reps - baseReps : null;

        return (
          <div key={userId} className="p-2.5 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{getMemberName(userId)}</span>
                {pctLabel && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                    pctLabel.startsWith("+") ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {pctLabel}
                  </span>
                )}
                {repsDiff != null && repsDiff !== 0 && (
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                    repsDiff > 0 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}>
                    {repsDiff > 0 ? `+${repsDiff}` : repsDiff} reps
                  </span>
                )}
              </div>
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
                <span className="text-[10px] text-muted-foreground uppercase">Séries</span>
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
        );
      })}

      {/* Available athletes to add */}
      {filteredAvailable.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              Ajouter ({filteredAvailable.length})
            </span>
            {filteredAvailable.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary"
                onClick={handleAddAll}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Tous
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {filteredAvailable.map(m => (
              <button
                key={m.user_id}
                onClick={() => handleAdd(m.user_id)}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-[11px] hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Plus className="h-2.5 w-2.5" />
                {m.display_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 text-center">Aucun athlète dans ce groupe</p>
      )}
    </div>
  );
};
