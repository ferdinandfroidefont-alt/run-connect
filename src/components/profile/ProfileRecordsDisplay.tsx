import { Fragment, useEffect, useState } from "react";
import { PersonStanding, Bike, Waves, Trophy, Footprints, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  PROFILE_SPORT_RECORD_LABELS,
  PROFILE_SPORT_RECORD_KEYS,
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
  running: { icon: PersonStanding, color: "bg-primary", label: PROFILE_SPORT_RECORD_LABELS.running },
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

/**
 * Valeurs issues de ProfileSportRecordsEdit : "durée - distance - allure|vitesse".
 * Sur le profil on n'affiche que durée + distance (l'allure est un détail d'édition).
 */
function formatRecordValueForProfileList(raw: string): string {
  const parts = raw
    .split(" - ")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length < 3) return raw.trim();
  const last = parts[parts.length - 1] ?? "";
  const isPaceOrSpeedMeta =
    /\/km\s*$/i.test(last) || /\/100m\s*$/i.test(last) || /\bkm\/h\s*$/i.test(last);
  if (!isPaceOrSpeedMeta) return raw.trim();
  return `${parts[0]} · ${parts[1]}`;
}

function splitMaquetteProfileRecord(display: string): { main: string; detail: string } {
  const d = display.trim();
  const idx = d.indexOf(" · ");
  if (idx === -1) return { main: d, detail: "" };
  return { main: d.slice(0, idx).trim(), detail: d.slice(idx + 3).trim() };
}

function normalizeSportKeyForMaquette(raw: string | undefined | null): ProfileSportRecordKey {
  const s = (raw ?? "").trim();
  if (!s) return "other";
  if (isProfileSportRecordKey(s)) return s;
  const lower = s.toLowerCase();
  if (isProfileSportRecordKey(lower)) return lower;
  return "other";
}

const MAQUETTE_SPORT: Record<
  Exclude<ProfileSportRecordKey, "other">,
  { emoji: string; color: string; label: string }
> = {
  running: { emoji: "🏃", color: "#007AFF", label: PROFILE_SPORT_RECORD_LABELS.running },
  cycling: { emoji: "🚴", color: "#FF3B30", label: PROFILE_SPORT_RECORD_LABELS.cycling },
  swimming: { emoji: "🏊", color: "#5AC8FA", label: PROFILE_SPORT_RECORD_LABELS.swimming },
  triathlon: { emoji: "🔱", color: "#AF52DE", label: PROFILE_SPORT_RECORD_LABELS.triathlon },
  walking: { emoji: "🚶", color: "#34C759", label: PROFILE_SPORT_RECORD_LABELS.walking },
};

