export type MessageSearchRecent =
  | {
      id: string;
      type: "user";
      name: string;
      handle: string;
      userId: string;
    }
  | {
      id: string;
      type: "club";
      name: string;
      members?: number;
      clubId: string;
    };

const LS_KEY = "rc.messageSearchRecents.v1";
const MAX = 12;

export function loadMessageSearchRecents(): MessageSearchRecent[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: MessageSearchRecent[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const o = item as MessageSearchRecent;
      if (o.type === "user" && typeof o.userId === "string" && typeof o.name === "string") {
        out.push({
          id: typeof o.id === "string" ? o.id : `u-${o.userId}`,
          type: "user",
          name: o.name,
          handle: typeof o.handle === "string" ? o.handle : "",
          userId: o.userId,
        });
      } else if (o.type === "club" && typeof o.clubId === "string" && typeof o.name === "string") {
        out.push({
          id: typeof o.id === "string" ? o.id : `c-${o.clubId}`,
          type: "club",
          name: o.name,
          members: typeof o.members === "number" ? o.members : undefined,
          clubId: o.clubId,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function save(items: MessageSearchRecent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* no-op */
  }
}

export function pushMessageSearchRecent(entry: Omit<MessageSearchRecent, "id">): MessageSearchRecent[] {
  const id =
    entry.type === "user"
      ? `u-${entry.userId}`
      : `c-${entry.clubId}`;
  const next: MessageSearchRecent = { ...entry, id };
  const prev = loadMessageSearchRecents().filter((r) => r.id !== id);
  const merged = [next, ...prev].slice(0, MAX);
  save(merged);
  return merged;
}

export function removeMessageSearchRecent(id: string): MessageSearchRecent[] {
  const merged = loadMessageSearchRecents().filter((r) => r.id !== id);
  save(merged);
  return merged;
}
