import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronRight, Clock, Gauge, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { TimePickerModal, PacePickerModal } from "@/components/ui/ios-wheel-picker";
import type { ProfileSportRecordRow } from "@/components/profile/ProfileRecordsDisplay";
import { cn } from "@/lib/utils";

type RecordType = "time" | "pace";

/** Distances courtes pour lesquelles seul "Temps" est pertinent */
const SHORT_DISTANCES = new Set(["100 m", "200 m", "400 m", "800 m"]);

function shouldShowPaceOption(sportKey: ProfileSportRecordKey, eventLabel: string): boolean {
  if (sportKey === "swimming" || sportKey === "triathlon") return false;
  if (SHORT_DISTANCES.has(eventLabel)) return false;
  return true;
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
  const value = input.trim().replace("/km", "").trim();
  const parts = value.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;
  if (parts.length === 2) return Number(parts[0]) * 60 + Number(parts[1]);
  if (parts.length === 3) return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  return null;
}

export default function ProfileSportRecordsEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [sportKey, setSportKey] = useState<ProfileSportRecordKey>("running");
  const [eventLabel, setEventLabel] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>("time");
  const [recordValue, setRecordValue] = useState("");
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Picker modals
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPacePicker, setShowPacePicker] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEventLabel, setEditingEventLabel] = useState("");
  const [editingRecordValue, setEditingRecordValue] = useState("");

  const showPace = useMemo(() => shouldShowPaceOption(sportKey, eventLabel), [sportKey, eventLabel]);

  // Reset record type if pace not available
  useEffect(() => {
    if (!showPace && recordType === "pace") {
      setRecordType("time");
      setRecordValue("");
      setRecordSeconds(0);
    }
  }, [showPace, recordType]);

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
    if (!user) { navigate("/auth", { replace: true }); return; }
    void load();
  }, [user, navigate, load]);

  const canAdd = eventLabel.trim() !== "" && recordValue !== "" && recordSeconds > 0;

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
      setRecordValue("");
      setRecordSeconds(0);
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

  const cancelEditing = () => { setEditingId(null); setEditingEventLabel(""); setEditingRecordValue(""); };

  const saveEdit = async () => {
    if (!user?.id || !editingId) return;
    const ev = editingEventLabel.trim();
    const rv = editingRecordValue.trim();
    if (!ev || !rv) { toast({ title: "Champs requis", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("profile_sport_records").update({ event_label: ev, record_value: rv }).eq("id", editingId).eq("user_id", user.id);
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
        (supabase as any).from("profile_sport_records").update({ sort_order: idx }).eq("id", r.id).eq("user_id", user.id)
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

  const handleOpenPicker = () => {
    if (recordType === "time") setShowTimePicker(true);
    else setShowPacePicker(true);
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
            Choisis un sport, sélectionne ton épreuve puis indique ta performance. Visible sur ton profil.
          </p>

          {/* ─── SPORT ─── */}
          <div className="bg-card">
            <div className="space-y-0 divide-y divide-border/50">
              {/* Sport */}
              <div className="flex items-center justify-between px-4 py-3 ios-shell:px-2.5">
                <span className="text-[15px] text-muted-foreground">Sport</span>
                <Select
                  value={sportKey}
                  onValueChange={(v) => {
                    setSportKey(v as ProfileSportRecordKey);
                    setEventLabel("");
                    setCustomMode(false);
                    setRecordValue("");
                    setRecordSeconds(0);
                  }}
                >
                  <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 text-[17px] font-medium text-foreground shadow-none [&>svg]:ml-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_SPORT_RECORD_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{PROFILE_SPORT_RECORD_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Distance / Épreuve */}
              <div className="flex items-center justify-between px-4 py-3 ios-shell:px-2.5">
                <span className="text-[15px] text-muted-foreground">Épreuve</span>
                {SPORT_DISTANCES[sportKey].length > 0 && !customMode ? (
                  <Select
                    value={SPORT_DISTANCES[sportKey].includes(eventLabel) ? eventLabel : ""}
                    onValueChange={(v) => {
                      if (v === "__custom") {
                        setCustomMode(true);
                        setEventLabel("");
                      } else {
                        setEventLabel(v);
                        setRecordValue("");
                        setRecordSeconds(0);
                      }
                    }}
                  >
                    <SelectTrigger className="h-auto w-auto max-w-[200px] border-0 bg-transparent p-0 text-right text-[17px] font-medium text-foreground shadow-none [&>svg]:ml-1">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_DISTANCES[sportKey].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                      <SelectItem value="__custom">Autre…</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={eventLabel}
                      onChange={(e) => setEventLabel(e.target.value)}
                      placeholder="Nom de l'épreuve"
                      className="h-8 w-40 border-0 bg-transparent p-0 text-right text-[17px] font-medium shadow-none placeholder:text-muted-foreground/40"
                    />
                    {customMode && SPORT_DISTANCES[sportKey].length > 0 && (
                      <button
                        className="text-xs text-primary"
                        onClick={() => { setCustomMode(false); setEventLabel(""); }}
                      >
                        Liste
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── TYPE DE RECORD ─── */}
          {eventLabel.trim() !== "" && (
            <div>
              <h3 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ios-shell:px-2.5">
                Type de record
              </h3>
              <div className="bg-card divide-y divide-border/50">
                {/* Temps */}
                <button
                  className="flex w-full items-center justify-between px-4 py-3 active:bg-secondary/60 transition-colors ios-shell:px-2.5"
                  onClick={() => {
                    setRecordType("time");
                    if (recordType !== "time") { setRecordValue(""); setRecordSeconds(0); }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#007AFF]">
                      <Clock className="h-[18px] w-[18px] text-white" />
                    </div>
                    <span className="text-[17px] text-foreground">Temps</span>
                  </div>
                  {recordType === "time" && <Check className="h-5 w-5 text-primary" />}
                </button>

                {/* Allure */}
                {showPace && (
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 active:bg-secondary/60 transition-colors ios-shell:px-2.5"
                    onClick={() => {
                      setRecordType("pace");
                      if (recordType !== "pace") { setRecordValue(""); setRecordSeconds(0); }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] bg-[#FF9500]">
                        <Gauge className="h-[18px] w-[18px] text-white" />
                      </div>
                      <span className="text-[17px] text-foreground">Allure</span>
                    </div>
                    {recordType === "pace" && <Check className="h-5 w-5 text-primary" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── VALEUR ─── */}
          {eventLabel.trim() !== "" && (
            <div>
              <h3 className="mb-2 px-4 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground ios-shell:px-2.5">
                {recordType === "time" ? "Temps" : "Allure"}
              </h3>
              <div className="bg-card">
                <button
                  className="flex w-full items-center justify-between px-4 py-3.5 active:bg-secondary/60 transition-colors ios-shell:px-2.5"
                  onClick={handleOpenPicker}
                >
                  <span className="text-[17px] text-foreground">
                    {recordType === "time" ? "Définir le temps" : "Définir l'allure"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-[17px] tabular-nums",
                      recordValue ? "font-semibold text-primary" : "text-muted-foreground/40"
                    )}>
                      {recordValue || (recordType === "time" ? "00:00" : "0:00/km")}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ─── BOUTON AJOUTER ─── */}
          <div className="px-4 ios-shell:px-2.5">
            <Button
              className="h-12 w-full rounded-xl text-[17px] font-semibold"
              onClick={() => void handleAdd()}
              disabled={saving || !canAdd}
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Ajouter le record
            </Button>
          </div>

          {/* ─── MES RECORDS ─── */}
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
                  Aucun record pour l'instant.
                </p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {rows.map((r, index) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-3 px-4 py-3 ios-shell:px-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-ios-caption1 text-muted-foreground">
                          {isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}
                        </p>
                        {editingId === r.id ? (
                          <div className="space-y-2 mt-1">
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

      {/* Picker Modals */}
      <TimePickerModal
        open={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={(formatted, totalSeconds) => {
          setRecordValue(formatted);
          setRecordSeconds(totalSeconds);
          setShowTimePicker(false);
        }}
        initialSeconds={recordType === "time" ? recordSeconds : 0}
      />
      <PacePickerModal
        open={showPacePicker}
        onClose={() => setShowPacePicker(false)}
        onConfirm={(formatted, secondsPerKm) => {
          setRecordValue(formatted);
          setRecordSeconds(secondsPerKm);
          setShowPacePicker(false);
        }}
        initialSecondsPerKm={recordType === "pace" ? recordSeconds : 300}
      />
    </IosFixedPageHeaderShell>
  );
}
