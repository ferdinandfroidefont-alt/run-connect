import { useEffect, useState } from "react";
import { PersonStanding, Bike, Waves, Trophy, Footprints, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  PROFILE_SPORT_RECORD_LABELS,
  type ProfileSportRecordKey,
  isProfileSportRecordKey,
} from "@/lib/profileSportRecords";

type LegacyRecords = {
  running_records?: unknown;
  cycling_records?: unknown;
  swimming_records?: unknown;
  triathlon_records?: unknown;
  walking_records?: unknown;
};

const sportConfig: Record<
  Exclude<ProfileSportRecordKey, "other">,
  { icon: typeof PersonStanding; color: string; label: string }
> = {
  running: { icon: PersonStanding, color: "bg-orange-500", label: PROFILE_SPORT_RECORD_LABELS.running },
  cycling: { icon: Bike, color: "bg-green-500", label: PROFILE_SPORT_RECORD_LABELS.cycling },
  swimming: { icon: Waves, color: "bg-blue-500", label: PROFILE_SPORT_RECORD_LABELS.swimming },
  triathlon: { icon: Trophy, color: "bg-purple-500", label: PROFILE_SPORT_RECORD_LABELS.triathlon },
  walking: { icon: Footprints, color: "bg-yellow-500", label: PROFILE_SPORT_RECORD_LABELS.walking },
};

export type ProfileSportRecordRow = {
  id: string;
  sport_key: string;
  event_label: string;
  record_value: string;
  sort_order: number;
};

function legacyEntries(rec: unknown): { label: string; value: string }[] {
  if (!rec || typeof rec !== "object") return [];
  return Object.entries(rec as Record<string, unknown>)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([distance, time]) => ({
      label: String(distance),
      value: String(time),
    }));
}

export function ProfileRecordsDisplay({
  userId,
  legacy,
  className,
  /** Ne rien afficher si aucun record (après chargement) — utile profil public */
  hideIfEmpty,
  /** Titre au-dessus du bloc (ex. profil public) */
  sectionTitle,
}: {
  userId: string;
  legacy?: LegacyRecords;
  className?: string;
  hideIfEmpty?: boolean;
  sectionTitle?: string;
}) {
  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profile_sport_records")
          .select("id, sport_key, event_label, record_value, sort_order")
          .eq("user_id", userId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        if (error) throw error;
        if (!cancelled) setRows((data ?? []) as ProfileSportRecordRow[]);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const legacyBlocks: { key: keyof typeof sportConfig; entries: { label: string; value: string }[] }[] = [];
  const lr = legacy?.running_records;
  const lc = legacy?.cycling_records;
  const ls = legacy?.swimming_records;
  const lt = legacy?.triathlon_records;
  const lw = legacy?.walking_records;
  if (lr) legacyBlocks.push({ key: "running", entries: legacyEntries(lr) });
  if (lc) legacyBlocks.push({ key: "cycling", entries: legacyEntries(lc) });
  if (ls) legacyBlocks.push({ key: "swimming", entries: legacyEntries(ls) });
  if (lt) legacyBlocks.push({ key: "triathlon", entries: legacyEntries(lt) });
  if (lw) legacyBlocks.push({ key: "walking", entries: legacyEntries(lw) });

  const hasLegacy = legacyBlocks.some((b) => b.entries.length > 0);
  const hasCustom = rows.length > 0;

  if (!loading && hideIfEmpty && !hasCustom && !hasLegacy) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("space-y-2 px-ios-4 py-3 ios-shell:px-2.5", className)}>
        <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
        <div className="h-10 animate-pulse rounded-lg bg-secondary" />
      </div>
    );
  }

  if (!hasCustom && !hasLegacy) {
    return (
      <div className={cn("px-ios-4 py-4 ios-shell:px-2.5", className)}>
        <p className="text-ios-subheadline text-muted-foreground">Aucun record renseigné pour le moment.</p>
      </div>
    );
  }

  return (
    <div className={cn(sectionTitle && "overflow-hidden rounded-ios-md border border-border/60 bg-card shadow-[var(--shadow-card)]", className)}>
      {sectionTitle ? (
        <p className="border-b border-border/50 px-4 py-2.5 text-ios-caption1 font-medium uppercase tracking-wide text-muted-foreground ios-shell:px-3">
          {sectionTitle}
        </p>
      ) : null}
      <div className={cn("space-y-4 px-ios-4 py-3 ios-shell:px-2.5", !sectionTitle && className)}>
      {hasCustom && (
        <div className="space-y-3">
          {rows.map((row) => {
            const sk = isProfileSportRecordKey(row.sport_key) ? row.sport_key : "other";
            const cfg =
              sk === "other"
                ? { icon: HelpCircle, color: "bg-slate-500", label: PROFILE_SPORT_RECORD_LABELS.other }
                : sportConfig[sk];
            const Icon = cfg.icon;
            return (
              <div
                key={row.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-ios-md border border-border/50 bg-secondary/40 px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.color)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-ios-caption1 font-medium text-muted-foreground">{cfg.label}</p>
                    <p className="truncate text-ios-body font-medium text-foreground">{row.event_label}</p>
                  </div>
                </div>
                <p className="shrink-0 text-right font-mono text-ios-body font-semibold tabular-nums text-primary">
                  {row.record_value}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {hasLegacy && (
        <div className="space-y-4">
          {legacyBlocks.map(({ key, entries }) => {
            if (entries.length === 0) return null;
            const config = sportConfig[key];
            const Icon = config.icon;
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2 text-ios-footnote font-medium text-muted-foreground">
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", config.color)}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span>{config.label}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {entries.map(({ label, value }) => (
                    <div
                      key={`${key}-${label}`}
                      className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-ios-subheadline font-medium">{label}</span>
                      <span className="min-w-0 truncate text-right font-mono text-ios-subheadline tabular-nums text-primary">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
