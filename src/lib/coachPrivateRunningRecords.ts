export type CoachPrivateRecordRow = {
  id: string;
  athlete_user_id: string;
  sport_key: string;
  event_label: string;
  record_value: string;
  note?: string | null;
};

const RUNNING_EVENT_ALIASES: Record<string, string> = {
  "1500 m": "1500m",
  "1500m": "1500m",
  "1 500 m": "1500m",
  "3 km": "3k",
  "3km": "3k",
  "3000 m": "3k",
  "3000m": "3k",
  "5 km": "5k",
  "5km": "5k",
  "5000 m": "5k",
  "5000m": "5k",
  "10 km": "10k",
  "10km": "10k",
  "10000 m": "10k",
  "10 000 m": "10k",
};

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeRunningEventKey(label: string) {
  const normalized = normalizeLabel(label);
  return RUNNING_EVENT_ALIASES[normalized] ?? normalized;
}

export function runningRecordsFromPrivateRows(rows: CoachPrivateRecordRow[] | null | undefined): Record<string, unknown> | null {
  if (!rows?.length) return null;
  const entries = rows
    .filter((row) => row.sport_key === "running")
    .map((row) => [normalizeRunningEventKey(row.event_label), row.record_value] as const);

  if (!entries.length) return null;
  return Object.fromEntries(entries);
}

export function mergeRunningRecords(
  athleteRecords?: Record<string, unknown> | null,
  coachValidatedRecords?: Record<string, unknown> | null,
) {
  if (!athleteRecords && !coachValidatedRecords) return null;
  return {
    ...(athleteRecords ?? {}),
    ...(coachValidatedRecords ?? {}),
  };
}