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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROFILE_SPORT_RECORD_KEYS,
  PROFILE_SPORT_RECORD_LABELS,
  SPORT_DISTANCES,
  isProfileSportRecordKey,
  type ProfileSportRecordKey,
} from "@/lib/profileSportRecords";
import type { ProfileSportRecordRow } from "@/components/profile/ProfileRecordsDisplay";

type MetricMode = "pace-km" | "pace-100m" | "speed-kmh" | "speed-watts";
type LastEdited = "distance" | "duration" | "metric";

type SportConfig = {
  mode: MetricMode;
  distanceMinKm: number;
  distanceMaxKm: number;
  metricMin: number;
  metricMax: number;
};

const SPORT_CONFIG: Record<ProfileSportRecordKey, SportConfig> = {
  running: { mode: "pace-km", distanceMinKm: 0.06, distanceMaxKm: 300, metricMin: 90, metricMax: 600 },
  walking: { mode: "pace-km", distanceMinKm: 0.06, distanceMaxKm: 300, metricMin: 180, metricMax: 1200 },
  swimming: { mode: "pace-100m", distanceMinKm: 0.05, distanceMaxKm: 20, metricMin: 40, metricMax: 360 },
  cycling: { mode: "speed-kmh", distanceMinKm: 1, distanceMaxKm: 300, metricMin: 5, metricMax: 80 },
  triathlon: { mode: "speed-kmh", distanceMinKm: 1, distanceMaxKm: 300, metricMin: 5, metricMax: 60 },
  other: { mode: "speed-kmh", distanceMinKm: 0.06, distanceMaxKm: 300, metricMin: 1, metricMax: 60 },
};

