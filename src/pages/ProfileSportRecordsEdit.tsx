import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { IosFixedPageHeaderShell } from "@/components/layout/IosFixedPageHeaderShell";
import { IosPageHeaderBar } from "@/components/layout/IosPageHeaderBar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WheelValuePickerModal } from "@/components/ui/ios-wheel-picker";
import { PROFILE_SPORT_RECORD_LABELS, isProfileSportRecordKey, type ProfileSportRecordKey } from "@/lib/profileSportRecords";
import type { ProfileSportRecordRow } from "@/components/profile/ProfileRecordsDisplay";
import { useDistanceUnits } from "@/contexts/DistanceUnitsContext";
import { kmToMiles, milesToKm } from "@/lib/distanceUnits";
import { cn } from "@/lib/utils";

/** Maquette 21 · RunConnect accent & surfaces */
const RC = {
  primary: "#0066cc",
  canvas: "#ffffff",
  parchment: "#f5f5f7",
  ink: "#1d1d1f",
  muted: "#7a7a7a",
  hairline: "#e0e0e0",
} as const;

const DISTANCE_CHIPS: Array<{ id: string; label: string; km: number | null }> = [
  { id: "1k", label: "1 km", km: 1 },
  { id: "5k", label: "5 km", km: 5 },
  { id: "10k", label: "10 km", km: 10 },
  { id: "semi", label: "Semi", km: 21.097 },
  { id: "marathon", label: "Marathon", km: 42.195 },
  { id: "custom", label: "Autre", km: null },
];

const PRIMARY_SPORT_ORDER: ProfileSportRecordKey[] = ["running", "cycling", "swimming", "walking"];
const EXTRA_SPORTS: ProfileSportRecordKey[] = ["triathlon", "other"];

const SPORT_EMOJI_BADGE: Record<ProfileSportRecordKey, { emoji: string; bg: string }> = {
  running: { emoji: "🏃", bg: "#007AFF" },
  cycling: { emoji: "🚴", bg: "#FF3B30" },
  swimming: { emoji: "🏊", bg: "#5AC8FA" },
  walking: { emoji: "🚶", bg: "#34C759" },
  triathlon: { emoji: "🔱", bg: "#AF52DE" },
  other: { emoji: "➕", bg: "#8E8E93" },
};

