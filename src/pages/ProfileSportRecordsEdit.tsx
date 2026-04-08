import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
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

export default function ProfileSportRecordsEdit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sportKey, setSportKey] = useState<ProfileSportRecordKey>("running");
  const [eventLabel, setEventLabel] = useState("");
  const [recordValue, setRecordValue] = useState("");

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

  const handleAdd = async () => {
    if (!user?.id) return;
    const ev = eventLabel.trim();
    const rv = recordValue.trim();
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
                <Select value={sportKey} onValueChange={(v) => { setSportKey(v as ProfileSportRecordKey); setEventLabel(""); }}>
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
                    value={SPORT_DISTANCES[sportKey].includes(eventLabel) ? eventLabel : eventLabel ? "__custom" : ""}
                    onValueChange={(v) => {
                      if (v === "__custom") {
                        setEventLabel("");
                      } else {
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
                {(SPORT_DISTANCES[sportKey].length === 0 || (!SPORT_DISTANCES[sportKey].includes(eventLabel) && eventLabel !== "")) && (
                  <Input
                    value={eventLabel}
                    onChange={(e) => setEventLabel(e.target.value)}
                    placeholder="Ex. Marathon de Paris"
                    className="h-11 rounded-ios-sm mt-1.5"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-ios-footnote text-muted-foreground">Record</label>
                <Input
                  value={recordValue}
                  onChange={(e) => setRecordValue(e.target.value)}
                  placeholder="Ex. 3h42 ou 18:30 / km"
                  className="h-11 rounded-ios-sm"
                />
              </div>
              <Button className="h-11 w-full rounded-ios-sm" onClick={() => void handleAdd()} disabled={saving}>
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
                  {rows.map((r) => (
                    <li key={r.id} className="flex min-w-0 items-center gap-3 px-4 py-3 ios-shell:px-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-ios-caption1 text-muted-foreground">
                          {isProfileSportRecordKey(r.sport_key) ? PROFILE_SPORT_RECORD_LABELS[r.sport_key] : r.sport_key}
                        </p>
                        <p className="truncate text-ios-body font-medium text-foreground">{r.event_label}</p>
                        <p className="font-mono text-ios-subheadline text-primary tabular-nums">{r.record_value}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => void handleDelete(r.id)}
                        disabled={saving}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
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
