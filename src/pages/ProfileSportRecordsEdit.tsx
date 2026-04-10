import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROFILE_SPORT_RECORD_KEYS,
  PROFILE_SPORT_RECORD_LABELS,
  SPORT_DISTANCES,
  isProfileSportRecordKey,
  type ProfileSportRecordKey,
} from "@/lib/profileSportRecords";
import type { ProfileSportRecordRow } from "@/components/profile/ProfileRecordsDisplay";

type RecordInputKind = "time" | "pace" | "speed";

type ParsedRecordInput = {
  kind: RecordInputKind;
  normalized: string;
  secondsPerKm?: number;
  speedKmh?: number;
  totalSeconds?: number;
};

const CYCLING_KEYS = new Set<ProfileSportRecordKey>(["cycling"]);

function parseDistanceKmFromEventLabel(label: string): number | null {
  const raw = label.trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("semi")) return 21.0975;
  if (raw.includes("marathon") && !raw.includes("semi")) return 42.195;
  if (raw.includes("half ironman") || raw.includes("70.3")) return 90;
  if (raw.includes("ironman")) return 180;
  const km = raw.match(/(\d+(?:[.,]\d+)?)\s*km/);
  if (km?.[1]) return Number(km[1].replace(",", "."));
  const meters = raw.match(/(\d+(?:[.,]\d+)?)\s*(m|metres|mètres)\b/);
  if (meters?.[1]) return Number(meters[1].replace(",", ".")) / 1000;
  return null;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseDurationToSeconds(input: string): number | null {
  const value = input.trim();
  const parts = value.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (s > 59) return null;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    if (m > 59 || s > 59) return null;
    return h * 3600 + m * 60 + s;
  }
  return null;
}