function formatDurationParts(totalSec: number): { h: string; m: string; s: string } {
  const safe = Math.max(0, Math.round(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
  };
}

function formatDuration(totalSec: number): string {
  const { h, m, s } = formatDurationParts(totalSec);
  const hi = Number(h);
  return hi > 0 ? `${hi}:${m}:${s}` : `${Number(m)}:${s}`;
}

function paceSecPerKmFromDuration(distanceKm: number, durationSec: number): number {
  return durationSec / Math.max(0.001, distanceKm);
}

function speedKmhFromDuration(distanceKm: number, durationSec: number): number {
  return distanceKm / Math.max(1 / 3600, durationSec / 3600);
}

function durationSecFromSpeed(distanceKm: number, kmh: number): number {
  return Math.round((distanceKm / Math.max(0.1, kmh)) * 3600);
}

function formatPaceDisplay(seconds: number, suffix: "/km" | "/100m"): string {
  const safe = Math.max(0, Math.round(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}'${String(ss).padStart(2, "0")}''${suffix}`;
}

function formatDistanceByUnit(km: number, unit: "km" | "mi"): string {
  const v = unit === "mi" ? kmToMiles(km) : km;
  const suffix = unit === "mi" ? "mi" : "km";
  return `${v.toFixed(v >= 10 ? 1 : 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")} ${suffix}`;
}

function parseDurationPartsFromRecordHeader(timeStr: string): number {
  const parts = timeStr.split(":").map((p) => parseInt(p.trim(), 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/** Reprend temps + distance depuis `record_value` (format émis par cet écran). */
function parseStoredRecordDistanceAndDuration(recordValue: string): { durationSec: number; distanceKm: number } | null {
  const parts = recordValue.split(" - ").map((s) => s.trim());
  if (parts.length < 2) return null;
  const dur = parseDurationPartsFromRecordHeader(parts[0]);
  const dm = parts[1].match(/^([\d.]+)\s*(km|mi)$/i);
  if (!dm) return null;
  const n = Number(dm[1]);
  const u = dm[2].toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return null;
  const km = u === "mi" ? milesToKm(n) : n;
  if (dur <= 0 || km <= 0) return null;
  return { durationSec: dur, distanceKm: km };
}

function presetIdForDistanceKm(km: number): string {
  for (const d of DISTANCE_CHIPS) {
    if (d.km != null && Math.abs(d.km - km) < 0.02) return d.id;
  }
  return "custom";
}

export default function ProfileSportRecordsEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { unit } = useDistanceUnits();

  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sportKey, setSportKey] = useState<ProfileSportRecordKey>("running");
  const [presetId, setPresetId] = useState<string>("10k");
  const [distanceKm, setDistanceKm] = useState(10);
  const [eventLabel, setEventLabel] = useState("10 km");

  const [durationSec, setDurationSec] = useState(41 * 60 + 18);
  const [paceSecPerKm, setPaceSecPerKm] = useState(5 * 60);

  const [customDistanceOpen, setCustomDistanceOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  const [speedPickerOpen, setSpeedPickerOpen] = useState(false);

  const [customDistanceWhole, setCustomDistanceWhole] = useState("5");
  const [customDistanceDec, setCustomDistanceDec] = useState("0");
  const [durH, setDurH] = useState("0");
  const [durM, setDurM] = useState("41");
  const [durS, setDurS] = useState("18");
  const [speedWhole, setSpeedWhole] = useState("25");
  const [speedDec, setSpeedDec] = useState("0");

  /** Ligne liste en cours d’édition (OK envoie un UPDATE par id). */
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

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

  const runningLike = sportKey === "running" || sportKey === "walking" || sportKey === "swimming";

  useEffect(() => {
    if (runningLike) {
      setPaceSecPerKm(paceSecPerKmFromDuration(distanceKm, durationSec));
    }
  }, [distanceKm, durationSec, runningLike]);

  const speedKmh = useMemo(
    () => (runningLike ? 0 : speedKmhFromDuration(distanceKm, durationSec)),
    [runningLike, distanceKm, durationSec],
  );

  const recordValue = useMemo(() => {
    const distText = formatDistanceByUnit(distanceKm, unit);
    if (sportKey === "running" || sportKey === "walking") {
      return `${formatDuration(durationSec)} - ${distText} - ${formatPaceDisplay(paceSecPerKm, "/km")}`;
    }
    if (sportKey === "swimming") {
      return `${formatDuration(durationSec)} - ${distText} - ${formatPaceDisplay(paceSecPerKm, "/100m")}`;
    }
    return `${formatDuration(durationSec)} - ${distText} - ${speedKmh.toFixed(1)} km/h`;
  }, [distanceKm, durationSec, paceSecPerKm, speedKmh, sportKey, unit]);

  const performanceLineLabel =
    sportKey === "swimming" ? "Allure /100m" : sportKey === "running" || sportKey === "walking" ? "Allure calculée" : "Vitesse moyenne";

  const performanceLineValue =
    sportKey === "swimming"
      ? formatPaceDisplay(paceSecPerKm, "/100m")
      : sportKey === "running" || sportKey === "walking"
        ? formatPaceDisplay(paceSecPerKm, "/km")
        : `${speedKmh.toFixed(1)} km/h`;

  const showNewPrBadge = useMemo(() => {
    if (editingRowId) return false;
    const label = eventLabel.trim().toLowerCase();
    return !rows.some((r) => r.sport_key === sportKey && r.event_label.trim().toLowerCase() === label);
  }, [rows, sportKey, eventLabel, editingRowId]);

  const loadRowForEdit = useCallback((r: ProfileSportRecordRow) => {
    const sk = r.sport_key;
    setSportKey(isProfileSportRecordKey(sk) ? sk : "other");
    setEditingRowId(r.id);
    setEventLabel(r.event_label);
    const parsed = parseStoredRecordDistanceAndDuration(r.record_value);
    if (parsed) {
      setDistanceKm(parsed.distanceKm);
      setDurationSec(parsed.durationSec);
      setPresetId(presetIdForDistanceKm(parsed.distanceKm));
    }
  }, []);

  const canSave = eventLabel.trim().length > 0 && distanceKm > 0 && durationSec > 0;

  const openDurationPicker = () => {
    const h = Math.floor(durationSec / 3600);
    const m = Math.floor((durationSec % 3600) / 60);
    const s = durationSec % 60;
    setDurH(String(h));
    setDurM(String(m));
    setDurS(String(s));
    setDurationPickerOpen(true);
  };

  const openSpeedPicker = () => {
    const sp = speedKmhFromDuration(distanceKm, durationSec);
    const whole = Math.floor(sp);
    const dec = Math.round((sp - whole) * 10);
    setSpeedWhole(String(whole));
    setSpeedDec(String(dec));
    setSpeedPickerOpen(true);
  };

  const handleSelectChip = (id: string, label: string, km: number | null) => {
    setPresetId(id);
    if (km == null) {
      setCustomDistanceWhole(String(Math.floor(Math.max(distanceKm, 1))));
      setCustomDistanceDec(String(Math.round((distanceKm % 1) * 10)));
      setCustomDistanceOpen(true);
      return;
    }
    const displayKm = unit === "mi" ? kmToMiles(km) : km;
    const nextKm = unit === "mi" ? milesToKm(displayKm) : displayKm;
    setDistanceKm(nextKm);
    setEventLabel(label);
  };

  const handleSave = async () => {
    if (!user?.id || !canSave) return;
    setSaving(true);
    try {
      const trimmedLabel = eventLabel.trim();
      const labelNorm = trimmedLabel.toLowerCase();

      if (editingRowId) {
        const { data, error } = await (supabase as any)
          .from("profile_sport_records")
          .update({
            sport_key: sportKey,
            event_label: trimmedLabel,
            record_value: recordValue,
          })
          .eq("id", editingRowId)
          .eq("user_id", user.id)
          .select("id, sport_key, event_label, record_value, sort_order")
          .single();
        if (error) throw error;
        setRows((prev) => prev.map((x) => (x.id === editingRowId ? (data as ProfileSportRecordRow) : x)));
        setEditingRowId(null);
        window.dispatchEvent(new Event("profile-records-updated"));
        toast({ title: "Record mis à jour" });
        return;
      }

      const existing = rows.find(
        (row) => row.sport_key === sportKey && row.event_label.trim().toLowerCase() === labelNorm,
      );

      if (existing) {
        const { data, error } = await (supabase as any)
          .from("profile_sport_records")
          .update({
            sport_key: sportKey,
            event_label: trimmedLabel,
            record_value: recordValue,
          })
          .eq("id", existing.id)
          .eq("user_id", user.id)
          .select("id, sport_key, event_label, record_value, sort_order")
          .single();
        if (error) throw error;
        setRows((prev) => prev.map((x) => (x.id === existing.id ? (data as ProfileSportRecordRow) : x)));
        window.dispatchEvent(new Event("profile-records-updated"));
        toast({ title: "Record mis à jour" });
        return;
      }

      const nextOrder = rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
      const { data, error } = await (supabase as any)
        .from("profile_sport_records")
        .insert({
          user_id: user.id,
          sport_key: sportKey,
          event_label: trimmedLabel,
          record_value: recordValue,
          sort_order: nextOrder,
        })
        .select("id, sport_key, event_label, record_value, sort_order")
        .single();
      if (error) throw error;
      setRows((prev) => [...prev, data as ProfileSportRecordRow]);
      window.dispatchEvent(new Event("profile-records-updated"));
      toast({ title: "Record ajouté" });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible d'enregistrer le record.",
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
      setEditingRowId((cur) => (cur === id ? null : cur));
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
  const timeParts = formatDurationParts(durationSec);

  return (
    <IosFixedPageHeaderShell
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden bg-white"
      headerWrapperClassName="shrink-0 border-b border-[#e0e0e0] bg-white"
      contentScroll
      scrollClassName="min-h-0 bg-white"
      header={
        <div className="pt-[var(--safe-area-top)]">
          <IosPageHeaderBar
            leadingBack={{
              onClick: () => navigate(-1),
              label: "Page précédente",
            }}
            title={editingRowId ? "Modifier le record" : "Ajouter un record"}
            right={
              <button
                type="button"
                className="flex h-11 min-w-[52px] shrink-0 items-center justify-center rounded-full px-3.5 text-[17px] font-semibold leading-none text-white shadow-none transition-transform active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: RC.primary }}
                aria-label="Enregistrer le record"
                disabled={!canSave || saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : "OK"}
              </button>
            }
          />
          <div className="h-2" />
        </div>
      }
    >
      <ScrollArea className="h-full min-h-0 min-w-0 flex-1 overflow-x-hidden">
        <div className="space-y-[22px] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
          {editingRowId ? (
            <div
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px]"
              style={{ backgroundColor: "rgba(0,102,204,0.08)" }}
            >
              <span className="min-w-0 text-[#1d1d1f]">Modification en cours</span>
              <button type="button" className="shrink-0 font-semibold" style={{ color: RC.primary }} onClick={() => setEditingRowId(null)}>
                Annuler
              </button>
            </div>
          ) : null}
          {/* Sport — maquette 21 */}
          <section>
            <div
              className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]"
              style={{ letterSpacing: "0.6px" }}
            >
              Sport
            </div>
            <div className="mt-2.5 space-y-2.5">
              <div className="overflow-hidden rounded-[14px] border border-[#e0e0e0] bg-white">
                {PRIMARY_SPORT_ORDER.map((k, index) => {
                  const active = sportKey === k;
                  const badge = SPORT_EMOJI_BADGE[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSportKey(k)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[#f5f5f7]",
                        index < PRIMARY_SPORT_ORDER.length - 1 && "border-b border-[#e0e0e0]"
                      )}
                      aria-label={PROFILE_SPORT_RECORD_LABELS[k]}
                      aria-pressed={active}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[16px] leading-none"
                        style={{ backgroundColor: badge.bg }}
                        aria-hidden
                      >
                        {badge.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[17px] font-normal tracking-tight text-[#1d1d1f]">
                        {PROFILE_SPORT_RECORD_LABELS[k]}
                      </span>
                      {active ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={2.5} /> : <span className="h-5 w-5 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <div className="overflow-hidden rounded-[14px] border border-[#e0e0e0] bg-white">
                {EXTRA_SPORTS.map((k, index) => {
                  const active = sportKey === k;
                  const badge = SPORT_EMOJI_BADGE[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSportKey(k)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-[#f5f5f7]",
                        index < EXTRA_SPORTS.length - 1 && "border-b border-[#e0e0e0]"
                      )}
                      aria-label={PROFILE_SPORT_RECORD_LABELS[k]}
                      aria-pressed={active}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[16px] leading-none"
                        style={{ backgroundColor: badge.bg }}
                        aria-hidden
                      >
                        {badge.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[17px] font-normal tracking-tight text-[#1d1d1f]">
                        {PROFILE_SPORT_RECORD_LABELS[k]}
                      </span>
                      {active ? <Check className="h-5 w-5 shrink-0 text-[#007AFF]" strokeWidth={2.5} /> : <span className="h-5 w-5 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Distance chips */}
          <section>
            <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]">Distance</div>
            <div className="flex flex-wrap gap-1.5">
              {DISTANCE_CHIPS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelectChip(d.id, d.label, d.km)}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-[13px] font-bold transition-transform active:scale-[0.98]",
                    presetId === d.id ? "text-white" : "border border-[#e0e0e0] bg-[#f5f5f7] text-[#1d1d1f]",
                  )}
                  style={presetId === d.id ? { backgroundColor: RC.primary, border: "none" } : undefined}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          {/* Temps + performance — card */}
          <section
            className="rounded-[18px] border-[1.5px] border-[#e0e0e0] p-[18px]"
            style={{ backgroundColor: RC.parchment }}
          >
            <div className="text-[12px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]">Temps</div>
            <button
              type="button"
              onClick={openDurationPicker}
              className="mt-2.5 flex w-full items-baseline justify-start gap-1.5 text-left font-display font-bold leading-none tracking-[-2.5px] active:opacity-80"
            >
              <span className="text-[56px] text-[#1d1d1f]">{timeParts.h}</span>
              <span className="pb-1 text-[20px] font-medium text-[#7a7a7a]">h</span>
              <span className="text-[56px]" style={{ color: RC.primary }}>
                {timeParts.m}
              </span>
              <span className="pb-1 text-[20px] font-medium text-[#7a7a7a]">m</span>
              <span className="text-[56px] text-[#1d1d1f]">{timeParts.s}</span>
              <span className="pb-1 text-[20px] font-medium text-[#7a7a7a]">s</span>
            </button>

            {runningLike ? (
              <div className="mt-3.5 flex w-full items-center justify-between rounded-xl bg-white p-3 text-left">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]">{performanceLineLabel}</div>
                  <div className="mt-0.5 font-display text-[18px] font-bold text-[#1d1d1f]">{performanceLineValue}</div>
                </div>
                {showNewPrBadge ? (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: RC.primary, backgroundColor: RC.canvas }}
                  >
                    NOUVEAU PR
                  </span>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={openSpeedPicker}
                className="mt-3.5 flex w-full items-center justify-between rounded-xl bg-white p-3 text-left active:opacity-90"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]">{performanceLineLabel}</div>
                  <div className="mt-0.5 font-display text-[18px] font-bold text-[#1d1d1f]">{performanceLineValue}</div>
                </div>
                {showNewPrBadge ? (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: RC.primary, backgroundColor: RC.canvas }}
                  >
                    NOUVEAU PR
                  </span>
                ) : null}
              </button>
            )}
          </section>

          {/* Liste existante — backend conservé */}
          <section className="pb-4">
            <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.6px] text-[#7a7a7a]">Mes records</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-[#0066cc]" />
              </div>
            ) : rows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e0e0e0] bg-[#f5f5f7] py-8 text-center text-[15px] text-[#7a7a7a]">
                Aucun record pour l'instant.
              </p>
            ) : (
              <ul className="divide-y divide-[#e0e0e0] rounded-2xl border border-[#e0e0e0] bg-white px-1">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className={cn("flex items-center gap-3 py-3 pl-3 pr-1", editingRowId === r.id && "rounded-xl bg-[#f5faff]")}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-lg px-0 py-0 text-left active:opacity-80"
                      onClick={() => loadRowForEdit(r)}
                    >
                      <p className="text-[13px] text-[#7a7a7a]">
                        {isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}
                      </p>
                      <p className="truncate font-display text-[16px] font-bold text-[#1d1d1f]">{r.event_label}</p>
                      <p className="font-mono text-[14px] tabular-nums" style={{ color: RC.primary }}>
                        {r.record_value}
                      </p>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(r.id)}
                      disabled={saving}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
          setDurationSec(Math.max(1, sec));
          setDurationPickerOpen(false);
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
          const sp = Number(`${speedWhole}.${speedDec}`);
          setDurationSec(durationSecFromSpeed(distanceKm, sp));
          setSpeedPickerOpen(false);
        }}
      />
    </IosFixedPageHeaderShell>
  );
}
