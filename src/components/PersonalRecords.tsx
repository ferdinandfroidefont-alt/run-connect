import { useEffect, useMemo, useState } from "react";
import { PersonStanding, Bike, Waves, Trophy, Footprints, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PersonalRecordsProps {
  records: {
    running_records?: any;
    cycling_records?: any;
    swimming_records?: any;
    triathlon_records?: any;
    walking_records?: any;
  };
  canEdit?: boolean;
  onRecordsChange?: (nextRecords: {
    running_records?: any;
    cycling_records?: any;
    swimming_records?: any;
    triathlon_records?: any;
    walking_records?: any;
  }) => void;
}

const sportConfig = {
  running: { icon: PersonStanding, color: "bg-orange-500", label: "Course" },
  cycling: { icon: Bike, color: "bg-green-500", label: "Vélo" },
  swimming: { icon: Waves, color: "bg-blue-500", label: "Natation" },
  triathlon: { icon: Trophy, color: "bg-purple-500", label: "Triathlon" },
  walking: { icon: Footprints, color: "bg-yellow-500", label: "Marche" },
};

export const PersonalRecords = ({ records, canEdit = false, onRecordsChange }: PersonalRecordsProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [localRecords, setLocalRecords] = useState(records);
  const [saving, setSaving] = useState(false);
  const [plannerSport, setPlannerSport] = useState<"running" | "cycling" | "swimming">("running");
  const [plannerDistanceKm, setPlannerDistanceKm] = useState(5);
  const [plannerTimeSeconds, setPlannerTimeSeconds] = useState(25 * 60);
  const [plannerMetric, setPlannerMetric] = useState(5);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const formatSeconds = (seconds: number) => {
    const safe = Math.max(0, Math.round(seconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    if (h > 0) {
      return `${h}h ${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
    }
    return `${m}'${String(s).padStart(2, "0")}"`;
  };

  const formatPace = (minutesPerUnit: number, suffix: string) => {
    const safe = Math.max(0, minutesPerUnit);
    const mins = Math.floor(safe);
    const secs = Math.round((safe - mins) * 60);
    const normalizedSecs = secs === 60 ? 0 : secs;
    const normalizedMins = secs === 60 ? mins + 1 : mins;
    return `${normalizedMins}'${String(normalizedSecs).padStart(2, "0")} / ${suffix}`;
  };

  const getPlannerConfig = () => {
    if (plannerSport === "cycling") {
      return {
        metricLabel: "Vitesse",
        metricSuffix: "km/h",
        metricMin: 8,
        metricMax: 75,
        distanceMinKm: 0.06,
        distanceMaxKm: 300,
        distanceLabel: `${plannerDistanceKm < 1 ? `${Math.round(plannerDistanceKm * 1000)} m` : `${plannerDistanceKm.toFixed(1)} km`}`,
        metricDisplay: `${plannerMetric.toFixed(1)} km/h`,
      };
    }

    if (plannerSport === "swimming") {
      return {
        metricLabel: "Allure",
        metricSuffix: "100m",
        metricMin: 0.7,
        metricMax: 4,
        distanceMinKm: 0.06,
        distanceMaxKm: 10,
        distanceLabel: `${plannerDistanceKm < 1 ? `${Math.round(plannerDistanceKm * 1000)} m` : `${plannerDistanceKm.toFixed(2)} km`}`,
        metricDisplay: formatPace(plannerMetric, "100m"),
      };
    }

    return {
      metricLabel: "Allure",
      metricSuffix: "km",
      metricMin: 1.5,
      metricMax: 10,
      distanceMinKm: 0.06,
      distanceMaxKm: 300,
      distanceLabel: `${plannerDistanceKm < 1 ? `${Math.round(plannerDistanceKm * 1000)} m` : `${plannerDistanceKm.toFixed(1)} km`}`,
      metricDisplay: formatPace(plannerMetric, "km"),
    };
  };

  const recalculate = (driver: "distance" | "time" | "metric", nextDistanceKm?: number, nextTimeSeconds?: number, nextMetric?: number) => {
    const cfg = getPlannerConfig();
    const distance = clamp(nextDistanceKm ?? plannerDistanceKm, cfg.distanceMinKm, cfg.distanceMaxKm);
    const metric = clamp(nextMetric ?? plannerMetric, cfg.metricMin, cfg.metricMax);
    const time = clamp(nextTimeSeconds ?? plannerTimeSeconds, 10, 48 * 3600);

    if (plannerSport === "cycling") {
      if (driver === "time") {
        const computedMetric = clamp(distance / (time / 3600), cfg.metricMin, cfg.metricMax);
        setPlannerMetric(computedMetric);
        setPlannerDistanceKm(distance);
        setPlannerTimeSeconds(time);
        return;
      }

      if (driver === "metric") {
        const computedTime = clamp((distance / metric) * 3600, 10, 48 * 3600);
        setPlannerDistanceKm(distance);
        setPlannerMetric(metric);
        setPlannerTimeSeconds(computedTime);
        return;
      }

      const computedTime = clamp((distance / metric) * 3600, 10, 48 * 3600);
      setPlannerDistanceKm(distance);
      setPlannerMetric(metric);
      setPlannerTimeSeconds(computedTime);
      return;
    }

    if (plannerSport === "swimming") {
      if (driver === "time") {
        const computedMetric = clamp((time / 60) / (distance * 10), cfg.metricMin, cfg.metricMax);
        setPlannerMetric(computedMetric);
        setPlannerDistanceKm(distance);
        setPlannerTimeSeconds(time);
        return;
      }

      if (driver === "metric") {
        const computedTime = clamp(distance * 10 * metric * 60, 10, 48 * 3600);
        setPlannerDistanceKm(distance);
        setPlannerMetric(metric);
        setPlannerTimeSeconds(computedTime);
        return;
      }

      const computedTime = clamp(distance * 10 * metric * 60, 10, 48 * 3600);
      setPlannerDistanceKm(distance);
      setPlannerMetric(metric);
      setPlannerTimeSeconds(computedTime);
      return;
    }

    if (driver === "time") {
      const computedMetric = clamp((time / 60) / distance, cfg.metricMin, cfg.metricMax);
      setPlannerMetric(computedMetric);
      setPlannerDistanceKm(distance);
      setPlannerTimeSeconds(time);
      return;
    }

    if (driver === "metric") {
      const computedTime = clamp(distance * metric * 60, 10, 48 * 3600);
      setPlannerDistanceKm(distance);
      setPlannerMetric(metric);
      setPlannerTimeSeconds(computedTime);
      return;
    }

    const computedTime = clamp(distance * metric * 60, 10, 48 * 3600);
    setPlannerDistanceKm(distance);
    setPlannerMetric(metric);
    setPlannerTimeSeconds(computedTime);
  };

  const handleSportChange = (sport: "running" | "cycling" | "swimming") => {
    setPlannerSport(sport);
    if (sport === "cycling") {
      setPlannerDistanceKm(40);
      setPlannerMetric(30);
      setPlannerTimeSeconds((40 / 30) * 3600);
      return;
    }
    if (sport === "swimming") {
      setPlannerDistanceKm(1);
      setPlannerMetric(2);
      setPlannerTimeSeconds(1 * 10 * 2 * 60);
      return;
    }
    setPlannerDistanceKm(5);
    setPlannerMetric(5);
    setPlannerTimeSeconds(5 * 5 * 60);
  };

  const formatTime = (time: string | number) => {
    if (!time) return null;
    return time.toString();
  };

  const hasRecords = 
    (localRecords.running_records && Object.keys(localRecords.running_records).some(k => localRecords.running_records[k])) ||
    (localRecords.cycling_records && Object.keys(localRecords.cycling_records).some(k => localRecords.cycling_records[k])) ||
    (localRecords.swimming_records && Object.keys(localRecords.swimming_records).some(k => localRecords.swimming_records[k])) ||
    (localRecords.triathlon_records && Object.keys(localRecords.triathlon_records).some(k => localRecords.triathlon_records[k])) ||
    (localRecords.walking_records && Object.keys(localRecords.walking_records).some(k => localRecords.walking_records[k]));

  const getRecordsCount = () => {
    let count = 0;
    if (localRecords.running_records) count += Object.values(localRecords.running_records).filter(v => v).length;
    if (localRecords.cycling_records) count += Object.values(localRecords.cycling_records).filter(v => v).length;
    if (localRecords.swimming_records) count += Object.values(localRecords.swimming_records).filter(v => v).length;
    if (localRecords.triathlon_records) count += Object.values(localRecords.triathlon_records).filter(v => v).length;
    if (localRecords.walking_records) count += Object.values(localRecords.walking_records).filter(v => v).length;
    return count;
  };

  const plannerDistanceLabel = useMemo(() => {
    if (plannerDistanceKm < 1) {
      return `${Math.round(plannerDistanceKm * 1000)}m`;
    }
    if (Number.isInteger(plannerDistanceKm)) {
      return `${Math.round(plannerDistanceKm)}k`;
    }
    return `${plannerDistanceKm.toFixed(1)}k`;
  }, [plannerDistanceKm]);

  const savePlannedRecord = async () => {
    if (!canEdit || !user?.id) {
      toast({
        title: "Action impossible",
        description: "Tu peux enregistrer un record seulement sur ton profil.",
        variant: "destructive",
      });
      return;
    }

    const fieldName = plannerSport === "running" ? "running_records" : plannerSport === "cycling" ? "cycling_records" : "swimming_records";
    const currentSportRecords = (localRecords[fieldName] && typeof localRecords[fieldName] === "object") ? localRecords[fieldName] : {};
    const nextSportRecords = {
      ...currentSportRecords,
      [plannerDistanceLabel]: formatSeconds(plannerTimeSeconds),
    };

    const nextRecords = {
      ...localRecords,
      [fieldName]: nextSportRecords,
    };

    try {
      setSaving(true);
      const { error } = await supabase
        .from("profiles")
        .update({ [fieldName]: nextSportRecords })
        .eq("user_id", user.id);

      if (error) throw error;

      setLocalRecords(nextRecords);
      onRecordsChange?.(nextRecords);
      toast({
        title: "Record enregistré",
        description: `${sportConfig[plannerSport].label} ${plannerDistanceLabel}: ${formatSeconds(plannerTimeSeconds)}`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'enregistrer ce record.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderSportRecordsDetail = (recordsData: any, sportKey: keyof typeof sportConfig) => {
    if (!recordsData || typeof recordsData !== 'object') return null;

    const entries = Object.entries(recordsData)
      .filter(([_, value]) => value && value !== "" && value !== null)
      .map(([distance, time]) => ({ distance, time: time as string | number }));

    if (entries.length === 0) return null;

    const config = sportConfig[sportKey];
    const Icon = config.icon;

    return (
      <div key={sportKey} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", config.color)}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          <span>{config.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {entries.map(({ distance, time }) => {
            const formattedTime = formatTime(time);
            if (!formattedTime) return null;
            return (
              <div
                key={distance}
                className="flex min-w-0 items-center justify-between gap-2 bg-secondary/50 rounded-lg px-3 py-2 ios-shell:px-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{distance}</span>
                <span className="min-w-0 truncate text-right text-sm font-mono text-primary tabular-nums">
                  {formattedTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const recordsCount = getRecordsCount();
  const plannerConfig = getPlannerConfig();

  return (
    <>
      {/* iOS List Item Row */}
      <button
        onClick={() => setShowDialog(true)}
        className="w-full flex items-center gap-3 px-4 py-3 active:bg-secondary transition-colors"
      >
        <div className="h-[30px] w-[30px] rounded-[7px] bg-orange-500 flex items-center justify-center">
          <Trophy className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1 flex items-center justify-between">
          <span className="text-[17px] text-foreground">Records personnels</span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-muted-foreground">
              {hasRecords ? `${recordsCount} record${recordsCount > 1 ? 's' : ''}` : "Aucun"}
            </span>
            <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
          </div>
        </div>
      </button>

      {/* Dialog with full records */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md p-0">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-orange-500" />
              Records personnels
            </h3>
            <div className="mb-4 rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Planifier un record</p>
                <select
                  value={plannerSport}
                  onChange={(e) => handleSportChange(e.target.value as "running" | "cycling" | "swimming")}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="running">Course à pied</option>
                  <option value="cycling">Vélo</option>
                  <option value="swimming">Natation</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-background px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Temps</p>
                  <p className="text-sm font-semibold tabular-nums">{formatSeconds(plannerTimeSeconds)}</p>
                </div>
                <div className="rounded-lg bg-background px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Kilométrage</p>
                  <p className="text-sm font-semibold tabular-nums">{plannerConfig.distanceLabel}</p>
                </div>
                <div className="rounded-lg bg-background px-2 py-2 min-w-0">
                  <p className="text-[11px] text-muted-foreground">{plannerConfig.metricLabel}</p>
                  <p className="text-sm font-semibold tabular-nums truncate">{plannerConfig.metricDisplay}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Temps</span>
                    <span>{formatSeconds(plannerTimeSeconds)}</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={48 * 3600}
                    step={10}
                    value={Math.round(plannerTimeSeconds)}
                    onChange={(e) => recalculate("time", undefined, Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>Distance</span>
                    <span>{plannerConfig.distanceLabel}</span>
                  </div>
                  <input
                    type="range"
                    min={plannerConfig.distanceMinKm}
                    max={plannerConfig.distanceMaxKm}
                    step={plannerSport === "swimming" ? 0.01 : 0.1}
                    value={plannerDistanceKm}
                    onChange={(e) => recalculate("distance", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{plannerConfig.metricLabel}</span>
                    <span>
                      {plannerSport === "cycling"
                        ? `${plannerConfig.metricMin} ${plannerConfig.metricSuffix} (gauche) - ${plannerConfig.metricMax} ${plannerConfig.metricSuffix} (droite)`
                        : `${formatPace(plannerConfig.metricMax, plannerConfig.metricSuffix)} (gauche) - ${formatPace(plannerConfig.metricMin, plannerConfig.metricSuffix)} (droite)`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={plannerConfig.metricMin}
                    max={plannerConfig.metricMax}
                    step={0.01}
                    value={plannerMetric}
                    onChange={(e) => recalculate("metric", undefined, undefined, Number(e.target.value))}
                    className="w-full accent-primary"
                    style={{
                      direction: plannerSport === "cycling" ? "ltr" : "rtl",
                    }}
                  />
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  onClick={savePlannedRecord}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Enregistrement..." : "Enregistrer ce record"}
                </Button>
              )}
            </div>
            {hasRecords ? (
              <div className="space-y-4">
                {renderSportRecordsDetail(localRecords.running_records, 'running')}
                {renderSportRecordsDetail(localRecords.cycling_records, 'cycling')}
                {renderSportRecordsDetail(localRecords.swimming_records, 'swimming')}
                {renderSportRecordsDetail(localRecords.triathlon_records, 'triathlon')}
                {renderSportRecordsDetail(localRecords.walking_records, 'walking')}
              </div>
            ) : (
              <div className="text-center py-8 px-4 bg-secondary/50 rounded-lg">
                <div className="text-5xl mb-4">🏅</div>
                <p className="text-base font-semibold mb-2">Aucun record pour l'instant !</p>
                <p className="text-sm text-muted-foreground">
                  Les records seront affichés ici une fois renseignés.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
