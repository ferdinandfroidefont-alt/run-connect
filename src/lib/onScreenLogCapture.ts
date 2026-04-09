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
let fallbackOverlayInstalled = false;
let fallbackOverlayBody: HTMLDivElement | null = null;
let originalConsole:
  | {
      log: (...args: unknown[]) => void;
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
      debug: (...args: unknown[]) => void;
    }
  | null = null;

declare global {
  interface Window {
    __BOOT_LOGS__?: string[];
    __bootLog?: (msg: string, data?: unknown) => void;
    __BOOT_REACT_OVERLAY_MOUNTED__?: boolean;
  }
}

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
  if (typeof window !== "undefined") {
    window.__BOOT_LOGS__ = window.__BOOT_LOGS__ ?? [];
    window.__BOOT_LOGS__.push(message);
    if (window.__BOOT_LOGS__.length > MAX) {
      window.__BOOT_LOGS__.splice(0, window.__BOOT_LOGS__.length - MAX);
    }
    window.dispatchEvent(new CustomEvent("boot-log"));
  }
  renderFallbackOverlay();
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

function ensureFallbackOverlay(): void {
  if (fallbackOverlayInstalled || typeof window === "undefined" || typeof document === "undefined") return;
  fallbackOverlayInstalled = true;

  const root = document.createElement("div");
  root.id = "__boot-log-overlay";
  root.setAttribute(
    "style",
    [
      "position:fixed",
      "left:0",
      "right:0",
      "bottom:0",
      "z-index:2147483647",
      "max-height:45vh",
      "background:rgba(0,0,0,0.96)",
      "color:#b7ffb7",
      "border-top:1px solid rgba(180,255,180,0.35)",
      "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
      "font-size:11px",
      "line-height:1.4",
      "pointer-events:auto",
      "padding-bottom:env(safe-area-inset-bottom,0px)",
      "display:flex",
      "flex-direction:column",
      "box-shadow:0 -8px 24px rgba(0,0,0,0.4)",
    ].join(";"),
  );

  const header = document.createElement("div");
  header.setAttribute(
    "style",
    "display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(180,255,180,0.2);color:#fff;flex:0 0 auto;",
  );
  const title = document.createElement("strong");
  title.textContent = "BOOT LOGS";
  title.setAttribute("style", "font-size:11px;");
  const meta = document.createElement("span");
  meta.id = "__boot-log-overlay-meta";
  meta.setAttribute("style", "opacity:0.8;font-size:10px;");
  const spacer = document.createElement("div");
  spacer.setAttribute("style", "flex:1 1 auto;");
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Effacer";
  clearBtn.setAttribute(
    "style",
    "border:1px solid rgba(180,255,180,0.35);background:transparent;color:#fff;padding:2px 6px;border-radius:6px;font-size:10px;",
  );
  clearBtn.onclick = () => clearOnScreenLogs();

  header.appendChild(title);
  header.appendChild(meta);
  header.appendChild(spacer);
  header.appendChild(clearBtn);

  const body = document.createElement("div");
  body.id = "__boot-log-overlay-body";
  body.setAttribute(
    "style",
    "overflow:auto;white-space:pre-wrap;word-break:break-word;padding:6px 8px;flex:1 1 auto;",
  );

  root.appendChild(header);
  root.appendChild(body);
  fallbackOverlayBody = body;

  const mount = () => {
    if (!document.body) {
      window.setTimeout(mount, 16);
      return;
    }
    document.body.appendChild(root);
    renderFallbackOverlay();
  };
  mount();
}

function renderFallbackOverlay(): void {
  if (!fallbackOverlayBody || typeof document === "undefined") return;
  const root = document.getElementById("__boot-log-overlay");
  if (!root) return;

  if (window.__BOOT_REACT_OVERLAY_MOUNTED__) {
    root.style.display = "none";
    return;
  }
  root.style.display = "flex";

  const meta = document.getElementById("__boot-log-overlay-meta");
  if (meta) meta.textContent = `${entries.length} lignes`;

  fallbackOverlayBody.innerHTML = entries
    .map((entry) => {
      const color =
        entry.level === "error"
          ? "#ff9b9b"
          : entry.level === "warn"
            ? "#ffd37a"
            : entry.level === "info"
              ? "#ffffff"
              : "#b7ffb7";
      return `<div style="padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:${color};">${escapeHtml(
        `[${new Date(entry.t).toLocaleTimeString()}] ${entry.level.toUpperCase()} ${entry.message}`,
      )}</div>`;
    })
    .join("");
  fallbackOverlayBody.scrollTop = fallbackOverlayBody.scrollHeight;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function bootLog(msg: string, data?: unknown): void {
  const line = data === undefined ? msg : `${msg} ${safeStringify([data])}`;
  if (originalConsole) {
    originalConsole.log(line);
  }
  if (isOnScreenLogsEnabled()) {
    push("info", [line]);
  }
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
  originalConsole = orig;
  window.__BOOT_LOGS__ = window.__BOOT_LOGS__ ?? [];
  window.__bootLog = (msg: string, data?: unknown) => {
    bootLog(msg, data);
  };

  if (isOnScreenLogsEnabled()) {
    ensureFallbackOverlay();
  }

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

  bootLog("[boot] on-screen log capture installed");
}

export function getOnScreenLogs(): readonly OnScreenLogEntry[] {
  return entries;
}

export function clearOnScreenLogs(): void {
  entries.length = 0;
  if (typeof window !== "undefined") {
    window.__BOOT_LOGS__ = [];
    window.dispatchEvent(new CustomEvent("boot-log"));
  }
  renderFallbackOverlay();
  listeners.forEach((fn) => fn());
}

export function subscribeOnScreenLogs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