const DEFAULT_DISTANCE_BY_EVENT: Record<string, number> = {
  "100 m": 0.1,
  "200 m": 0.2,
  "400 m": 0.4,
  "800 m": 0.8,
  "1500 m": 1.5,
  "3000 m": 3,
  "5000 m": 5,
  "10 000 m": 10,
  "50 m": 0.05,
  "100 m nat": 0.1,
  "200 m nat": 0.2,
  "400 m nat": 0.4,
  "Eau libre 5 km": 5,
  "Eau libre 10 km": 10,
  "5 km": 5,
  "10 km": 10,
  "20 km": 20,
  "50 km": 50,
  "100 km": 100,
  "150 km": 150,
  "200 km": 200,
  "Semi-marathon": 21.097,
  "Marathon": 42.195,
  "Sprint": 25,
  "Olympique (M)": 51.5,
  "Half Ironman (70.3)": 113,
  "Ironman": 226,
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function speedFromWatts(watts: number): number {
  // Approximation utilitaire UI pour garder les 3 sliders synchronises.
  return 10 + watts * 0.065;
}

function wattsFromSpeed(speedKmh: number): number {
  return (speedKmh - 10) / 0.065;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDistance(km: number, sport: ProfileSportRecordKey): string {
  if (sport === "swimming" || km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km >= 10 ? 1 : 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} km`;
}

function metricLabel(mode: MetricMode): string {
  if (mode === "pace-km") return "Allure";
  if (mode === "pace-100m") return "Allure nat";
  if (mode === "speed-watts") return "Puissance";
  return "Vitesse";
}

function metricUnit(mode: MetricMode): string {
  if (mode === "pace-km") return "min/km";
  if (mode === "pace-100m") return "min/100m";
  if (mode === "speed-watts") return "W";
  return "km/h";
}

function formatMetric(mode: MetricMode, value: number): string {
  if (mode === "speed-kmh") return `${value.toFixed(1)} km/h`;
  if (mode === "speed-watts") return `${Math.round(value)} W`;
  const suffix = mode === "pace-km" ? "/km" : "/100m";
  return `${formatPace(value)}${suffix}`;
}

function metricFromDistanceDuration(mode: MetricMode, distanceKm: number, durationSec: number): number {
  if (mode === "speed-kmh") return distanceKm / (durationSec / 3600);
  if (mode === "speed-watts") return wattsFromSpeed(distanceKm / (durationSec / 3600));
  if (mode === "pace-100m") return durationSec / (distanceKm * 10);
  return durationSec / distanceKm;
}

function durationFromDistanceMetric(mode: MetricMode, distanceKm: number, metric: number): number {
  if (mode === "speed-kmh") return (distanceKm / metric) * 3600;
  if (mode === "speed-watts") return (distanceKm / speedFromWatts(metric)) * 3600;
  if (mode === "pace-100m") return metric * distanceKm * 10;
  return metric * distanceKm;
}

function distanceFromDurationMetric(mode: MetricMode, durationSec: number, metric: number): number {
  if (mode === "speed-kmh") return (durationSec / 3600) * metric;
  if (mode === "speed-watts") return (durationSec / 3600) * speedFromWatts(metric);
  if (mode === "pace-100m") return durationSec / (metric * 10);
  return durationSec / metric;
}

function defaultDistanceFromEvent(sport: ProfileSportRecordKey, event: string): number {
  if (!event.trim()) return sport === "swimming" ? 1 : 5;
  if (DEFAULT_DISTANCE_BY_EVENT[event] !== undefined) return DEFAULT_DISTANCE_BY_EVENT[event];
  if (sport === "swimming") {
    const m = event.match(/(\d+)\s*m/i);
    if (m) return Number(m[1]) / 1000;
  }
  const km = event.match(/(\d+(?:[\.,]\d+)?)\s*km/i);
  if (km) return Number(km[1].replace(",", "."));
  return sport === "swimming" ? 1 : 5;
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
  const [cyclingMetricKind, setCyclingMetricKind] = useState<"kmh" | "watts">("kmh");

  const [distanceKm, setDistanceKm] = useState(5);
  const [durationSec, setDurationSec] = useState(17 * 60 + 30);
  const [metricValue, setMetricValue] = useState(210);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEventLabel, setEditingEventLabel] = useState("");
  const [editingRecordValue, setEditingRecordValue] = useState("");

  const cfg = useMemo(() => {
    const base = SPORT_CONFIG[sportKey];
    if (sportKey !== "cycling") return base;
    if (cyclingMetricKind === "watts") {
      return { ...base, mode: "speed-watts" as const, metricMin: 80, metricMax: 650 };
    }
    return { ...base, mode: "speed-kmh" as const, metricMin: 5, metricMax: 80 };
  }, [sportKey, cyclingMetricKind]);

  const recompute = useCallback(
    (lastEdited: LastEdited, nextDistance = distanceKm, nextDuration = durationSec, nextMetric = metricValue) => {
      const clampedDistance = clamp(nextDistance, cfg.distanceMinKm, cfg.distanceMaxKm);
      let resolvedDistance = clampedDistance;
      let resolvedDuration = nextDuration;
      let resolvedMetric = nextMetric;

      if (lastEdited === "distance" || lastEdited === "metric") {
        resolvedDuration = durationFromDistanceMetric(cfg.mode, resolvedDistance, resolvedMetric);
      } else if (lastEdited === "duration") {
        resolvedMetric = metricFromDistanceDuration(cfg.mode, resolvedDistance, resolvedDuration);
      }

      if (lastEdited === "duration") {
        resolvedDistance = distanceFromDurationMetric(cfg.mode, resolvedDuration, resolvedMetric);
      }

      resolvedDistance = clamp(resolvedDistance, cfg.distanceMinKm, cfg.distanceMaxKm);
      resolvedDuration = Math.max(30, Math.min(48 * 3600, resolvedDuration));
      resolvedMetric = clamp(resolvedMetric, cfg.metricMin, cfg.metricMax);

      setDistanceKm(resolvedDistance);
      setDurationSec(resolvedDuration);
      setMetricValue(resolvedMetric);
    },
    [cfg, distanceKm, durationSec, metricValue],
  );

  useEffect(() => {
    const baseDistance = clamp(defaultDistanceFromEvent(sportKey, eventLabel), cfg.distanceMinKm, cfg.distanceMaxKm);
    const baseMetric = clamp(metricValue, cfg.metricMin, cfg.metricMax);
    setDistanceKm(baseDistance);
    setMetricValue(baseMetric);
    setDurationSec(durationFromDistanceMetric(cfg.mode, baseDistance, baseMetric));
  }, [sportKey, eventLabel, cfg.distanceMinKm, cfg.distanceMaxKm, cfg.metricMin, cfg.metricMax, cfg.mode]);

  const recordValue = useMemo(() => {
    return `${formatDuration(durationSec)} ? ${formatDistance(distanceKm, sportKey)} ? ${formatMetric(cfg.mode, metricValue)}`;
  }, [durationSec, distanceKm, sportKey, cfg.mode, metricValue]);

  const canAdd = eventLabel.trim() !== "" && durationSec > 0;

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
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger vos records.", variant: "destructive" });
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

  const handleAdd = async () => {
    if (!user?.id || !canAdd) return;
    setSaving(true);
    try {
      const nextOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
      const { data, error } = await (supabase as any)
        .from("profile_sport_records")
        .insert({
          user_id: user.id,
          sport_key: sportKey,
          event_label: eventLabel.trim(),
          record_value: recordValue,
          sort_order: nextOrder,
        })
        .select("id, sport_key, event_label, record_value, sort_order")
        .single();
      if (error) throw error;
      setRows((prev) => [...prev, data as ProfileSportRecordRow]);
      setEventLabel("");
      setCustomMode(false);
      toast({ title: "Record ajouté" });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter le record.", variant: "destructive" });
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
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
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
      toast({ title: "Champs requis", variant: "destructive" });
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
      setRows((prev) => prev.map((r) => (r.id === editingId ? { ...r, event_label: ev, record_value: rv } : r)));
      cancelEditing();
      toast({ title: "Record modifié" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de modifier.", variant: "destructive" });
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
    [nextRows[currentIndex], nextRows[targetIndex]] = [nextRows[targetIndex], nextRows[currentIndex]];
    setRows(nextRows.map((r, idx) => ({ ...r, sort_order: idx })));
    setSaving(true);
    try {
      const updates = nextRows.map((r, idx) =>
        (supabase as any).from("profile_sport_records").update({ sort_order: idx }).eq("id", r.id).eq("user_id", user.id),
      );
      const results = await Promise.all(updates);
      if (results.find((res) => res.error)?.error) throw results.find((res) => res.error)!.error;
    } catch {
      toast({ title: "Erreur", description: "Impossible de réordonner.", variant: "destructive" });
      void load();
    } finally {
      setSaving(false);
    }
  };

  const metricSliderValue = useMemo(() => {
    const ratio = (metricValue - cfg.metricMin) / (cfg.metricMax - cfg.metricMin);
    if (cfg.mode === "speed-kmh") return ratio * 100;
    return (1 - ratio) * 100;
  }, [metricValue, cfg]);

  const metricLeftLabel = cfg.mode === "speed-kmh" ? `${cfg.metricMin} ${metricUnit(cfg.mode)}` : `${formatPace(cfg.metricMax)} ${metricUnit(cfg.mode)}`;
  const metricRightLabel = cfg.mode === "speed-kmh" ? `${cfg.metricMax} ${metricUnit(cfg.mode)}` : `${formatPace(cfg.metricMin)} ${metricUnit(cfg.mode)}`;

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
            title="Planifier un record"
          />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden py-5">
          <p className="px-4 text-ios-subheadline text-muted-foreground ios-shell:px-2.5">
            Règle les 3 stats (temps, distance, allure/vitesse). Elles se recalculent automatiquement selon le sport.
          </p>

          <div className="bg-card">
            <div className="space-y-0 divide-y divide-border/50">
              <div className="flex items-center justify-between px-4 py-3 ios-shell:px-2.5">
                <span className="text-[15px] text-muted-foreground">Sport</span>
                <Select
                  value={sportKey}
                  onValueChange={(v) => {
                    setSportKey(v as ProfileSportRecordKey);
                    setEventLabel("");
                    setCustomMode(false);
                    setCyclingMetricKind("kmh");
                  }}
                >
                  <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-[17px] font-medium text-foreground shadow-none [&>svg]:ml-1">
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

              <div className="flex items-center justify-between px-4 py-3 ios-shell:px-2.5">
                <span className="text-[15px] text-muted-foreground">Epreuve</span>
                {SPORT_DISTANCES[sportKey].length > 0 && !customMode ? (
                  <Select
                    value={SPORT_DISTANCES[sportKey].includes(eventLabel) ? eventLabel : ""}
                    onValueChange={(v) => {
                      if (v === "__custom") {
                        setCustomMode(true);
                        setEventLabel("");
                      } else {
                        setEventLabel(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-auto w-auto max-w-[220px] border-0 bg-transparent p-0 text-right text-[17px] font-medium text-foreground shadow-none [&>svg]:ml-1">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_DISTANCES[sportKey].map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom">Autre...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={eventLabel}
                      onChange={(e) => setEventLabel(e.target.value)}
                      placeholder="Nom de l'epreuve"
                      className="h-8 w-44 border-0 bg-transparent p-0 text-right text-[17px] font-medium shadow-none placeholder:text-muted-foreground/40"
                    />
                    {customMode && SPORT_DISTANCES[sportKey].length > 0 && (
                      <button className="text-xs text-primary" onClick={() => { setCustomMode(false); setEventLabel(""); }}>
                        Liste
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {eventLabel.trim() !== "" && (
            <>
              {sportKey === "cycling" && (
                <div className="px-4 ios-shell:px-2.5">
                  <div className="inline-flex rounded-xl border border-border bg-card p-1">
                    <button
                      type="button"
                      onClick={() => setCyclingMetricKind("kmh")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cyclingMetricKind === "kmh" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      km/h
                    </button>
                    <button
                      type="button"
                      onClick={() => setCyclingMetricKind("watts")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${cyclingMetricKind === "watts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      Watts
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 px-4 ios-shell:px-2.5">
                <div className="rounded-xl border border-border/50 bg-gradient-to-b from-card to-secondary/20 p-3 text-center shadow-sm">
                  <p className="text-[11px] text-muted-foreground">Temps</p>
                  <p className="font-mono text-[17px] font-semibold text-primary">{formatDuration(durationSec)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-gradient-to-b from-card to-secondary/20 p-3 text-center shadow-sm">
                  <p className="text-[11px] text-muted-foreground">Kilometrage</p>
                  <p className="font-mono text-[17px] font-semibold text-primary">{formatDistance(distanceKm, sportKey)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-gradient-to-b from-card to-secondary/20 p-3 text-center shadow-sm">
                  <p className="text-[11px] text-muted-foreground">{metricLabel(cfg.mode)}</p>
                  <p className="font-mono text-[17px] font-semibold text-primary">{formatMetric(cfg.mode, metricValue)}</p>
                </div>
              </div>

              <div className="space-y-3 bg-card px-4 py-4 ios-shell:px-2.5">
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="font-mono text-foreground">{formatDistance(distanceKm, sportKey)}</span>
                  </div>
                  <input
                    type="range"
                    min={cfg.distanceMinKm}
                    max={cfg.distanceMaxKm}
                    step={0.01}
                    value={distanceKm}
                    onChange={(e) => recompute("distance", Number(e.target.value), durationSec, metricValue)}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatDistance(cfg.distanceMinKm, sportKey)}</span>
                    <span>{formatDistance(cfg.distanceMaxKm, sportKey)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">Temps</span>
                    <span className="font-mono text-foreground">{formatDuration(durationSec)}</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={48 * 3600}
                    step={5}
                    value={durationSec}
                    onChange={(e) => recompute("duration", distanceKm, Number(e.target.value), metricValue)}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>0:30</span>
                    <span>48:00:00</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="mb-2 flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground">{metricLabel(cfg.mode)}</span>
                    <span className="font-mono text-foreground">{formatMetric(cfg.mode, metricValue)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={metricSliderValue}
                    onChange={(e) => {
                      const slider = Number(e.target.value) / 100;
                      const ratio = cfg.mode === "speed-kmh" ? slider : 1 - slider;
                      const nextMetric = cfg.metricMin + ratio * (cfg.metricMax - cfg.metricMin);
                      recompute("metric", distanceKm, durationSec, nextMetric);
                    }}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{metricLeftLabel}</span>
                    <span>{metricRightLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Gauche = plus lent, droite = plus rapide.</p>
                </div>
              </div>
            </>
          )}

          <div className="px-4 ios-shell:px-2.5">
            <Button className="h-12 w-full rounded-xl text-[17px] font-semibold" onClick={() => void handleAdd()} disabled={saving || !canAdd}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Ajouter le record
            </Button>
          </div>

          <div>
            <h3 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ios-shell:px-2.5">Mes records</h3>
            <div className="bg-card">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <p className="px-4 py-8 text-center text-ios-subheadline text-muted-foreground ios-shell:px-2.5">Aucun record pour l'instant.</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {rows.map((r, index) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-3 px-4 py-3 ios-shell:px-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-ios-caption1 text-muted-foreground">{isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}</p>
                        {editingId === r.id ? (
                          <div className="mt-1 space-y-2">
                            <Input value={editingEventLabel} onChange={(e) => setEditingEventLabel(e.target.value)} className="h-9 rounded-ios-sm" />
                            <Input value={editingRecordValue} onChange={(e) => setEditingRecordValue(e.target.value)} className="h-9 rounded-ios-sm font-mono" />
                          </div>
                        ) : (
                          <>
                            <p className="truncate text-ios-body font-medium text-foreground">{r.event_label}</p>
                            <p className="font-mono text-ios-subheadline text-primary tabular-nums">{r.record_value}</p>
                          </>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {editingId === r.id ? (
                          <>
                            <Button type="button" variant="ghost" size="icon" onClick={() => void saveEdit()} disabled={saving}><Check className="h-5 w-5 text-primary" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={cancelEditing} disabled={saving}><X className="h-5 w-5" /></Button>
                          </>
                        ) : (
                          <>
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveRecord(r.id, "up")} disabled={saving || index === 0}><ArrowUp className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => moveRecord(r.id, "down")} disabled={saving || index === rows.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => startEditing(r)} disabled={saving}><Pencil className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(r.id)} disabled={saving}><Trash2 className="h-5 w-5" /></Button>
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