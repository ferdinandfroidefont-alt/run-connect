import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, Bike, Check, Footprints, Loader2, Plus, Trash2, Waves, Zap, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import {
  PROFILE_SPORT_RECORD_KEYS,
  PROFILE_SPORT_RECORD_LABELS,
  isProfileSportRecordKey,
  type ProfileSportRecordKey,
} from "@/lib/profileSportRecords";
import type { ProfileSportRecordRow } from "@/components/profile/ProfileRecordsDisplay";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";
import { kmToMiles, milesToKm } from "@/lib/distanceUnits";

type WizardStep = 1 | 2 | 3 | 4;
type RunningMode = "time" | "pace";
type CyclingMode = "speed" | "watts";

const STEP_LABELS = ["Sport", "Distance", "Performance", "Récap"];

const DISTANCE_PRESETS: Array<{ id: string; label: string; km: number | null }> = [
  { id: "5k", label: "5 km", km: 5 },
  { id: "10k", label: "10 km", km: 10 },
  { id: "semi", label: "Semi-marathon", km: 21.097 },
  { id: "marathon", label: "Marathon", km: 42.195 },
  { id: "custom", label: "Autre", km: null },
];

const SPORT_ICONS: Record<ProfileSportRecordKey, LucideIcon> = {
  running: Activity,
  walking: Footprints,
  cycling: Bike,
  swimming: Waves,
  triathlon: Zap,
  other: Plus,
};

function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function parseDurationToSec(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => Number.parseInt(p, 10));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function formatDistanceByUnit(km: number, unit: "km" | "mi"): string {
  const v = unit === "mi" ? kmToMiles(km) : km;
  const suffix = unit === "mi" ? "mi" : "km";
  return `${v.toFixed(v >= 10 ? 1 : 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} ${suffix}`;
}

function paceSecPerKmFromDuration(distanceKm: number, durationSec: number): number {
  return durationSec / Math.max(0.001, distanceKm);
}

function durationSecFromPace(distanceKm: number, paceSecPerKm: number): number {
  return Math.round(distanceKm * paceSecPerKm);
}

function speedKmhFromDuration(distanceKm: number, durationSec: number): number {
  return distanceKm / Math.max(1 / 3600, durationSec / 3600);
}

function durationSecFromSpeed(distanceKm: number, kmh: number): number {
  return Math.round((distanceKm / Math.max(0.1, kmh)) * 3600);
}

function speedFromWatts(watts: number): number {
  return 10 + watts * 0.065;
}

