import { isReallyNative } from "@/lib/nativeDetection";

export type OnScreenLogLevel = "log" | "warn" | "error" | "info" | "debug";

export interface OnScreenLogEntry {
  t: number;
  level: OnScreenLogLevel;
  message: string;
}

const MAX = 400;
const entries: OnScreenLogEntry[] = [];
const listeners = new Set<() => void>();

let installed = false;

function safeStringify(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a);
      } catch {
        try {
          return String(a);
        } catch {
          return "[inaffichable]";
        }
      }
    })
    .join(" ");
}

function push(level: OnScreenLogLevel, args: unknown[]) {
  const message = safeStringify(args);
  entries.push({ t: Date.now(), level, message });
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  listeners.forEach((fn) => fn());
}

/**
 * Panneau logs : désactivable avec VITE_DEBUG_ON_SCREEN=false (build store).
 * Par défaut : **activé en dev** et **sur shell natif** (sinon écran blanc sans aucune trace).
 */
export function isOnScreenLogsEnabled(): boolean {
  const v = import.meta.env.VITE_DEBUG_ON_SCREEN as string | undefined;
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  if (v === "web") return false;
  if (v === "native") return isReallyNative();
  if (import.meta.env.DEV) return true;
  return isReallyNative();
}

/** À appeler une fois au boot (main.tsx), avant createRoot. */
export function installOnScreenLogCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console),
  };

  console.log = (...a: unknown[]) => {
    orig.log(...a);
    if (isOnScreenLogsEnabled()) push("log", a);
  };
  console.info = (...a: unknown[]) => {
    orig.info(...a);
    if (isOnScreenLogsEnabled()) push("info", a);
  };
  console.warn = (...a: unknown[]) => {
    orig.warn(...a);
    if (isOnScreenLogsEnabled()) push("warn", a);
  };
  console.error = (...a: unknown[]) => {
    orig.error(...a);
    if (isOnScreenLogsEnabled()) push("error", a);
  };
  console.debug = (...a: unknown[]) => {
    orig.debug(...a);
    if (isOnScreenLogsEnabled()) push("debug", a);
  };

  window.addEventListener("error", (ev) => {
    if (!isOnScreenLogsEnabled()) return;
    const msg = ev.message || "error";
    const loc = ev.filename ? ` @ ${ev.filename}:${ev.lineno}` : "";
    push("error", [`[window.error] ${msg}${loc}`]);
  });

  window.addEventListener("unhandledrejection", (ev) => {
    if (!isOnScreenLogsEnabled()) return;
    const reason = ev.reason;
    const text =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : safeStringify([reason]);
    push("error", [`[unhandledrejection] ${text}`]);
  });
}

export function getOnScreenLogs(): readonly OnScreenLogEntry[] {
  return entries;
}

export function clearOnScreenLogs(): void {
  entries.length = 0;
  listeners.forEach((fn) => fn());
}

export function subscribeOnScreenLogs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