export function ProfileRecordsDisplay({
  userId,
  legacy,
  className,
  /** Ne rien afficher si aucun record (après chargement) — utile profil public */
  hideIfEmpty,
  /** Titre au-dessus du bloc (ex. profil public) */
  sectionTitle,
  /** Cartes blanches groupées par sport (maquette Profil RunConnect v6) */
  presentation,
}: {
  userId: string;
  legacy?: LegacyRecords;
  className?: string;
  hideIfEmpty?: boolean;
  sectionTitle?: string;
  presentation?: "default" | "maquette";
}) {
  const [rows, setRows] = useState<ProfileSportRecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchRows = async () => {
      try {
        const { data, error } = await (supabase as any)
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
    };

    void fetchRows();

    const onRecordsUpdated = () => {
      if (cancelled) return;
      setLoading(true);
      void fetchRows();
    };
    const onFocus = () => {
      if (cancelled) return;
      void fetchRows();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };

    window.addEventListener("profile-records-updated", onRecordsUpdated);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-records-updated", onRecordsUpdated);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
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

  if (presentation === "maquette") {
    type MainSportKey = Exclude<ProfileSportRecordKey, "other">;

    const customGrouped = rows.reduce<Map<ProfileSportRecordKey, ProfileSportRecordRow[]>>((acc, row) => {
      const k = normalizeSportKeyForMaquette(row.sport_key);
      if (!acc.has(k)) acc.set(k, []);
      acc.get(k)!.push(row);
      return acc;
    }, new Map());

    /** Autre + sport_key hors schéma. */
    const otherUnified: ProfileSportRecordRow[] = [...(customGrouped.get("other") ?? [])];
    for (const [k, rs] of customGrouped.entries()) {
      if (k === "other") continue;
      if (!(PROFILE_SPORT_RECORD_KEYS as readonly string[]).includes(k)) {
        otherUnified.push(...rs);
      }
    }

    function renderMergedLineDivider(i: number) {
      return i > 0 ? <div className="ml-4 h-px bg-[#E5E5EA]" /> : null;
    }

    return (
      <div className={cn("space-y-7", className)}>
        {(PROFILE_SPORT_RECORD_KEYS.filter((sk) => sk !== "other") as MainSportKey[]).map((sk) => {
          const legacyEntries = legacyBlocks.find((lb) => lb.key === sk)?.entries ?? [];
          const dbRows = customGrouped.get(sk) ?? [];
          if (legacyEntries.length === 0 && dbRows.length === 0) return null;

          const g = MAQUETTE_SPORT[sk];
          let idx = -1;

          return (
            <div key={sk} className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex shrink-0 items-center justify-center text-[18px]"
                  style={{ width: 36, height: 36, borderRadius: 10, background: g.color }}
                >
                  {g.emoji}
                </div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0A0F1F",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  {g.label}
                </h2>
              </div>
              <div
                style={{
                  background: "white",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
                }}
              >
                {legacyEntries.map(({ label, value }) => {
                  idx++;
                  return (
                    <Fragment key={`leg-${sk}-${label}-${idx}`}>
                      {renderMergedLineDivider(idx)}
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p
                            style={{
                              fontSize: 17,
                              fontWeight: 800,
                              color: "#0A0F1F",
                              margin: 0,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {label}
                          </p>
                          <p style={{ marginTop: 2, margin: "2px 0 0", fontSize: 13, color: "#8E8E93" }}>
                            Record personnel
                          </p>
                        </div>
                        <p
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: g.color,
                            margin: 0,
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "-0.02em",
                          }}
                          className="shrink-0 pl-3"
                        >
                          {value}
                        </p>
                      </div>
                    </Fragment>
                  );
                })}
                {dbRows.map((row) => {
                  idx++;
                  const formatted = formatRecordValueForProfileList(row.record_value);
                  const split = splitMaquetteProfileRecord(formatted);
                  return (
                    <Fragment key={row.id}>
                      {renderMergedLineDivider(idx)}
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p
                            style={{
                              fontSize: 17,
                              fontWeight: 800,
                              color: "#0A0F1F",
                              margin: 0,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {row.event_label}
                          </p>
                          {split.detail ? (
                            <p style={{ marginTop: 2, margin: "2px 0 0", fontSize: 13, color: "#8E8E93" }}>
                              {split.detail}
                            </p>
                          ) : null}
                        </div>
                        <p
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: g.color,
                            margin: 0,
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: "-0.02em",
                          }}
                          className="shrink-0 pl-3"
                        >
                          {split.main}
                        </p>
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}

        {otherUnified.length > 0 ? (
          <div key="other-unified" className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className="flex shrink-0 items-center justify-center text-[18px]"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#8E8E93" }}
              >
                📌
              </div>
              <h2 className="m-0 text-[20px] font-extrabold tracking-tight text-[#0A0F1F]">
                {PROFILE_SPORT_RECORD_LABELS.other}
              </h2>
            </div>
            <div
              style={{
                background: "white",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.06)",
              }}
            >
              {otherUnified.map((row, i) => {
                const formatted = formatRecordValueForProfileList(row.record_value);
                const split = splitMaquetteProfileRecord(formatted);
                return (
                  <Fragment key={row.id}>
                    {renderMergedLineDivider(i)}
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="m-0 text-[17px] font-extrabold tracking-tight text-[#0A0F1F]">
                          {row.event_label}
                        </p>
                        {split.detail ? (
                          <p className="m-0 mt-0.5 text-[13px] text-[#8E8E93]">{split.detail}</p>
                        ) : null}
                      </div>
                      <p
                        style={{ fontSize: 22, fontWeight: 900, color: "#8E8E93" }}
                        className="shrink-0 pl-3 font-black tabular-nums text-[22px]"
                      >
                        {split.main}
                      </p>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : null}
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
                  {formatRecordValueForProfileList(row.record_value)}
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