function autoFormatSmartTime(raw: string): string {
  if (raw.includes(":") || raw.includes("/") || /[a-z]/i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  if (digits.length === 3) return `${digits.slice(0, 1)}:${digits.slice(1, 3)}`;
  if (digits.length === 6) return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
  if (digits.length === 5) return `${digits.slice(0, 1)}:${digits.slice(1, 3)}:${digits.slice(3, 5)}`;
  return raw;
}

function parseRecordInput(value: string): ParsedRecordInput | null {
  const v = value.trim().toLowerCase().replace(",", ".");
  if (!v) return null;

  if (v.includes("/km") || v.includes("min/km")) {
    const pacePart = v.replace("/km", "").replace("min/km", "").trim();
    const sec = parseDurationToSeconds(pacePart);
    if (sec == null || sec <= 0) return null;
    return { kind: "pace", normalized: `${formatDuration(sec)}/km`, secondsPerKm: sec };
  }

  if (v.includes(":")) {
    const sec = parseDurationToSeconds(v);
    if (sec == null || sec <= 0) return null;
    return { kind: "time", normalized: formatDuration(sec), totalSeconds: sec };
  }

  if (/^\d+(\.\d+)?$/.test(v)) {
    const speed = Number(v);
    if (!Number.isFinite(speed) || speed <= 0) return null;
    return { kind: "speed", normalized: `${speed.toFixed(1)} km/h`, speedKmh: speed };
  }

  return null;
}

export default function ProfileSportRecordsEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sportKey, setSportKey] = useState<ProfileSportRecordKey>("running");
  const [eventLabel, setEventLabel] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [recordValue, setRecordValue] = useState("");
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEventLabel, setEditingEventLabel] = useState("");
  const [editingRecordValue, setEditingRecordValue] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("profile_sport_records")
        .select("id, sport_key, event_label, record_value, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRows((data ?? []) as ProfileSportRecordRow[]);
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos records.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    void load();
  }, [user, navigate, load]);

  const distanceKm = useMemo(() => parseDistanceKmFromEventLabel(eventLabel), [eventLabel]);
  const parsedInput = useMemo(() => parseRecordInput(recordValue), [recordValue]);
  const isCycling = CYCLING_KEYS.has(sportKey);
  const primaryLabel = isCycling ? "Performance" : "Temps";
  const placeholder = isCycling ? "Ex. 32.5 km/h ou 1:10:00" : "Ex. 18:42";

  const derived = useMemo(() => {
    if (!parsedInput || !distanceKm || distanceKm <= 0) return null;
    if (parsedInput.kind === "time" && parsedInput.totalSeconds) {
      const pace = parsedInput.totalSeconds / distanceKm;
      const speed = distanceKm / (parsedInput.totalSeconds / 3600);
      return { pace, speed };
    }
    if (parsedInput.kind === "pace" && parsedInput.secondsPerKm) {
      const speed = 3600 / parsedInput.secondsPerKm;
      return { pace: parsedInput.secondsPerKm, speed };
    }
    if (parsedInput.kind === "speed" && parsedInput.speedKmh) {
      const pace = 3600 / parsedInput.speedKmh;
      return { pace, speed: parsedInput.speedKmh };
    }
    return null;
  }, [parsedInput, distanceKm]);

  useEffect(() => {
    if (!parsedInput || hasBuzzed) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
    setHasBuzzed(true);
  }, [parsedInput, hasBuzzed]);

  const handleAdd = async () => {
    if (!user?.id) return;
    const ev = eventLabel.trim();
    const rv = parsedInput?.normalized ?? recordValue.trim();
    if (!ev || !rv || !parsedInput) {
      toast({
        title: "Champs requis",
        description: "Saisissez une performance valide (temps, allure ou vitesse).",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const nextOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
      const { data, error } = await (supabase as any)
        .from("profile_sport_records")
        .insert({
          user_id: user.id,
          sport_key: sportKey,
          event_label: ev,
          record_value: rv,
          sort_order: nextOrder,
        })
        .select("id, sport_key, event_label, record_value, sort_order")
        .single();
      if (error) throw error;
      setRows((prev) => [...prev, data as ProfileSportRecordRow]);
      setEventLabel("");
      setRecordValue("");
      setHasBuzzed(false);
      toast({ title: "Record ajouté" });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible d’ajouter le record.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("profile_sport_records").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Record supprimé" });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (row: ProfileSportRecordRow) => {
    setEditingId(row.id);
    setEditingEventLabel(row.event_label);
    setEditingRecordValue(row.record_value);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingEventLabel("");
    setEditingRecordValue("");
  };

  const saveEdit = async () => {
    if (!user?.id || !editingId) return;
    const ev = editingEventLabel.trim();
    const rv = editingRecordValue.trim();
    if (!ev || !rv) {
      toast({
        title: "Champs requis",
        description: "Renseignez l’épreuve et la valeur du record.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profile_sport_records")
        .update({ event_label: ev, record_value: rv })
        .eq("id", editingId)
        .eq("user_id", user.id);
      if (error) throw error;
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, event_label: ev, record_value: rv } : r))
      );
      cancelEditing();
      toast({ title: "Record modifie" });
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le record.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveRecord = async (id: string, direction: "up" | "down") => {
    if (!user?.id) return;
    const currentIndex = rows.findIndex((r) => r.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) return;

    const nextRows = [...rows];
    const current = nextRows[currentIndex];
    const target = nextRows[targetIndex];
    [nextRows[currentIndex], nextRows[targetIndex]] = [target, current];

    setRows(nextRows.map((r, idx) => ({ ...r, sort_order: idx })));
    setSaving(true);
    try {
      const updates = nextRows.map((r, idx) =>
        (supabase as any)
          .from("profile_sport_records")
          .update({ sort_order: idx })
          .eq("id", r.id)
          .eq("user_id", user.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((res) => res.error);
      if (failed?.error) throw failed.error;
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "Erreur",
        description: "Impossible de reordonner les records.",
        variant: "destructive",
      });
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-secondary"
      headerWrapperClassName="shrink-0"
      contentScroll
      scrollClassName="min-h-0 bg-secondary"
      header={
        <div className="min-w-0 border-b border-border bg-card/95 pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            left={
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            }
            title="Records sport"
          />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          <p className="px-4 text-ios-subheadline text-muted-foreground ios-shell:px-2.5">
            Choisis un sport, nomme ton épreuve (ex. semi-marathon, 5 km piscine) et indique ta perf. Visible sur ton
            profil.
          </p>

          <div className="bg-card">
            <div className="space-y-3 px-4 py-4 ios-shell:px-2.5">
              <div className="space-y-1.5">
                <label className="text-ios-footnote text-muted-foreground">Sport</label>
                <Select value={sportKey} onValueChange={(v) => { setSportKey(v as ProfileSportRecordKey); setEventLabel(""); setCustomMode(false); }}>
                  <SelectTrigger className="h-11 rounded-ios-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_SPORT_RECORD_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PROFILE_SPORT_RECORD_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-ios-footnote text-muted-foreground">Distance / Épreuve</label>
                {SPORT_DISTANCES[sportKey].length > 0 ? (
                  <Select
                    value={customMode ? "__custom" : (SPORT_DISTANCES[sportKey].includes(eventLabel) ? eventLabel : "")}
                    onValueChange={(v) => {
                      if (v === "__custom") {
                        setCustomMode(true);
                        setEventLabel("");
                      } else {
                        setCustomMode(false);
                        setEventLabel(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-ios-sm">
                      <SelectValue placeholder="Choisir une distance" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_DISTANCES[sportKey].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="__custom">Autre (personnalisé)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {(SPORT_DISTANCES[sportKey].length === 0 || customMode) && (
                  <Input
                    value={eventLabel}
                    onChange={(e) => setEventLabel(e.target.value)}
                    placeholder="Ex. Marathon de Paris"
                    className="h-11 rounded-ios-sm mt-1.5"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-ios-footnote text-muted-foreground">{primaryLabel}</label>
                <Input
                  value={recordValue}
                  onChange={(e) => {
                    const next = autoFormatSmartTime(e.target.value);
                    setRecordValue(next);
                    if (!parseRecordInput(next)) setHasBuzzed(false);
                  }}
                  placeholder={placeholder}
                  inputMode="decimal"
                  className={`h-14 rounded-ios-sm text-center text-[28px] font-semibold tracking-tight tabular-nums ${
                    parsedInput ? "border-emerald-400/70 bg-emerald-50/40 dark:bg-emerald-950/15" : ""
                  }`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Exemples: `18:42` (temps), `3:45/km` (allure), `15.2` (vitesse)
                </p>
                {parsedInput && (
                  <div className="rounded-ios-sm bg-secondary/50 px-3 py-2 text-[12px]">
                    <p className="text-muted-foreground">
                      Interprétation:{" "}
                      <span className="font-medium text-foreground">
                        {parsedInput.kind === "time"
                          ? "Temps"
                          : parsedInput.kind === "pace"
                            ? "Allure"
                            : "Vitesse"}
                      </span>
                    </p>
                    {distanceKm && derived && (
                      <p className="mt-1 text-foreground">
                        Allure: <span className="font-medium">{formatDuration(derived.pace)}/km</span> · Vitesse:{" "}
                        <span className="font-medium">{derived.speed.toFixed(1)} km/h</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button className="h-11 w-full rounded-ios-sm" onClick={() => void handleAdd()} disabled={saving || !parsedInput}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Ajouter
              </Button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ios-shell:px-2.5">
              Mes records
            </h3>
            <div className="bg-card">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-ios-subheadline text-muted-foreground ios-shell:px-2.5">
                  Aucun record pour l’instant.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((r, index) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-3 px-4 py-3 ios-shell:px-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-ios-caption1 text-muted-foreground">
                          {isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}
                        </p>
                        {editingId === r.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingEventLabel}
                              onChange={(e) => setEditingEventLabel(e.target.value)}
                              className="h-9 rounded-ios-sm"
                            />
                            <Input
                              value={editingRecordValue}
                              onChange={(e) => setEditingRecordValue(e.target.value)}
                              className="h-9 rounded-ios-sm font-mono"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="truncate text-ios-body font-medium text-foreground">{r.event_label}</p>
                            <p className="font-mono text-ios-subheadline text-primary tabular-nums">{r.record_value}</p>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {editingId === r.id ? (
                          <>
                            <Button type="button" variant="ghost" size="icon" onClick={() => void saveEdit()} disabled={saving} aria-label="Valider">
                              <Check className="h-5 w-5 text-primary" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={cancelEditing} disabled={saving} aria-label="Annuler">
                              <X className="h-5 w-5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveRecord(r.id, "up")} disabled={saving || index === 0} aria-label="Monter">
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveRecord(r.id, "down")} disabled={saving || index === rows.length - 1} aria-label="Descendre">
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => startEditing(r)} disabled={saving} aria-label="Modifier">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => void handleDelete(r.id)}
                              disabled={saving}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </IosFixedPageHeaderShell>
  );
}