export default function ProfileSportRecordsEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { unit } = useDistanceUnits();

  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState<WizardStep>(1);
  const [sportKey, setSportKey] = useState<ProfileSportRecordKey>("running");
  const [presetId, setPresetId] = useState<string>("5k");
  const [distanceKm, setDistanceKm] = useState(5);
  const [eventLabel, setEventLabel] = useState("5 km");

  const [runningMode, setRunningMode] = useState<RunningMode>("time");
  const [cyclingMode, setCyclingMode] = useState<CyclingMode>("speed");
  const [durationSec, setDurationSec] = useState(25 * 60);
  const [paceSecPerKm, setPaceSecPerKm] = useState(5 * 60);
  const [speedKmh, setSpeedKmh] = useState(25);
  const [watts, setWatts] = useState(220);

  const [customDistanceOpen, setCustomDistanceOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [pacePickerOpen, setPacePickerOpen] = useState(false);
  const [speedPickerOpen, setSpeedPickerOpen] = useState(false);
  const [wattsPickerOpen, setWattsPickerOpen] = useState(false);

  const [customDistanceWhole, setCustomDistanceWhole] = useState("5");
  const [customDistanceDec, setCustomDistanceDec] = useState("0");
  const [durH, setDurH] = useState("0");
  const [durM, setDurM] = useState("25");
  const [durS, setDurS] = useState("0");
  const [paceM, setPaceM] = useState("5");
  const [paceS, setPaceS] = useState("0");
  const [speedWhole, setSpeedWhole] = useState("25");
  const [speedDec, setSpeedDec] = useState("0");
  const [wattsDraft, setWattsDraft] = useState("220");

  const openDurationPicker = () => {
    const h = Math.floor(durationSec / 3600);
    const m = Math.floor((durationSec % 3600) / 60);
    const s = durationSec % 60;
    setDurH(String(h));
    setDurM(String(m));
    setDurS(String(s));
    setDurationPickerOpen(true);
  };

  const openPacePicker = () => {
    setPaceM(String(Math.floor(paceSecPerKm / 60)));
    setPaceS(String(paceSecPerKm % 60));
    setPacePickerOpen(true);
  };

  const openSpeedPicker = () => {
    const whole = Math.floor(speedKmh);
    const dec = Math.round((speedKmh - whole) * 10);
    setSpeedWhole(String(whole));
    setSpeedDec(String(dec));
    setSpeedPickerOpen(true);
  };

  const openWattsPicker = () => {
    setWattsDraft(String(Math.round(watts)));
    setWattsPickerOpen(true);
  };

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

  useEffect(() => {
    const runningLike = sportKey === "running" || sportKey === "walking" || sportKey === "swimming";
    if (runningLike && runningMode === "time") {
      setPaceSecPerKm(paceSecPerKmFromDuration(distanceKm, durationSec));
    }
    if (runningLike && runningMode === "pace") {
      setDurationSec(durationSecFromPace(distanceKm, paceSecPerKm));
    }
    if (!runningLike && cyclingMode === "speed") {
      setDurationSec(durationSecFromSpeed(distanceKm, speedKmh));
      setWatts(Math.round((speedKmh - 10) / 0.065));
    }
    if (!runningLike && cyclingMode === "watts") {
      const computedSpeed = speedFromWatts(watts);
      setSpeedKmh(computedSpeed);
      setDurationSec(durationSecFromSpeed(distanceKm, computedSpeed));
    }
  }, [distanceKm, sportKey, runningMode, cyclingMode, paceSecPerKm, speedKmh, watts]);

  const recordValue = useMemo(() => {
    const distText = formatDistanceByUnit(distanceKm, unit);
    if (sportKey === "running" || sportKey === "walking") {
      return `${formatDuration(durationSec)} - ${distText} - ${Math.floor(paceSecPerKm / 60)}:${String(paceSecPerKm % 60).padStart(2, "0")}/km`;
    }
    if (sportKey === "swimming") {
      return `${formatDuration(durationSec)} - ${distText} - ${Math.floor(paceSecPerKm / 60)}:${String(paceSecPerKm % 60).padStart(2, "0")}/100m`;
    }
    const perf = cyclingMode === "watts" ? `${Math.round(watts)} W` : `${speedKmh.toFixed(1)} km/h`;
    return `${formatDuration(durationSec)} - ${distText} - ${perf}`;
  }, [distanceKm, durationSec, paceSecPerKm, speedKmh, watts, sportKey, unit, cyclingMode]);

  const canContinueStep2 = eventLabel.trim().length > 0 && distanceKm > 0;
  const canContinueStep3 = durationSec > 0;

  const resetWizard = () => {
    setStep(1);
    setSportKey("running");
    setPresetId("5k");
    setDistanceKm(5);
    setEventLabel("5 km");
    setRunningMode("time");
    setCyclingMode("speed");
    setDurationSec(25 * 60);
    setPaceSecPerKm(5 * 60);
    setSpeedKmh(25);
    setWatts(220);
  };

  const handleSelectPreset = (id: string, label: string, km: number | null) => {
    setPresetId(id);
    if (km == null) {
      setCustomDistanceWhole(String(Math.floor(distanceKm)));
      setCustomDistanceDec(String(Math.round((distanceKm % 1) * 10)));
      setCustomDistanceOpen(true);
      return;
    }
    const converted = unit === "mi" ? kmToMiles(km) : km;
    setDistanceKm(unit === "mi" ? milesToKm(converted) : converted);
    setEventLabel(label);
  };

  const handleAdd = async () => {
    if (!user?.id) return;
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
      window.dispatchEvent(new Event("profile-records-updated"));
      toast({ title: "Record ajouté" });
      resetWizard();
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
      window.dispatchEvent(new Event("profile-records-updated"));
      toast({ title: "Record supprimé" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const distanceWholeOpts = Array.from({ length: 201 }, (_, i) => ({ value: String(i), label: String(i) }));
  const digitOpts = Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: String(i) }));
  const hourOpts = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") }));
  const minSecOpts = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i).padStart(2, "0") }));
  const speedWholeOpts = Array.from({ length: 101 }, (_, i) => ({ value: String(i), label: String(i) }));
  const wattsOpts = Array.from({ length: 571 }, (_, i) => ({ value: String(i + 80), label: String(i + 80) }));

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
            title="Créer un record"
          />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="space-y-4 px-4 py-5 ios-shell:px-2.5">
          <div className="rounded-2xl bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Progression</span>
              <span>{step}/4</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {STEP_LABELS.map((label, i) => {
                const idx = (i + 1) as WizardStep;
                const active = idx === step;
                const done = idx < step;
                return (
                  <div key={label} className={`rounded-lg px-2 py-2 text-center text-[11px] ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {step === 1 && (
            <div className="rounded-2xl bg-card p-4">
              <h2 className="text-[20px] font-semibold text-foreground">Choisis ton sport</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Une seule sélection, puis suivant.</p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {PROFILE_SPORT_RECORD_KEYS.map((k) => {
                  const SportIcon = SPORT_ICONS[k];
                  return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSportKey(k)}
                    className={`rounded-2xl border px-3 py-4 text-left ${sportKey === k ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
                  >
                    <SportIcon className="h-6 w-6 text-primary" />
                    <p className="mt-1 text-[14px] font-semibold text-foreground">{PROFILE_SPORT_RECORD_LABELS[k]}</p>
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl bg-card p-4">
              <h2 className="text-[20px] font-semibold text-foreground">Distance / épreuve</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Format guidé, rapide à une main.</p>
              <div className="mt-4 space-y-2">
                {DISTANCE_PRESETS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectPreset(d.id, d.label, d.km)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-[16px] font-semibold ${presetId === d.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/30 text-foreground"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-border/60 bg-secondary/40 p-3">
                <p className="text-xs text-muted-foreground">Distance sélectionnée</p>
                <p className="text-[17px] font-semibold text-foreground">{formatDistanceByUnit(distanceKm, unit)}</p>
                <Input
                  value={eventLabel}
                  onChange={(e) => setEventLabel(e.target.value)}
                  placeholder="Nom de lépreuve"
                  className="mt-2 h-10"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl bg-card p-4">
              <h2 className="text-[20px] font-semibold text-foreground">Performance</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Sélection précise via roulettes verticales.</p>

              {(sportKey === "running" || sportKey === "walking" || sportKey === "swimming") && (
                <div className="mt-4 space-y-3">
                  <div className="inline-flex rounded-xl border border-border bg-secondary/30 p-1">
                    <button type="button" onClick={() => setRunningMode("time")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${runningMode === "time" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Temps</button>
                    <button type="button" onClick={() => setRunningMode("pace")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${runningMode === "pace" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Allure</button>
                  </div>

                  <button type="button" onClick={openDurationPicker} className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">Temps</p>
                    <p className="text-[20px] font-semibold text-foreground">{formatDuration(durationSec)}</p>
                  </button>
                  <button type="button" onClick={openPacePicker} className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">{sportKey === "swimming" ? "Allure /100m" : "Allure /km"}</p>
                    <p className="text-[20px] font-semibold text-foreground">{Math.floor(paceSecPerKm / 60)}:{String(paceSecPerKm % 60).padStart(2, "0")}</p>
                  </button>
                </div>
              )}

              {(sportKey === "cycling" || sportKey === "triathlon" || sportKey === "other") && (
                <div className="mt-4 space-y-3">
                  <div className="inline-flex rounded-xl border border-border bg-secondary/30 p-1">
                    <button type="button" onClick={() => setCyclingMode("speed")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cyclingMode === "speed" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Vitesse</button>
                    <button type="button" onClick={() => setCyclingMode("watts")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${cyclingMode === "watts" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Puissance</button>
                  </div>

                  <button type="button" onClick={openDurationPicker} className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left">
                    <p className="text-xs text-muted-foreground">Temps</p>
                    <p className="text-[20px] font-semibold text-foreground">{formatDuration(durationSec)}</p>
                  </button>

                  {cyclingMode === "speed" ? (
                    <button type="button" onClick={openSpeedPicker} className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left">
                      <p className="text-xs text-muted-foreground">Vitesse moyenne</p>
                      <p className="text-[20px] font-semibold text-foreground">{speedKmh.toFixed(1)} km/h</p>
                    </button>
                  ) : (
                    <button type="button" onClick={openWattsPicker} className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-left">
                      <p className="text-xs text-muted-foreground">Puissance moyenne</p>
                      <p className="text-[20px] font-semibold text-foreground">{Math.round(watts)} W</p>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="rounded-2xl bg-card p-4">
              <h2 className="text-[20px] font-semibold text-foreground">Récapitulatif</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">Vérifie puis confirme ton record.</p>
              <div className="mt-4 space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Sport</span><span className="font-semibold text-foreground">{PROFILE_SPORT_RECORD_LABELS[sportKey]}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Épreuve</span><span className="font-semibold text-foreground">{eventLabel}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Distance</span><span className="font-semibold text-foreground">{formatDistanceByUnit(distanceKm, unit)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Performance</span><span className="font-semibold text-primary">{recordValue}</span></div>
              </div>
              <Button className="mt-4 h-12 w-full rounded-xl text-[17px] font-semibold" onClick={() => void handleAdd()} disabled={saving}>
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-5 w-5" />Confirmer le record</>}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="h-11 flex-1" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1) as WizardStep)}>Retour</Button>
            <Button className="h-11 flex-1" disabled={(step === 2 && !canContinueStep2) || (step === 3 && !canContinueStep3) || step === 4} onClick={() => setStep((s) => Math.min(4, s + 1) as WizardStep)}>
              Suivant
            </Button>
          </div>

          <div className="rounded-2xl bg-card p-4">
            <h3 className="mb-3 text-[14px] font-semibold uppercase tracking-wide text-muted-foreground">Mes records</h3>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-ios-subheadline text-muted-foreground">Aucun record pour l'instant.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-ios-caption1 text-muted-foreground">{isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}</p>
                      <p className="truncate text-ios-body font-medium text-foreground">{r.event_label}</p>
                      <p className="font-mono text-ios-subheadline text-primary tabular-nums">{r.record_value}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => void handleDelete(r.id)} disabled={saving}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ScrollArea>

      <WheelValuePickerModal
        open={customDistanceOpen}
        onClose={() => setCustomDistanceOpen(false)}
        title={`Distance (${unit})`}
        columns={[
          { items: distanceWholeOpts, value: customDistanceWhole, onChange: setCustomDistanceWhole },
          { items: digitOpts, value: customDistanceDec, onChange: setCustomDistanceDec },
        ]}
        onConfirm={() => {
          const val = Number(`${customDistanceWhole}.${customDistanceDec}`);
          const km = unit === "mi" ? milesToKm(val) : val;
          setDistanceKm(Math.max(0.1, km));
          setEventLabel(`Autre (${val.toFixed(1)} ${unit})`);
          setCustomDistanceOpen(false);
        }}
      />
      <WheelValuePickerModal
        open={durationPickerOpen}
        onClose={() => setDurationPickerOpen(false)}
        title="Temps"
        columns={[
          { items: hourOpts, value: durH, onChange: setDurH, suffix: "h" },
          { items: minSecOpts, value: durM, onChange: setDurM, suffix: "min" },
          { items: minSecOpts, value: durS, onChange: setDurS, suffix: "s" },
        ]}
        onConfirm={() => {
          const sec = Number(durH) * 3600 + Number(durM) * 60 + Number(durS);
          setRunningMode("time");
          setDurationSec(Math.max(1, sec));
          setDurationPickerOpen(false);
        }}
      />
      <WheelValuePickerModal
        open={pacePickerOpen}
        onClose={() => setPacePickerOpen(false)}
        title={sportKey === "swimming" ? "Allure /100m" : "Allure /km"}
        columns={[
          { items: minSecOpts, value: paceM, onChange: setPaceM, suffix: "min" },
          { items: minSecOpts, value: paceS, onChange: setPaceS, suffix: "s" },
        ]}
        onConfirm={() => {
          setRunningMode("pace");
          setPaceSecPerKm(Number(paceM) * 60 + Number(paceS));
          setPacePickerOpen(false);
        }}
      />
      <WheelValuePickerModal
        open={speedPickerOpen}
        onClose={() => setSpeedPickerOpen(false)}
        title="Vitesse moyenne"
        columns={[
          { items: speedWholeOpts, value: speedWhole, onChange: setSpeedWhole },
          { items: digitOpts, value: speedDec, onChange: setSpeedDec },
        ]}
        onConfirm={() => {
          setSpeedKmh(Number(`${speedWhole}.${speedDec}`));
          setSpeedPickerOpen(false);
        }}
      />
      <WheelValuePickerModal
        open={wattsPickerOpen}
        onClose={() => setWattsPickerOpen(false)}
        title="Puissance moyenne"
        columns={[{ items: wattsOpts, value: wattsDraft, onChange: setWattsDraft, suffix: "W" }]}
        onConfirm={() => {
          setWatts(Number(wattsDraft));
          setWattsPickerOpen(false);
        }}
      />
    </IosFixedPageHeaderShell>
  );
}