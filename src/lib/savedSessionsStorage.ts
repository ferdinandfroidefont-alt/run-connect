const LS_KEY = "rc.savedSessions.v1";

export type SavedSessionSnapshot = {
  id: string;
  savedAt: number;
  title: string;
  activity_type: string;
  scheduled_at: string;
  location_name?: string;
  distance_km?: number | null;
  organizer_id?: string;
  organizer_display?: string;
  organizer_username?: string;
  organizer_avatar?: string | null;
  description?: string;
};

function readAll(): SavedSessionSnapshot[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SavedSessionSnapshot =>
        typeof s === "object" &&
        s != null &&
        typeof (s as SavedSessionSnapshot).id === "string" &&
        typeof (s as SavedSessionSnapshot).title === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(list: SavedSessionSnapshot[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

export function listSavedSessions(): SavedSessionSnapshot[] {
  return readAll().sort((a, b) => b.savedAt - a.savedAt);
}

export function isSessionSaved(sessionId: string): boolean {
  return readAll().some((s) => s.id === sessionId);
}

export function toggleSavedSession(snapshot: SavedSessionSnapshot): boolean {
  const list = readAll();
  const idx = list.findIndex((s) => s.id === snapshot.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeAll(list);
    return false;
  }
  writeAll([{ ...snapshot, savedAt: Date.now() }, ...list.filter((s) => s.id !== snapshot.id)]);
  return true;
}

export function removeSavedSession(sessionId: string) {
  writeAll(readAll().filter((s) => s.id !== sessionId));
}

export function buildSavedSnapshotFromSession(session: {
  id: string;
  title: string;
  activity_type: string;
  scheduled_at: string;
  location_name?: string;
  distance_km?: number | null;
  description?: string;
  organizer_id?: string;
  profiles?: { display_name?: string; username?: string; avatar_url?: string | null };
}): SavedSessionSnapshot {
  return {
    id: session.id,
    savedAt: Date.now(),
    title: session.title,
    activity_type: session.activity_type,
    scheduled_at: session.scheduled_at,
    location_name: session.location_name,
    distance_km: session.distance_km,
    description: session.description,
    organizer_id: session.organizer_id,
    organizer_display: session.profiles?.display_name,
    organizer_username: session.profiles?.username,
    organizer_avatar: session.profiles?.avatar_url ?? null,
  };
}
